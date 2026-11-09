using System.Net;

namespace SwiiprSupportPortal;

public sealed record CardGroupsResult(string CardToken, string Status, string? Message, string? Before, string? UpdateResponse, string? After, bool DryRun);

/// <summary>
/// Resets card groups for one card: GET, PUT (empty groups body), GET, as in the original console tool.
/// Status values: skipped, updated, dry-run, failed. Secrets and hashes are never logged or returned.
/// </summary>
public sealed class CardGroupsUpdater(HttpClient http, PayneticsOptions options, Func<long>? clock = null)
{
    public const string UpdateBody = "{\"usage\":\"\",\"fees\":\"\",\"schedule_fees\":\"\",\"web_service_fees\":\"\",\"limits\":\"\",\"linkage\":\"\",\"mcc\":\"\"}";
    public const string ErrorMarker = "11000";

    private readonly Func<long> _clock = clock ?? (() => DateTimeOffset.UtcNow.ToUnixTimeSeconds());

    public static bool HasErrorMarker(string body) => body.Contains(ErrorMarker, StringComparison.Ordinal);

    public async Task<CardGroupsResult> ProcessAsync(string cardToken, bool dryRun, CancellationToken ct)
    {
        if (!options.IsConfigured) return Fail(cardToken, dryRun, "Paynetics credentials are not configured.");
        if (!CardTokenParser.IsValid(cardToken)) return Fail(cardToken, dryRun, "Invalid card token.");

        var url = $"v2/cards/{Uri.EscapeDataString(cardToken)}/groups";
        try
        {
            var (getOk, getStatus, before) = await SendAsync(HttpMethod.Get, url, null, ct);
            if (!getOk) return new(cardToken, "failed", $"GET failed with HTTP {(int)getStatus}; update skipped.", before, null, null, dryRun);
            if (HasErrorMarker(before)) return new(cardToken, "skipped", "GET response contains error 11000; update skipped.", before, null, null, dryRun);
            if (dryRun) return new(cardToken, "dry-run", "Dry run: only the GET was performed.", before, null, null, true);

            var (putOk, putStatus, put) = await SendAsync(HttpMethod.Put, url, UpdateBody, ct);
            if (HasErrorMarker(put)) return new(cardToken, "skipped", "PUT response contains error 11000.", before, put, null, false);
            if (!putOk) return new(cardToken, "failed", $"PUT failed with HTTP {(int)putStatus}.", before, put, null, false);

            var (_, _, after) = await SendAsync(HttpMethod.Get, url, null, ct);
            if (HasErrorMarker(after)) return new(cardToken, "updated", "Updated, but the follow-up GET returned error 11000.", before, put, after, false);
            return new(cardToken, "updated", null, before, put, after, false);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return Fail(cardToken, dryRun, $"Upstream request failed: {ex.Message}");
        }
    }

    private static CardGroupsResult Fail(string token, bool dryRun, string message) => new(token, "failed", message, null, null, null, dryRun);

    private async Task<(bool Ok, HttpStatusCode Status, string Body)> SendAsync(HttpMethod method, string url, string? json, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(method, url);
        foreach (var (key, value) in PayneticsHmac.BuildHeaders(options.ApiKey!, options.ClientSecret!, json ?? string.Empty, PayneticsHmac.CardGroupsMethod, _clock()))
        {
            request.Headers.TryAddWithoutValidation(key, value);
        }
        if (json is not null) request.Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        using var response = await http.SendAsync(request, ct);
        return (response.IsSuccessStatusCode, response.StatusCode, await response.Content.ReadAsStringAsync(ct));
    }
}
