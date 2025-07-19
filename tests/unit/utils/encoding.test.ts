import {
  encode,
  decode,
  isValidDate,
  isNonASCII,
  interpretNumericEntities,
  parseArrayValue,
  tryParseDate,
  getSafeKey,
  compact
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

    it('should ignore entities above 0xFFFF', () => {
      expect(interpretNumericEntities('hello&#65536;world')).toBe('helloworld');
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
});