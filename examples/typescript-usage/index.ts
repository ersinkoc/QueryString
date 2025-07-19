import querystring, { QueryBuilder, q, schema } from '@oxog/querystring';

// Define interfaces
interface SearchParams {
  q: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'popularity';
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

// Type-safe parsing
console.log('=== Type-safe Parsing ===');
const searchQuery = 'q=typescript&page=2&limit=20&filters[category]=tutorials';
const searchParams = querystring.parse<SearchParams>(searchQuery, {
  parseNumbers: true
});
console.log('Search params:', searchParams);
console.log('Page type:', typeof searchParams.page); // number

// Schema validation
console.log('\n=== Schema Validation ===');
const searchSchema = schema({
  q: q.string().min(1).max(100),
  page: q.number().min(1).default(1),
  limit: q.number().min(1).max(100).default(20),
  sort: q.enum('relevance', 'date', 'popularity').optional(),
  filters: q.object().shape({
    category: q.string().optional(),
    minPrice: q.number().min(0).optional(),
    maxPrice: q.number().min(0).optional(),
    tags: q.array(q.string()).optional()
  }).optional()
});

// Validate parsed query
const validationResult = searchSchema.safeParse(searchParams);
if (validationResult.success) {
  console.log('Valid search params:', validationResult.data);
} else {
  console.log('Validation errors:', validationResult.errors);
}

// QueryBuilder with TypeScript
console.log('\n=== QueryBuilder with Types ===');
const builder = new QueryBuilder<SearchParams>()
  .add('q', 'typescript tutorial')
  .add('page', 1)
  .add('limit', 20)
  .add('sort', 'relevance')
  .addObject('filters', {
    category: 'programming',
    minPrice: 0,
    maxPrice: 50,
    tags: ['typescript', 'tutorial', 'beginner']
  });

const builtQuery = builder.build({ arrayFormat: 'brackets' });
console.log('Built query:', builtQuery);

// Advanced schema with transforms
console.log('\n=== Advanced Schema ===');
const userSchema = schema({
  id: q.number().positive(),
  name: q.string().min(2).max(50),
  email: q.string().email(),
  preferences: q.object().shape({
    theme: q.enum('light', 'dark').default('light'),
    notifications: q.boolean().default(true)
  })
});

const userQuery = 'id=123&name=John%20Doe&email=john@example.com&preferences[theme]=dark&preferences[notifications]=false';
const userData = userSchema.parse(
  querystring.parse(userQuery, {
    parseNumbers: true,
    parseBooleans: true
  })
);
console.log('Validated user:', userData);

// Generic function with query string types
function buildApiUrl<T extends Record<string, any>>(
  endpoint: string,
  params: T,
  options?: Parameters<typeof querystring.stringify>[1]
): string {
  const query = querystring.stringify(params, options);
  return `https://api.example.com${endpoint}${query ? '?' + query : ''}`;
}

// Use the generic function
const apiUrl = buildApiUrl('/users', {
  role: 'admin',
  active: true,
  departments: ['engineering', 'product']
}, {
  arrayFormat: 'comma',
  parseBooleans: true
});
console.log('\n=== Generic API URL ===');
console.log('API URL:', apiUrl);

// Complex nested structure with validation
console.log('\n=== Complex Validation ===');
const orderSchema = schema({
  orderId: q.string().uuid(),
  customer: q.object().shape({
    id: q.number(),
    name: q.string(),
    email: q.string().email()
  }),
  items: q.array(
    q.object().shape({
      productId: q.string(),
      quantity: q.number().positive(),
      price: q.number().positive()
    })
  ).min(1),
  total: q.number().positive(),
  status: q.enum('pending', 'processing', 'shipped', 'delivered'),
  createdAt: q.date()
});

// Example of runtime type guards
function isSearchParams(obj: any): obj is SearchParams {
  return searchSchema.safeParse(obj).success;
}

const unknownQuery = querystring.parse('q=test&page=1');
if (isSearchParams(unknownQuery)) {
  // TypeScript knows this is SearchParams
  console.log('\n=== Type Guard ===');
  console.log('Valid search query:', unknownQuery.q);
}

// Conditional query building with type safety
console.log('\n=== Conditional Building ===');
class ApiQueryBuilder<T extends Record<string, any>> extends QueryBuilder<T> {
  addIfDefined<K extends keyof T>(key: K, value: T[K] | undefined): this {
    if (value !== undefined) {
      this.add(key as string, value);
    }
    return this;
  }

  addPagination(page?: number, limit?: number): this {
    this.addIfDefined('page' as keyof T, page as T[keyof T]);
    this.addIfDefined('limit' as keyof T, limit as T[keyof T]);
    return this;
  }
}

const apiQuery = new ApiQueryBuilder<SearchParams>()
  .add('q', 'typescript')
  .addIfDefined('sort', undefined) // Won't be added
  .addPagination(2, 50)
  .build();

console.log('Conditional query:', apiQuery);