import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../.factory/copy-audit.md', import.meta.url), 'utf8');
const banned = ['leverage', 'seamless', 'effortless', 'robust', 'powerful', 'intuitive', 'reimagine', 'supercharge', 'unlock', 'delightful', 'journey', 'ecosystem', 'ai-powered'];
const rows = source.split('\n').flatMap((line) => {
  const match = line.match(/^\| `(.+)` \| (\d+) \| Pass \|$/);
  return match ? [{ copy: match[1], expected: Number(match[2]) }] : [];
});

if (rows.length < 40) throw new Error('Copy audit is incomplete.');
for (const row of rows) {
  const words = row.copy.match(/[\p{L}\p{N}]+(?:[–-][\p{L}\p{N}]+)*/gu) ?? [];
  if (words.length !== row.expected) throw new Error(`Count mismatch: "${row.copy}" is ${words.length}, not ${row.expected}.`);
  if (words.length > 22) throw new Error(`Copy exceeds 22 words: "${row.copy}".`);
  const lower = row.copy.toLowerCase();
  const found = banned.find((word) => lower.includes(word));
  if (found) throw new Error(`Banned word "${found}" appears in: "${row.copy}".`);
}

console.log(`Copy audit passed for ${rows.length} landing-page lines.`);
