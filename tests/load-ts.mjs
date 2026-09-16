import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const cache = new Map();
export function loadTs(relative) {
  const filename = resolve(relative);
  if (cache.has(filename)) return cache.get(filename);
  const result = { exports: {} };
  cache.set(filename, result.exports);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (name) =>
    name.startsWith('@/') ? loadTs(name.slice(2) + '.ts') : require(name);
  new Function('require', 'module', 'exports', output)(localRequire, result, result.exports);
  return result.exports;
}
