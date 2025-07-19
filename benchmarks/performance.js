const querystring = require('../dist/index.js');

console.log('@oxog/querystring Performance Benchmark\n');

// Test data
const simpleObject = {
  name: 'John',
  age: 30,
  city: 'New York'
};

const complexObject = {
  user: {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en'
    }
  },
  products: [
    { id: 1, name: 'Product 1', price: 19.99 },
    { id: 2, name: 'Product 2', price: 29.99 },
    { id: 3, name: 'Product 3', price: 39.99 }
  ],
  filters: {
    category: 'electronics',
    minPrice: 10,
    maxPrice: 100,
    brands: ['Apple', 'Samsung', 'Sony']
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 150
  }
};

const arrayObject = {
  tags: Array(100).fill(0).map((_, i) => `tag${i}`),
  values: Array(100).fill(0).map((_, i) => i)
};

// Benchmark function
function benchmark(name, fn, iterations = 100000) {
  console.log(`\nBenchmarking: ${name}`);
  console.log('-'.repeat(40));
  
  // Warmup
  for (let i = 0; i < 1000; i++) {
    fn();
  }
  
  // Actual benchmark
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  
  const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
  const opsPerSecond = Math.round(iterations / (duration / 1000));
  
  console.log(`Iterations: ${iterations}`);
  console.log(`Total time: ${duration.toFixed(2)}ms`);
  console.log(`Ops/second: ${opsPerSecond.toLocaleString()}`);
  console.log(`Time per op: ${(duration / iterations).toFixed(4)}ms`);
}

// Run benchmarks
console.log('=== PARSE BENCHMARKS ===');

const simpleQuery = querystring.stringify(simpleObject);
benchmark('Parse Simple Query', () => {
  querystring.parse(simpleQuery);
});

const complexQuery = querystring.stringify(complexObject);
benchmark('Parse Complex Query', () => {
  querystring.parse(complexQuery);
}, 10000);

const arrayQuery = querystring.stringify(arrayObject, { arrayFormat: 'repeat' });
benchmark('Parse Array Query (repeat format)', () => {
  querystring.parse(arrayQuery, { arrayFormat: 'repeat' });
}, 10000);

const bracketArrayQuery = querystring.stringify(arrayObject, { arrayFormat: 'brackets' });
benchmark('Parse Array Query (brackets format)', () => {
  querystring.parse(bracketArrayQuery, { arrayFormat: 'brackets' });
}, 10000);

console.log('\n\n=== STRINGIFY BENCHMARKS ===');

benchmark('Stringify Simple Object', () => {
  querystring.stringify(simpleObject);
});

benchmark('Stringify Complex Object', () => {
  querystring.stringify(complexObject);
}, 10000);

benchmark('Stringify Array Object (repeat)', () => {
  querystring.stringify(arrayObject, { arrayFormat: 'repeat' });
}, 10000);

benchmark('Stringify Array Object (brackets)', () => {
  querystring.stringify(arrayObject, { arrayFormat: 'brackets' });
}, 10000);

console.log('\n\n=== QUERYBUILDER BENCHMARKS ===');

benchmark('QueryBuilder Operations', () => {
  const builder = new querystring.QueryBuilder()
    .add('search', 'test')
    .addArray('tags', ['js', 'node'])
    .addObject('filters', { active: true })
    .build();
}, 50000);

console.log('\n\n=== SCHEMA VALIDATION BENCHMARKS ===');

const testSchema = querystring.schema({
  name: querystring.q.string(),
  age: querystring.q.number(),
  email: querystring.q.string().email().optional()
});

const validData = { name: 'John', age: 30, email: 'john@example.com' };

benchmark('Schema Validation', () => {
  testSchema.parse(validData);
}, 50000);

console.log('\n\n=== MEMORY USAGE ===');

const initialMemory = process.memoryUsage();

// Create many objects to test memory
const manyObjects = [];
for (let i = 0; i < 10000; i++) {
  manyObjects.push(querystring.parse(`key${i}=value${i}&nested[prop${i}]=data${i}`));
}

const finalMemory = process.memoryUsage();

console.log('\nMemory Usage:');
console.log(`Heap Used: ${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
console.log(`External: ${((finalMemory.external - initialMemory.external) / 1024 / 1024).toFixed(2)} MB`);

console.log('\n\nBenchmark completed!');