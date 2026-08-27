# Roadmap

Haven is complete and usable as it stands: bank sync, the month projection,
budgets, planned purchases, investment tracking, learned category rules,
recurring suggestions, goals, outbound alerts, credit-card bills and a
30-day calendar are all implemented and tested. What follows has two
origins, kept separate on purpose. The first group was scoped and approved
in the original design and has now shipped. The second group came out of
reading the delivered code afterwards.

## Shipped from the original design

### Recurring-expense detection and learned category rules

`category_rules` are learned on `PATCH /transactions/:id/category` and applied
at sync wherever `customCategoryId` is still null. Recurring `matchPattern`
auto-links on sync. `GET /recurring/suggestions` proposes unregistered
monthly expenses; the user confirms before anything is created.

### Goals and an emergency-fund target

`goals` / `goal_contributions` plus a singleton `settings` row. The emergency
fund target is `emergency_fund_months` times recurring expense equivalents.
A planned monthly contribution is the only goal amount that enters the month
projection.

### Outbound alerts

Budget limit, large transaction, and connection error fire through an
`OutboundChannel` (`ALERT_CHANNEL=none|webhook|telegram`). `notifications`
dedupes successful sends.

### Credit-card bills and a 30-day calendar

`credit_card_bills` is keyed by the provider bill id. Remaining installments
are derived from stored `installment_number` / `installment_total`. `/calendario`
shows a rolling 30-day due list.

## Extensions identified after delivery

### Time-weighted investment returns

`summarizeInvestments` reports an absolute gain — current value minus invested
amount — per asset, per type and in total. Daily snapshots are already written
by the snapshot job and drive the history chart, but no return calculation
reads them, so a contribution made mid-period is indistinguishable from a
market move.

The extension computes a time-weighted return (and an internal rate of return
per asset) from the existing snapshot series plus a record of contributions and
withdrawals, which the schema does not currently keep.

### A second real provider

`BankDataProvider` has two implementations: `pluggy` for real Open Finance
Brasil connections and `mock` for the deterministic demo dataset. The
abstraction is therefore validated against exactly one live backend.

Adding a second real aggregator would be the honest test of the interface, and
would tell whether the provider-native id convention (`pluggy_*` columns,
meaning "the provider's own id") survives contact with a provider whose id
model differs.

### Browser-level end-to-end tests

`packages/web` is covered by three suites — the API client, the app shell and
the dashboard page — all running against a stubbed `fetch`. CI additionally
runs a Docker Compose smoke test that asserts the health, dashboard and SPA
endpoints respond. No test drives a real browser, so a routing or rendering
regression that survives a stubbed fetch would reach a deploy.

The extension is a Playwright suite against the demo dataset, which is
deterministic by construction and therefore safe to assert exact figures
against.
