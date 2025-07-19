const querystring = require('@oxog/querystring').default;

// Basic parsing
console.log('=== Basic Parsing ===');
const parsed = querystring.parse('name=John&age=30&city=NYC');
console.log('Parsed:', parsed);
// { name: 'John', age: '30', city: 'NYC' }

// Basic stringifying
console.log('\n=== Basic Stringifying ===');
const stringified = querystring.stringify({
  name: 'John',
  age: 30,
  city: 'NYC'
});
console.log('Stringified:', stringified);
// name=John&age=30&city=NYC

// Array handling
console.log('\n=== Array Handling ===');
const arrayQuery = 'colors=red&colors=green&colors=blue';
const parsedArray = querystring.parse(arrayQuery);
console.log('Parsed array:', parsedArray);
// { colors: ['red', 'green', 'blue'] }

const stringifiedArray = querystring.stringify({ colors: ['red', 'green', 'blue'] });
console.log('Stringified array:', stringifiedArray);
// colors=red&colors=green&colors=blue

// Nested objects
console.log('\n=== Nested Objects ===');
const nestedQuery = 'user[name]=John&user[age]=30&user[address][city]=NYC';
const parsedNested = querystring.parse(nestedQuery);
console.log('Parsed nested:', parsedNested);
// { user: { name: 'John', age: '30', address: { city: 'NYC' } } }

// URL parsing
console.log('\n=== URL Parsing ===');
const fullUrl = 'https://api.example.com/search?q=javascript&limit=10&page=1';
const { url, query } = querystring.parseUrl(fullUrl);
console.log('Base URL:', url);
console.log('Query params:', query);

// Type coercion
console.log('\n=== Type Coercion ===');
const typedQuery = querystring.parse('count=42&active=true&price=19.99', {
  parseNumbers: true,
  parseBooleans: true
});
console.log('Typed values:', typedQuery);
console.log('Types:', {
  count: typeof typedQuery.count,
  active: typeof typedQuery.active,
  price: typeof typedQuery.price
});

// Different array formats
console.log('\n=== Array Formats ===');
const items = { tags: ['js', 'node', 'web'] };

console.log('Brackets:', querystring.stringify(items, { arrayFormat: 'brackets' }));
// tags[]=js&tags[]=node&tags[]=web

console.log('Indices:', querystring.stringify(items, { arrayFormat: 'indices' }));
// tags[0]=js&tags[1]=node&tags[2]=web

console.log('Comma:', querystring.stringify(items, { arrayFormat: 'comma' }));
// tags=js,node,web

console.log('JSON:', querystring.stringify(items, { arrayFormat: 'json' }));
// tags=["js","node","web"]

// Filtering and sorting
console.log('\n=== Filtering and Sorting ===');
const data = {
  name: 'John',
  password: 'secret',
  email: 'john@example.com',
  age: 30
};

const filtered = querystring.stringify(data, {
  filter: ['name', 'email', 'age'],
  sort: true
});
console.log('Filtered & sorted:', filtered);
// age=30&email=john%40example.com&name=John