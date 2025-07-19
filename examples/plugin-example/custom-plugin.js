const { createPlugin, PluginManager, querystring } = require('@oxog/querystring');

// Example 1: Logging Plugin
const loggingPlugin = createPlugin({
  name: 'logger',
  beforeParse: (input, options) => {
    console.log(`[PARSE] Input: "${input}"`);
    console.log(`[PARSE] Options:`, options);
    return input;
  },
  afterParse: (result, options) => {
    console.log(`[PARSE] Result:`, result);
    return result;
  },
  beforeStringify: (obj, options) => {
    console.log(`[STRINGIFY] Input:`, obj);
    console.log(`[STRINGIFY] Options:`, options);
    return obj;
  },
  afterStringify: (result, options) => {
    console.log(`[STRINGIFY] Result: "${result}"`);
    return result;
  }
});

// Example 2: API Key Plugin
const apiKeyPlugin = createPlugin({
  name: 'api-key',
  beforeStringify: (obj, options) => {
    // Add API key to all requests
    return {
      ...obj,
      api_key: process.env.API_KEY || 'demo-key'
    };
  },
  afterParse: (result, options) => {
    // Remove API key from parsed results for security
    const { api_key, ...rest } = result;
    return rest;
  }
});

// Example 3: Prefix Plugin
const prefixPlugin = createPlugin({
  name: 'prefix',
  beforeStringify: (obj, options) => {
    // Add prefix to all keys
    const prefixed = {};
    for (const [key, value] of Object.entries(obj)) {
      prefixed[`app_${key}`] = value;
    }
    return prefixed;
  },
  afterParse: (result, options) => {
    // Remove prefix from parsed keys
    const unprefixed = {};
    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith('app_')) {
        unprefixed[key.substring(4)] = value;
      } else {
        unprefixed[key] = value;
      }
    }
    return unprefixed;
  }
});

// Example 4: Encryption Plugin (simplified example)
const encryptionPlugin = createPlugin({
  name: 'encryption',
  beforeStringify: (obj, options) => {
    const encrypted = { ...obj };
    // Encrypt sensitive fields
    const sensitiveFields = ['password', 'ssn', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        // Simple base64 encoding (use real encryption in production!)
        encrypted[field] = Buffer.from(String(encrypted[field])).toString('base64');
        encrypted[`${field}_encrypted`] = true;
      }
    }
    
    return encrypted;
  },
  afterParse: (result, options) => {
    const decrypted = { ...result };
    
    // Decrypt fields that were encrypted
    for (const [key, value] of Object.entries(decrypted)) {
      if (key.endsWith('_encrypted') && value === true) {
        const fieldName = key.replace('_encrypted', '');
        if (decrypted[fieldName]) {
          // Simple base64 decoding (use real decryption in production!)
          decrypted[fieldName] = Buffer.from(String(decrypted[fieldName]), 'base64').toString();
        }
        delete decrypted[key];
      }
    }
    
    return decrypted;
  }
});

// Example 5: Validation Plugin
const validationPlugin = createPlugin({
  name: 'validation',
  afterParse: (result, options) => {
    // Validate email fields
    for (const [key, value] of Object.entries(result)) {
      if (key.includes('email') && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error(`Invalid email format for field "${key}": ${value}`);
        }
      }
    }
    
    // Validate phone numbers
    for (const [key, value] of Object.entries(result)) {
      if (key.includes('phone') && typeof value === 'string') {
        const phoneRegex = /^\+?[\d\s-()]+$/;
        if (!phoneRegex.test(value)) {
          throw new Error(`Invalid phone format for field "${key}": ${value}`);
        }
      }
    }
    
    return result;
  }
});

// Example 6: Compression Plugin for large data
const compressionPlugin = createPlugin({
  name: 'compression',
  beforeStringify: (obj, options) => {
    // Compress large string values
    const compressed = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > 1000) {
        // Use simple compression indicator (use real compression in production!)
        compressed[key] = `COMPRESSED:${value.substring(0, 50)}...`;
        compressed[`${key}_length`] = value.length;
      } else {
        compressed[key] = value;
      }
    }
    
    return compressed;
  }
});

// Example usage
console.log('=== Plugin Examples ===\n');

// Create plugin manager
const manager = new PluginManager();

// Register plugins
manager.register(loggingPlugin);
manager.register(apiKeyPlugin);
manager.register(prefixPlugin);

// Example 1: Using plugins with parse
console.log('1. Parsing with plugins:');
const query = 'name=John&email=john@example.com&age=30';
const parsed = querystring.parse(query, { plugins: manager });
console.log('Final result:', parsed);
console.log();

// Example 2: Using plugins with stringify
console.log('2. Stringifying with plugins:');
const data = {
  name: 'Jane',
  email: 'jane@example.com',
  role: 'admin'
};
const stringified = querystring.stringify(data, { plugins: manager });
console.log('Final result:', stringified);
console.log();

// Example 3: Using encryption plugin
console.log('3. Encryption plugin example:');
const secureManager = new PluginManager();
secureManager.register(encryptionPlugin);

const sensitiveData = {
  username: 'john_doe',
  password: 'super_secret_123',
  ssn: '123-45-6789'
};

const encrypted = querystring.stringify(sensitiveData, { plugins: secureManager });
console.log('Encrypted query:', encrypted);

const decrypted = querystring.parse(encrypted, { plugins: secureManager });
console.log('Decrypted data:', decrypted);
console.log();

// Example 4: Using validation plugin
console.log('4. Validation plugin example:');
const validationManager = new PluginManager();
validationManager.register(validationPlugin);

try {
  const validData = querystring.parse('email=valid@example.com&phone=+1-234-567-8900', {
    plugins: validationManager
  });
  console.log('Valid data:', validData);
} catch (error) {
  console.error('Validation error:', error.message);
}

try {
  const invalidData = querystring.parse('email=invalid-email&phone=abc123', {
    plugins: validationManager
  });
} catch (error) {
  console.error('Validation error:', error.message);
}

// Example 5: Chaining multiple plugins
console.log('\n5. Chaining multiple plugins:');
const chainedManager = new PluginManager();
chainedManager.register(loggingPlugin);
chainedManager.register(validationPlugin);
chainedManager.register(prefixPlugin);
chainedManager.register(apiKeyPlugin);

const complexData = {
  user_email: 'user@example.com',
  user_phone: '+1-555-0123',
  action: 'subscribe'
};

const processed = querystring.stringify(complexData, { plugins: chainedManager });
console.log('\nProcessed query:', processed);

// Example 6: Custom plugin with options
const configurablePlugin = createPlugin({
  name: 'configurable',
  beforeParse: (input, options) => {
    const config = options.pluginConfig?.configurable || {};
    
    if (config.uppercase) {
      return input.toUpperCase();
    }
    if (config.lowercase) {
      return input.toLowerCase();
    }
    
    return input;
  }
});

console.log('\n6. Configurable plugin example:');
const configManager = new PluginManager();
configManager.register(configurablePlugin);

const upperResult = querystring.parse('Name=John&Age=30', {
  plugins: configManager,
  pluginConfig: {
    configurable: {
      lowercase: true
    }
  }
});
console.log('Lowercase result:', upperResult);