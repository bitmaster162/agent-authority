# BitEvo Agent Authority

Public reference package for BitEvo's seven-gate Agent Authority & Evidence model.

This repository is bound to the BitEvo source revision:

- repository: `bitmaster162/bitevo-agent-site`
- commit: `314f75a8bfd373ee5f0fa378d0ad2afad518a3e9`
- tree: `326ef5c262fe441370f7c02aa025d014dadbd235`
- gate source: `src/pages/diagnostic.astro`

## Seven gates

1. Authority Budget
2. Object binding
3. Authority owner
4. Evidence Before Effect
5. Freshness
6. External confirmation
7. Recovery

These are BitEvo working gates for examining one action-capable workflow. They are not presented as an external standard or as a universal security model.

## What the reference package does

- publishes the seven gate questions and rationales in `spec/gates.json`;
- accepts one local JSON answer document with `YES / NO / UNKNOWN` for every gate;
- fails closed on a missing or invalid gate answer;
- emits unresolved `NO / UNKNOWN` gates as a local decision-gap record;
- includes one explicitly synthetic example;
- includes deterministic tests using the Node.js standard library;
- exposes the same evaluator through the `bitevo-precheck` GitHub Action without adding network calls or target-system authority.

## Boundary

The package does **not**:

- produce a trust or safety score;
- certify a workflow or organization;
- grant testing authorization;
- claim that passing seven gates proves security;
- execute external actions;
- contact network services;
- request credentials;
- modify a target system.

Written scope and Rules of Engagement remain separate from this public reference.

## Local use

Requires a current Node.js runtime. The package has no third-party runtime dependencies.

```sh
npm test
npm run check:sample
```

The sample command reads `examples/synthetic-workflow.json` and prints a local JSON decision-gap record to stdout.


## GitHub Action: `bitevo-precheck`

The repository-root `action.yml` wraps the same deterministic evaluator for CI.

The required `answers_path` must resolve to a regular file inside `GITHUB_WORKSPACE`. The action accepts only the existing `bitevo.agent-authority.answers.v1` schema and the existing `YES / NO / UNKNOWN` gate states.

Default behavior is **report-only** for valid inputs: `NO` and `UNKNOWN` remain unresolved decision gaps and are emitted as outputs and in the step summary. Set `fail_on_unresolved: "true"` only when the calling repository explicitly wants unresolved gates to fail that CI step.

Example:

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@<immutable-commit-sha>
  - uses: bitmaster162/agent-authority@<reviewed-ref>
    with:
      answers_path: path/to/authority-answers.json
      fail_on_unresolved: "false"
```

The Action does not require a token, secret, network request, deployment permission or write permission. A zero unresolved count is not a security certification and does not grant testing authorization.

## Files

- `spec/gates.json` — seven source-bound gates and their questions/rationales.
- `src/evaluate.mjs` — deterministic local evaluator.
- `examples/synthetic-workflow.json` — synthetic worked input only.
- `action.yml` — GitHub Action metadata for `bitevo-precheck`.
- `src/action.mjs` — workspace-bound GitHub Action wrapper.
- `test/gates.test.mjs` — regression tests for gate count, boundaries and fail-closed input handling.
- `test/action.test.mjs` — regression tests for Action outputs, strict/report-only modes and workspace binding.
- `PROVENANCE.md` — source binding for this package.

## Publication boundary

No license has been selected. The `bitevo-precheck` Action is a local/deterministic wrapper around the same seven-gate evaluator; it does not add a trust score, certification, testing authorization or external execution path.

Any later licensing choice, Marketplace publication, release/tag, site cross-link, branch-protection rule or repository setting change requires its own reviewed change and applicable owner gate.
