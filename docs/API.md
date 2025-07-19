# API Documentation

## Table of Contents

- [Core Functions](#core-functions)
  - [parse()](#parse)
  - [parseUrl()](#parseurl)
  - [stringify()](#stringify)
  - [stringifyUrl()](#stringifyurl)
- [QueryBuilder](#querybuilder)
- [Schema Validation](#schema-validation)
- [Security](#security)
- [Plugins](#plugins)
- [Type Definitions](#type-definitions)

## Core Functions

### parse()

Parses a query string into an object.

```typescript
function parse(input: string, options?: ParseOptions): ParsedQuery
```

#### Parameters

- `input` (string): The query string to parse
- `options` (ParseOptions): Optional parsing options

#### ParseOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiter` | string | '&' | Character to split pairs |
| `depth` | number | 5 | Maximum depth for nested objects |
| `arrayFormat` | ArrayFormat | 'repeat' | Array parsing format |
| `arrayFormatSeparator` | string | ',' | Separator for 'separator' format |
| `decode` | boolean | true | Decode URL-encoded values |
| `decoder` | function | decodeURIComponent | Custom decoder function |
| `charset` | 'utf-8' \| 'iso-8859-1' | 'utf-8' | Character encoding |
| `charsetSentinel` | boolean | false | Look for charset sentinel |
| `interpretNumericEntities` | boolean | false | Interpret numeric HTML entities |
| `parameterLimit` | number | 1000 | Maximum number of parameters |
| `parseArrays` | boolean | true | Parse array values |
| `allowDots` | boolean | false | Allow dot notation |
| `plainObjects` | boolean | false | Create plain objects without prototype |
| `allowPrototypes` | boolean | false | Allow prototype properties |
| `allowSparse` | boolean | false | Allow sparse arrays |
| `strictNullHandling` | boolean | false | Differentiate null from empty string |
| `comma` | boolean | false | Parse comma-separated values |
| `commaRoundTrip` | boolean | false | Preserve comma encoding |
| `ignoreQueryPrefix` | boolean | false | Ignore leading '?' |
| `duplicates` | 'combine' \| 'first' \| 'last' | 'combine' | How to handle duplicate keys |
| `parseNumbers` | boolean | false | Parse numeric strings to numbers |
| `parseBooleans` | boolean | false | Parse 'true'/'false' to booleans |
| `parseDates` | boolean | false | Parse ISO date strings to Date objects |
| `typeCoercion` | boolean \| TypeCoercionOptions | false | Enable type coercion |

#### Examples

```javascript
// Basic parsing
parse('foo=bar&baz=qux')
// { foo: 'bar', baz: 'qux' }

// With arrays
parse('arr=1&arr=2&arr=3', { arrayFormat: 'repeat' })
// { arr: ['1', '2', '3'] }

// With type coercion
parse('num=42&bool=true', { parseNumbers: true, parseBooleans: true })
// { num: 42, bool: true }

// With dot notation
parse('user.name=John&user.age=30', { allowDots: true })
// { user: { name: 'John', age: '30' } }
```

### parseUrl()

Parses a URL and extracts the query string parameters.

```typescript
function parseUrl(url: string, options?: ParseOptions): ParsedUrl
```

#### Returns

```typescript
interface ParsedUrl {
  url: string;      // Base URL without query string
  query: ParsedQuery; // Parsed query parameters
}
```

#### Example

```javascript
parseUrl('https://example.com/search?q=test&page=2')
// {
//   url: 'https://example.com/search',
//   query: { q: 'test', page: '2' }
// }
```

### stringify()

Converts an object into a query string.

```typescript
function stringify(obj: unknown, options?: StringifyOptions): string
```

#### StringifyOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiter` | string | '&' | Character to join pairs |
| `strictNullHandling` | boolean | false | Encode null as bare key |
| `skipNulls` | boolean | false | Skip null and undefined values |
| `encode` | boolean | true | URL-encode values |
| `encoder` | function | encodeURIComponent | Custom encoder function |
| `filter` | array \| function | - | Filter keys to include |
| `arrayFormat` | ArrayFormat | 'repeat' | Array stringification format |
| `arrayFormatSeparator` | string | ',' | Separator for 'separator' format |
| `indices` | boolean | false | Include array indices |
| `sort` | boolean \| function | false | Sort keys |
| `serializeDate` | function | toISOString | Date serialization function |
| `format` | 'RFC1738' \| 'RFC3986' | 'RFC3986' | URI encoding standard |
| `encodeValuesOnly` | boolean | false | Only encode values, not keys |
| `addQueryPrefix` | boolean | false | Add '?' prefix |
| `allowDots` | boolean | false | Use dot notation |
| `charset` | 'utf-8' \| 'iso-8859-1' | 'utf-8' | Character encoding |
| `charsetSentinel` | boolean | false | Add charset sentinel |
| `commaRoundTrip` | boolean | false | Special comma handling |
| `comma` | boolean | false | Join arrays with commas |

#### Examples

```javascript
// Basic stringification
stringify({ foo: 'bar', baz: 'qux' })
// 'foo=bar&baz=qux'

// With arrays
stringify({ tags: ['js', 'node'] }, { arrayFormat: 'brackets' })
// 'tags[]=js&tags[]=node'

// With filtering
stringify({ name: 'John', password: 'secret' }, { filter: ['name'] })
// 'name=John'

// With sorting
stringify({ z: 1, a: 2 }, { sort: true })
// 'a=2&z=1'
```

### stringifyUrl()

Appends query parameters to a URL.

```typescript
function stringifyUrl(url: string, query: unknown, options?: StringifyOptions): string
```

#### Example

```javascript
stringifyUrl('https://example.com', { search: 'test', page: 1 })
// 'https://example.com?search=test&page=1'

stringifyUrl('https://example.com?existing=true', { new: 'param' })
// 'https://example.com?existing=true&new=param'
```

## QueryBuilder

Fluent interface for building query strings.

### Constructor

```typescript
new QueryBuilder(options?: QueryBuilderOptions)
```

### Methods

#### add(key: string, value: unknown): this
Adds a single key-value pair.

```javascript
builder.add('name', 'John')
```

#### addMultiple(obj: Record<string, unknown>): this
Adds multiple key-value pairs.

```javascript
builder.addMultiple({ name: 'John', age: 30 })
```

#### addArray(key: string, values: unknown[]): this
Adds an array value.

```javascript
builder.addArray('tags', ['js', 'node'])
```

#### addObject(key: string, obj: Record<string, unknown>): this
Adds a nested object.

```javascript
builder.addObject('user', { name: 'John', age: 30 })
```

#### append(key: string, value: unknown): this
Appends to an existing value, creating an array if needed.

```javascript
builder.append('tags', 'js')
builder.append('tags', 'node')
// tags: ['js', 'node']
```

#### merge(other: string | ParsedQuery | QueryBuilder): this
Merges another query into this builder.

```javascript
builder.merge('foo=bar&baz=qux')
builder.merge({ additional: 'data' })
```

#### has(key: string): boolean
Checks if a key exists.

#### get(key: string): unknown
Gets a value by key.

#### delete(key: string): this
Removes a key.

#### clear(): this
Removes all keys.

#### filter(predicate: Function): QueryBuilder
Creates a new builder with filtered values.

```javascript
const filtered = builder.filter((value, key) => key !== 'password')
```

#### transform(transformer: Function): this
Transforms the entire query object.

```javascript
builder.transform(query => {
  // Uppercase all keys
  const transformed = {}
  for (const [key, value] of Object.entries(query)) {
    transformed[key.toUpperCase()] = value
  }
  return transformed
})
```

#### when(condition: boolean | Function, callback: Function): this
Conditional building.

```javascript
builder
  .when(isAuthenticated, q => q.add('userId', userId))
  .when(hasFilters, q => q.addObject('filters', filters))
```

#### build(options?: StringifyOptions): string
Builds the final query string.

#### toUrl(url?: string, options?: StringifyOptions): string
Builds a complete URL with query string.

### Static Methods

#### QueryBuilder.from(input: string | ParsedQuery | QueryBuilder): QueryBuilder
Creates a builder from various inputs.

#### QueryBuilder.create(query?: ParsedQuery): QueryBuilder
Creates a builder with initial query.

## Schema Validation

### Creating Schemas

```javascript
import { q, schema } from '@oxog/querystring';

const mySchema = schema({
  name: q.string().min(2).max(50),
  age: q.number().min(0).max(150),
  email: q.string().email()
});
```

### Schema Types

#### q.string()
- `.min(length)` - Minimum length
- `.max(length)` - Maximum length
- `.length(length)` - Exact length
- `.email()` - Valid email format
- `.url()` - Valid URL format
- `.uuid()` - Valid UUID format
- `.regex(pattern)` - Match regex pattern
- `.startsWith(prefix)` - Must start with prefix
- `.endsWith(suffix)` - Must end with suffix
- `.includes(substring)` - Must include substring
- `.trim()` - Trim whitespace
- `.toLowerCase()` - Convert to lowercase
- `.toUpperCase()` - Convert to uppercase

#### q.number()
- `.min(value)` - Minimum value
- `.max(value)` - Maximum value
- `.int()` - Must be integer
- `.positive()` - Must be positive
- `.negative()` - Must be negative
- `.nonpositive()` - Must be <= 0
- `.nonnegative()` - Must be >= 0
- `.multipleOf(value)` - Must be multiple of value
- `.finite()` - Must be finite
- `.safe()` - Must be safe integer

#### q.boolean()
Accepts: true, false, 'true', 'false', 1, 0, '1', '0'

#### q.date()
- `.min(date)` - Minimum date
- `.max(date)` - Maximum date

#### q.array(itemSchema?)
- `.min(length)` - Minimum length
- `.max(length)` - Maximum length
- `.length(length)` - Exact length
- `.nonempty()` - Must not be empty

#### q.object()
- `.shape(shape)` - Define object shape
- `.strict()` - No extra keys allowed
- `.passthrough()` - Allow extra keys
- `.strip()` - Remove extra keys
- `.catchall(schema)` - Schema for unknown keys
- `.pick(keys)` - Pick specific keys
- `.omit(keys)` - Omit specific keys
- `.extend(shape)` - Extend with more fields
- `.merge(schema)` - Merge with another schema
- `.partial()` - Make all fields optional
- `.required()` - Make all fields required

#### q.enum(...values)
Validates against a list of allowed values.

#### q.union(...schemas)
Validates against any of the provided schemas.

#### q.literal(value)
Validates against an exact value.

### Modifiers

#### .optional()
Makes a schema optional (allows undefined).

#### .nullable()
Makes a schema nullable (allows null).

#### .default(value)
Provides a default value.

#### .transform(fn)
Transforms the validated value.

#### .refine(fn, message?)
Adds custom validation logic.

### Validation Methods

#### schema.parse(value)
Validates and returns the value. Throws on error.

#### schema.safeParse(value)
Returns a result object without throwing.

```javascript
const result = schema.safeParse(value)
if (result.success) {
  console.log(result.data)
} else {
  console.log(result.errors)
}
```

## Security

### createSecureParser(options)

Creates a parser with security constraints.

```javascript
const secureParser = createSecureParser({
  maxKeys: 100,
  maxDepth: 5,
  allowPrototypes: false,
  sanitize: true
});
```

### validateSecurity(obj, options)

Validates an object against security rules.

```javascript
const { valid, errors } = validateSecurity(parsed, {
  maxKeys: 50,
  maxDepth: 3
});
```

### sanitizeInput(input, options)

Sanitizes input to prevent XSS.

```javascript
const safe = sanitizeInput('<script>alert("xss")</script>')
// '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
```

## Type Definitions

### ArrayFormat
```typescript
type ArrayFormat = 
  | 'brackets'    // arr[]=1&arr[]=2
  | 'indices'     // arr[0]=1&arr[1]=2
  | 'repeat'      // arr=1&arr=2
  | 'comma'       // arr=1,2
  | 'separator'   // arr=1|2
  | 'json'        // arr=["1","2"]
  | 'bracket-separator' // arr[]=1|2
```

### ParsedQuery
```typescript
type ParsedQuery = Record<string, QueryValue>
type QueryValue = Primitive | Primitive[] | { [key: string]: QueryValue }
type Primitive = string | number | boolean | null | undefined
```

### QueryStringPlugin
```typescript
interface QueryStringPlugin {
  name: string
  beforeParse?: (input: string, options: ParseOptions) => string
  afterParse?: (result: ParsedQuery, options: ParseOptions) => ParsedQuery
  beforeStringify?: (obj: ParsedQuery, options: StringifyOptions) => ParsedQuery
  afterStringify?: (result: string, options: StringifyOptions) => string
}
```