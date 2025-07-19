const { 
  querystring, 
  QueryBuilder, 
  PluginManager,
  createPlugin,
  timestampPlugin,
  lowercaseKeysPlugin,
  filterEmptyPlugin,
  createSecureParser,
  q,
  schema
} = require('@oxog/querystring');

// Custom plugin example
console.log('=== Custom Plugin ===');
const debugPlugin = createPlugin({
  name: 'debug',
  beforeParse: (input, options) => {
    console.log('[DEBUG] Parsing:', input);
    return input;
  },
  afterParse: (result, options) => {
    console.log('[DEBUG] Parsed result:', result);
    return result;
  },
  beforeStringify: (obj, options) => {
    console.log('[DEBUG] Stringifying:', obj);
    return obj;
  },
  afterStringify: (result, options) => {
    console.log('[DEBUG] Stringified result:', result);
    return result;
  }
});

// Use plugins
const pluginManager = new PluginManager();
pluginManager.register(debugPlugin);
pluginManager.register(timestampPlugin);
pluginManager.register(lowercaseKeysPlugin);

// Parse with plugins
const input = 'Name=John&AGE=30&CITY=NYC';
let parsed = querystring.parse(input);
parsed = pluginManager.applyAfterParse(parsed, {});
console.log('After plugins:', parsed);

// Security example
console.log('\n=== Security Features ===');
const secureParser = createSecureParser({
  maxKeys: 10,
  maxDepth: 3,
  allowPrototypes: false,
  sanitize: true
});

// Safe query
try {
  const safe = secureParser('name=John&age=30');
  console.log('Safe query parsed:', safe);
} catch (error) {
  console.error('Security error:', error.message);
}

// Malicious query attempts
const maliciousQueries = [
  '__proto__[admin]=true',
  'user[__proto__][admin]=true',
  'comment=<script>alert("XSS")</script>',
  'a[b][c][d][e][f][g]=deep' // Too deep
];

maliciousQueries.forEach(query => {
  try {
    secureParser(query);
  } catch (error) {
    console.log(`Blocked: "${query}" - ${error.message}`);
  }
});

// Advanced QueryBuilder usage
console.log('\n=== Advanced QueryBuilder ===');
const query = new QueryBuilder()
  .add('search', 'javascript')
  .addArray('categories', ['web', 'frontend', 'backend'])
  .addObject('filters', {
    difficulty: 'intermediate',
    duration: { min: 10, max: 60 },
    free: true
  })
  .when(true, (q) => q.add('featured', true))
  .unless(false, (q) => q.add('archived', false))
  .transform(query => {
    // Add metadata
    query._metadata = {
      version: 'v2',
      timestamp: new Date().toISOString()
    };
    return query;
  })
  .tap(q => {
    console.log('Current state:', q.size(), 'items');
  });

console.log('Complex query:', query.build({
  arrayFormat: 'brackets',
  encode: true,
  sort: true
}));

// Batch operations
console.log('\n=== Batch Operations ===');
const batchBuilder = new QueryBuilder()
  .addMultiple({
    page: 1,
    limit: 20,
    sort: 'date',
    order: 'desc'
  })
  .merge('tags=javascript&tags=nodejs')
  .filter((value, key) => key !== 'limit')
  .map((value, key) => `${key}:${value}`)
  .join(', ');

console.log('Batch result:', batchBuilder);

// Schema validation with custom rules
console.log('\n=== Advanced Schema Validation ===');
const apiSchema = schema({
  apiKey: q.string()
    .regex(/^[A-Z0-9]{32}$/)
    .transform(v => v.toUpperCase()),
  
  timestamp: q.number()
    .refine(v => v > Date.now() - 300000, 'Timestamp too old')
    .transform(v => new Date(v)),
  
  data: q.object().shape({
    action: q.enum('create', 'read', 'update', 'delete'),
    resource: q.string().min(1).max(50),
    payload: q.any().optional()
  }),
  
  signature: q.string()
    .refine(v => v.length === 64, 'Invalid signature length')
});

// Validate API request
const apiRequest = {
  apiKey: 'abc123def456ghi789jkl012mno345pq',
  timestamp: Date.now(),
  data: {
    action: 'create',
    resource: 'users',
    payload: { name: 'John', email: 'john@example.com' }
  },
  signature: '0'.repeat(64)
};

const validationResult = apiSchema.safeParse(apiRequest);
if (validationResult.success) {
  console.log('Valid API request');
} else {
  console.log('Validation errors:', validationResult.errors);
}

// Performance optimization with memoization
console.log('\n=== Performance Optimization ===');
const cache = new Map();

function cachedParse(query, options) {
  const key = JSON.stringify({ query, options });
  if (cache.has(key)) {
    console.log('Cache hit!');
    return cache.get(key);
  }
  
  const result = querystring.parse(query, options);
  cache.set(key, result);
  return result;
}

// First call - cache miss
cachedParse('foo=bar&baz=qux', { parseNumbers: true });
// Second call - cache hit
cachedParse('foo=bar&baz=qux', { parseNumbers: true });

// Complex real-world example
console.log('\n=== Real-world Example: E-commerce Search ===');
const ecommerceSchema = schema({
  q: q.string().optional(),
  category: q.string().optional(),
  brands: q.array(q.string()).optional(),
  priceMin: q.number().min(0).optional(),
  priceMax: q.number().min(0).optional(),
  rating: q.number().min(1).max(5).optional(),
  inStock: q.boolean().default(true),
  shipping: q.enum('standard', 'express', 'overnight').optional(),
  sort: q.enum('relevance', 'price-asc', 'price-desc', 'rating', 'newest').default('relevance'),
  page: q.number().min(1).default(1),
  limit: q.number().min(10).max(100).default(20)
});

const searchQuery = new QueryBuilder()
  .add('q', 'laptop')
  .add('category', 'electronics/computers')
  .addArray('brands', ['Apple', 'Dell', 'HP'])
  .add('priceMin', 500)
  .add('priceMax', 2000)
  .add('rating', 4)
  .add('inStock', true)
  .add('shipping', 'express')
  .add('sort', 'price-asc')
  .add('page', 1)
  .build({ arrayFormat: 'comma' });

console.log('Search URL:', `https://shop.example.com/search?${searchQuery}`);

const parsedSearch = querystring.parse(searchQuery, {
  arrayFormat: 'comma',
  parseNumbers: true,
  parseBooleans: true
});

const validatedSearch = ecommerceSchema.parse(parsedSearch);
console.log('Validated search params:', validatedSearch);

// Plugin composition
console.log('\n=== Plugin Composition ===');
const analyticsPlugin = createPlugin({
  name: 'analytics',
  afterParse: (result) => {
    result._analytics = {
      parsed_at: Date.now(),
      keys_count: Object.keys(result).length
    };
    return result;
  }
});

const cleanupPlugin = createPlugin({
  name: 'cleanup',
  beforeStringify: (obj) => {
    const cleaned = { ...obj };
    delete cleaned._analytics;
    delete cleaned._metadata;
    delete cleaned._timestamp;
    return cleaned;
  }
});

const composedManager = new PluginManager();
composedManager.register(timestampPlugin);
composedManager.register(analyticsPlugin);
composedManager.register(filterEmptyPlugin);
composedManager.register(cleanupPlugin);

let data = { name: 'John', age: 30, empty: '' };
data = composedManager.applyBeforeStringify(data, {});
console.log('After all plugins:', querystring.stringify(data));