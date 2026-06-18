# 02 — Investigate the need

Dig the idea down to its root **before** proposing any shape. This is the brainstorm *with*
the user — a real enquiry, run entirely through `AskUserQuestion`, where the options are
the hypotheses you advance. Deep on substance, light on form.

## Inputs
- `idea` (required) — the raw idea, from `load-state`.
- `brief`, `personas`, `north_star` (optional) — context to anchor and orient the enquiry.

## Outputs

A clear understanding of the need (held for `propose-shape`, not necessarily printed):

```
job: "<the real job the user is trying to get done>"
root_pain: "<the root pain, past the surface symptom>"
expected_outcome: "<what changes for the user when it works>"
current_workaround: "<what they do today>"
```

## Depends on
- `load-state`

## Process
1. Read `reference/shaping-playbook.md`.
2. **Dig via AskUserQuestion, 1–2 questions at a time.** Each question advances the enquiry
   *and* contributes: its options are plausible hypotheses you put forward (the user clicks
   instead of writing). Always leave "Other" open; use `multiSelect` when several answers
   can hold. Adapt the next question to the answer — chase the root, don't run a fixed
   questionnaire. In the background lean on Jobs To Be Done (context · job · outcome ·
   pain · workaround), "5 whys", and job-adjacency (the job right before/after) — **never
   name them on screen**. When personas/brief exist, anchor the questions on them.
3. **Stop when the need is net** — the root job, the root pain, and the expected outcome
   are clear — or when the user clicks "propose now". Do not over-interrogate.

## Test

LLM assertion: the enquiry runs through `AskUserQuestion` with options that are real
hypotheses (not hollow), digs past the first surface answer toward a root job/pain, and
never surfaces framework names, scores, or a value hypothesis. Jumping straight to a
feature shape without digging fails this action.
