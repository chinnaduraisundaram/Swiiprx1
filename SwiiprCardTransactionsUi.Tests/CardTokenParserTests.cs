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
    public void Parse_FlagsInvalidFormats()
    {
        var result = CardTokenParser.Parse($"short\n{new string('g', 64)}\n{A}x\n{A}");
        Assert.Equal([A], result.Valid);
        Assert.Equal(3, result.Invalid.Count);
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
    public void IsValid_Requires64HexChars()
    {
        Assert.True(CardTokenParser.IsValid(A));
        Assert.False(CardTokenParser.IsValid(A[..63]));
        Assert.False(CardTokenParser.IsValid("../" + A));
    }
}
