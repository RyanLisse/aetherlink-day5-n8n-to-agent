import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const labelsPath = path.resolve(process.argv[2] ?? path.join(packageDirectory, 'labels.json'));
const templatePath = path.join(packageDirectory, 'labels.template.json');
const answerKey = JSON.parse(readFileSync(path.join(packageDirectory, 'answer-key.json'), 'utf8'));
const LABELS = ['low', 'medium', 'high'];
const UNGRADED = ['MSG-10'];
const LESSONS = [
  { name: 'Lesson 1', range: 'MSG-01 to MSG-06', ids: ['MSG-01', 'MSG-02', 'MSG-03', 'MSG-04', 'MSG-05', 'MSG-06'] },
  { name: 'Lesson 3', range: 'MSG-01 to MSG-09', ids: Object.keys(answerKey.hashes) },
];

const hash = (id, label) => createHash(answerKey.algorithm).update(`${id}:${label}`).digest('hex');
const stop = (message) => {
  console.error(message);
  process.exit(2);
};

if (!existsSync(labelsPath)) {
  if (process.argv[2]) stop(`No labels file at ${labelsPath}.`);
  copyFileSync(templatePath, labelsPath);
  console.log('Created labels.json. Write low, medium or high for each message, then run npm run check again.');
  process.exit(1);
}

let labels;
try {
  labels = JSON.parse(readFileSync(labelsPath, 'utf8'));
} catch (error) {
  stop(`${path.basename(labelsPath)} is not valid JSON: ${error.message}`);
}
if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
  stop('labels.json must be a JSON object like {"MSG-01": "low"}.');
}

const results = new Map();
for (const [id, value] of Object.entries(labels)) {
  if (UNGRADED.includes(id)) {
    console.log(`${id} is not graded (information is missing); ignored.`);
    continue;
  }
  if (!(id in answerKey.hashes)) stop(`Unknown message ID: ${id}. Use MSG-01 to MSG-09.`);
  const label = typeof value === 'string' ? value.trim().toLowerCase() : value;
  if (label === '' || label === null) continue;
  if (!LABELS.includes(label)) stop(`Invalid label for ${id}: ${JSON.stringify(value)}. Use low, medium or high.`);
  const correct = hash(id, label) === answerKey.hashes[id];
  results.set(id, correct);
  console.log(`${id} ${correct ? 'correct' : 'revise'}`);
}

for (const lesson of LESSONS) {
  const matched = lesson.ids.filter((id) => results.get(id) === true).length;
  const verdict = matched === lesson.ids.length ? 'PASS' : 'REVISE';
  console.log(`${lesson.name} (${lesson.range}): ${matched}/${lesson.ids.length} ${verdict}`);
}

const lessonOnePass = LESSONS[0].ids.every((id) => results.get(id) === true);
const anyWrong = [...results.values()].includes(false);
process.exit(lessonOnePass && !anyWrong ? 0 : 1);
