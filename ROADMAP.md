# Roadmap

Haven is complete and usable as it stands: bank sync, the month projection,
budgets, planned purchases and investment tracking are all implemented and
tested. What follows has two origins, kept separate on purpose. The first
group was scoped and approved in the original design and simply never got
built. The second group came out of reading the delivered code afterwards.
Each item names the state it would replace, so the gap is verifiable in the
code rather than implied.

## Approved in the original design, not yet built

### Recurring-expense detection and learned category rules

A transaction's category today comes from the provider (`pluggy_category`) or
from a manual assignment through `PATCH /transactions/:id`. There is no rule
engine, so a recurring merchant has to be categorized by hand every month, and
a monthly bill that is not registered as a recurring entry stays invisible to
the projection until someone notices.

The design called for two halves that reinforce each other: a `category_rules`
table (pattern, category, priority) applied at sync time only where no manual
category exists, with a rule learned automatically when a transaction is
recategorized by hand; and a detector that reads transaction history to
suggest recurring entries the user has not registered yet.

### Goals and an emergency-fund target

There is no notion of saving toward anything. The projection answers "what does
this month look like" and stops there.

The design called for a `goals` table (name, kind `goal` or `emergency_fund`,
target amount, optional deadline, optional linked account) with
`goal_contributions` recording deposits, plus a settings-backed
`emergency_fund_months` factor: the emergency-fund target is that factor times
the sum of the recurring expense entries, so it moves on its own as the cost of
living changes instead of being a number typed once and forgotten.

### Outbound alerts

Budget usage, large transactions and a broken bank connection are all visible
in the app, which means they are only seen when the app is opened. There is no
notification path of any kind in the codebase.

The design called for three triggers — a budget crossing its limit, a single
transaction above a configurable threshold, and a connection entering an error
state — delivered to an outbound channel, with a `notifications` table
recording what was sent so an alert never fires twice, and a `settings` table
holding the threshold and the channel target.

### Credit-card bills and a 30-day calendar

The `transactions` table already carries `installment_number` and
`installment_total` from the provider's credit-card metadata, but nothing reads
them: an installment purchase made outside the planned-purchases flow is not
projected forward, and there is no bill-level view at all.

The design called for a `credit_card_bills` table keyed by the provider's bill
id (due date, total, status), the remaining installments derived from the
metadata already stored, and a rolling 30-day calendar of what falls due.

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
