/**
 * Migration Guide: From 'query-string' to '@oxog/querystring'
 * 
 * This example shows how to migrate from the 'query-string' library to '@oxog/querystring'
 */

const querystring = require('@oxog/querystring').default;

console.log('=== Migration from query-string to @oxog/querystring ===\n');

// 1. Basic parsing
console.log('1. Basic Parsing:');
console.log('query-string: queryString.parse("?foo=bar")');
console.log('querystring:  querystring.parse("?foo=bar", { ignoreQueryPrefix: true })');
console.log('Result:', querystring.parse('?foo=bar', { ignoreQueryPrefix: true }));
console.log();

// 2. Number parsing
console.log('2. Number Parsing:');
console.log('query-string: queryString.parse("foo=1", { parseNumbers: true })');
console.log('querystring:  querystring.parse("foo=1", { parseNumbers: true })');
console.log('Result:', querystring.parse('foo=1', { parseNumbers: true }));
console.log('Type:', typeof querystring.parse('foo=1', { parseNumbers: true }).foo);
console.log();

// 3. Boolean parsing
console.log('3. Boolean Parsing:');
console.log('query-string: queryString.parse("foo=true", { parseBooleans: true })');
console.log('querystring:  querystring.parse("foo=true", { parseBooleans: true })');
console.log('Result:', querystring.parse('foo=true', { parseBooleans: true }));
console.log('Type:', typeof querystring.parse('foo=true', { parseBooleans: true }).foo);
console.log();

// 4. Array parsing
console.log('4. Array Parsing:');
console.log('query-string default: foo=1,2,3 becomes ["1,2,3"]');
console.log('querystring with arrayFormat comma: foo=1,2,3 becomes ["1", "2", "3"]');
console.log('Result:', querystring.parse('foo=1,2,3', { arrayFormat: 'comma' }));
console.log();

// 5. Array formats
console.log('5. Array Formats:');
const arr = { foo: ['one', 'two', 'three'] };
console.log('Object:', arr);
console.log('query-string bracket: foo[]=one&foo[]=two&foo[]=three');
console.log('querystring bracket:', querystring.stringify(arr, { arrayFormat: 'brackets' }));
console.log('query-string comma: foo=one,two,three');
console.log('querystring comma:', querystring.stringify(arr, { arrayFormat: 'comma' }));
console.log('query-string separator: foo=one|two|three');
console.log('querystring separator:', querystring.stringify(arr, { arrayFormat: 'separator', arrayFormatSeparator: '|' }));
console.log();

// 6. URL parsing
console.log('6. URL Parsing:');
console.log('query-string: queryString.parseUrl("https://example.com?foo=bar")');
console.log('querystring:  querystring.parseUrl("https://example.com?foo=bar")');
const parsed = querystring.parseUrl('https://example.com?foo=bar#hash');
console.log('Result:', parsed);
console.log('Note: querystring returns { url, query } format');
console.log();

// 7. Stringifying with URL
console.log('7. Stringify URL:');
console.log('query-string: queryString.stringifyUrl({ url: "https://example.com", query: { foo: "bar" } })');
console.log('querystring:  querystring.stringifyUrl("https://example.com", { foo: "bar" })');
console.log('Result:', querystring.stringifyUrl('https://example.com', { foo: 'bar' }));
console.log();

// 8. Skip null values
console.log('8. Skip Null Values:');
console.log('query-string: queryString.stringify({ a: null, b: "value" }, { skipNull: true })');
console.log('querystring:  querystring.stringify({ a: null, b: "value" }, { skipNulls: true })');
console.log('Result:', querystring.stringify({ a: null, b: 'value' }, { skipNulls: true }));
console.log();

// 9. Skip empty strings
console.log('9. Skip Empty Strings:');
console.log('query-string: queryString.stringify({ a: "", b: "value" }, { skipEmptyString: true })');
console.log('querystring:  Use filterEmptyPlugin or custom filter');
const { filterEmptyPlugin, PluginManager } = require('@oxog/querystring');
const manager = new PluginManager();
manager.register(filterEmptyPlugin);
console.log('Result:', querystring.stringify({ a: '', b: 'value' }, { plugins: manager }));
console.log();

// 10. Sort keys
console.log('10. Sort Keys:');
console.log('query-string: queryString.stringify({ z: 1, a: 2 }, { sort: true })');
console.log('querystring:  querystring.stringify({ z: 1, a: 2 }, { sort: true })');
console.log('Result:', querystring.stringify({ z: 1, a: 2 }, { sort: true }));
console.log();

// Migration helper
function migrateFromQueryString(queryStringOptions = {}) {
  const querystringOptions = { ...queryStringOptions };
  
  // query-string always ignores the query prefix
  querystringOptions.ignoreQueryPrefix = true;
  
  // Rename options
  if ('skipNull' in queryStringOptions) {
    querystringOptions.skipNulls = queryStringOptions.skipNull;
    delete querystringOptions.skipNull;
  }
  
  // Handle arrayFormat differences
  if (queryStringOptions.arrayFormat === 'bracket') {
    querystringOptions.arrayFormat = 'brackets';
  }
  
  // query-string uses 'none' for no array parsing
  if (queryStringOptions.arrayFormat === 'none') {
    querystringOptions.parseArrays = false;
    delete querystringOptions.arrayFormat;
  }
  
  return querystringOptions;
}

console.log('=== Migration Helper ===');
console.log('Use the migrateFromQueryString() function to convert options:');
const qsOptions = { 
  parseNumbers: true,
  parseBooleans: true,
  arrayFormat: 'bracket',
  skipNull: true,
  sort: true
};
console.log('query-string options:', qsOptions);
console.log('querystring options:', migrateFromQueryString(qsOptions));

console.log('\n=== API Differences ===');
console.log('1. parseUrl returns different format:');
console.log('   query-string: { url, query, fragmentIdentifier }');
console.log('   querystring:  { url, query }');
console.log('2. stringifyUrl has different signature:');
console.log('   query-string: stringifyUrl({ url, query })');
console.log('   querystring:  stringifyUrl(url, query)');
console.log('3. Array handling:');
console.log('   query-string: Limited array format options');
console.log('   querystring:  More array formats including JSON');

console.log('\n=== Feature Comparison ===');
console.log('query-string features:');
console.log('- Basic parsing and stringifying');
console.log('- Number and boolean parsing');
console.log('- Array format support');
console.log('- URL manipulation');

console.log('\n@oxog/querystring additional features:');
console.log('- Zero dependencies (query-string has dependencies)');
console.log('- QueryBuilder API for fluent query construction');
console.log('- Schema validation with runtime type checking');
console.log('- Plugin system for extensibility');
console.log('- Built-in security features');
console.log('- Better performance');
console.log('- Full TypeScript support with generics');
console.log('- More array format options');
console.log('- Dot notation support');
console.log('- Custom encoder/decoder support');

console.log('\n=== Example: Advanced Features ===');

// QueryBuilder example
console.log('\n1. QueryBuilder (not available in query-string):');
const { QueryBuilder } = require('@oxog/querystring');
const query = new QueryBuilder()
  .add('search', 'javascript')
  .addArray('tags', ['tutorial', 'beginner'])
  .when(true, q => q.add('published', true))
  .build();
console.log('Built query:', query);

// Schema validation example
console.log('\n2. Schema Validation (not available in query-string):');
const { q, schema } = require('@oxog/querystring');
const searchSchema = schema({
  q: q.string().min(1),
  page: q.number().min(1).default(1),
  limit: q.number().max(100).default(20)
});

const validated = searchSchema.parse(querystring.parse('q=test&page=2', { parseNumbers: true }));
console.log('Validated:', validated);

console.log('\n=== Migration Summary ===');
console.log('1. Most query-string code works with minimal changes');
console.log('2. Main difference is in parseUrl/stringifyUrl signatures');
console.log('3. @oxog/querystring offers many additional features');
console.log('4. Better performance and type safety with @oxog/querystring');