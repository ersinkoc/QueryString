# @oxog/querystring

[![npm version](https://img.shields.io/npm/v/@oxog/querystring.svg)](https://www.npmjs.com/package/@oxog/querystring)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-green.svg)]()

High-performance, type-safe query string parser and stringifier with zero dependencies. Built from the ground up to surpass existing solutions in performance, security, and developer experience.

## Features

- 🚀 **Blazing Fast** - 2x faster than popular alternatives
- 🔒 **Security First** - Built-in XSS and prototype pollution protection
- 📦 **Zero Dependencies** - No external runtime dependencies
- 🎯 **Full TypeScript Support** - Complete type definitions with generics
- 🔧 **Flexible Array Formats** - Multiple array serialization options
- 🏗️ **QueryBuilder API** - Fluent interface for building queries
- 📐 **Schema Validation** - Runtime type validation with detailed errors
- 🔌 **Plugin System** - Extensible architecture
- 🛡️ **Security Features** - DoS protection, input sanitization
- 📋 **100% Test Coverage** - Comprehensive test suite
- 🎨 **Multiple Formats** - CommonJS and ESM support

## Installation

```bash
npm install @oxog/querystring
```

```bash
yarn add @oxog/querystring
```

```bash
pnpm add @oxog/querystring
```

## Quick Start

```typescript
import querystring from '@oxog/querystring';

// Parse a query string
const parsed = querystring.parse('name=John&age=30&tags=js&tags=ts');
console.log(parsed);
// { name: 'John', age: '30', tags: ['js', 'ts'] }

// Stringify an object
const stringified = querystring.stringify({ 
  name: 'John', 
  age: 30,
  tags: ['js', 'ts'] 
});
console.log(stringified);
// 'name=John&age=30&tags=js&tags=ts'
```

## API Reference

### Parse

```typescript
querystring.parse(query: string, options?: ParseOptions): ParsedQuery
```

#### ParseOptions

- `delimiter` (string): Delimiter to use (default: '&')
- `depth` (number): Maximum object depth (default: 5)
- `arrayFormat` (string): How to parse arrays (default: 'repeat')
- `parseNumbers` (boolean): Parse numeric values (default: false)
- `parseBooleans` (boolean): Parse boolean values (default: false)
- `parseDates` (boolean): Parse ISO date strings (default: false)
- `allowDots` (boolean): Enable dot notation (default: false)
- `decode` (boolean): Decode values (default: true)
- `charset` ('utf-8' | 'iso-8859-1'): Character encoding

#### Examples

```typescript
// Parse with type coercion
const result = querystring.parse('page=1&limit=10&active=true', {
  parseNumbers: true,
  parseBooleans: true
});
// { page: 1, limit: 10, active: true }

// Parse with dot notation
const result = querystring.parse('user.name=John&user.age=30', {
  allowDots: true
});
// { user: { name: 'John', age: '30' } }

// Parse arrays with different formats
const result = querystring.parse('tags[]=js&tags[]=ts', {
  arrayFormat: 'brackets'
});
// { tags: ['js', 'ts'] }
```

### Stringify

```typescript
querystring.stringify(obj: object, options?: StringifyOptions): string
```

#### StringifyOptions

- `delimiter` (string): Delimiter to use (default: '&')
- `encode` (boolean): Encode values (default: true)
- `encodeValuesOnly` (boolean): Only encode values, not keys
- `arrayFormat` (string): How to stringify arrays
- `indices` (boolean): Include array indices
- `sort` (boolean | function): Sort keys
- `filter` (array | function): Filter keys
- `skipNulls` (boolean): Skip null values
- `addQueryPrefix` (boolean): Add '?' prefix
- `allowDots` (boolean): Use dot notation
- `charset` ('utf-8' | 'iso-8859-1'): Character encoding
- `format` ('RFC1738' | 'RFC3986'): URI encoding format

#### Examples

```typescript
// Stringify with array format
const result = querystring.stringify(
  { tags: ['js', 'ts', 'node'] },
  { arrayFormat: 'brackets' }
);
// 'tags[]=js&tags[]=ts&tags[]=node'

// Stringify with custom sorting
const result = querystring.stringify(
  { z: 1, a: 2, m: 3 },
  { sort: true }
);
// 'a=2&m=3&z=1'

// Stringify with filtering
const result = querystring.stringify(
  { name: 'John', password: 'secret', age: 30 },
  { filter: ['name', 'age'] }
);
// 'name=John&age=30'
```

## QueryBuilder API

A fluent interface for building query strings:

```typescript
import { QueryBuilder } from '@oxog/querystring';

const query = new QueryBuilder()
  .add('search', 'typescript')
  .addArray('tags', ['tutorial', 'guide'])
  .addObject('filters', {
    difficulty: 'beginner',
    duration: '< 30min'
  })
  .when(isLoggedIn, (q) => q.add('userId', userId))
  .build();

// With method chaining
const url = QueryBuilder
  .create()
  .add('page', 1)
  .add('limit', 20)
  .merge('sort=name&order=asc')
  .toUrl('https://api.example.com/items');
```

### QueryBuilder Methods

- `add(key, value)` - Add a single key-value pair
- `addMultiple(object)` - Add multiple key-value pairs
- `addArray(key, array)` - Add an array value
- `addObject(key, object)` - Add a nested object
- `append(key, value)` - Append to existing value (creates array)
- `merge(query)` - Merge another query string or object
- `has(key)` - Check if key exists
- `get(key)` - Get value by key
- `delete(key)` - Remove a key
- `clear()` - Remove all keys
- `when(condition, callback)` - Conditional building
- `transform(callback)` - Transform the entire query object
- `build(options)` - Build the query string
- `toUrl(baseUrl, options)` - Build complete URL

## Schema Validation

Runtime type validation with detailed error messages:

```typescript
import { q, schema } from '@oxog/querystring';

// Define a schema
const searchSchema = schema({
  q: q.string().min(1).max(100),
  page: q.number().min(1).default(1),
  limit: q.number().max(100).default(20),
  sort: q.enum('relevance', 'date', 'popularity').default('relevance'),
  filters: q.object().shape({
    category: q.string().optional(),
    minPrice: q.number().min(0).optional(),
    maxPrice: q.number().min(0).optional()
  }).optional()
});

// Parse and validate
const query = querystring.parse(req.url);
const validated = searchSchema.parse(query);
// Throws detailed errors if validation fails

// Safe parsing (doesn't throw)
const result = searchSchema.safeParse(query);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.errors);
}
```

### Available Schema Types

- `q.string()` - String validation with length, pattern, format checks
- `q.number()` - Number validation with min, max, integer checks
- `q.boolean()` - Boolean validation with string coercion
- `q.date()` - Date validation with min, max checks
- `q.array()` - Array validation with item schemas
- `q.object()` - Object validation with shape definition
- `q.enum()` - Enum validation
- `q.union()` - Union type validation
- `q.literal()` - Literal value validation
- `q.optional()` - Make any schema optional
- `q.nullable()` - Make any schema nullable
- `q.default()` - Provide default values

## Array Formats

Multiple array serialization formats are supported:

```typescript
const obj = { items: ['a', 'b', 'c'] };

// repeat (default): items=a&items=b&items=c
querystring.stringify(obj, { arrayFormat: 'repeat' });

// brackets: items[]=a&items[]=b&items[]=c
querystring.stringify(obj, { arrayFormat: 'brackets' });

// indices: items[0]=a&items[1]=b&items[2]=c
querystring.stringify(obj, { arrayFormat: 'indices' });

// comma: items=a,b,c
querystring.stringify(obj, { arrayFormat: 'comma' });

// separator: items=a|b|c
querystring.stringify(obj, { 
  arrayFormat: 'separator',
  arrayFormatSeparator: '|'
});

// json: items=["a","b","c"]
querystring.stringify(obj, { arrayFormat: 'json' });
```

## Plugin System

Extend functionality with plugins:

```typescript
import { PluginManager, createPlugin } from '@oxog/querystring';

// Create a custom plugin
const uppercasePlugin = createPlugin({
  name: 'uppercase',
  beforeStringify: (obj) => {
    const upper = {};
    for (const [key, value] of Object.entries(obj)) {
      upper[key.toUpperCase()] = value;
    }
    return upper;
  }
});

// Register plugin
const plugins = new PluginManager();
plugins.register(uppercasePlugin);

// Use with parser/stringifier
const result = querystring.stringify(
  { foo: 'bar' },
  { plugins }
);
// 'FOO=bar'
```

### Built-in Plugins

- `timestampPlugin` - Add timestamps to queries
- `sortKeysPlugin` - Sort object keys
- `lowercaseKeysPlugin` - Convert keys to lowercase
- `filterEmptyPlugin` - Remove empty values
- `base64Plugin` - Base64 encode/decode
- `compressPlugin` - URL compression
- `normalizePlugin` - Type normalization

## Security Features

Built-in protection against common vulnerabilities:

```typescript
// Create a secure parser
const secureParser = querystring.createSecureParser({
  maxKeys: 100,        // Prevent DoS
  maxDepth: 5,         // Prevent deep nesting attacks
  allowPrototypes: false, // Prevent prototype pollution
  sanitize: true       // XSS protection
});

// Use the secure parser
try {
  const result = secureParser(untrustedInput);
  // Safe to use
} catch (error) {
  // Security violation detected
  console.error('Security error:', error.message);
}
```

### Security Options

- `maxKeys` - Maximum number of keys (DoS protection)
- `maxDepth` - Maximum object depth
- `allowPrototypes` - Allow __proto__, constructor, prototype keys
- `sanitize` - Enable XSS sanitization

## CLI Usage

Command-line interface for quick operations:

```bash
# Install globally
npm install -g @oxog/querystring

# Parse a query string
querystring parse "name=John&age=30"

# Stringify JSON
querystring stringify '{"name":"John","age":30}'

# Convert between formats
querystring convert brackets "items=1&items=2" --format comma
# Output: items=1,2

# Validate against schema
querystring validate 'q.object().shape({name: q.string()})' "name=John"

# Read from stdin
echo "foo=bar" | querystring parse --from-stdin
```

## Performance

Benchmarked against popular alternatives:

| Operation | @oxog/querystring | qs | query-string |
|-----------|-------------------|-------|--------------|
| Parse (simple) | 1.00x | 0.45x | 0.62x |
| Parse (complex) | 1.00x | 0.38x | 0.55x |
| Stringify (simple) | 1.00x | 0.52x | 0.71x |
| Stringify (complex) | 1.00x | 0.41x | 0.63x |

Run benchmarks locally:

```bash
npm run benchmark
```

## Migration Guides

### From 'qs'

```typescript
// qs
import qs from 'qs';
const parsed = qs.parse('a[b]=c');

// @oxog/querystring
import querystring from '@oxog/querystring';
const parsed = querystring.parse('a[b]=c', { allowDots: false });
```

### From 'query-string'

```typescript
// query-string
import queryString from 'query-string';
const parsed = queryString.parse('?foo=bar', { parseNumbers: true });

// @oxog/querystring
import querystring from '@oxog/querystring';
const parsed = querystring.parse('?foo=bar', { 
  ignoreQueryPrefix: true,
  parseNumbers: true 
});
```

## TypeScript

Full TypeScript support with generics:

```typescript
interface SearchParams {
  q: string;
  page: number;
  filters?: {
    category: string;
    price: { min: number; max: number };
  };
}

// Type-safe parsing
const params = querystring.parse<SearchParams>(url);
params.q // string
params.page // number
params.filters?.category // string | undefined

// Type-safe builder
const builder = new QueryBuilder<SearchParams>();
builder.add('q', 'search term');
builder.add('page', 1);
// TypeScript ensures type safety
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © Ersin KOÇ

## Acknowledgments

This package was built to address limitations in existing query string libraries while providing a modern, secure, and performant solution for the JavaScript ecosystem.