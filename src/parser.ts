import { ParseOptions, ParsedQuery, QueryValue, ArrayFormat } from './types';
import { decode, parseArrayValue, tryParseDate, interpretNumericEntities } from './utils/encoding';
import { hasOwn } from './utils/object';
import { parseArrayFormat, isArrayKey, normalizeArrayKey, combineArrayValues } from './utils/array';

const defaults: Required<ParseOptions> = {
  delimiter: '&',
  depth: 5,
  arrayFormat: 'repeat',
  arrayFormatSeparator: ',',
  decode: true,
  decoder: decode,
  charset: 'utf-8',
  charsetSentinel: false,
  interpretNumericEntities: false,
  parameterLimit: 1000,
  parseArrays: true,
  allowDots: false,
  plainObjects: false,
  allowPrototypes: false,
  allowSparse: false,
  strictNullHandling: false,
  comma: false,
  commaRoundTrip: false,
  ignoreQueryPrefix: false,
  duplicates: 'combine',
  parseNumbers: false,
  parseBooleans: false,
  parseDates: false,
  typeCoercion: false,
};

export function parse(input: string, options?: ParseOptions): ParsedQuery {
  const opts = { ...defaults, ...options };
  const {
    delimiter,
    depth,
    arrayFormat,
    arrayFormatSeparator,
    decode: shouldDecode,
    decoder,
    charset,
    charsetSentinel,
    interpretNumericEntities: shouldInterpretNumericEntities,
    parameterLimit,
    parseArrays,
    allowDots,
    plainObjects,
    allowPrototypes,
    strictNullHandling,
    ignoreQueryPrefix,
    duplicates,
    parseNumbers,
    parseBooleans,
    parseDates,
    typeCoercion,
  } = opts;

  if (!input || typeof input !== 'string') {
    return plainObjects ? Object.create(null) : {};
  }

  let queryString = input;

  if (ignoreQueryPrefix && queryString.charAt(0) === '?') {
    queryString = queryString.slice(1);
  }

  if (charsetSentinel) {
    const charsetMatch = queryString.match(/utf8=%E2%9C%93/);
    if (charsetMatch) {
      queryString = queryString.replace(/utf8=%E2%9C%93&?/, '');
    }
  }

  const pairs = queryString.split(delimiter);
  
  const result: ParsedQuery = plainObjects ? Object.create(null) : {};

  if (pairs.length > parameterLimit) {
    throw new Error(`Parameter limit exceeded. Maximum allowed: ${parameterLimit}`);
  }

  const typeCoercionOpts = typeof typeCoercion === 'object' ? typeCoercion : {
    numbers: typeCoercion === true || parseNumbers,
    booleans: typeCoercion === true || parseBooleans,
    dates: typeCoercion === true || parseDates,
    arrays: parseArrays,
    objects: true,
  };

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    
    // Skip empty pairs
    if (!pair) {
      continue;
    }
    
    const equalIndex = pair.indexOf('=');

    let key: string;
    let val: string;

    if (equalIndex === -1) {
      key = shouldDecode ? decoder(pair, decode) : pair;
      val = strictNullHandling ? null as any : '';
    } else {
      key = shouldDecode ? decoder(pair.slice(0, equalIndex), decode) : pair.slice(0, equalIndex);
      val = shouldDecode ? decoder(pair.slice(equalIndex + 1), decode) : pair.slice(equalIndex + 1);
    }

    if (shouldInterpretNumericEntities && charset === 'iso-8859-1') {
      val = interpretNumericEntities(val);
    }

    let parsedValue: QueryValue = val;

    if (typeCoercionOpts.numbers || typeCoercionOpts.booleans) {
      parsedValue = parseArrayValue(val, {
        parseNumbers: typeCoercionOpts.numbers,
        parseBooleans: typeCoercionOpts.booleans,
      });
    }

    if (typeCoercionOpts.dates && typeof parsedValue === 'string') {
      const dateValue = tryParseDate(parsedValue);
      if (dateValue instanceof Date) {
        parsedValue = dateValue as any;
      }
    }

    if (parseArrays) {
      if (isArrayKey(key, arrayFormat)) {
        key = normalizeArrayKey(key, arrayFormat);
      }
      if (arrayFormat === 'comma' || arrayFormat === 'separator' || arrayFormat === 'json' || arrayFormat === 'bracket-separator') {
        parsedValue = parseArrayFormat(key, parsedValue as string, arrayFormat, arrayFormatSeparator);
      }
    }

    let keys: string[];
    if (allowDots) {
      keys = key.split('.');
    } else if (key.includes('[') && key.includes(']')) {
      // Handle bracket notation like a[b][c]
      keys = key.split(/[\[\]]+/).filter(Boolean);
    } else {
      keys = [key];
    }
    parseKeys(result, keys, parsedValue, {
      depth,
      plainObjects,
      allowPrototypes,
      duplicates,
      arrayFormat,
    });
  }

  return result;
}

function parseKeys(
  obj: ParsedQuery,
  keys: string[],
  value: QueryValue,
  options: {
    depth: number;
    plainObjects: boolean;
    allowPrototypes: boolean;
    duplicates: 'combine' | 'first' | 'last';
    arrayFormat: ArrayFormat;
  }
): void {
  if (keys.length === 0) {
    return;
  }

  const { depth, plainObjects, duplicates } = options;
  let target = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isArrayIndex = /^\d+$/.test(nextKey);

    if (i >= depth) {
      return;
    }

    if (!hasOwn(target, key)) {
      if (isArrayIndex) {
        target[key] = [];
      } else {
        target[key] = plainObjects ? Object.create(null) : {};
      }
    }

    target = target[key] as Record<string, QueryValue>;
  }

  const lastKey = keys[keys.length - 1];

  if (duplicates === 'first' && hasOwn(target, lastKey)) {
    return;
  }

  if (duplicates === 'last' || !hasOwn(target, lastKey)) {
    target[lastKey] = value;
  } else if (duplicates === 'combine') {
    target[lastKey] = combineArrayValues(target[lastKey], value);
  }
}

export function parseUrl(url: string, options?: ParseOptions): { url: string; query: ParsedQuery } {
  if (!url || typeof url !== 'string') {
    return { url: '', query: {} };
  }

  const queryIndex = url.indexOf('?');
  
  if (queryIndex === -1) {
    return { url, query: {} };
  }

  const baseUrl = url.slice(0, queryIndex);
  const queryString = url.slice(queryIndex + 1);
  const query = parse(queryString, options);

  return { url: baseUrl, query };
}