using System.Text.Json;

namespace SwiiprSupportPortal;

public sealed record BalanceRow(
    string CardToken,
    string Status,
    string IsActivated,
    string IsOtpSmsEnabled,
    string Currency,
    string Available,
    string Blocked,
    string BalanceToken,
    string ExternalIdentifier,
    string RawResponse);

/// <summary>
/// Maps GET /v2.0/cardmanagement/card/{token}/balance onto flat rows (one per balance) and CSV.
/// Property names are matched case-insensitively ignoring `_` and `-`, and the `data` envelope is optional.
/// </summary>
public static class CardBalanceMapper
{
    public static readonly string[] Header =
    [
        "CardToken", "Status", "IsActivated", "IsOtpSmsEnabled", "Currency", "Available", "Blocked",
        "BalanceToken", "ExternalIdentifier", "RawResponse",
    ];

    public static List<BalanceRow> Map(CardFetchResult result)
    {
        var raw = result.Response ?? string.Empty;
        if (!result.IsSuccess) return [Empty(result.CardToken, raw)];

        JsonDocument doc;
        try { doc = JsonDocument.Parse(raw); }
        catch (JsonException) { return [Empty(result.CardToken, raw)]; }

        using (doc)
        {
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object && TryGet(root, "data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                root = data;
            }
            if (root.ValueKind != JsonValueKind.Object) return [Empty(result.CardToken, raw)];

            var status = Str(root, "status");
            var activated = Str(root, "isActivated");
            var otp = Str(root, "isOtpSmsEnabled");

            var balances = new List<JsonElement>();
            if (TryGet(root, "balances", out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                balances.AddRange(arr.EnumerateArray().Where(b => b.ValueKind == JsonValueKind.Object));
            }

            if (balances.Count == 0)
            {
                return [new BalanceRow(result.CardToken, status, activated, otp, "", "", "", "", "", "")];
            }

            return balances.Select(b => new BalanceRow(
                result.CardToken, status, activated, otp,
                Str(b, "currency"), Str(b, "available"), Str(b, "blocked"),
                Str(b, "token"), Str(b, "externalIdentifier"), "")).ToList();
        }
    }

    public static string Build(IEnumerable<CardFetchResult> results)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append(string.Join(",", Header.Select(CardTransactionsCsv.Quote))).Append(Environment.NewLine);
        foreach (var row in results.SelectMany(Map))
        {
            string[] values =
            [
                row.CardToken, row.Status, row.IsActivated, row.IsOtpSmsEnabled, row.Currency,
                row.Available, row.Blocked, row.BalanceToken, row.ExternalIdentifier, row.RawResponse,
            ];
            sb.Append(string.Join(",", values.Select(CardTransactionsCsv.Quote))).Append(Environment.NewLine);
        }
        return sb.ToString();
    }

    private static BalanceRow Empty(string cardToken, string raw) => new(cardToken, "", "", "", "", "", "", "", "", raw);

    private static string Norm(string name) => name.Replace("_", "").Replace("-", "").ToLowerInvariant();

    private static bool TryGet(JsonElement element, string name, out JsonElement value)
    {
        var wanted = Norm(name);
        foreach (var p in element.EnumerateObject())
        {
            if (Norm(p.Name) == wanted) { value = p.Value; return true; }
        }
        value = default;
        return false;
    }

    private static string Str(JsonElement element, string name)
    {
        if (!TryGet(element, name, out var v)) return "";
        return v.ValueKind switch
        {
            JsonValueKind.String => v.GetString() ?? "",
            JsonValueKind.Number => v.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => "",
        };
    }
}
