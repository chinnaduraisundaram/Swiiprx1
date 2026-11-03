using System.Text;
using System.Text.Json;

namespace SwiiprCardTransactionsUi;

/// <summary>Result of fetching one card's transactions (body is the raw response or an error message).</summary>
public sealed record CardFetchResult(string CardToken, bool IsSuccess, string Response);

/// <summary>
/// Builds CSV identical in shape to PayneticsCardTransactionsExport:
/// every value is double-quoted, quotes doubled, rows joined with the platform newline.
/// </summary>
public static class CardTransactionsCsv
{
    public const string Header =
        "CardToken,TransactionToken,CreatedAt,UpdatedOn,Fee,Status,IsHidden,Reference,IsRecurring,IsInitialRecurring,Type,OriginalAmount,OriginalCurrency,IsPaid,Merchant,Account,Balance,Amount,Currency,DebitCredit,Fx,BalanceBefore,BalanceAfter,CounterpartAmount,CounterpartBalanceAfter,CounterpartDebitCredit,CounterpartMerchant,CounterpartBalanceBefore,CounterpartFx,CounterpartBalance,CounterpartCurrency,CounterpartAccount,CounterpartCard,RawResponse";

    private const int ColumnCount = 34;

    public static string Build(IEnumerable<CardFetchResult> results)
    {
        var sb = new StringBuilder();
        sb.Append(Header).Append(Environment.NewLine);
        foreach (var result in results)
        {
            foreach (var row in BuildRows(result))
            {
                sb.Append(string.Join(",", row.Select(Quote))).Append(Environment.NewLine);
            }
        }
        return sb.ToString();
    }

    public static List<string[]> BuildRows(CardFetchResult result)
    {
        if (!result.IsSuccess)
        {
            return [RawRow(result.CardToken, result.Response)];
        }

        try
        {
            using var document = JsonDocument.Parse(result.Response);
            if (!TryFindItems(document.RootElement, out var items))
            {
                return [RawRow(result.CardToken, result.Response)];
            }
            return items.EnumerateArray().Select(item => ItemRow(result.CardToken, item)).ToList();
        }
        catch (JsonException ex)
        {
            return [RawRow(result.CardToken, ex.Message)];
        }
    }

    // Paynetics: data.items. The platform may return that envelope, a bare { items }, or a bare array.
    private static bool TryFindItems(JsonElement root, out JsonElement items)
    {
        items = default;
        if (root.ValueKind == JsonValueKind.Array)
        {
            items = root;
            return true;
        }
        if (root.ValueKind != JsonValueKind.Object)
        {
            return false;
        }
        if (TryGet(root, "data", out var data))
        {
            if (data.ValueKind == JsonValueKind.Array)
            {
                items = data;
                return true;
            }
            if (data.ValueKind == JsonValueKind.Object && TryGet(data, "items", out var inner) && inner.ValueKind == JsonValueKind.Array)
            {
                items = inner;
                return true;
            }
        }
        if (TryGet(root, "items", out var direct) && direct.ValueKind == JsonValueKind.Array)
        {
            items = direct;
            return true;
        }
        return false;
    }

    private static string[] RawRow(string cardToken, string raw)
    {
        var row = new string[ColumnCount];
        Array.Fill(row, string.Empty);
        row[0] = cardToken;
        row[ColumnCount - 1] = raw;
        return row;
    }

    private static string[] ItemRow(string cardToken, JsonElement item)
    {
        string counterpartCard = string.Empty;
        JsonElement counterpart = default;
        bool hasCounterpart = item.ValueKind == JsonValueKind.Object && TryGet(item, "counterpart", out counterpart)
            && counterpart.ValueKind == JsonValueKind.Object;
        if (hasCounterpart)
        {
            counterpartCard = GetString(counterpart, "card");
        }

        string cp(string name) => hasCounterpart ? GetString(counterpart, name) : string.Empty;

        string type = GetString(item, "type");
        if (string.Equals(type, "internal-transfer", StringComparison.OrdinalIgnoreCase))
        {
            type = string.Equals(counterpartCard, cardToken, StringComparison.OrdinalIgnoreCase) ? "Load" : "Unload";
        }

        return
        [
            cardToken,
            GetString(item, "token"),
            GetString(item, "created_at"),
            GetString(item, "updated_on"),
            GetString(item, "fee"),
            GetString(item, "status"),
            GetString(item, "is_hidden"),
            GetString(item, "reference"),
            GetString(item, "is_recurring"),
            GetString(item, "is_initial_recurring"),
            type,
            GetString(item, "original_amount"),
            GetString(item, "original_currency"),
            GetString(item, "is_paid"),
            GetString(item, "merchant"),
            GetString(item, "account"),
            GetString(item, "balance"),
            GetString(item, "amount"),
            GetString(item, "currency"),
            GetString(item, "debit_credit"),
            GetString(item, "fx"),
            GetString(item, "balance_before"),
            GetString(item, "balance_after"),
            cp("amount"),
            cp("balance_after"),
            cp("debit_credit"),
            cp("merchant"),
            cp("balance_before"),
            cp("fx"),
            cp("balance"),
            cp("currency"),
            cp("account"),
            counterpartCard,
            string.Empty,
        ];
    }

    // Values are emitted as returned (JsonElement.ToString), so dates are not reformatted - same as the reference.
    private static string GetString(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && TryGet(element, name, out var value) ? value.ToString() : string.Empty;

    // Exact snake_case first (as Paynetics), then case/underscore-insensitive (camelCase/PascalCase from the platform).
    private static bool TryGet(JsonElement element, string name, out JsonElement value)
    {
        if (element.TryGetProperty(name, out value))
        {
            return true;
        }
        var wanted = name.Replace("_", string.Empty);
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name.Replace("_", string.Empty), wanted, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }
        value = default;
        return false;
    }

    internal static string Quote(string? value) => $"\"{(value ?? string.Empty).Replace("\"", "\"\"")}\"";
}
