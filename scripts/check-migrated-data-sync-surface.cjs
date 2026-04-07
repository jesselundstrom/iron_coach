const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const forbiddenPatterns = [
  ".from('profiles')",
  '.from("profiles")',
  "table: 'profiles'",
  'table: "profiles"',
  'fetchLegacyProfileBlob',
  'applyLegacyProfileBlob',
  'pushLegacyProfileBlob',
];

const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredSuffixes = ['.d.ts'];
const failures = [];

function shouldScan(filePath) {
  if (ignoredSuffixes.some((suffix) => filePath.endsWith(suffix))) return false;
  return allowedExtensions.has(path.extname(filePath));
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!shouldScan(fullPath)) continue;
    scanFile(fullPath);
  }
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    forbiddenPatterns.forEach((pattern) => {
      if (!line.includes(pattern)) return;
      failures.push({
        filePath,
        lineNumber: index + 1,
        pattern,
        line: line.trim(),
      });
    });
  });
}

walk(srcDir);

if (!failures.length) {
  console.log('Migration guardrail passed: no forbidden data-sync blob patterns found in src/.');
  process.exit(0);
}

console.error('Migration guardrail failed. Migrated data-sync surfaces must not reintroduce profiles blob access:');
failures.forEach((failure) => {
  const relativePath = path.relative(rootDir, failure.filePath).replace(/\\/g, '/');
  console.error(
    `- ${relativePath}:${failure.lineNumber} matched "${failure.pattern}" -> ${failure.line}`
  );
});
process.exit(1);
