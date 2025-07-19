#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Pre-publish checks for @oxog/querystring\n');

const errors = [];
const warnings = [];

// Check 1: Package.json validity
console.log('📋 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  
  // Required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'types', 'author', 'license'];
  requiredFields.forEach(field => {
    if (!packageJson[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Check package name
  if (packageJson.name !== '@oxog/querystring') {
    errors.push(`Package name should be '@oxog/querystring', found: ${packageJson.name}`);
  }
  
  // Check files field
  if (!packageJson.files || !packageJson.files.includes('dist')) {
    warnings.push('dist folder not included in files field');
  }
  
  console.log('✅ package.json is valid');
} catch (error) {
  errors.push(`Invalid package.json: ${error.message}`);
}

// Check 2: Build files
console.log('\n📦 Checking build files...');
const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/index.mjs',
  'README.md',
  'LICENSE',
  'CHANGELOG.md'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${file}`);
  }
});

// Check 3: Dependencies
console.log('\n📚 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
  warnings.push(`Found runtime dependencies: ${Object.keys(packageJson.dependencies).join(', ')}. This should be a zero-dependency package.`);
}

// Check 4: Git status
console.log('\n🗂️ Checking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (gitStatus.trim()) {
    warnings.push('Uncommitted changes found:\n' + gitStatus);
  }
} catch (error) {
  warnings.push('Unable to check git status');
}

// Check 5: npm registry
console.log('\n🌐 Checking npm registry...');
try {
  const npmUser = execSync('npm whoami', { encoding: 'utf-8' }).trim();
  console.log(`✅ Logged in as: ${npmUser}`);
  
  // Check if user has access to @oxog scope
  try {
    execSync('npm access ls-packages @oxog', { encoding: 'utf-8' });
    console.log('✅ Access to @oxog scope confirmed');
  } catch (error) {
    warnings.push('No access to @oxog scope. You may need to request access or create the scope.');
  }
} catch (error) {
  errors.push('Not logged in to npm. Run `npm login` first.');
}

// Check 6: Test coverage
console.log('\n🧪 Checking test coverage...');
try {
  const coverageFile = path.join(__dirname, '../coverage/coverage-final.json');
  if (fs.existsSync(coverageFile)) {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverage).forEach(file => {
      Object.values(file.s || {}).forEach(count => {
        totalStatements++;
        if (count > 0) coveredStatements++;
      });
    });
    
    const coveragePercent = ((coveredStatements / totalStatements) * 100).toFixed(2);
    console.log(`✅ Test coverage: ${coveragePercent}%`);
    
    if (coveragePercent < 95) {
      warnings.push(`Test coverage (${coveragePercent}%) is below recommended 95%`);
    }
  } else {
    warnings.push('No coverage report found. Run tests first.');
  }
} catch (error) {
  warnings.push('Unable to check test coverage');
}

// Check 7: TypeScript compilation
console.log('\n🔧 Checking TypeScript build...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  errors.push('TypeScript compilation errors found');
}

// Results
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTS\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Ready to publish.');
} else {
  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Please fix errors before publishing.');
    process.exit(1);
  }
}

console.log('\n💡 To publish, run: npm run publish:npm');
process.exit(0);