const hexTable = (() => {
  const array: string[] = [];
  for (let i = 0; i < 256; ++i) {
    array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
  }
  return array;
})();

// [F039] iso-8859-1: one %XX byte up to U+00FF, a numeric character reference (as qs does) beyond that.
const LATIN1_SAFE = /^[A-Za-z0-9\-._~]$/;
const LATIN1_SAFE_BRACKETS = /^[[\]]$/;
const LATIN1_SAFE_RFC1738 = /^[!'()*]$/;

function encodeLatin1(
  string: string,
  format: 'RFC1738' | 'RFC3986',
  allowBrackets: boolean
): string {
  const out: string[] = [];
  for (let i = 0; i < string.length; ++i) {
    let c = string.charCodeAt(i);
    const ch = string[i];
    const keepsRaw =
      LATIN1_SAFE.test(ch) ||
      (allowBrackets && LATIN1_SAFE_BRACKETS.test(ch)) ||
      (format === 'RFC1738' && LATIN1_SAFE_RFC1738.test(ch));
    if (keepsRaw) {
      out.push(string[i]);
    } else if (c === 0x20 && format === 'RFC1738') {
      out.push('+');
    } else if (c < 0x100) {
      out.push(hexTable[c]);
    } else {
      if (c >= 0xd800 && c < 0xe000) {
        const next = i + 1 < string.length ? string.charCodeAt(i + 1) : 0;
        if (c >= 0xdc00 || next < 0xdc00 || next > 0xdfff) {
          throw new Error('Invalid UTF-8');
        }
        i += 1;
        c = 0x10000 + (((c & 0x3ff) << 10) | (next & 0x3ff));
      }
      out.push('%26%23' + c + '%3B');
    }
  }
  return out.join('');
}

export function decodeLatin1(str: string): string {
  if (!str || str.length === 0) {
    return str;
  }

  return str
    .replace(/\+/g, ' ')
    .replace(/%([0-9a-fA-F]{2})/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function encode(
  str: string,
  format: 'RFC1738' | 'RFC3986' = 'RFC3986',
  allowBrackets = false,
  charset: 'utf-8' | 'iso-8859-1' = 'utf-8'
): string {
  if (str.length === 0) {
    return str;
  }

  const string = typeof str === 'string' ? str : String(str);

  if (charset === 'iso-8859-1') {
    return encodeLatin1(string, format, allowBrackets);
  }

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

    // [F007] Only a high surrogate followed by a low surrogate is a valid pair; a lone
    // surrogate would otherwise swallow the next character and encode a bogus code point.
    const next = i + 1 < string.length ? string.charCodeAt(i + 1) : 0;
    if (c >= 0xDC00 || next < 0xDC00 || next > 0xDFFF) {
      throw new Error('Invalid UTF-8');
    }
    i += 1;

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

  // [F045] '+' is a space even when another escape is malformed; only the percent-decoding falls back.
  const spaced = str.replace(/\+/g, ' ');

  try {
    return decodeURIComponent(spaced);
  } catch (e) {
    return spaced;
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
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!match) {
    return str;
  }

  // [F027] V8's legacy fallback rolls impossible days over (2021-02-29 -> 2021-03-01); reject them.
  const lastDay = new Date(Date.UTC(2000, 0, 1));
  lastDay.setUTCFullYear(Number(match[1]), Number(match[2]), 0);
  if (Number(match[3]) > lastDay.getUTCDate()) {
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