/**
 * Migration Guide: From 'qs' to '@oxog/querystring'
 * 
 * This example shows how to migrate from the 'qs' library to '@oxog/querystring'
 */

const querystring = require('@oxog/querystring').default;

console.log('=== Migration from qs to @oxog/querystring ===\n');

// 1. Basic parsing
console.log('1. Basic Parsing:');
console.log('qs:         qs.parse("a=b&c=d")');
console.log('querystring: querystring.parse("a=b&c=d")');
console.log('Result:', querystring.parse('a=b&c=d'));
console.log();

// 2. Array parsing
console.log('2. Array Parsing:');
console.log('qs default uses brackets: a[]=1&a[]=2');
console.log('querystring default uses repeat: a=1&a=2');
console.log('To match qs behavior, use arrayFormat: "brackets"');
console.log('Result:', querystring.parse('a[]=1&a[]=2', { arrayFormat: 'brackets' }));
console.log();

// 3. Nested objects
console.log('3. Nested Objects:');
console.log('Both libraries support: a[b][c]=d');
console.log('Result:', querystring.parse('a[b][c]=d'));
console.log();

// 4. Dot notation
console.log('4. Dot Notation:');
console.log('qs:         qs.parse("a.b.c=d", { allowDots: true })');
console.log('querystring: querystring.parse("a.b.c=d", { allowDots: true })');
console.log('Result:', querystring.parse('a.b.c=d', { allowDots: true }));
console.log();

// 5. Stringification
console.log('5. Stringification:');
const obj = { a: 'b', c: ['d', 'e'] };
console.log('Object:', obj);
console.log('qs default:', 'a=b&c[0]=d&c[1]=e');
console.log('querystring default:', querystring.stringify(obj));
console.log('With indices format:', querystring.stringify(obj, { arrayFormat: 'indices' }));
console.log();

// 6. Delimiter options
console.log('6. Custom Delimiter:');
console.log('qs:         qs.parse("a=b;c=d", { delimiter: ";" })');
console.log('querystring: querystring.parse("a=b;c=d", { delimiter: ";" })');
console.log('Result:', querystring.parse('a=b;c=d', { delimiter: ';' }));
console.log();

// 7. Depth limit
console.log('7. Depth Limit:');
console.log('qs:         qs.parse("a[b][c][d][e][f][g]=h", { depth: 3 })');
console.log('querystring: querystring.parse("a[b][c][d][e][f][g]=h", { depth: 3 })');
console.log('Result:', querystring.parse('a[b][c][d][e][f][g]=h', { depth: 3 }));
console.log();

// 8. Parameter limit
console.log('8. Parameter Limit:');
console.log('qs:         qs.parse("a=1&b=2&c=3", { parameterLimit: 2 })');
console.log('querystring: querystring.parse("a=1&b=2&c=3", { parameterLimit: 2 })');
try {
  querystring.parse('a=1&b=2&c=3', { parameterLimit: 2 });
} catch (error) {
  console.log('Result: Error -', error.message);
}
console.log();

// 9. Strict null handling
console.log('9. Strict Null Handling:');
console.log('qs:         qs.stringify({ a: null }, { strictNullHandling: true })');
console.log('querystring: querystring.stringify({ a: null }, { strictNullHandling: true })');
console.log('Result:', querystring.stringify({ a: null }, { strictNullHandling: true }));
console.log();

// 10. Filter option
console.log('10. Filter Option:');
const data = { a: 'b', c: 'd', e: 'f' };
console.log('Object:', data);
console.log('Filter: ["a", "c"]');
console.log('Result:', querystring.stringify(data, { filter: ['a', 'c'] }));
console.log();

// 11. Sort option
console.log('11. Sort Option:');
const unsorted = { z: 1, a: 2, m: 3 };
console.log('Object:', unsorted);
console.log('With sort: true');
console.log('Result:', querystring.stringify(unsorted, { sort: true }));
console.log();

// 12. Handling of undefined
console.log('12. Undefined Values:');
console.log('qs behavior: skipNulls option also skips undefined');
console.log('querystring: Same behavior with skipNulls');
console.log('Result:', querystring.stringify({ a: undefined, b: null, c: 'value' }, { skipNulls: true }));
console.log();

// Migration helper function
function migrateFromQs(qsOptions = {}) {
  const querystringOptions = { ...qsOptions };
  
  // qs uses 'indices' format by default for arrays
  if (!querystringOptions.arrayFormat && qsOptions.arrayFormat === undefined) {
    querystringOptions.arrayFormat = 'indices';
  }
  
  // qs uses 'allowPrototypes' while querystring uses security-first approach
  if (qsOptions.allowPrototypes) {
    console.warn('Warning: allowPrototypes is a security risk. Consider using secure parser instead.');
  }
  
  return querystringOptions;
}

console.log('=== Migration Helper ===');
console.log('Use the migrateFromQs() function to convert qs options:');
const qsOptions = { 
  delimiter: ';', 
  depth: 10, 
  arrayFormat: 'brackets' 
};
console.log('qs options:', qsOptions);
console.log('querystring options:', migrateFromQs(qsOptions));

console.log('\n=== Key Differences ===');
console.log('1. Default array format: qs uses "indices", querystring uses "repeat"');
console.log('2. Security: querystring has built-in security features');
console.log('3. Performance: querystring is optimized for speed');
console.log('4. Type safety: querystring has full TypeScript support');
console.log('5. Additional features: QueryBuilder, Schema validation, Plugins');

console.log('\n=== Advantages of @oxog/querystring ===');
console.log('- Zero dependencies');
console.log('- Better performance');
console.log('- Type-safe with TypeScript');
console.log('- Built-in security features');
console.log('- Plugin system for extensibility');
console.log('- Schema validation');
console.log('- Fluent QueryBuilder API');