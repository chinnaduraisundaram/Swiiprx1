using Xunit;

namespace SwiiprSupportPortal.Tests;

public class CardBalanceMapperTests
{
    // Sanitised sample of GET /v2.0/cardmanagement/card/{token}/balance.
    private const string Sample = """
        {"data":{"balances":[{"available":0,"blocked":0,"currency":"EUR","token":"cfa193b8-1f16-4cfc-8178-a3e6533a35fd","external_identifier":"365981280"}],"is_otp_sms_enabled":false,"status":"inactive","is_activated":true,"token":"298cd7d3-1068-4f88-861b-21aec9900e4b"},"code":0,"message":null,"errors":null}
        """;

    [Fact]
    public void Sample_MapsToOneRow()
    {
        var rows = CardBalanceMapper.Map(new CardFetchResult("card1", true, Sample));
        var r = Assert.Single(rows);
        Assert.Equal(new BalanceRow("card1", "inactive", "true", "false", "EUR", "0", "0",
            "cfa193b8-1f16-4cfc-8178-a3e6533a35fd", "365981280", ""), r);
    }

    [Fact]
    public void MultipleBalances_OneRowEach()
    {
        var json = """{"data":{"status":"active","isActivated":true,"balances":[{"available":10.5,"blocked":2,"currency":"EUR"},{"Available":3,"Blocked":0,"Currency":"GBP","ExternalIdentifier":"x"}]}}""";
        var rows = CardBalanceMapper.Map(new CardFetchResult("c", true, json));
        Assert.Equal(2, rows.Count);
        Assert.Equal("10.5", rows[0].Available);
        Assert.Equal("GBP", rows[1].Currency);
        Assert.Equal("x", rows[1].ExternalIdentifier);
        Assert.All(rows, r => Assert.Equal("active", r.Status));
    }

    [Fact]
    public void NoEnvelope_AndNoBalances_GivesOneRowWithEmptyBalanceColumns()
    {
        var rows = CardBalanceMapper.Map(new CardFetchResult("c", true, """{"status":"active","is_activated":false,"balances":[]}"""));
        var r = Assert.Single(rows);
        Assert.Equal("active", r.Status);
        Assert.Equal("false", r.IsActivated);
        Assert.Equal("", r.Currency);
    }

    [Fact]
    public void FailedOrInvalid_GivesRawResponseRow()
    {
        Assert.Equal("HTTP 401", Assert.Single(CardBalanceMapper.Map(new CardFetchResult("c", false, "HTTP 401"))).RawResponse);
        Assert.Equal("not json", Assert.Single(CardBalanceMapper.Map(new CardFetchResult("c", true, "not json"))).RawResponse);
    }

    [Fact]
    public void Csv_HeaderAndQuoting()
    {
        var csv = CardBalanceMapper.Build([new CardFetchResult("c1", true, Sample), new CardFetchResult("c\"2", false, "bad, \"raw\"")]);
        var lines = csv.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal("\"CardToken\",\"Status\",\"IsActivated\",\"IsOtpSmsEnabled\",\"Currency\",\"Available\",\"Blocked\",\"BalanceToken\",\"ExternalIdentifier\",\"RawResponse\"", lines[0]);
        Assert.Equal("\"c1\",\"inactive\",\"true\",\"false\",\"EUR\",\"0\",\"0\",\"cfa193b8-1f16-4cfc-8178-a3e6533a35fd\",\"365981280\",\"\"", lines[1]);
        Assert.Equal("\"c\"\"2\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"bad, \"\"raw\"\"\"", lines[2]);
    }
}
