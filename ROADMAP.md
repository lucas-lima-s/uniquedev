# Roadmap

Haven is complete and usable as it stands: every screen is implemented, the
sync path is idempotent, and the projection engine is fully tested. Nothing
below is a missing piece of the current product — each item is a deliberate
extension, listed with the state it would replace so the gap is verifiable in
the code rather than implied.

## Rule-based auto-categorization

A transaction's category today comes from the provider (`pluggy_category`) or
from a manual assignment through `PATCH /transactions/:id`. There is no rule
engine: a recurring merchant has to be categorized by hand every month.

The extension is a `category_rules` table matched against the description and
the provider category at sync time, applied only where the user has not set a
category explicitly, so a manual assignment always wins over a rule.

## Time-weighted investment returns

`summarizeInvestments` reports an absolute gain — current value minus invested
amount — per asset, per type and in total. Daily snapshots are already written
by the snapshot job and drive the history chart, but no return calculation
reads them, so a contribution made mid-period is indistinguishable from a
market move.

The extension computes a time-weighted return (and an internal rate of return
per asset) from the existing snapshot series plus a record of contributions and
withdrawals, which the schema does not currently keep.

## A second real provider

`BankDataProvider` has two implementations: `pluggy` for real Open Finance
Brasil connections and `mock` for the deterministic demo dataset. The
abstraction is therefore validated against exactly one live backend.

Adding a second real aggregator would be the honest test of the interface, and
would tell whether the provider-native id convention (`pluggy_*` columns,
meaning "the provider's own id") survives contact with a provider whose id
model differs.

## Browser-level end-to-end tests

`packages/web` is covered by three suites — the API client, the app shell and
the dashboard page — all running against a stubbed `fetch`. CI additionally
runs a Docker Compose smoke test that asserts the health, dashboard and SPA
endpoints respond. No test drives a real browser, so a routing or rendering
regression that survives a stubbed fetch would reach a deploy.

The extension is a Playwright suite against the demo dataset, which is
deterministic by construction and therefore safe to assert exact figures
against.

## Budget and commitment alerts

Budget usage and open commitments are computed by the projection engine and
shown on the dashboard, which means they are only seen when the app is opened.
There is no notification path of any kind in the codebase.

The extension is an opt-in notification when a budget crosses a threshold or
when the month's open commitments exceed projected income — delivered through a
generic outbound webhook rather than a built-in email or push integration, to
keep the single-host deployment free of new infrastructure.
