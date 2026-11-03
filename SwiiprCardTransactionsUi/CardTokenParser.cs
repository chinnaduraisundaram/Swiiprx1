using System.Text.RegularExpressions;

namespace SwiiprCardTransactionsUi;

public sealed record ParsedTokens(IReadOnlyList<string> Valid, IReadOnlyList<string> Invalid, int Duplicates);

public static partial class CardTokenParser
{
    // Paynetics card tokens are 64-char hex (SHA-256 style).
    [GeneratedRegex("^[0-9a-fA-F]{64}$")]
    private static partial Regex TokenFormat();

    public static bool IsValid(string token) => TokenFormat().IsMatch(token);

    /// <summary>Splits on newlines (and commas/semicolons), trims, strips quotes, dedupes case-insensitively, validates format.</summary>
    public static ParsedTokens Parse(string? text)
    {
        var valid = new List<string>();
        var invalid = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int duplicates = 0;

        foreach (var raw in (text ?? string.Empty).Split(['\r', '\n', ',', ';'], StringSplitOptions.None))
        {
            var token = raw.Trim().Trim('"', '\'').Trim();
            if (token.Length == 0)
            {
                continue;
            }
            if (!seen.Add(token))
            {
                duplicates++;
                continue;
            }
            (IsValid(token) ? valid : invalid).Add(token);
        }

        return new ParsedTokens(valid, invalid, duplicates);
    }
}
