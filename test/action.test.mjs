import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const actionPath = path.join(repoRoot, 'src', 'action.mjs');
const sample = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'examples', 'synthetic-workflow.json'), 'utf8')
);

function makeWorkspace(document = sample) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bitevo-precheck-'));
  const workspace = path.join(root, 'workspace');
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, 'answers.json'), JSON.stringify(document, null, 2));
  return { root, workspace };
}

function runAction({ document = sample, strict = 'false', answersPath = 'answers.json', setup } = {}) {
  const { root, workspace } = makeWorkspace(document);
  if (setup) setup({ root, workspace });

  const output = path.join(root, 'output.txt');
  const summary = path.join(root, 'summary.md');
  const result = spawnSync(process.execPath, [actionPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_WORKSPACE: workspace,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
      INPUT_ANSWERS_PATH: answersPath,
      INPUT_FAIL_ON_UNRESOLVED: strict
    }
  });

  return {
    ...result,
    output: fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '',
    summary: fs.existsSync(summary) ? fs.readFileSync(summary, 'utf8') : '',
    root,
    workspace
  };
}

test('report-only mode emits four unresolved gates without failing', () => {
  const result = runAction();
  assert.equal(result.status, 0);
  assert.match(result.output, /explicit_yes_gates=3/);
  assert.match(result.output, /unresolved_count=4/);
  assert.match(
    result.output,
    /unresolved_ids=evidence_before_effect,freshness,external_confirmation,recovery/
  );
  assert.match(result.summary, /no trust score, no certification, no testing authorization/);
});

test('strict mode fails on unresolved gates after emitting outputs', () => {
  const result = runAction({ strict: 'true' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Strict mode: 4 unresolved gate/);
  assert.match(result.output, /unresolved_count=4/);
});

test('all YES remains successful in strict mode and does not claim security', () => {
  const allYes = structuredClone(sample);
  for (const key of Object.keys(allYes.answers)) allYes.answers[key] = 'YES';
  const result = runAction({ document: allYes, strict: 'true' });
  assert.equal(result.status, 0);
  assert.match(result.output, /explicit_yes_gates=7/);
  assert.match(result.output, /unresolved_count=0/);
  assert.match(result.summary, /This does not prove security/);
});

test('invalid or missing schema fails closed', () => {
  const broken = structuredClone(sample);
  delete broken.schema;
  const result = runAction({ document: broken });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid or missing schema/);
});

test('missing gate answer fails closed', () => {
  const broken = structuredClone(sample);
  delete broken.answers.freshness;
  const result = runAction({ document: broken });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid or missing answer for freshness/);
});

test('invalid strict-mode value fails closed', () => {
  const result = runAction({ strict: 'sometimes' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /fail_on_unresolved must be true or false/);
});

test('answers_path cannot escape GITHUB_WORKSPACE', () => {
  const result = runAction({
    answersPath: '../outside.json',
    setup: ({ root }) => {
      fs.writeFileSync(path.join(root, 'outside.json'), JSON.stringify(sample));
    }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must resolve inside GITHUB_WORKSPACE/);
});

test('answers_path cannot escape GITHUB_WORKSPACE through a symlink', () => {
  const result = runAction({
    answersPath: 'linked/outside.json',
    setup: ({ root, workspace }) => {
      const outsideDir = path.join(root, 'outside');
      fs.mkdirSync(outsideDir);
      fs.writeFileSync(path.join(outsideDir, 'outside.json'), JSON.stringify(sample));
      fs.symlinkSync(
        outsideDir,
        path.join(workspace, 'linked'),
        process.platform === 'win32' ? 'junction' : 'dir'
      );
    }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must resolve inside GITHUB_WORKSPACE/);
});

test('action metadata preserves report-only default and Node 20 runtime', () => {
  const metadata = fs.readFileSync(path.join(repoRoot, 'action.yml'), 'utf8');
  assert.match(metadata, /fail_on_unresolved:/);
  assert.match(metadata, /default: "false"/);
  assert.match(metadata, /using: "node20"/);
  assert.match(metadata, /main: "src\/action\.mjs"/);
});
