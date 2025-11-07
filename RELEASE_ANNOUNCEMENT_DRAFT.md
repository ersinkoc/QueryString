# Release Announcement: @oxog/querystring v1.0.1

We're excited to announce the release of **@oxog/querystring v1.0.1**, a maintenance release that fixes 6 bugs and improves overall code quality!

---

## 🐛 What's Fixed

### High Priority
- **Fixed non-functional `strip()` method** - The `ObjectSchema.strip()` method now properly removes unknown properties and correctly overrides `passthrough()` and `strict()` modes.

### Bug Fixes
- Fixed incorrect encoder usage for Date field keys in stringifier
- Fixed ESLint configuration compatibility (restored `npm run lint` functionality)
- Removed unreachable code in stringifier (improved code coverage)
- Removed redundant prototype pollution checking (minor performance improvement)
- Removed useless string operation in parser

---

## 📊 Improvements

- **Test Coverage:** Increased from 99.09% → 99.33%
- **Tests:** Added 3 new tests for strip() functionality
- **Total Tests:** All 495 tests passing
- **Code Quality:** Removed dead code, improved maintainability
- **Performance:** Minor optimizations from code cleanup

---

## ✅ Quality Assurance

This release maintains our commitment to quality:
- ✅ Zero breaking changes
- ✅ 100% test pass rate
- ✅ No security vulnerabilities
- ✅ Full backward compatibility
- ✅ TypeScript strict mode compliant

---

## 📦 Installation

```bash
npm install @oxog/querystring@1.0.1
```

or update your existing installation:

```bash
npm update @oxog/querystring
```

---

## 🔧 Migration Guide

**No migration needed!** This is a drop-in replacement for v1.0.0 with bug fixes only.

If you were working around the broken `strip()` method, you can now remove your workarounds:

```typescript
// Before (workaround):
const schema = q.object().shape({ name: q.string() });
// Unknown keys were already stripped by default

// After (explicit):
const schema = q.object().shape({ name: q.string() }).strip();
// Now .strip() properly overrides other modes
```

---

## 🙏 Acknowledgments

Special thanks to our comprehensive testing framework and the systematic code analysis that identified these issues.

---

## 📚 Documentation

Full details available in:
- [BUG_FIX_SUMMARY.md](./BUG_FIX_SUMMARY.md)
- [CHANGELOG.md](./CHANGELOG.md)

---

## 🔗 Resources

- **NPM:** https://www.npmjs.com/package/@oxog/querystring
- **GitHub:** https://github.com/ersinkoc/QueryString
- **Documentation:** See README.md for full API documentation

---

## 🚀 What's Next

We're committed to maintaining the highest quality standards. Check out our [CODE_QUALITY_ROADMAP.md](./CODE_QUALITY_ROADMAP.md) for upcoming improvements.

---

**Thank you for using @oxog/querystring!** 🎉

If you encounter any issues, please [open an issue on GitHub](https://github.com/ersinkoc/QueryString/issues).
