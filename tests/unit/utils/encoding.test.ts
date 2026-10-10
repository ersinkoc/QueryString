import {
  encode,
  decode,
  isValidDate,
  isNonASCII,
  interpretNumericEntities,
  parseArrayValue,
  tryParseDate,
  getSafeKey,
  compact,
  decodeLatin1,
} from '../../../src/utils/encoding';

describe('Encoding utilities', () => {
  describe('encode', () => {
    it('should encode special characters in RFC3986 format', () => {
      expect(encode('hello world')).toBe('hello%20world');
      expect(encode('hello+world')).toBe('hello%2Bworld');
      expect(encode('hello@world')).toBe('hello%40world');
      expect(encode('hello#world')).toBe('hello%23world');
    });

    it('should encode special characters in RFC1738 format', () => {
      expect(encode('hello world', 'RFC1738')).toBe('hello+world');
      expect(encode('hello+world', 'RFC1738')).toBe('hello%2Bworld');
      expect(encode('hello@world', 'RFC1738')).toBe('hello%40world');
    });

    it('should allow brackets when specified', () => {
      expect(encode('hello[world]')).toBe('hello%5Bworld%5D');
      expect(encode('hello[world]', 'RFC3986', true)).toBe('hello[world]');
      expect(encode('hello[world]', 'RFC1738', true)).toBe('hello%5Bworld%5D'); // RFC1738 uses encodeURIComponent, doesn't respect allowBrackets
    });

    it('should not encode safe characters', () => {
      const safeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      expect(encode(safeChars)).toBe(safeChars);
    });

    it('should handle empty strings', () => {
      expect(encode('')).toBe('');
    });

    it('should handle unicode characters', () => {
      expect(encode('hello世界')).toBe('hello%E4%B8%96%E7%95%8C');
      expect(encode('😀')).toBe('%F0%9F%98%80');
    });

    it('should handle null and undefined bytes', () => {
      expect(encode('\x00')).toBe('%00');
      expect(encode('\u0000')).toBe('%00');
    });

    it('should handle high-value unicode characters', () => {
      expect(encode('\uD83D\uDE00')).toBe('%F0%9F%98%80'); // emoji
    });

    it('should handle invalid UTF-8 surrogate pairs', () => {
      // This tests the "Invalid UTF-8" error case
      expect(() => encode('\uD83D')).toThrow('Invalid UTF-8');
    });
  });

  describe('decode', () => {
    it('should decode percent-encoded characters', () => {
      expect(decode('hello%20world')).toBe('hello world');
      expect(decode('hello%2Bworld')).toBe('hello+world');
      expect(decode('hello%40world')).toBe('hello@world');
    });

    it('should always decode plus signs as spaces', () => {
      expect(decode('hello+world')).toBe('hello world');
      expect(decode('hello%2Bworld')).toBe('hello+world');
    });

    it('should handle malformed encoding gracefully', () => {
      expect(decode('hello%2')).toBe('hello%2'); // incomplete encoding - returns original
      expect(decode('hello%ZZ')).toBe('hello%ZZ'); // invalid hex - returns original
      expect(decode('hello%')).toBe('hello%'); // incomplete encoding - returns original
    });

    it('still turns plus signs into spaces when another escape is malformed (F045)', () => {
      expect(decode('x+y%zz')).toBe('x y%zz');
      expect(decode('50%+off')).toBe('50% off');
      expect(decode('a+b%2')).toBe('a b%2');
      expect(decode('%41+%zz')).toBe('%41 %zz');
      expect(decode('+')).toBe(' ');
    });

    it('should decode unicode characters', () => {
      expect(decode('hello%E4%B8%96%E7%95%8C')).toBe('hello世界');
      expect(decode('%F0%9F%98%80')).toBe('😀');
    });

    it('should handle empty strings', () => {
      expect(decode('')).toBe('');
    });

    it('should handle mixed encoded and unencoded content', () => {
      expect(decode('hello%20world%2Btest')).toBe('hello world+test');
    });

    it('should handle plus signs and percent encoding together', () => {
      expect(decode('hello+%20world')).toBe('hello  world'); // plus becomes space, %20 becomes space
      expect(decode('hello%25world')).toBe('hello%world');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid Date objects', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2023-01-01'))).toBe(true);
      expect(isValidDate(new Date(0))).toBe(true);
    });

    it('should return false for invalid Date objects', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate(new Date(NaN))).toBe(false);
    });

    it('should return false for non-Date objects', () => {
      expect(isValidDate('2023-01-01')).toBe(false);
      expect(isValidDate(1672531200000)).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate({})).toBe(false);
      expect(isValidDate([])).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidDate(new Date('1970-01-01'))).toBe(true);
      expect(isValidDate(new Date('2038-01-19'))).toBe(true);
      expect(isValidDate(new Date(8640000000000000))).toBe(true); // max date
      expect(isValidDate(new Date(-8640000000000000))).toBe(true); // min date
    });
  });

  describe('isNonASCII', () => {
    it('should return false for ASCII characters', () => {
      expect(isNonASCII('hello')).toBe(false);
      expect(isNonASCII('Hello123!@#')).toBe(false);
      expect(isNonASCII('')).toBe(false);
    });

    it('should return true for non-ASCII characters', () => {
      expect(isNonASCII('hello世界')).toBe(true);
      expect(isNonASCII('café')).toBe(true);
      expect(isNonASCII('😀')).toBe(true);
    });

    it('should detect characters above 0x7F', () => {
      expect(isNonASCII('hello\u0080')).toBe(true); // first non-ASCII character
      expect(isNonASCII('hello\u007F')).toBe(false); // last ASCII character
    });
  });

  describe('interpretNumericEntities', () => {
    it('should interpret numeric HTML entities', () => {
      expect(interpretNumericEntities('hello&#32;world')).toBe('hello world');
      expect(interpretNumericEntities('hello&#65;&#66;&#67;')).toBe('helloABC');
    });

    it('should handle multiple entities', () => {
      expect(interpretNumericEntities('&#72;&#101;&#108;&#108;&#111;')).toBe('Hello');
    });

    it('decodes astral entities and ignores surrogates and values beyond U+10FFFF (F071)', () => {
      // Previously every entity above 0xFFFF was dropped, which broke the latin1 round trip of astral characters.
      expect(interpretNumericEntities('hello&#65536;world')).toBe('hello\u{10000}world');
      expect(interpretNumericEntities('x&#128512;y')).toBe('x\u{1F600}y');
      expect(interpretNumericEntities('&#1114111;')).toBe('\u{10FFFF}');
      expect(interpretNumericEntities('a&#1114112;b')).toBe('ab');
      expect(interpretNumericEntities('a&#55357;b&#56832;c')).toBe('abc');
      expect(interpretNumericEntities('A&#8364;')).toBe('A€');
    });

    it('should ignore malformed entities', () => {
      expect(interpretNumericEntities('hello&#;world')).toBe('hello&#;world');
      expect(interpretNumericEntities('hello&abc;world')).toBe('hello&abc;world');
    });

    it('should handle text without entities', () => {
      expect(interpretNumericEntities('hello world')).toBe('hello world');
    });

    it('should handle zero and negative values safely', () => {
      expect(interpretNumericEntities('hello&#0;world')).toBe('hello\u0000world');
    });
  });

  describe('parseArrayValue', () => {
    it('should parse numbers when enabled', () => {
      expect(parseArrayValue('123', { parseNumbers: true })).toBe(123);
      expect(parseArrayValue('123.45', { parseNumbers: true })).toBe(123.45);
      expect(parseArrayValue('-123', { parseNumbers: true })).toBe(-123);
    });

    it('should parse booleans when enabled', () => {
      expect(parseArrayValue('true', { parseBooleans: true })).toBe(true);
      expect(parseArrayValue('false', { parseBooleans: true })).toBe(false);
    });

    it('should not parse when options are disabled', () => {
      expect(parseArrayValue('123', { parseNumbers: false })).toBe('123');
      expect(parseArrayValue('true', { parseBooleans: false })).toBe('true');
    });

    it('should return string for invalid numbers', () => {
      expect(parseArrayValue('abc', { parseNumbers: true })).toBe('abc');
      expect(parseArrayValue('123abc', { parseNumbers: true })).toBe('123abc');
    });

    it('should handle both options together', () => {
      expect(parseArrayValue('123', { parseNumbers: true, parseBooleans: true })).toBe(123);
      expect(parseArrayValue('true', { parseNumbers: true, parseBooleans: true })).toBe(true);
      expect(parseArrayValue('text', { parseNumbers: true, parseBooleans: true })).toBe('text');
    });
  });

  describe('tryParseDate', () => {
    it('should parse valid ISO date strings', () => {
      const date = tryParseDate('2023-01-01T00:00:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect((date as Date).getFullYear()).toBe(2023);
    });

    it('should parse simple date strings', () => {
      const date = tryParseDate('2023-01-01');
      expect(date).toBeInstanceOf(Date);
      expect((date as Date).getFullYear()).toBe(2023);
    });

    it('should return original string for invalid dates', () => {
      expect(tryParseDate('invalid-date')).toBe('invalid-date');
      expect(tryParseDate('not-a-date')).toBe('not-a-date');
      expect(tryParseDate('')).toBe('');
    });

    it('should handle edge cases', () => {
      expect(tryParseDate('2023-13-01')).toBe('2023-13-01'); // invalid month
      expect(tryParseDate('2023-01-32')).toBe('2023-01-32'); // invalid day
    });
  });

  describe('getSafeKey', () => {
    it('should convert dots to brackets when allowed', () => {
      expect(getSafeKey('key.with.dots', true)).toBe('key[with][dots]');
      expect(getSafeKey('simple', true)).toBe('simple');
    });

    it('should return key as-is when dots are not allowed', () => {
      expect(getSafeKey('key.with.dots', false)).toBe('key.with.dots');
      expect(getSafeKey('simple', false)).toBe('simple');
    });

    it('should handle multiple consecutive dots', () => {
      expect(getSafeKey('key...dots', false)).toBe('key...dots');
      expect(getSafeKey('key...dots', true)).toBe('key..[dots]'); // Only matches .dots, not the .. part
    });

    it('should handle empty strings', () => {
      expect(getSafeKey('', true)).toBe('');
      expect(getSafeKey('', false)).toBe('');
    });
  });

  describe('compact', () => {
    it('should remove null and undefined values', () => {
      expect(compact(['a', null, 'b', undefined, 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should preserve other falsy values', () => {
      expect(compact(['a', '', 0, false, 'b'])).toEqual(['a', '', 0, false, 'b']);
    });

    it('should handle empty arrays', () => {
      expect(compact([])).toEqual([]);
    });

    it('should handle arrays with only null/undefined', () => {
      expect(compact([null, undefined, null])).toEqual([]);
    });

    it('should handle mixed types', () => {
      expect(compact([1, null, 'string', undefined, true, 0])).toEqual([1, 'string', true, 0]);
    });
  });

  describe('lone surrogates (audit F007)', () => {
    it('rejects lone surrogates anywhere instead of swallowing the next character', () => {
      expect(() => encode('\uD800x')).toThrow('Invalid UTF-8');
      expect(() => encode('\uDC00x')).toThrow('Invalid UTF-8');
      expect(() => encode('\uD800\uD800')).toThrow('Invalid UTF-8');
      expect(() => encode('\uDC00\uD800')).toThrow('Invalid UTF-8');
    });

    it('still encodes valid surrogate pairs', () => {
      expect(encode('\u{1F600}')).toBe('%F0%9F%98%80');
      expect(encode('a\u{1F600}\u{1F600}')).toBe('a%F0%9F%98%80%F0%9F%98%80');
    });
  });

  describe('non-ISO text after a date (audit F072)', () => {
    it('keeps text with a date prefix as a string instead of using the legacy Date fallback', () => {
      for (const text of ['2020-01-02 Mar', '2020-01-02 (comment)', '2020-01-02 12:00 PM', '2020-01-02 PST', '2020-01-02 12:00 EST', '2020-01-02Z', '2020-01-02T']) {
        expect(tryParseDate(text)).toBe(text);
      }
    });

    it('still parses ISO-8601 date and date-time forms', () => {
      expect((tryParseDate('2020-01-02T03:04:05.123Z') as Date).toISOString()).toBe('2020-01-02T03:04:05.123Z');
      expect((tryParseDate('2020-01-02T03:04:05+0100') as Date).toISOString()).toBe('2020-01-02T02:04:05.000Z');
      expect((tryParseDate('2020-01-02T03:04Z') as Date).toISOString()).toBe('2020-01-02T03:04:00.000Z');
    });
  });

  describe('impossible calendar dates (audit F027)', () => {
    it('keeps impossible dates as strings instead of rolling them over', () => {
      for (const text of ['2021-02-29', '2020-02-30', '2020-04-31', '2023-11-31', '2100-02-29', '2021-02-29T10:00:00Z']) {
        expect(tryParseDate(text)).toBe(text);
      }
    });

    it('still parses valid dates, including leap days', () => {
      expect((tryParseDate('2020-02-29') as Date).toISOString()).toBe('2020-02-29T00:00:00.000Z');
      expect((tryParseDate('2000-02-29') as Date).toISOString()).toBe('2000-02-29T00:00:00.000Z');
      expect((tryParseDate('2020-12-31') as Date).toISOString()).toBe('2020-12-31T00:00:00.000Z');
      expect((tryParseDate('2020-12-31T23:00:00-05:00') as Date).toISOString()).toBe('2021-01-01T04:00:00.000Z');
    });
  });

  describe('iso-8859-1 (F038/F039)', () => {
    it('encode() writes one byte up to U+00FF and a numeric reference beyond', () => {
      expect(encode('é', 'RFC3986', false, 'iso-8859-1')).toBe('%E9');
      expect(encode('ÿ', 'RFC3986', false, 'iso-8859-1')).toBe('%FF');
      expect(encode('Ā', 'RFC3986', false, 'iso-8859-1')).toBe('%26%23256%3B');
      expect(encode('\u{1F600}', 'RFC3986', false, 'iso-8859-1')).toBe('%26%23128512%3B');
      expect(encode('a b', 'RFC1738', false, 'iso-8859-1')).toBe('a+b');
      expect(encode('a[b]', 'RFC3986', true, 'iso-8859-1')).toBe('a[b]');
      expect(encode('', 'RFC3986', false, 'iso-8859-1')).toBe('');
      expect(encode('é')).toBe('%C3%A9');
    });

    it('encode() rejects lone surrogates', () => {
      expect(() => encode('\ud800', 'RFC3986', false, 'iso-8859-1')).toThrow('Invalid UTF-8');
      expect(() => encode('x\udc00', 'RFC3986', false, 'iso-8859-1')).toThrow('Invalid UTF-8');
      expect(() => encode('\ud800x', 'RFC3986', false, 'iso-8859-1')).toThrow('Invalid UTF-8');
    });

    it('decodeLatin1() maps each %XX to one character and leaves bad escapes', () => {
      expect(decodeLatin1('Jos%E9')).toBe('José');
      expect(decodeLatin1('a+b%2b')).toBe('a b+');
      expect(decodeLatin1('%C3%A9')).toBe('Ã©');
      expect(decodeLatin1('100%zz%E')).toBe('100%zz%E');
      expect(decodeLatin1('')).toBe('');
    });
  });
});