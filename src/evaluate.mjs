import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(here, '../spec/gates.json');

export function loadGateSpec() {
  return JSON.parse(fs.readFileSync(specPath, 'utf8'));
}

export function evaluateAnswers(document, spec = loadGateSpec()) {
  const allowed = new Set(spec.states);
  const answers = document?.answers ?? {};
  const results = spec.gates.map((gate) => {
    const answer = answers[gate.id];
    if (!allowed.has(answer)) {
      throw new Error(`Invalid or missing answer for ${gate.id}; expected YES, NO or UNKNOWN`);
    }
    return { id: gate.id, gate: gate.name, answer, rationale: gate.rationale };
  });

  const explicit = results.filter((item) => item.answer === 'YES');
  const unresolved = results.filter((item) => item.answer !== 'YES');

  return {
    schema: 'bitevo.agent-authority.decision-gap.v1',
    boundary: {
      trust_score: false,
      certification: false,
      testing_authorization: false
    },
    workflow: document.workflow ?? null,
    example_class: document.example_class ?? null,
    explicit_yes_gates: explicit.length,
    unresolved_gates: unresolved
  };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node src/evaluate.mjs <answers.json>');
    process.exitCode = 2;
    return;
  }
  const document = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  const result = evaluateAnswers(document);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
