# Plugin System Documentation

## Overview

The plugin system in @oxog/querystring allows you to extend and modify the behavior of parsing and stringifying operations through a simple hook-based architecture.

## Creating Plugins

### Basic Plugin Structure

```javascript
import { createPlugin } from '@oxog/querystring';

const myPlugin = createPlugin({
  name: 'my-plugin',
  
  // Called before parsing starts
  beforeParse: (input, options) => {
    // Modify the input string
    return input;
  },
  
  // Called after parsing completes
  afterParse: (result, options) => {
    // Modify the parsed result
    return result;
  },
  
  // Called before stringifying starts
  beforeStringify: (obj, options) => {
    // Modify the object to stringify
    return obj;
  },
  
  // Called after stringifying completes
  afterStringify: (result, options) => {
    // Modify the stringified result
    return result;
  }
});
```

### Using createCustomPlugin

For more flexibility, use `createCustomPlugin`:

```javascript
import { createCustomPlugin } from '@oxog/querystring';

const customPlugin = createCustomPlugin('custom', {
  beforeParse: (input) => {
    console.log('Parsing:', input);
    return input;
  },
  afterStringify: (result) => {
    return result + '&_source=api';
  }
});
```

## Plugin Manager

### Creating a Plugin Manager

```javascript
import { PluginManager } from '@oxog/querystring';

const manager = new PluginManager();
```

### Registering Plugins

```javascript
manager.register(myPlugin);
manager.register(anotherPlugin);

// Or create with initial plugins
const manager = PluginManager.create([plugin1, plugin2]);
```

### Managing Plugins

```javascript
// Check if plugin exists
if (manager.has('my-plugin')) {
  // Get plugin
  const plugin = manager.get('my-plugin');
}

// List all plugins
const pluginNames = manager.list();

// Unregister a plugin
manager.unregister('my-plugin');

// Clear all plugins
manager.clear();
```

## Built-in Plugins

### timestampPlugin

Adds a timestamp to objects before stringifying.

```javascript
import { timestampPlugin } from '@oxog/querystring';

manager.register(timestampPlugin);

// Before stringify: { foo: 'bar' }
// After plugin: { foo: 'bar', _timestamp: 1234567890 }
```

### sortKeysPlugin

Sorts object keys alphabetically before stringifying.

```javascript
import { sortKeysPlugin } from '@oxog/querystring';

manager.register(sortKeysPlugin);

// Before: { z: 1, a: 2, m: 3 }
// After: { a: 2, m: 3, z: 1 }
```

### lowercaseKeysPlugin

Converts all keys to lowercase.

```javascript
import { lowercaseKeysPlugin } from '@oxog/querystring';

manager.register(lowercaseKeysPlugin);

// Parse: FOO=bar&BAZ=qux
// Result: { foo: 'bar', baz: 'qux' }
```

### filterEmptyPlugin

Removes empty values before stringifying.

```javascript
import { filterEmptyPlugin } from '@oxog/querystring';

manager.register(filterEmptyPlugin);

// Before: { name: 'John', empty: '', nil: null, arr: [] }
// After: { name: 'John' }
```

### base64Plugin

Encodes/decodes query strings as base64.

```javascript
import { base64Plugin } from '@oxog/querystring';

manager.register(base64Plugin);

// Stringify result: "Zm9vPWJhciZiYXo9cXV4"
// Parse input: "Zm9vPWJhciZiYXo9cXV4" → "foo=bar&baz=qux"
```

### compressPlugin

Decompresses common URL encodings for readability.

```javascript
import { compressPlugin } from '@oxog/querystring';

manager.register(compressPlugin);

// Input: "path%2Fto%2Ffile%20name"
// Output: "path/to/file name"
```

### normalizePlugin

Normalizes string values to appropriate types.

```javascript
import { normalizePlugin } from '@oxog/querystring';

manager.register(normalizePlugin);

// Parse result: { bool: 'true', num: '42', str: '  hello  ' }
// After plugin: { bool: true, num: 42, str: 'hello' }
```

## Using Plugins with parse/stringify

### Direct Usage

```javascript
import querystring, { PluginManager, timestampPlugin } from '@oxog/querystring';

const manager = new PluginManager();
manager.register(timestampPlugin);

// Option 1: Apply plugins manually
const input = 'foo=bar';
const processedInput = manager.applyBeforeParse(input, {});
const parsed = querystring.parse(processedInput);
const result = manager.applyAfterParse(parsed, {});

// Option 2: Use the integrated API
const result = querystring.parse('foo=bar', { plugins: manager });
```

### Default Plugin Manager

```javascript
// Use the default plugin manager
querystring.plugins.register(myPlugin);

// Enable default plugins
const result = querystring.parse('foo=bar', { plugins: true });
```

## Advanced Plugin Examples

### Analytics Plugin

Track query string usage:

```javascript
const analyticsPlugin = createPlugin({
  name: 'analytics',
  afterParse: (result, options) => {
    // Track parsed queries
    analytics.track('query_parsed', {
      keys: Object.keys(result),
      count: Object.keys(result).length,
      timestamp: Date.now()
    });
    return result;
  }
});
```

### Validation Plugin

Validate data during parsing:

```javascript
const validationPlugin = createPlugin({
  name: 'validation',
  afterParse: (result, options) => {
    // Validate email fields
    for (const [key, value] of Object.entries(result)) {
      if (key.includes('email') && typeof value === 'string') {
        if (!value.includes('@')) {
          throw new Error(`Invalid email: ${value}`);
        }
      }
    }
    return result;
  }
});
```

### Encryption Plugin

Encrypt sensitive data:

```javascript
const encryptionPlugin = createPlugin({
  name: 'encryption',
  beforeStringify: (obj, options) => {
    const encrypted = { ...obj };
    // Encrypt sensitive fields
    if (encrypted.password) {
      encrypted.password = encrypt(encrypted.password);
    }
    return encrypted;
  },
  afterParse: (result, options) => {
    // Decrypt sensitive fields
    if (result.password) {
      result.password = decrypt(result.password);
    }
    return result;
  }
});
```

### Caching Plugin

Cache parse results:

```javascript
const cache = new Map();

const cachingPlugin = createPlugin({
  name: 'caching',
  beforeParse: (input, options) => {
    const cached = cache.get(input);
    if (cached) {
      // Return a special marker that parse will handle
      return `__CACHED__:${JSON.stringify(cached)}`;
    }
    return input;
  },
  afterParse: (result, options) => {
    // Store in cache for next time
    const originalInput = options._originalInput;
    if (originalInput) {
      cache.set(originalInput, result);
    }
    return result;
  }
});
```

## Plugin Composition

Combine multiple plugins for complex behavior:

```javascript
const compositePlugin = createPlugin({
  name: 'composite',
  beforeParse: (input, options) => {
    // Apply multiple transformations
    input = lowercasePlugin.beforeParse(input, options);
    input = trimPlugin.beforeParse(input, options);
    return input;
  },
  afterParse: (result, options) => {
    // Apply multiple post-processing steps
    result = normalizePlugin.afterParse(result, options);
    result = validationPlugin.afterParse(result, options);
    return result;
  }
});
```

## Best Practices

1. **Plugin Naming**: Use descriptive, unique names to avoid conflicts
2. **Error Handling**: Wrap operations in try-catch when appropriate
3. **Performance**: Keep plugin operations lightweight
4. **Side Effects**: Avoid modifying the original input/output objects
5. **Documentation**: Document what your plugin does and any options it accepts

## Plugin Options

Pass options to plugins through the parse/stringify options:

```javascript
const myPlugin = createPlugin({
  name: 'configurable',
  beforeParse: (input, options) => {
    const pluginOptions = options.pluginOptions?.configurable || {};
    if (pluginOptions.uppercase) {
      return input.toUpperCase();
    }
    return input;
  }
});

// Use with options
querystring.parse('foo=bar', {
  plugins: manager,
  pluginOptions: {
    configurable: {
      uppercase: true
    }
  }
});
```

## Testing Plugins

```javascript
import { createPlugin, PluginManager } from '@oxog/querystring';

describe('MyPlugin', () => {
  const plugin = createPlugin({
    name: 'test-plugin',
    afterParse: (result) => ({
      ...result,
      _processed: true
    })
  });

  it('should add _processed flag', () => {
    const manager = new PluginManager();
    manager.register(plugin);
    
    const result = manager.applyAfterParse({ foo: 'bar' }, {});
    expect(result).toHaveProperty('_processed', true);
  });
});
```