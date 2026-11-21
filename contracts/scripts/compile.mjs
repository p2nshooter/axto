/** Kompilasi semua kontrak dengan solc-js (tanpa binari eksternal). Artefak → contracts/out/<Nama>.json */
import solc from 'solc';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.sol') ? [join(d, f)] : []));
const sources = Object.fromEntries(walk(SRC).map((f) => [f.slice(ROOT.length + 1), { content: readFileSync(f, 'utf8') }]));

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'paris',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};

function findImports(path) {
  for (const base of [join(ROOT, 'node_modules'), ROOT]) {
    const p = join(base, path);
    if (existsSync(p)) return { contents: readFileSync(p, 'utf8') };
  }
  return { error: `not found: ${path}` };
}

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (out.errors ?? []).filter((e) => e.severity === 'error');
for (const e of out.errors ?? []) console.error(e.formattedMessage);
if (errors.length) process.exit(1);
mkdirSync(join(ROOT, 'out'), { recursive: true });
let n = 0;
for (const [file, contracts] of Object.entries(out.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    if (!c.evm.bytecode.object) continue;
    writeFileSync(join(ROOT, 'out', `${name}.json`), JSON.stringify({ contractName: name, source: file, abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` }));
    n += 1;
    console.log(`${name}: ${c.evm.deployedBytecode.object.length / 2} B`);
  }
}
console.log(`${n} kontrak dikompilasi (solc ${solc.version()})`);
