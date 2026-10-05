# BitEvo Agent Authority

Public B9 baseline for BitEvo's seven-gate Agent Authority & Evidence model.

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

## Scope

The model asks whether the consequential action is explicit, bound to the intended object, owned by a defined authority, supported by required evidence before effect, checked for freshness, independently confirmed after effect, and routed into a defined constrained or recovery state when evidence becomes uncertain.

A gate may be explicit, unresolved, or contradicted. Missing evidence is not converted into a positive result.

## Boundary

This repository baseline does **not**:

- produce a trust or safety score;
- certify a workflow or organization;
- grant testing authorization;
- claim that passing seven gates proves security;
- execute external actions;
- contact network services;
- request credentials;
- modify a target system.

Written scope and Rules of Engagement remain separate from this public reference.

## Publication state

This first public baseline intentionally contains only this README. No license, package, evaluator, example payload, GitHub Action, branch-protection rule, or site integration is established by this commit.

Any later implementation, licensing choice, `bitevo-precheck` GitHub Action, site cross-link, or repository setting change is separate work and requires its own reviewed change and applicable owner gate.
