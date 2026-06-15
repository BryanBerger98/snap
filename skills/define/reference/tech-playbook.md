# De-risk playbook — the four big risks + ethical

The old `tech-review` only asked "can we build it?" (feasibility). Products die more
often on **value** and **viability** than on feasibility, so this pass covers all five
risk types (Cagan's four big risks + ethical). Run it **per specified `Now` feature**,
right after `spec-feature`. Output = append-only decisions (`ADR-*`, each with a
`risk_type`) + a risk register. For each risk type, decide: an **ADR** (a real choice
with trade-offs), an **assumption to test** (with a success criterion), or **N/A**
(with a one-line reason). Never skip a type silently.

## The five risk types

- **R1 — Value** *(`risk_type: value`)*: will they actually use or buy it? Is the
  evidence real user behaviour, or only stakeholder opinion? A feature nobody pulls is
  the most expensive thing to build. Tie back to a 🟢 persona pain.
- **R2 — Usability** *(`risk_type: usability`)*: can the target persona figure it out
  without help — discover it, understand it, complete the flow, recover from errors?
  Accessibility (a11y) and localisation belong here.
- **R3 — Feasibility** *(`risk_type: feasibility`)*: can we build it with our tech,
  skills and constraints? **This is where the old NFR grid lives** — walk each axis
  against the feature's user flow:
  - **Security** — authn/authz (who can do what), injection surfaces (SQL/command/XSS),
    secrets handling, sensitive inputs, third-party trust. Worst an attacker does here?
  - **Resilience** — load, failure modes, recovery (retries, idempotence, timeouts),
    degraded behaviour. What happens when a dependency is down?
  - **Data protection** — what personal/sensitive data is touched, where it lives,
    retention, consent, deletion. *(Regulatory exposure also feeds R4.)*
  - **Performance** — latency targets, payload/scale, hot paths, caching, N+1 risks.
    What's the budget, and what blows it?
  - **Dependencies** — new libraries/services, their maturity/maintenance, licence,
    supply-chain risk, lock-in.
- **R4 — Viability** *(`risk_type: viability`)*: does it work for the *business*? Legal,
  finance/cost, compliance & data protection (RGPD), brand, sales/go-to-market,
  partnerships. Easy to skip for internal tools — don't.
- **R5 — Ethical** *(`risk_type: ethical`)*: harm, privacy, fairness/bias, manipulation
  (dark patterns / perverse incentives), exclusion. Name the way this could hurt someone.

## Method
1. Run the engine loop (PROPOSE → TRIAGE → DIG → GATE, `reference/interview-engine.md`)
   over the five risk types. Most risks get one or two real questions — don't pad.
2. A real choice with trade-offs → write an `ADR-*` (context · decision · alternatives ·
   consequences) with its `risk_type`, linked to the feature (`related`). Append-only.
3. A risk you can't resolve yet → frame it as an **assumption to test**: "We believe…;
   we'll know it's true when…". A risk with nothing to decide → mark **N/A** with a
   reason. Never skip a type silently.
4. Emit the risk register (one line per type) and roll up every 🔴 assumption from the
   earlier phases into the consolidated register.

## Quality bar
No risk left "unknown" — each of the five is an ADR, a scheduled test, or a justified
N/A. Value answered by user evidence, not "we asked stakeholders". ADRs stay
journal-short, one decision each, every one carrying a valid `risk_type`.
