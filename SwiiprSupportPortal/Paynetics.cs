using System.Security.Cryptography;
using System.Text;

namespace SwiiprSupportPortal;

public sealed class PayneticsOptions
{
    public string BaseUrl { get; init; } = "https://api.paynetics.net";
    public string? ApiKey { get; init; }
    public string? ClientSecret { get; init; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(ClientSecret);

    /// <summary>Per-request values (when non-blank) win over the server configuration.</summary>
    public static PayneticsOptions Merge(PayneticsOptions server, string? baseUrl, string? apiKey, string? clientSecret) => new()
    {
        BaseUrl = string.IsNullOrWhiteSpace(baseUrl) ? server.BaseUrl : baseUrl.Trim(),
        ApiKey = string.IsNullOrWhiteSpace(apiKey) ? server.ApiKey : apiKey.Trim(),
        ClientSecret = string.IsNullOrWhiteSpace(clientSecret) ? server.ClientSecret : clientSecret.Trim(),
    };
}

public static class PayneticsHmac
{
    public const string CardGroupsMethod = "card_groups";

    /// <summary>Lowercase hex HMAC-SHA256 of <paramref name="message"/> keyed with <paramref name="secret"/>.</summary>
    public static string Hash(string message, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(message))).ToLowerInvariant();
    }

    /// <summary>x-hash = HMAC(secret, apiKey + timestamp + methodName + serializedPayload); payload is "" for GET.</summary>
    public static IReadOnlyDictionary<string, string> BuildHeaders(string apiKey, string secret, string serializedPayload, string methodName, long unixSeconds)
    {
        var timestamp = unixSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return new Dictionary<string, string>
        {
            ["x-api-key"] = apiKey,
            ["x-timestamp"] = timestamp,
            ["x-hash"] = Hash($"{apiKey}{timestamp}{methodName}{serializedPayload}", secret),
        };
    }
}
