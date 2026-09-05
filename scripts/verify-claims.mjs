import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const claims = JSON.parse(await readFile(new URL('../.factory/claims.json', import.meta.url), 'utf8'));
const failures = [];

for (const claim of claims) {
  console.log(`\n[claim:${claim.id}] ${claim.claim}`);
  console.log(`$ ${claim.test}`);
  const result = spawnSync(claim.test, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) failures.push(claim.id);
}

if (failures.length > 0) {
  throw new Error(`Claim checks failed: ${failures.join(', ')}`);
}

console.log(`\nAll ${claims.length} declared claim commands passed.`);
