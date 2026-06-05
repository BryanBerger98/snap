# Technical concerns playbook — the NFR grid

NFR = non-functional requirements: what isn't a visible feature but still decides whether
the product holds up. Run this **per specified `Now` feature**, right after `spec-feature`.
Output = append-only decisions (`ADR-*`) + a coverage checklist. For each axis, decide:
**treated** (→ an ADR), **not concerned** (with a one-line reason), or **to-dig**.

## The five axes
- **Security** — authn/authz (who can do what), injection surfaces (SQL/command/XSS),
  secrets handling, sensitive inputs, third-party trust. What's the worst an attacker
  does here?
- **Resilience** — load expectations, failure modes, recovery (retries, idempotence,
  timeouts), degraded behaviour. What happens when a dependency is down?
- **Data protection** — what personal/sensitive data is touched, where it lives,
  retention, consent, deletion, regulatory exposure (e.g. GDPR/RGPD).
- **Performance** — latency targets, payload/scale, hot paths, caching, N+1 risks. What's
  the budget, and what blows it?
- **Dependencies** — new libraries/services introduced, their maturity/maintenance,
  licence, supply-chain risk, lock-in.

## Method
1. Walk each axis against the feature's user flow. Most axes get one or two real
   questions — don't pad.
2. A real choice with trade-offs → write an `ADR-*` (context · decision · alternatives ·
   consequences), linked to the feature (`related`). Append-only.
3. An axis with nothing to decide → mark **not concerned** with a reason. Never skip an
   axis silently.
4. Emit the coverage checklist (one line per axis) into the run summary.

## Quality bar
Every axis explicitly addressed (treated or justified N/A). A silently-skipped axis fails
this pass. ADRs stay journal-short, one decision each.
