using System.Globalization;
using System.Text;

namespace SwiiprSupportPortal;

public sealed record InvalidToken(int Line, string Value, string Reason);

public sealed record ParsedTokens(IReadOnlyList<string> Valid, IReadOnlyList<InvalidToken> Invalid, int Duplicates);

public static class CardTokenParser
{
    private static readonly char[] Separators = ['\r', '\n', '\t', ',', ';', ' ', '\u00A0', '\u2007', '\u202F'];

    private static readonly char[] Forbidden = ['/', '\\', '?', '#', '%'];

    // Card tokens may be any length/format; only reject values unsafe to place in a URL path segment.
    public static bool IsValid(string token) =>
        token.Length > 0 && token.Length <= 512 && Explain(token) is null;

    /// <summary>Removes quotes, BOM, zero-width and other invisible characters that Excel/web pastes add.</summary>
    public static string Normalize(string raw)
    {
        var sb = new StringBuilder(raw.Length);
        foreach (var c in raw)
        {
            var category = char.GetUnicodeCategory(c);
            if (category is UnicodeCategory.Format or UnicodeCategory.Control or UnicodeCategory.SpaceSeparator)
            {
                continue;
            }
            sb.Append(c);
        }
        return sb.ToString().Trim('"', '\'', '“', '”', '‘', '’', '{', '}');
    }

    public static string? Explain(string token)
    {
        if (token.Length == 0) return "Empty value.";
        if (token.Length > 512) return "Longer than 512 characters.";
        if (token.Any(char.IsWhiteSpace) || token.Any(char.IsControl)) return "Contains whitespace or control characters.";
        var bad = token.IndexOfAny(Forbidden);
        return bad >= 0 ? $"Contains the disallowed character '{token[bad]}'." : null;
    }

    /// <summary>Splits on newlines/tabs/commas/semicolons/spaces, normalises, dedupes case-insensitively, rejects only URL-unsafe values.</summary>
    public static ParsedTokens Parse(string? text)
    {
        var valid = new List<string>();
        var invalid = new List<InvalidToken>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int duplicates = 0;
        int line = 0;

        foreach (var rawLine in (text ?? string.Empty).Split(["\r\n", "\n", "\r"], StringSplitOptions.None))
        {
            line++;
            foreach (var part in rawLine.Split(Separators, StringSplitOptions.RemoveEmptyEntries))
            {
                var token = Normalize(part);
                if (token.Length == 0)
                {
                    continue;
                }
                if (!seen.Add(token))
                {
                    duplicates++;
                    continue;
                }
                var reason = Explain(token);
                if (reason is null) valid.Add(token);
                else invalid.Add(new InvalidToken(line, token, reason));
            }
        }

        return new ParsedTokens(valid, invalid, duplicates);
    }
}

