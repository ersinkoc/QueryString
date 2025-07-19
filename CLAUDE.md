# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@oxog/querystring is a high-performance, type-safe query string parser and stringifier with zero runtime dependencies. It provides a modern alternative to packages like 'qs' and 'query-string' with enhanced security features, better performance, and a superior developer experience.

## Development Commands

### Build
```bash
npm run build         # Build both CommonJS and ESM outputs
npm run build:esm    # Build ESM output only
```

### Testing
```bash
npm test             # Run all tests with coverage (must achieve 90%+)
npm run test:watch   # Run tests in watch mode
jest parser.test.ts  # Run a specific test file
jest -t "parse"      # Run tests matching pattern
```

### Code Quality
```bash
npm run lint         # Run ESLint on src/**/*.ts
npm run format       # Format code with Prettier
```

### Performance
```bash
npm run benchmark    # Run performance benchmarks
```

### Publishing
```bash
npm run publish:check # Pre-flight checks before publishing
npm run publish:npm   # Interactive publish to npm
npm run publish:bump  # Bump version and publish
```

## Architecture Overview

### Core Module Structure

The codebase follows a modular architecture with clear separation of concerns:

1. **Parser Module** (`src/parser.ts`)
   - Implements `parse()` and `parseUrl()` functions
   - Handles multiple array formats (repeat, brackets, indices, comma, separator, json)
   - Supports dot notation, type coercion, and nested object parsing
   - Uses utility functions from `utils/` for encoding and object manipulation

2. **Stringifier Module** (`src/stringifier.ts`)
   - Implements `stringify()` and `stringifyUrl()` functions
   - Handles various serialization formats matching parser capabilities
   - Supports filtering, sorting, and custom encoding options
   - Works in tandem with parser for round-trip consistency

3. **QueryBuilder API** (`src/builder.ts`)
   - Provides fluent interface for building queries
   - Methods like `add()`, `addArray()`, `addObject()`, `merge()`, `transform()`
   - Supports conditional building with `when()` and `unless()`
   - Can be chained and converted to string or URL

4. **Schema Validation** (`src/schema.ts`)
   - Zod-like validation API with `q` namespace
   - Supports string, number, boolean, date, array, object, enum, union types
   - Chainable validators with transformations and refinements
   - `parse()` throws on error, `safeParse()` returns result object

5. **Security Layer** (`src/security.ts`)
   - `createSecureParser()` factory for DoS protection
   - `validateSecurity()` checks for prototype pollution, XSS
   - `sanitizeInput()` removes dangerous patterns
   - Configurable limits on keys, depth, and input patterns

6. **Plugin System** (`src/plugins.ts`)
   - `PluginManager` class manages plugin lifecycle
   - Hooks: `beforeParse`, `afterParse`, `beforeStringify`, `afterStringify`
   - Built-in plugins: timestamp, sortKeys, lowercase, filterEmpty, base64, compress, normalize
   - Plugins can be chained and composed

### Key Design Patterns

1. **Options Pattern**: All major functions accept comprehensive options objects
2. **Factory Pattern**: `createSecureParser()`, `createPlugin()` for customization
3. **Builder Pattern**: `QueryBuilder` for fluent API construction
4. **Plugin Architecture**: Extensible through hook-based system
5. **Type Safety**: Full TypeScript with generics, no `any` types allowed

### Critical Implementation Details

1. **Array Handling**: The parser and stringifier must handle array formats consistently. Default is 'repeat' format.

2. **Type Coercion**: When enabled, values are coerced based on content:
   - Numbers: Valid numeric strings → number
   - Booleans: 'true'/'false' → boolean
   - Dates: ISO date strings → Date objects

3. **Security Constraints**:
   - Default max keys: 1000
   - Default max depth: 5
   - Prototype pollution keys blocked: `__proto__`, `constructor`, `prototype`

4. **Plugin Integration**: The main export (`querystring`) wraps parser/stringifier with plugin support when `plugins` option is provided.

### Testing Requirements

- **90%+ code coverage** is mandatory (configured in jest.config.js)
- Tests are in `tests/unit/` for individual modules
- Integration tests in `tests/integration/` for end-to-end scenarios
- Each module has corresponding test file (e.g., `parser.ts` → `parser.test.ts`)

### Build Output

The package builds to `dist/` with:
- CommonJS output (`.js` files)
- ESM output (`.mjs` files)
- TypeScript declarations (`.d.ts` files)
- Source maps for debugging

### Common Development Tasks

When modifying the parser or stringifier:
1. Ensure round-trip consistency (parse → stringify → parse yields same result)
2. Update both unit and integration tests
3. Run benchmarks to verify performance hasn't degraded
4. Check that all array formats work correctly

When adding new features:
1. Add TypeScript types to `src/types/index.ts`
2. Consider security implications and add to security module if needed
3. Document in API.md if it's a public API change
4. Add examples to demonstrate usage

When creating plugins:
1. Use `createPlugin()` helper for consistency
2. Document hooks and behavior in PLUGINS.md
3. Add tests specifically for plugin behavior
4. Consider performance impact of plugin operations