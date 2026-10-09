#!/usr/bin/env node

// Post-processes `tsc --module esnext --outDir dist/esm`: renames .js to .mjs, adds the file extensions
// Node's ESM resolver requires to relative specifiers, and writes the dist/index.mjs entry point.

const fs = require('fs');
const path = require('path');

const esmDir = path.join(__dirname, '..', 'dist', 'esm');

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

for (const file of listFiles(esmDir).filter((f) => f.endsWith('.js'))) {
  fs.renameSync(file, file.slice(0, -'.js'.length) + '.mjs');
}

const relativeImport = /(\bfrom\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;

for (const file of listFiles(esmDir).filter((f) => f.endsWith('.mjs'))) {
  const source = fs.readFileSync(file, 'utf8');
  const rewritten = source.replace(relativeImport, (match, lead, quote, specifier) => {
    const target = path.resolve(path.dirname(file), specifier);
    if (fs.existsSync(target + '.mjs')) {
      return `${lead}${quote}${specifier}.mjs${quote}`;
    }
    if (fs.existsSync(path.join(target, 'index.mjs'))) {
      return `${lead}${quote}${specifier}/index.mjs${quote}`;
    }
    return match;
  });

  if (rewritten !== source) {
    fs.writeFileSync(file, rewritten);
  }
}

fs.writeFileSync(
  path.join(esmDir, '..', 'index.mjs'),
  "export * from './esm/index.mjs';\nexport { default } from './esm/index.mjs';\n"
);
console.log('ESM build complete');
