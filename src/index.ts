export { parse, parseUrl } from './parser';
export { stringify, stringifyUrl } from './stringifier';
export { QueryBuilder } from './builder';
export { q, schema, validate, isValid } from './schema';
export {
  PluginManager,
  createPlugin,
  timestampPlugin,
  sortKeysPlugin,
  lowercaseKeysPlugin,
  filterEmptyPlugin,
  base64Plugin,
  compressPlugin,
  normalizePlugin,
  createCustomPlugin,
} from './plugins';
export {
  sanitizeInput,
  validateSecurity,
  countKeys,
  hasPrototypePollution,
  detectXSS,
  secureStringify,
  createSecureParser,
} from './security';

export * from './types';

import { parse as _parse, parseUrl as _parseUrl } from './parser';
import { stringify as _stringify, stringifyUrl as _stringifyUrl } from './stringifier';
import { QueryBuilder as _QueryBuilder } from './builder';
import { q as _q, schema as _schema, validate as _validate, isValid as _isValid } from './schema';
import { PluginManager } from './plugins';
import { createSecureParser } from './security';
import { ParseOptions, ParsedQuery, StringifyOptions } from './types';

const defaultPluginManager = new PluginManager();

export const querystring = {
  parse: <T extends object = ParsedQuery>(
    input: string,
    options?: ParseOptions & { plugins?: boolean | PluginManager }
  ): T => {
    const { plugins, ...parseOptions } = options || {};
    const pluginManager = plugins === true ? defaultPluginManager : plugins instanceof PluginManager ? plugins : null;
    
    if (pluginManager) {
      // [F018] beforeParse hooks are typed (input: string); non-string input stays graceful (-> {}).
      const processedInput =
        typeof input === 'string' ? pluginManager.applyBeforeParse(input, parseOptions) : input;
      const result = _parse(processedInput, parseOptions);
      return pluginManager.applyAfterParse(result, parseOptions) as unknown as T;
    }
    
    return _parse<T>(input, parseOptions);
  },
  
  stringify: (obj: unknown, options?: StringifyOptions & { plugins?: boolean | PluginManager }) => {
    const { plugins, ...stringifyOptions } = options || {};
    const pluginManager = plugins === true ? defaultPluginManager : plugins instanceof PluginManager ? plugins : null;
    
    if (pluginManager) {
      // [F036] beforeStringify hooks are typed (obj: ParsedQuery); null/primitive input stays graceful (-> '').
      const processedObj =
        obj !== null && typeof obj === 'object'
          ? pluginManager.applyBeforeStringify(obj as any, stringifyOptions)
          : obj;
      const result = _stringify(processedObj, stringifyOptions);
      return pluginManager.applyAfterStringify(result, stringifyOptions);
    }
    
    return _stringify(obj, stringifyOptions);
  },
  
  parseUrl: _parseUrl,
  stringifyUrl: _stringifyUrl,
  
  QueryBuilder: _QueryBuilder,
  builder: (options?: any) => new _QueryBuilder(options),
  
  q: _q,
  schema: _schema,
  validate: _validate,
  isValid: _isValid,
  
  plugins: defaultPluginManager,
  
  createSecureParser: (options?: any) => createSecureParser(_parse, options),
  
  version: '1.0.0',
};

export default querystring;