const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(
  repoRoot,
  'node_modules',
  '@supabase',
  'supabase-js',
  'dist',
  'umd',
  'supabase.js'
);
const vendoredPath = path.join(repoRoot, 'public', 'vendor', 'supabase.js');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  fail(`Missing installed Supabase UMD bundle at ${sourcePath}`);
}

if (!fs.existsSync(vendoredPath)) {
  fail(`Missing vendored Supabase bundle at ${vendoredPath}`);
}

const installed = fs.readFileSync(sourcePath, 'utf8');
const vendored = fs.readFileSync(vendoredPath, 'utf8');

if (installed !== vendored) {
  fail(
    'Vendored Supabase bundle is out of sync with node_modules/@supabase/supabase-js/dist/umd/supabase.js'
  );
}

console.log('Vendored Supabase bundle matches installed package.');
