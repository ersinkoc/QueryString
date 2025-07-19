#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function publish() {
  console.log('🚀 @oxog/querystring Publisher\n');

  try {
    // Check if dist folder exists
    if (!fs.existsSync(path.join(__dirname, '../dist'))) {
      console.log('❌ dist folder not found. Building project...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Run tests
    console.log('\n📋 Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log('✅ All tests passed!\n');
    } catch (error) {
      console.error('❌ Tests failed. Please fix tests before publishing.');
      process.exit(1);
    }

    // Check npm login status
    console.log('🔐 Checking npm authentication...');
    try {
      const user = execSync('npm whoami', { encoding: 'utf-8' }).trim();
      console.log(`✅ Logged in as: ${user}\n`);
    } catch (error) {
      console.log('❌ Not logged in to npm\n');
      
      const authMethod = await question('Choose authentication method:\n1. Login with username/password\n2. Use auth token\n\nEnter choice (1 or 2): ');
      
      if (authMethod === '1') {
        console.log('\n📝 Please login to npm:');
        execSync('npm login', { stdio: 'inherit' });
      } else if (authMethod === '2') {
        const token = await question('\n🔑 Enter your npm auth token: ');
        execSync(`npm config set //registry.npmjs.org/:_authToken ${token}`);
        console.log('✅ Token configured\n');
      } else {
        console.log('❌ Invalid choice');
        process.exit(1);
      }
    }

    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    console.log(`\n📦 Package: ${packageJson.name}`);
    console.log(`📌 Version: ${packageJson.version}`);
    console.log(`📄 License: ${packageJson.license}`);
    console.log(`👤 Author: ${packageJson.author}`);

    // Check if package already exists
    console.log('\n🔍 Checking npm registry...');
    try {
      const npmInfo = execSync(`npm view ${packageJson.name} version`, { encoding: 'utf-8' }).trim();
      console.log(`⚠️  Package already exists on npm with version: ${npmInfo}`);
      
      if (npmInfo === packageJson.version) {
        console.log('❌ Same version already published. Please bump version in package.json');
        process.exit(1);
      }
    } catch (error) {
      console.log('✅ Package not found on npm (first publish)');
    }

    // Dry run
    const dryRun = await question('\n🧪 Do a dry run first? (y/n): ');
    if (dryRun.toLowerCase() === 'y') {
      console.log('\n🏃 Running dry run...');
      execSync('npm publish --dry-run', { stdio: 'inherit' });
    }

    // Confirm publish
    const confirm = await question('\n🚀 Ready to publish to npm? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Publishing cancelled');
      process.exit(0);
    }

    // Add tag option
    const tag = await question('\n🏷️  Publish with tag (leave empty for latest): ');
    
    // Publish
    console.log('\n📤 Publishing to npm...');
    const publishCmd = tag ? `npm publish --tag ${tag}` : 'npm publish';
    execSync(publishCmd, { stdio: 'inherit' });

    console.log('\n✅ Successfully published!');
    console.log(`\n📦 Install with: npm install ${packageJson.name}`);
    console.log(`🌐 View on npm: https://www.npmjs.com/package/${packageJson.name}`);

    // Git tag suggestion
    const gitTag = await question('\n🏷️  Create git tag for this release? (y/n): ');
    if (gitTag.toLowerCase() === 'y') {
      execSync(`git tag v${packageJson.version}`, { stdio: 'inherit' });
      console.log(`✅ Git tag v${packageJson.version} created`);
      
      const pushTag = await question('📤 Push tag to origin? (y/n): ');
      if (pushTag.toLowerCase() === 'y') {
        execSync(`git push origin v${packageJson.version}`, { stdio: 'inherit' });
        console.log('✅ Tag pushed to origin');
      }
    }

    console.log('\n🎉 All done!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Version bump helper
async function bumpVersion() {
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log(`\n📌 Current version: ${packageJson.version}`);
  const bumpType = await question('Choose version bump:\n1. Patch (x.x.X)\n2. Minor (x.X.0)\n3. Major (X.0.0)\n4. Custom\n\nEnter choice (1-4): ');
  
  let newVersion;
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  
  switch (bumpType) {
    case '1':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    case '2':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case '3':
      newVersion = `${major + 1}.0.0`;
      break;
    case '4':
      newVersion = await question('Enter new version: ');
      break;
    default:
      console.log('❌ Invalid choice');
      process.exit(1);
  }
  
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Version bumped to ${newVersion}`);
  
  // Update CHANGELOG
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    const updateChangelog = await question('\n📝 Update CHANGELOG.md? (y/n): ');
    if (updateChangelog.toLowerCase() === 'y') {
      const changes = await question('Enter changes for this version: ');
      const date = new Date().toISOString().split('T')[0];
      const changelogContent = fs.readFileSync(changelogPath, 'utf8');
      const newEntry = `\n## [${newVersion}] - ${date}\n\n### Changed\n- ${changes}\n`;
      const updatedChangelog = changelogContent.replace('## [1.0.0]', newEntry + '\n## [1.0.0]');
      fs.writeFileSync(changelogPath, updatedChangelog);
      console.log('✅ CHANGELOG.md updated');
    }
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--bump') || args.includes('-b')) {
    await bumpVersion();
  }
  
  await publish();
}

main().catch(console.error);