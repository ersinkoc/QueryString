# Publishing Scripts

This directory contains scripts to help publish @oxog/querystring to npm.

## Scripts

### publish.js
Interactive script for publishing to npm with the following features:
- Checks npm authentication (login or token)
- Runs tests before publishing
- Supports dry run
- Creates git tags
- Handles version bumping
- Updates CHANGELOG.md

**Usage:**
```bash
# Normal publish
npm run publish:npm

# Publish with version bump
npm run publish:bump
```

### pre-publish-check.js
Pre-flight checks before publishing:
- Validates package.json
- Checks for required files
- Verifies build output
- Checks git status
- Validates npm access
- Reports test coverage
- TypeScript compilation check

**Usage:**
```bash
npm run publish:check
```

## Publishing Workflow

1. **Pre-publish check**
   ```bash
   npm run publish:check
   ```

2. **Bump version (if needed)**
   ```bash
   npm run publish:bump
   ```

3. **Publish to npm**
   ```bash
   npm run publish:npm
   ```

## Authentication

The publish script supports two authentication methods:

1. **Interactive login**
   - Choose option 1 when prompted
   - Enter npm credentials

2. **Auth token**
   - Choose option 2 when prompted
   - Provide your npm auth token
   - Get token from: https://www.npmjs.com/settings/[username]/tokens

## First Time Publishing

For first time publishing to @oxog scope:

1. Create the scope (if not exists):
   ```bash
   npm login --scope=@oxog
   ```

2. Ensure package.json has correct scope:
   ```json
   {
     "name": "@oxog/querystring"
   }
   ```

3. Run the publish script:
   ```bash
   npm run publish:npm
   ```