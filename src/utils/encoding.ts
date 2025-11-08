const hexTable = ((): string[] => {
  const array: string[] = [];
  for (let i = 0; i < 256; ++i) {
    array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
  }
  return array;
})();

export function encode(str: string, format: 'RFC1738' | 'RFC3986' = 'RFC3986', allowBrackets = false): string {
  if (str.length === 0) {
    return str;
  }

  const string = typeof str === 'string' ? str : String(str);

  if (format === 'RFC1738') {
    return encodeURIComponent(string).replace(/%20/g, '+');
  }

  const out: string[] = [];
  for (let i = 0; i < string.length; ++i) {
    let c = string.charCodeAt(i);

    if (
      c === 0x2D || // -
      c === 0x2E || // .
      c === 0x5F || // _
      c === 0x7E || // ~
      (allowBrackets && (c === 0x5B || c === 0x5D)) || // [ ]
      (c >= 0x30 && c <= 0x39) || // 0-9
      (c >= 0x41 && c <= 0x5A) || // a-z
      (c >= 0x61 && c <= 0x7A) || // A-Z
      (format === ('RFC1738' as string) && (c === 0x28 || c === 0x29)) // ( )
    ) {
      out.push(string[i]);
      continue;
    }

    if (c < 0x80) {
      out.push(hexTable[c]);
      continue;
    }

    if (c < 0x800) {
      out.push(hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
      continue;
    }

    if (c < 0xD800 || c >= 0xE000) {
      out.push(
        hexTable[0xE0 | (c >> 12)] +
        hexTable[0x80 | ((c >> 6) & 0x3F)] +
        hexTable[0x80 | (c & 0x3F)]
      );
      continue;
    }

    i += 1;
    if (i >= string.length) {
      throw new Error('Invalid UTF-8');
    }

    c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
    out.push(
      hexTable[0xF0 | (c >> 18)] +
      hexTable[0x80 | ((c >> 12) & 0x3F)] +
      hexTable[0x80 | ((c >> 6) & 0x3F)] +
      hexTable[0x80 | (c & 0x3F)]
    );
  }

  return out.join('');
}

export function decode(str: string): string {
  if (!str || str.length === 0) {
    return str;
  }

  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (e) {
    return str;
  }
}

export function isNonASCII(str: string): boolean {
  for (let i = 0; i < str.length; ++i) {
    if (str.charCodeAt(i) > 0x7F) {
      return true;
    }
  }
  return false;
}

export function interpretNumericEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_match, entity) => {
    const code = parseInt(entity, 10);
    if (code < 0xFFFF) {
      return String.fromCharCode(code);
    }
    return '';
  });
}

export function parseArrayValue(val: string, options: { parseNumbers?: boolean; parseBooleans?: boolean }): string | number | boolean {
  if (options.parseNumbers && !Number.isNaN(Number(val))) {
    const numVal = parseFloat(val);
    if (val === String(numVal)) {
      return numVal;
    }
  }

  if (options.parseBooleans) {
    if (val === 'true') return true;
    if (val === 'false') return false;
  }

  return val;
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

export function tryParseDate(str: string): Date | string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str;
  }

  const date = new Date(str);
  return isValidDate(date) ? date : str;
}

export function getSafeKey(key: string, allowDots: boolean): string {
  if (!allowDots) {
    return key;
  }

  return key.replace(/\.([^.[]+)/g, '[$1]');
}

export function compact<T>(array: (T | undefined | null)[]): T[] {
  const result: T[] = [];
  for (const item of array) {
    if (item !== undefined && item !== null) {
      result.push(item);
    }
  }
  return result;
}