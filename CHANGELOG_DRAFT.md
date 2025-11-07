# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **[HIGH]** Fixed `ObjectSchema.strip()` method that was non-functional
  - `strip()` now properly overrides `passthrough()` and `strict()` modes
  - Added comprehensive tests for strip functionality
  - Resolves issue where calling `.passthrough().strip()` would keep passthrough mode active

- **[MEDIUM]** Fixed incorrect encoder usage for Date field keys in stringifier
  - Now uses `keyEncoder` instead of `encoder` for encoding Date field keys
  - Ensures consistent encoding behavior across all field types

- **[MEDIUM]** Fixed ESLint configuration compatibility
  - Pinned ESLint to v8.57.0 for `.eslintrc.js` format support
  - Resolves `npm run lint` failure with ESLint 9.x

### Changed
- **[LOW]** Removed unreachable null/undefined check in stringifier (lines 190-192)
  - Improves code coverage from 99.09% to 99.33%
  - No functional impact (code was never executed)

- **[LOW]** Removed useless comma string operation in parser (lines 118-120)
  - Eliminates no-op `val.split(',').join(',')` operation
  - Minor performance improvement

- **[LOW]** Optimized prototype pollution checking in security module
  - Removed redundant enumerable property loop
  - Properties already checked by `Object.getOwnPropertyNames()`
  - Minor performance improvement

### Added
- Comprehensive bug analysis documentation (`BUG_ANALYSIS_REPORT.md`)
- Bug fix summary with metrics (`BUG_FIX_SUMMARY.md`)
- Three new tests for `ObjectSchema.strip()` functionality

### Metrics
- Tests: 492 → 495 (+3 new tests)
- Code Coverage: 99.09% → 99.33% (+0.24% statements)
- All 495 tests passing
- Zero breaking changes

## [1.0.0] - Previous Release

### Added
- Initial release with core functionality
- Parser with multiple array format support
- Stringifier with customizable encoding
- Schema validation with Zod-like API
- QueryBuilder for fluent query construction
- Security features (XSS detection, prototype pollution protection)
- Plugin system for extensibility
- Comprehensive test suite (99%+ coverage)

---

[Unreleased]: https://github.com/ersinkoc/QueryString/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ersinkoc/QueryString/releases/tag/v1.0.0
