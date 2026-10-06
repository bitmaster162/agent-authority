import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAnswers } from './evaluate.mjs';

const EXPECTED_SCHEMA = 'bitevo.agent-authority.answers.v1';
const here = path.dirname(fileURLToPath(import.meta.url));

function requireInput(env, name) {
  const value = env[`INPUT_${name}`];
  if (!value || !value.trim()) {
    throw new Error(`Missing required action input: ${name.toLowerCase()}`);
  }
  return value.trim();
}

function parseBooleanInput(value, name) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === '' || normalized === 'false') return false;
  if (normalized === 'true') return true;
  throw new Error(`${name} must be true or false`);
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function resolveBoundInput(workspace, inputPath) {
  const workspaceReal = fs.realpathSync(workspace);
  const candidate = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(workspaceReal, inputPath);

  if (!fs.existsSync(candidate)) {
    throw new Error(`Answer document not found: ${inputPath}`);
  }

  const candidateReal = fs.realpathSync(candidate);
  if (!isInside(workspaceReal, candidateReal)) {
    throw new Error('answers_path must resolve inside GITHUB_WORKSPACE');
  }

  const stat = fs.statSync(candidateReal);
  if (!stat.isFile()) {
    throw new Error('answers_path must resolve to a regular file');
  }

  return candidateReal;
}

function appendOutput(env, name, value) {
  const outputPath = env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${name}=${value}\n`, 'utf8');
}

function appendSummary(env, result) {
  const summaryPath = env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const lines = [
    '### BitEvo pre-check',
    '',
    `- Explicit YES gates: ${result.explicit_yes_gates}/7`,
    `- Unresolved gates: ${result.unresolved_gates.length}`,
    '- Boundary: no trust score, no certification, no testing authorization.',
    ''
  ];

  if (result.unresolved_gates.length === 0) {
    lines.push('No unresolved gates are present in this input. This does not prove security.');
  } else {
    lines.push('| Gate | Answer |');
    lines.push('| --- | --- |');
    for (const item of result.unresolved_gates) {
      lines.push(`| ${item.gate} | ${item.answer} |`);
    }
  }

  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

export function runAction(env = process.env) {
  const workspace = path.resolve(env.GITHUB_WORKSPACE || process.cwd());
  const answersPath = requireInput(env, 'ANSWERS_PATH');
  const failOnUnresolved = parseBooleanInput(env.INPUT_FAIL_ON_UNRESOLVED, 'fail_on_unresolved');
  const resolvedInput = resolveBoundInput(workspace, answersPath);

  const document = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
  if (document?.schema !== EXPECTED_SCHEMA) {
    throw new Error(`Invalid or missing schema; expected ${EXPECTED_SCHEMA}`);
  }

  const result = evaluateAnswers(document);
  const unresolvedIds = result.unresolved_gates.map((item) => item.id).join(',');

  appendOutput(env, 'explicit_yes_gates', result.explicit_yes_gates);
  appendOutput(env, 'unresolved_count', result.unresolved_gates.length);
  appendOutput(env, 'unresolved_ids', unresolvedIds);
  appendSummary(env, result);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (failOnUnresolved && result.unresolved_gates.length > 0) {
    process.stderr.write(
      `Strict mode: ${result.unresolved_gates.length} unresolved gate(s); failing the step.\n`
    );
    return 1;
  }

  return 0;
}

function main() {
  try {
    process.exitCode = runAction(process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`bitevo-precheck: ${message}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(here, 'action.mjs')) {
  main();
}
