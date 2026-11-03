# Swiipr Support Portal

Multi-task airline support portal. Home page (animated take-off/landing hero) plus task pages; the first task is **Card Transactions Export** (`/card-transactions.html`).

**Adding a task:** build a page under `wwwroot/`, then add an entry to `wwwroot/js/tasks.js` (id, title, category, href, icon, description). The home dashboard and grouping come from this registry; set `nav: true` to pin it in the menu.

**Tools:** Card Transactions Export (platform API), Bulk Token Utilities, CSV Viewer/Cleaner, JWT Decoder (client-side only, nothing uploaded or stored), Production Release Checklist (ticks saved in localStorage) and Support Runbook & FAQ. Pure logic for the utilities is in `wwwroot/js/utils.js` (tests: `npm test`). Layout lives in `js/layout.js`, styles in `css/site.css`.

Transaction token column: matched case-insensitively, ignoring `_`/`-`, in this order: `token`, `transactionToken`, `transactionId`, `transactionReference`, `id`; then a nested `transaction.{id|token}`; then any property whose name contains `transaction` + (`id`|`token`); finally any property ending in `id` (excluding card/account/merchant/counterpart/user/customer). Numbers and GUIDs are accepted. If the column is still empty, use **Show raw** on a token's row (or **Copy raw JSON**) to see the real field names. As a flagged last resort (no token/id field at all) `external_identifier`, `external_link`, then `linked_transaction` are used and the RawResponse column says so; `merchant`/`account`/`balance`/`acquiring.card` are never used. Items are found in `data.items`, `data`, `items`, a bare array, or the first array of objects at the root/`data`. Suggested repo name: `swiipr-airline-support-portal`.

## Card transactions export

Small ASP.NET Core (.NET 10) app + static front-end. You sign in with Azure AD B2C (MSAL browser, auth-code + PKCE), paste/upload card tokens, and it calls the SwiiprX platform endpoint
`GET https://api.swiiprx.com/v2.0/cardmanagement/card/{cardToken}/transaction` (platform -> Paynetics, so your blocked IP is not involved) and exports one combined CSV.

CSV output replicates `PayneticsCardTransactionsExport` (`SwiiprProdSupportApp`): same 34 columns/order, every value double-quoted with `"` doubled, `internal-transfer` mapped to `Load`/`Unload` by comparing the counterpart card to the card token, dates/values emitted exactly as returned (no reformatting), and a row with only `CardToken` + `RawResponse` for failed cards or responses without items.

## Status and Balance Check

`/card-balance.html` (nav: Status and Balance Check) calls `GET https://api.swiiprx.com/v2.0/cardmanagement/card/{cardToken}/balance` through the same-origin proxy `/api/cards/{cardToken}/balance` (same auth, token list, concurrency, retries/backoff and Retry-After handling as the transactions export). One CSV row per balance (a card with no balances gets one row with empty balance columns; failed fetches get a `RawResponse` row). Header: `CardToken,Status,IsActivated,IsOtpSmsEnabled,Currency,Available,Blocked,BalanceToken,ExternalIdentifier,RawResponse`, all values quoted. Field names are matched case-insensitively ignoring `_`/`-`, and the `data` envelope is optional. The page shows chips (cards per status, available per currency) and highlights non-active cards or `blocked > 0`. Mapper: `CardBalanceMapper.cs`; helpers: `wwwroot/js/balance.js`.

## Design

- `wwwroot/` - vanilla JS UI. MSAL handles login, token cache (sessionStorage) and silent renewal (`acquireTokenSilent` before every request; one forced refresh on 401). If silent renewal needs interaction, you are told to sign in again and use **Retry failed**.
- Manual bearer token: the optional **Bearer token** box (masked by default, Show/Clear buttons) takes a pasted JWT (a leading `Bearer ` is stripped). When filled it is used instead of B2C login, so no B2C configuration is needed. It lives only in a JS variable (never in storage, never logged, lost on reload) and is sent only to the local proxy. Its `exp` claim is checked client-side and an expired token stops the run with a clear message.
- Fetching: configurable concurrency (default 4), retries with exponential backoff + jitter on network errors/429/5xx (honours `Retry-After`, default 4 retries), per-token status (pending/running/success/failed), progress bar, cancel, retry-failed.
- Same-origin proxy (`/api/cards/{token}/transactions`): the platform API's CORS policy for `localhost` is unknown, so calls go through the local server, which forwards your `Authorization` header unchanged. Nothing is stored or logged; no secrets exist in the app. Tokens may be any length/format; they are normalised (trim, quotes, NBSP/zero-width chars) and rejected only if empty, over 512 chars, or containing whitespace or `/ \ ? # %` (the token is URL-escaped when forwarded).
- `CardTransactionsCsv` / `CardTokenParser` (C#) hold the CSV and parsing logic, exposed as `/api/export` and `/api/tokens/parse`.

## Configuration

`appsettings.json` (override via environment variables, user-secrets or `appsettings.Local.json`, which is git-ignored):

| Setting (env var) | Meaning |
|---|---|
| `AzureAdB2C:ClientId` (`AzureAdB2C__ClientId`) | **Required.** SPA app registration client ID |
| `AzureAdB2C:Scopes` (`AzureAdB2C__Scopes`) | **Required.** Full scope URI(s), space/comma separated, e.g. `https://<tenant>.onmicrosoft.com/<api-app-id>/access_as_user` (plain `access_as_user` is not enough for B2C) |
| `AzureAdB2C:RedirectUri` | Default `http://localhost:5173/` |
| `AzureAdB2C:Authority` / `Policy` | Default `https://login.swiiprx.com/eecea696-0f67-4e65-a017-34650c9ab7b1/v2.0/` / `B2C_1_Swiiprx_User` |
| `PlatformApi:BaseUrl` | Default `https://api.swiiprx.com` |
| `Fetch:MaxConcurrency`, `Fetch:MaxRetries` | Defaults 4 / 4 |
| `Session:TimeoutMinutes`, `Session:WarningMinutes` | Idle timeout on the Card Export page (default 60 min, `0` disables) and the "Stay signed in" warning shown before it (default 5 min). On expiry the pasted JWT, card tokens and results are cleared, the account is signed out locally and a "Session expired" dialog is shown. Running fetches count as activity. |
| `Urls` | Default `http://localhost:5173` |

## Run

```powershell
cd SwiiprSupportPortal
npm install            # copies msal-browser.min.js into wwwroot/lib
$env:AzureAdB2C__ClientId = "<client id>"
$env:AzureAdB2C__Scopes   = "<full scope uri for access_as_user>"
dotnet run
```

Open http://localhost:5173/, sign in, paste tokens, **Fetch transactions**, **Download CSV** (or the per-row **CSV** button).

## Tests

```powershell
dotnet test          # C# tests, from the repo root (SwiiprSupportPortal.sln)
cd SwiiprSupportPortal; npm test   # JS tests for bearer-token handling
```

## B2C requirements

- The app registration used must be a **Single-page application** with redirect URI `http://localhost:5173/` (exactly `AzureAdB2C:RedirectUri`) added under the SPA platform (needed for auth-code + PKCE). Add the deployed URL too if hosted elsewhere.
- It must be allowed to request the `access_as_user` API permission (admin-consented) and be enabled on the `B2C_1_Swiiprx_User` user flow.
- If the login domain blocks it, `login.swiiprx.com` is passed as a known authority.

## Differences / assumptions vs. the Paynetics response

The platform response schema was not available, so the mapper is tolerant: it reads `data.items`, `data` (array), `items`, or a bare array; field names are matched as Paynetics snake_case first, then case/underscore-insensitive (`createdAt`, `CreatedAt`). Differences from the reference:

- Success is HTTP 2xx (the reference required Paynetics `code == 0`).
- No `/v2/transactions/1/1000?show_hidden=true` paging params: the platform endpoint takes only the card token, so volume/hidden-transaction coverage depends on the platform.
- `type == internal-transfer` -> `Load`/`Unload` relies on `counterpart.card` being present in the platform payload; if the platform omits it, such rows will read `Unload`.
- If the platform renames fields, those columns will be empty (raw JSON is not kept for success rows) - adjust the keys in `CardTransactionsCsv.ItemRow`.
- The console export writes to a fixed folder with CRLF newlines on Windows; here the CSV is downloaded and uses the server's `Environment.NewLine`.

