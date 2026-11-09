// Fails the build if Arabic text appears outside src/i18n (UI text must use t(); comments must be English).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ALLOWED_PREFIX = join('src', 'i18n') + (process.platform === 'win32' ? '\\' : '/');
const ARABIC = /[\u0600-\u06FF]/;
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name) || full.startsWith(ALLOWED_PREFIX)) continue;
    readFileSync(full, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (ARABIC.test(line)) offenders.push(`${relative('.', full)}:${i + 1}: ${line.trim()}`);
      });
  }
}

walk('src');

if (offenders.length > 0) {
  console.error('Arabic text found outside src/i18n (use t() for UI text, English for comments):\n' + offenders.join('\n'));
  process.exit(1);
}
console.log('i18n check passed');
