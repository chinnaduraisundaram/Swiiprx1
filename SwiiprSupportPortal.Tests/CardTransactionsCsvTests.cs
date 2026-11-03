using SwiiprSupportPortal;
using Xunit;

namespace SwiiprSupportPortal.Tests;

public class CardTransactionsCsvTests
{
    private static readonly string Card = new('a', 64);
    private static readonly string NL = Environment.NewLine;

    [Fact]
    public void Header_HasThirtyFourColumnsInReferenceOrder()
    {
        var cols = CardTransactionsCsv.Header.Split(',');
        Assert.Equal(34, cols.Length);
        Assert.Equal("CardToken", cols[0]);
        Assert.Equal("Type", cols[10]);
        Assert.Equal("CounterpartCard", cols[32]);
        Assert.Equal("RawResponse", cols[33]);
    }

    [Fact]
    public void Success_MapsFieldsInOrder_AllValuesQuoted()
    {
        const string json = """
        {"code":0,"data":{"items":[{"token":"t1","created_at":"2025-01-02T03:04:05Z","updated_on":"2025-01-03","fee":"0.5","status":"completed",
        "is_hidden":false,"reference":"ref","is_recurring":false,"is_initial_recurring":false,"type":"purchase","original_amount":"10.00",
        "original_currency":"USD","is_paid":true,"merchant":"Shop","account":"acc","balance":100,"amount":9.5,"currency":"EUR",
        "debit_credit":"debit","fx":1.1,"balance_before":109.5,"balance_after":100}]}}
        """;
        var csv = CardTransactionsCsv.Build([new CardFetchResult(Card, true, json)]);
        var lines = csv.Split(NL, StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length);
        Assert.Equal(CardTransactionsCsv.Header, lines[0]);
        var expected = string.Join(",", new[]
        {
            Card, "t1", "2025-01-02T03:04:05Z", "2025-01-03", "0.5", "completed", "False", "ref", "False", "False", "purchase",
            "10.00", "USD", "True", "Shop", "acc", "100", "9.5", "EUR", "debit", "1.1", "109.5", "100",
            "", "", "", "", "", "", "", "", "", "", "",
        }.Select(v => $"\"{v}\""));
        Assert.Equal(expected, lines[1]);
    }

    [Fact]
    public void InternalTransfer_BecomesLoadWhenCounterpartCardIsThisCard_OtherwiseUnload()
    {
        string Item(string cpCard) =>
            $$$"""{"data":{"items":[{"token":"x","type":"internal-transfer","counterpart":{"amount":"5","card":"{{{cpCard}}}","currency":"EUR"}}]}}""";

        var load = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, Item(Card.ToUpperInvariant()))).Single();
        var unload = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, Item("other"))).Single();

        Assert.Equal("Load", load[10]);
        Assert.Equal("Unload", unload[10]);
        Assert.Equal("5", load[23]);
        Assert.Equal("EUR", load[30]);
        Assert.Equal("other", unload[32]);
    }

    [Fact]
    public void Failure_WritesCardTokenAndRawResponseOnly()
    {
        var row = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, false, "HTTP 500")).Single();
        Assert.Equal(34, row.Length);
        Assert.Equal(Card, row[0]);
        Assert.Equal("HTTP 500", row[33]);
        Assert.All(row[1..33], v => Assert.Equal(string.Empty, v));
    }

    [Theory]
    [InlineData("""{"code":0,"data":{}}""")]
    [InlineData("""{"hello":"world"}""")]
    public void SuccessWithoutItems_WritesRawResponseRow(string body)
    {
        var row = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, body)).Single();
        Assert.Equal(body, row[33]);
    }

    [Fact]
    public void InvalidJson_WritesParserMessageAsRawResponse()
    {
        var row = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, "not json")).Single();
        Assert.Equal(Card, row[0]);
        Assert.NotEmpty(row[33]);
    }

    [Fact]
    public void PlatformShapes_BareArrayAndCamelCase_AreSupported()
    {
        const string json = """[{"token":"t9","createdAt":"2025-05-05","debitCredit":"credit"}]""";
        var row = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, json)).Single();
        Assert.Equal("t9", row[1]);
        Assert.Equal("2025-05-05", row[2]);
        Assert.Equal("credit", row[19]);
    }

    [Theory]
    [InlineData("""[{"transactionToken":"tx1"}]""")]
    [InlineData("""[{"transaction_token":"tx1"}]""")]
    [InlineData("""{"data":{"items":[{"transactionId":"tx1"}]}}""")]
    [InlineData("""[{"id":"tx1","token":null}]""")]
    public void TransactionToken_AcceptsPlatformAliases(string json)
    {
        var row = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, json)).Single();
        Assert.Equal("tx1", row[1]);
    }

    [Fact]
    public void MultipleItemsAndCards_ProduceOneHeaderAndAllRows()
    {
        const string json = """{"data":{"items":[{"token":"1"},{"token":"2"}]}}""";
        var csv = CardTransactionsCsv.Build([
            new CardFetchResult(Card, true, json),
            new CardFetchResult(new string('b', 64), false, "err"),
        ]);
        Assert.Equal(4, csv.Split(NL, StringSplitOptions.RemoveEmptyEntries).Length);
    }

    [Fact]
    public void Quote_EscapesQuotesCommasAndNewlines()
    {
        Assert.Equal("\"a\"\"b\"", CardTransactionsCsv.Quote("a\"b"));
        Assert.Equal("\"a,b\"", CardTransactionsCsv.Quote("a,b"));
        Assert.Equal("\"\"", CardTransactionsCsv.Quote(null));

        var csv = CardTransactionsCsv.Build([new CardFetchResult(Card, false, "line1\nline \"2\", x")]);
        Assert.Contains("\"line1\nline \"\"2\"\", x\"", csv);
    }
}
