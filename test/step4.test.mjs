import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const check = (file) => spawnSync(process.execPath, ['check.mjs', file], { encoding: 'utf8' });

test('Step 4: npm run check prints the acceptance lines and exits 1 until labels are filled in', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'w4-check-'));
  try {
    const labels = path.join(dir, 'labels.json');
    copyFileSync('labels.template.json', labels);
    const result = check(labels);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Lesson 1 \(MSG-01 to MSG-06\): 0\/6 REVISE/);
    assert.match(result.stdout, /Lesson 3 \(MSG-01 to MSG-09\): 0\/9 REVISE/);

    writeFileSync(labels, JSON.stringify({ 'MSG-01': 'urgent' }));
    assert.equal(check(labels).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
