using SwiiprCardTransactionsUi;
using Xunit;

namespace SwiiprCardTransactionsUi.Tests;

public class CardTokenParserTests
{
    private static readonly string A = new('a', 64);
    private static readonly string B = new('b', 64);

    [Fact]
    public void Parse_TrimsSplitsLinesAndSkipsBlanks()
    {
        var result = CardTokenParser.Parse($"  {A}  \r\n\r\n{B}\n");
        Assert.Equal([A, B], result.Valid);
        Assert.Empty(result.Invalid);
    }

    [Fact]
    public void Parse_DedupesCaseInsensitivelyKeepingFirstAndCountsDuplicates()
    {
        var result = CardTokenParser.Parse($"{A}\n{A.ToUpperInvariant()}\n{A}\n{B}");
        Assert.Equal([A, B], result.Valid);
        Assert.Equal(2, result.Duplicates);
    }

    [Fact]
    public void Parse_AcceptsAnyLengthAndFormat()
    {
        var result = CardTokenParser.Parse($"short\nABC-123_x.y\n{new string('g', 200)}\n{A}x\n{A}");
        Assert.Equal(5, result.Valid.Count);
        Assert.Empty(result.Invalid);
    }

    [Fact]
    public void Parse_RejectsOnlyUrlUnsafeValuesWithLineAndReason()
    {
        var result = CardTokenParser.Parse($"ok1\n../{A}\nok2\na?b\nx#y\n100%\n{new string('z', 513)}");
        Assert.Equal(["ok1", "ok2"], result.Valid);
        Assert.Equal(5, result.Invalid.Count);
        Assert.Equal(2, result.Invalid[0].Line);
        Assert.Equal(4, result.Invalid[1].Line);
        Assert.All(result.Invalid, i => Assert.False(string.IsNullOrEmpty(i.Reason)));
    }

    private const string Hex = "4082c170642739c5ffa4058d5d6010e51ba31f8756f5f158ac3d2ac17cfc856b";
    private const string Guid = "20a8d83d-22b2-462e-abf9-30d206bfa91f";

    [Fact]
    public void Parse_AcceptsReportedHexAndGuidTokens()
    {
        var result = CardTokenParser.Parse($"{Hex}\n{Guid}");
        Assert.Equal([Hex, Guid], result.Valid);
        Assert.Empty(result.Invalid);
    }

    [Theory]
    [InlineData("  {0}\t\r\n  {1}  \r\n")]
    [InlineData("\"{0}\"\r\n\"{1}\"")]
    [InlineData("\uFEFF{0}\u00A0\n\u200B{1}\u00A0")]
    [InlineData("{0}\t{1}")]
    [InlineData("{0} {1}")]
    [InlineData("'{0}',\u201C{1}\u201D")]
    public void Parse_HandlesExcelStylePadding(string template)
    {
        var result = CardTokenParser.Parse(string.Format(template, Hex, Guid));
        Assert.Equal([Hex, Guid], result.Valid);
        Assert.Empty(result.Invalid);
    }

    [Fact]
    public void Parse_GuidIsCaseInsensitiveAndDeduped()
    {
        var result = CardTokenParser.Parse($"{Guid}\n{Guid.ToUpperInvariant()}");
        Assert.Equal([Guid], result.Valid);
        Assert.Equal(1, result.Duplicates);
    }

    [Fact]
    public void Parse_MalformedValueExplainsWhy()
    {
        var result = CardTokenParser.Parse("a/b");
        Assert.Contains("'/'", result.Invalid.Single().Reason);
    }

    [Fact]
    public void Parse_AcceptsQuotedAndCommaSeparatedCsvInput()
    {
        var result = CardTokenParser.Parse($"\"{A}\",{B}");
        Assert.Equal([A, B], result.Valid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  \n ")]
    public void Parse_EmptyInput_ReturnsNothing(string? input)
    {
        var result = CardTokenParser.Parse(input);
        Assert.Empty(result.Valid);
        Assert.Empty(result.Invalid);
    }

    [Fact]
    public void IsValid_AcceptsAnyFormatButRejectsUrlUnsafeValues()
    {
        Assert.True(CardTokenParser.IsValid(A));
        Assert.True(CardTokenParser.IsValid("20a8d83d-22b2-462e-abf9-30d206bfa91f"));
        Assert.True(CardTokenParser.IsValid("x"));
        Assert.False(CardTokenParser.IsValid(""));
        Assert.False(CardTokenParser.IsValid("../" + A));
        Assert.False(CardTokenParser.IsValid("a b"));
        Assert.False(CardTokenParser.IsValid("a\\b"));
    }
}
