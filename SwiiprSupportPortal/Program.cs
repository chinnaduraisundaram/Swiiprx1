using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using SwiiprSupportPortal;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient("platform", (sp, client) =>
{
    var baseUrl = sp.GetRequiredService<IConfiguration>()["PlatformApi:BaseUrl"] ?? "https://api.swiiprx.com";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(60);
});

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

// Only public MSAL settings are exposed; there are no secrets in this app.
app.MapGet("/api/config", (IConfiguration config) =>
{
    var b2c = config.GetSection("AzureAdB2C");
    return Results.Json(new
    {
        clientId = b2c["ClientId"] ?? string.Empty,
        redirectUri = b2c["RedirectUri"] ?? string.Empty,
        authority = b2c["Authority"] ?? string.Empty,
        policy = b2c["Policy"] ?? string.Empty,
        scopes = (b2c["Scopes"] ?? string.Empty).Split([' ', ','], StringSplitOptions.RemoveEmptyEntries),
        maxConcurrency = config.GetValue("Fetch:MaxConcurrency", 4),
        maxRetries = config.GetValue("Fetch:MaxRetries", 4),
        sessionTimeoutMinutes = config.GetValue("Session:TimeoutMinutes", 60),
        sessionWarningMinutes = config.GetValue("Session:WarningMinutes", 5),
    });
});

app.MapPost("/api/tokens/parse", (ParseRequest request) => Results.Json(CardTokenParser.Parse(request.Text)));

// Same-origin proxy: avoids browser CORS and forwards the user's bearer token as-is (never stored or logged).
static async Task<IResult> ProxyCard(string cardToken, string suffix, HttpRequest request, IHttpClientFactory factory, CancellationToken ct)
{
    if (!CardTokenParser.IsValid(cardToken))
    {
        return Results.Text("Invalid card token (must be non-empty, no whitespace, and none of / \\ ? # %).", statusCode: 400);
    }
    var authorization = request.Headers.Authorization.ToString();
    if (string.IsNullOrWhiteSpace(authorization))
    {
        return Results.Text("Missing Authorization header.", statusCode: 401);
    }

    using var upstream = new HttpRequestMessage(HttpMethod.Get, $"v2.0/cardmanagement/card/{Uri.EscapeDataString(cardToken)}/{suffix}");
    upstream.Headers.TryAddWithoutValidation("Authorization", authorization);
    upstream.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));

    try
    {
        using var response = await factory.CreateClient("platform").SendAsync(upstream, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (response.Headers.RetryAfter?.Delta is { } delta)
        {
            request.HttpContext.Response.Headers["Retry-After"] = ((int)Math.Ceiling(delta.TotalSeconds)).ToString();
        }
        return Results.Text(body, response.Content.Headers.ContentType?.ToString() ?? "text/plain", statusCode: (int)response.StatusCode);
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
    {
        return Results.Text($"Upstream request failed: {ex.Message}", statusCode: (int)HttpStatusCode.BadGateway);
    }
}

app.MapGet("/api/cards/{cardToken}/transactions", (string cardToken, HttpRequest request, IHttpClientFactory factory, CancellationToken ct) =>
    ProxyCard(cardToken, "transaction", request, factory, ct));

app.MapGet("/api/cards/{cardToken}/balance", (string cardToken, HttpRequest request, IHttpClientFactory factory, CancellationToken ct) =>
    ProxyCard(cardToken, "balance", request, factory, ct));

app.MapPost("/api/balance/map", (ExportItem item) =>
    Results.Json(CardBalanceMapper.Map(new CardFetchResult(item.CardToken, item.IsSuccess, item.Response ?? string.Empty))));

app.MapPost("/api/balance/export", (ExportRequest request) =>
{
    var results = request.Results.Select(r => new CardFetchResult(r.CardToken, r.IsSuccess, r.Response ?? string.Empty));
    return Results.Text(CardBalanceMapper.Build(results), "text/csv; charset=utf-8");
});

app.MapPost("/api/export", (ExportRequest request) =>
{
    var results = request.Results.Select(r => new CardFetchResult(r.CardToken, r.IsSuccess, r.Response ?? string.Empty));
    var csv = CardTransactionsCsv.Build(results);
    return Results.Text(csv, "text/csv; charset=utf-8");
});

app.Run();

internal sealed record ParseRequest(string? Text);
internal sealed record ExportItem(string CardToken, bool IsSuccess, string? Response);
internal sealed record ExportRequest(List<ExportItem> Results);

public partial class Program;
