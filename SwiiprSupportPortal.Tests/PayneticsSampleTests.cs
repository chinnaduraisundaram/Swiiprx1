using SwiiprSupportPortal;
using Xunit;

namespace SwiiprSupportPortal.Tests;

public class PayneticsSampleTests
{
    private const string Card = "CARD-A";

    // Sanitised copy of an original Paynetics response (card tokens replaced).
    private const string Sample = """
    {"code":0,"data":{"items":[
      {"token":"23fb77db-22e2-4cd7-a648-8171512ab3b5","execution_date":"2026-07-03T03:08:51+00:00","created_at":"2026-07-03T03:08:51+00:00","updated_on":"2026-07-03T03:13:58+00:00","fee":0,"status":1,"is_hidden":false,"linked_transaction":"d14bb8e4-a82b-4eca-990a-1ab3f03a2b7e","is_recurring":false,"is_initial_recurring":false,"external_identifier":"17692970346","external_link":"BNET-1","type":"presentment","original_amount":20,"original_currency":"EUR","is_paid":false,"merchant":"M1","account":"A1","balance":"B1","amount":20,"currency":"EUR","debit_credit":"debit","fx":1,"balance_before":0,"balance_after":0,"acquiring":{"card":"CARD-A"}},
      {"token":"55625b38-e986-4fff-b9c8-1f8c715b4cf4","created_at":"2026-07-01T18:02:16+00:00","updated_on":"2026-07-01T18:02:16+00:00","fee":0,"status":1,"is_hidden":false,"reference":"Welfare","is_recurring":false,"is_initial_recurring":false,"type":"internal-transfer","original_amount":20,"original_currency":"EUR","is_paid":false,"merchant":"M1","account":"A2","balance":"B2","amount":20,"currency":"EUR","debit_credit":"debit","fx":1,"balance_before":38033.18,"balance_after":38013.18,"counterpart":{"amount":20,"balance_after":20,"debit_credit":"credit","merchant":"M1","balance_before":0,"fx":1,"balance":"B1","currency":"EUR","card":"CARD-A","account":"A1"}}
    ],"total_items":2}}
    """;

    [Fact]
    public void OriginalPaynetics_UsesItemTokenAndMapsColumns()
    {
        var rows = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, Sample));
        Assert.Equal(2, rows.Count);

        var a = rows[0];
        Assert.Equal("23fb77db-22e2-4cd7-a648-8171512ab3b5", a[1]);
        Assert.Equal("2026-07-03T03:08:51+00:00", a[2]);
        Assert.Equal("2026-07-03T03:13:58+00:00", a[3]);
        Assert.Equal("presentment", a[10]);
        Assert.Equal("M1", a[14]);
        Assert.Equal("A1", a[15]);
        Assert.Equal("20", a[17]);
        Assert.Equal("debit", a[19]);
        Assert.Equal(string.Empty, a[32]); // acquiring.card is not the counterpart card
        Assert.Equal(string.Empty, a[33]); // no fallback note

        var b = rows[1];
        Assert.Equal("55625b38-e986-4fff-b9c8-1f8c715b4cf4", b[1]);
        Assert.Equal("Welfare", b[7]);
        Assert.Equal("Load", b[10]); // counterpart card == this card
        Assert.Equal("credit", b[25]);
        Assert.Equal("CARD-A", b[32]);
    }

    [Fact]
    public void PlatformWithoutToken_UsesFlaggedFallback_NeverMerchantAccountBalanceOrAcquiringCard()
    {
        const string json = """[{"external_identifier":"EXT1","merchant":"M1","account":"A1","balance":"B1","acquiring":{"card":"C"}}]""";
        var row = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, json)).Single();
        Assert.Equal("EXT1", row[1]);
        Assert.Contains("external_identifier", row[33]);

        const string none = """[{"merchant":"M1","account":"A1","balance":"B1","acquiring":{"card":"C"}}]""";
        var empty = CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, none)).Single();
        Assert.Equal(string.Empty, empty[1]);
    }

    [Theory]
    [InlineData("""[{"external_identifier":"E","external_link":"L","linked_transaction":"T"}]""", "E")]
    [InlineData("""[{"external_link":"L","linked_transaction":"T"}]""", "L")]
    [InlineData("""[{"linked_transaction":"T"}]""", "T")]
    public void FallbackOrder(string json, string expected) =>
        Assert.Equal(expected, CardTransactionsCsv.BuildRows(new CardFetchResult(Card, true, json)).Single()[1]);
}
