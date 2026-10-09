import { ParseOptions, ParsedQuery, QueryValue, ArrayFormat, Primitive } from './types';
import {
  decode,
  decodeLatin1,
  parseArrayValue,
  tryParseDate,
  interpretNumericEntities
} from './utils/encoding';
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

// [F043] `parse<SearchParams>(...)` is the documented typed call; the result type is the caller's assertion.
export function parse<T extends object = ParsedQuery>(input: string, options?: ParseOptions): T;
export function parse(input: string, options?: ParseOptions): unknown {
  const opts = { ...defaults, ...options };
  const {
    delimiter,
    depth,
    arrayFormat: configuredArrayFormat,
    arrayFormatSeparator,
    decode: shouldDecode,
    decoder,
    charset: configuredCharset,
    charsetSentinel,
    interpretNumericEntities: shouldInterpretNumericEntities,
    parameterLimit,
    parseArrays,
    allowDots,
    plainObjects,
    allowPrototypes,
    allowSparse,
    strictNullHandling,
    comma,
    ignoreQueryPrefix,
    duplicates,
    parseNumbers,
    parseBooleans,
    parseDates,
    typeCoercion,
  } = opts;

  // [F041] `comma: true` selects the comma array format unless arrayFormat is given explicitly (as stringify does).
  const arrayFormat: ArrayFormat =
    options?.arrayFormat === undefined && comma ? 'comma' : configuredArrayFormat;

  if (!input || typeof input !== 'string') {
    return plainObjects ? Object.create(null) : {};
  }

  let queryString = input;

  if (ignoreQueryPrefix && queryString.charAt(0) === '?') {
    queryString = queryString.slice(1);
  }

  const pairs = queryString.split(delimiter);

  let charset = configuredCharset;
  if (charsetSentinel) {
    // [F023] Consume only a pair that is exactly the sentinel, never text inside other keys/values.
    // [F044] Either sentinel (utf-8 or the stringifier's iso-8859-1 one) is consumed and selects the charset.
    const utf8Index = pairs.indexOf('utf8=%E2%9C%93');
    const latin1Index = pairs.indexOf('utf8=%26%2310003%3B');
    const useLatin1 = latin1Index !== -1 && (utf8Index === -1 || latin1Index < utf8Index);
    const sentinelIndex = useLatin1 ? latin1Index : utf8Index;
    if (sentinelIndex !== -1) {
      pairs.splice(sentinelIndex, 1);
      charset = useLatin1 ? 'iso-8859-1' : 'utf-8';
    }
  }

  // [F038] charset 'iso-8859-1' decodes each %XX as one latin1 character; a custom decoder still wins.
  const baseDecoder = charset === 'iso-8859-1' ? decodeLatin1 : decode;
  const activeDecoder = decoder === decode ? baseDecoder : decoder;
  
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
      key = shouldDecode ? activeDecoder(pair, baseDecoder) : pair;
      val = strictNullHandling ? null as any : '';
    } else {
      const rawKey = pair.slice(0, equalIndex);
      const rawVal = pair.slice(equalIndex + 1);
      key = shouldDecode ? activeDecoder(rawKey, baseDecoder) : rawKey;
      val = shouldDecode ? activeDecoder(rawVal, baseDecoder) : rawVal;
    }

    if (shouldInterpretNumericEntities && charset === 'iso-8859-1') {
      val = interpretNumericEntities(val);
    }

    // [F002] val is null for bare keys under strictNullHandling.
    if (comma && typeof val === 'string' && val.indexOf(',') > -1) {
      val = val.split(',').join(',');
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
        // [F021] The key syntax declares an array; keep one-element arrays as arrays.
        parsedValue = [parsedValue as Primitive];
      }
      if (arrayFormat === 'comma' || arrayFormat === 'separator' || arrayFormat === 'json' || arrayFormat === 'bracket-separator') {
        parsedValue = parseArrayFormat(key, parsedValue as string, arrayFormat, arrayFormatSeparator);
        // [F040] `a[]=x` under the comma format declares an array too (what commaRoundTrip stringifies).
        if (arrayFormat === 'comma' && key.endsWith('[]')) {
          key = key.slice(0, -2);
          parsedValue = Array.isArray(parsedValue) ? parsedValue : ([parsedValue] as Primitive[]);
        }
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

  // [F003] allowSparse=false (default): drop holes created by index keys such as a[50000000]=x.
  return allowSparse ? result : (compactSparse(result) as ParsedQuery);
}

function compactSparse(value: QueryValue): QueryValue {
  if (Array.isArray(value)) {
    const indexKeys = Object.keys(value).filter((k) => /^\d+$/.test(k));
    const items: QueryValue[] =
      indexKeys.length === value.length
        ? value
        : indexKeys.map((k) => (value as unknown as Record<string, QueryValue>)[k]);
    for (let i = 0; i < items.length; i++) {
      items[i] = compactSparse(items[i]) as Primitive;
    }
    return items as Primitive[];
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const obj = value as Record<string, QueryValue>;
    for (const key of Object.keys(obj)) {
      const child = obj[key];
      const compacted = compactSparse(child);
      if (compacted !== child) {
        defineKey(obj, key, compacted);
      }
    }
  }

  return value;
}

function defineKey(
  target: Record<string, QueryValue>,
  key: string,
  value: QueryValue
): void {
  if (key === '__proto__') {
    // Plain assignment would invoke the Object.prototype.__proto__ setter and
    // rewrite the target's prototype chain instead of storing the key; define
    // an own property instead, matching the null-prototype (plainObjects)
    // behavior so parsed data stays visible to own-key consumers.
    Object.defineProperty(target, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }

  target[key] = value;
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

    let next = target[key] as Record<string, QueryValue>;

    if (!hasOwn(target, key)) {
      next = isArrayIndex ? [] : plainObjects ? Object.create(null) : {};
      defineKey(target, key, next);
    } else if (next === null || typeof next !== 'object') {
      // [F001] A scalar already owns this key (`a=1&a[b]=2`); descending into it
      // would throw, so resolve the conflict with the duplicates policy instead.
      if (duplicates === 'first') {
        return;
      }
      const container: Record<string, QueryValue> = isArrayIndex
        ? []
        : plainObjects
          ? Object.create(null)
          : {};
      // Wrap explicitly: combineArrayValues() would flatten an array container.
      defineKey(
        target,
        key,
        duplicates === 'last' ? container : ([next, container] as unknown as QueryValue)
      );
      next = container;
    } else if (Array.isArray(next) && !isArrayIndex) {
      // [F022] A named key cannot live on an array (JSON/stringify/array methods ignore it): continue in the
      // last object element, or append a new object element.
      const items = next as unknown as QueryValue[];
      const last = items[items.length - 1];
      if (last !== null && typeof last === 'object' && !Array.isArray(last)) {
        next = last as Record<string, QueryValue>;
      } else {
        const container: Record<string, QueryValue> = plainObjects ? Object.create(null) : {};
        items.push(container);
        next = container;
      }
    }

    target = next;
  }

  const lastKey = keys[keys.length - 1];

  if (duplicates === 'first' && hasOwn(target, lastKey)) {
    return;
  }

  if (duplicates === 'last' || !hasOwn(target, lastKey)) {
    defineKey(target, lastKey, value);
  } else if (duplicates === 'combine') {
    // Safe once the key exists as an own data property: it shadows the
    // inherited __proto__ accessor, so assignment updates the own key.
    target[lastKey] = combineArrayValues(target[lastKey], value);
  }
}

export function parseUrl(url: string, options?: ParseOptions): { url: string; query: ParsedQuery } {
  if (!url || typeof url !== 'string') {
    return { url: '', query: {} };
  }

  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  // [F026] The query ends at '#'; a '?' after '#' belongs to the fragment.
  if (queryIndex === -1 || (hashIndex !== -1 && hashIndex < queryIndex)) {
    return { url, query: {} };
  }

  const baseUrl = url.slice(0, queryIndex);
  const queryString = url.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex);
  const query = parse(queryString, options);

  return { url: baseUrl, query };
}