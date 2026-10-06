import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateAnswers, loadGateSpec } from '../src/evaluate.mjs';

const spec = loadGateSpec();
const sample = JSON.parse(fs.readFileSync(new URL('../examples/synthetic-workflow.json', import.meta.url), 'utf8'));

test('spec contains exactly seven unique gates', () => {
  assert.equal(spec.gates.length, 7);
  assert.equal(new Set(spec.gates.map((gate) => gate.id)).size, 7);
  assert.equal(new Set(spec.gates.map((gate) => gate.name)).size, 7);
});

test('spec preserves the no-score and no-authorization boundary', () => {
  assert.equal(spec.boundary.trust_score, false);
  assert.equal(spec.boundary.certification, false);
  assert.equal(spec.boundary.testing_authorization, false);
  assert.equal(spec.boundary.network_requests, 0);
});

test('synthetic example produces four unresolved gates', () => {
  const result = evaluateAnswers(sample, spec);
  assert.equal(result.explicit_yes_gates, 3);
  assert.equal(result.unresolved_gates.length, 4);
  assert.deepEqual(
    result.unresolved_gates.map((item) => item.gate),
    ['Evidence Before Effect', 'Freshness', 'External confirmation', 'Recovery']
  );
  assert.equal(result.boundary.trust_score, false);
  assert.equal(result.boundary.testing_authorization, false);
});

test('missing or invalid answers fail closed', () => {
  const broken = structuredClone(sample);
  delete broken.answers.freshness;
  assert.throws(() => evaluateAnswers(broken, spec), /Invalid or missing answer for freshness/);
});
