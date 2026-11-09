using System.Net;
using SwiiprSupportPortal;
using Xunit;

namespace SwiiprSupportPortal.Tests;

public class CardGroupsUpdaterTests
{
    // Fake values only; never use real Paynetics credentials in tests.
    private static readonly PayneticsOptions Fake = new() { BaseUrl = "https://paynetics.invalid", ApiKey = "fake-key", ClientSecret = "fake-secret" };

    private sealed class Stub(Func<HttpRequestMessage, string?, (HttpStatusCode, string)> respond) : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string? Body, Dictionary<string, string> Headers)> Calls { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            Calls.Add((request.Method, request.RequestUri!.ToString(), body, request.Headers.ToDictionary(h => h.Key, h => h.Value.First())));
            var (status, text) = respond(request, body);
            return new HttpResponseMessage(status) { Content = new StringContent(text) };
        }
    }

    private static (CardGroupsUpdater, Stub) Make(Func<HttpRequestMessage, string?, (HttpStatusCode, string)> respond, PayneticsOptions? o = null)
    {
        var stub = new Stub(respond);
        return (new CardGroupsUpdater(new HttpClient(stub) { BaseAddress = new Uri("https://paynetics.invalid/") }, o ?? Fake, () => 1700000000), stub);
    }

    [Fact]
    public void Hmac_matches_rfc4231_test_case_2()
    {
        Assert.Equal("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843", PayneticsHmac.Hash("what do ya want for nothing?", "Jefe"));
    }

    [Fact]
    public void Headers_hash_apikey_timestamp_method_and_payload()
    {
        var h = PayneticsHmac.BuildHeaders("k", "s", "{\"a\":1}", "card_groups", 1700000000);
        Assert.Equal("k", h["x-api-key"]);
        Assert.Equal("1700000000", h["x-timestamp"]);
        Assert.Equal(PayneticsHmac.Hash("k1700000000card_groups{\"a\":1}", "s"), h["x-hash"]);
        Assert.Equal(h["x-hash"], h["x-hash"].ToLowerInvariant());
    }

    [Fact]
    public void Update_body_is_the_exact_compact_json()
    {
        Assert.Equal("{\"usage\":\"\",\"fees\":\"\",\"schedule_fees\":\"\",\"web_service_fees\":\"\",\"limits\":\"\",\"linkage\":\"\",\"mcc\":\"\"}", CardGroupsUpdater.UpdateBody);
    }

    [Fact]
    public async Task Happy_path_does_get_put_get_and_signs_the_put_with_the_body()
    {
        int gets = 0;
        var (u, stub) = Make((r, _) => r.Method == HttpMethod.Get ? (HttpStatusCode.OK, ++gets == 1 ? "before" : "after") : (HttpStatusCode.OK, "ok"));
        var res = await u.ProcessAsync("tok-1", false, default);
        Assert.Equal("updated", res.Status);
        Assert.Equal("before", res.Before);
        Assert.Equal("after", res.After);
        Assert.Equal([HttpMethod.Get, HttpMethod.Put, HttpMethod.Get], stub.Calls.Select(c => c.Method));
        Assert.All(stub.Calls, c => Assert.EndsWith("v2/cards/tok-1/groups", c.Url));
        Assert.Equal(CardGroupsUpdater.UpdateBody, stub.Calls[1].Body);
        Assert.Equal(PayneticsHmac.Hash("fake-key1700000000card_groups" + CardGroupsUpdater.UpdateBody, "fake-secret"), stub.Calls[1].Headers["x-hash"]);
        Assert.Equal(PayneticsHmac.Hash("fake-key1700000000card_groups", "fake-secret"), stub.Calls[0].Headers["x-hash"]);
    }

    [Fact]
    public async Task Dry_run_only_performs_the_get()
    {
        var (u, stub) = Make((_, _) => (HttpStatusCode.OK, "groups"));
        var res = await u.ProcessAsync("tok", true, default);
        Assert.Equal("dry-run", res.Status);
        Assert.Single(stub.Calls);
    }

    [Fact]
    public async Task Get_with_11000_is_skipped_without_put()
    {
        var (u, stub) = Make((_, _) => (HttpStatusCode.OK, "{\"code\":11000}"));
        var res = await u.ProcessAsync("tok", false, default);
        Assert.Equal("skipped", res.Status);
        Assert.Single(stub.Calls);
    }

    [Fact]
    public async Task Get_non_2xx_fails_without_put()
    {
        var (u, stub) = Make((_, _) => (HttpStatusCode.NotFound, "nope"));
        var res = await u.ProcessAsync("tok", false, default);
        Assert.Equal("failed", res.Status);
        Assert.Single(stub.Calls);
    }

    [Fact]
    public async Task Put_with_11000_is_skipped_even_on_2xx_and_no_second_get()
    {
        var (u, stub) = Make((r, _) => r.Method == HttpMethod.Get ? (HttpStatusCode.OK, "before") : (HttpStatusCode.OK, "11000"));
        var res = await u.ProcessAsync("tok", false, default);
        Assert.Equal("skipped", res.Status);
        Assert.Equal(2, stub.Calls.Count);
    }

    [Fact]
    public async Task Put_non_2xx_fails()
    {
        var (u, stub) = Make((r, _) => r.Method == HttpMethod.Get ? (HttpStatusCode.OK, "before") : (HttpStatusCode.BadRequest, "bad"));
        var res = await u.ProcessAsync("tok", false, default);
        Assert.Equal("failed", res.Status);
        Assert.Equal(2, stub.Calls.Count);
    }

    [Fact]
    public void Merge_prefers_request_values_and_falls_back_to_server()
    {
        var m = PayneticsOptions.Merge(Fake, "  https://other.invalid ", "req-key", "  ");
        Assert.Equal("https://other.invalid", m.BaseUrl);
        Assert.Equal("req-key", m.ApiKey);
        Assert.Equal("fake-secret", m.ClientSecret);
        var none = PayneticsOptions.Merge(new PayneticsOptions(), null, null, null);
        Assert.False(none.IsConfigured);
        Assert.True(PayneticsOptions.Merge(new PayneticsOptions(), null, "a", "b").IsConfigured);
    }

    [Fact]
    public async Task Missing_credentials_fail_without_calling_upstream()
    {
        var (u, stub) = Make((_, _) => (HttpStatusCode.OK, "x"), new PayneticsOptions());
        var res = await u.ProcessAsync("tok", false, default);
        Assert.Equal("failed", res.Status);
        Assert.Empty(stub.Calls);
    }

    [Fact]
    public async Task Unsafe_token_is_rejected()
    {
        var (u, stub) = Make((_, _) => (HttpStatusCode.OK, "x"));
        Assert.Equal("failed", (await u.ProcessAsync("a/b", false, default)).Status);
        Assert.Empty(stub.Calls);
    }

    [Fact]
    public async Task Result_never_contains_credentials()
    {
        var (u, _) = Make((_, _) => (HttpStatusCode.OK, "groups"));
        var json = System.Text.Json.JsonSerializer.Serialize(await u.ProcessAsync("tok", true, default));
        Assert.DoesNotContain("fake-secret", json);
        Assert.DoesNotContain("fake-key", json);
    }
}
