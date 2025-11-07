# Code Quality Improvement Roadmap

This document outlines recommended improvements for the @oxog/querystring codebase, prioritized by impact and effort.

---

## ✅ Completed (This PR)

- [x] Fixed all 6 identified bugs
- [x] Improved test coverage to 99.33%
- [x] Removed dead code
- [x] Fixed ESLint configuration
- [x] Enhanced documentation

---

## 🎯 High Priority (Recommended for Next Sprint)

### 1. Address ESLint Warnings (54 remaining)
**Impact:** High | **Effort:** Medium | **Risk:** Low

**Current State:**
- 54 ESLint warnings across the codebase
- Mostly about missing return types and `any` types

**Specific Issues:**
- Missing return type annotations (27 warnings)
- Explicit `any` types used (24 warnings)
- Unused variables with underscore prefix (3 warnings)

**Action Plan:**
```typescript
// Example fixes needed:
// Before:
parse: (input: string, options?: ParseOptions & { plugins?: boolean | PluginManager }) => {
  // ...
}

// After:
parse: (input: string, options?: ParseOptions & { plugins?: boolean | PluginManager }): ParsedQuery => {
  // ...
}
```

**Benefits:**
- Better type safety
- Improved IDE autocomplete
- Easier refactoring
- Better documentation

**Estimated Time:** 2-3 hours

---

### 2. Improve Uncovered Code Paths
**Impact:** Medium | **Effort:** Low | **Risk:** Low

**Current Coverage Gaps:**
- `src/parser.ts:176` - Uncovered line
- `src/schema.ts:34-60` - Uncovered branch conditions
- `src/security.ts:197` - Edge case not tested
- `src/stringifier.ts:255,259,263` - Error handling paths

**Action Plan:**
1. Write tests for uncovered parser edge case (line 176)
2. Add tests for schema transformation edge cases
3. Test security module error conditions
4. Cover stringifier error paths

**Benefits:**
- Reach 100% line coverage
- Better edge case handling
- More robust error handling

**Estimated Time:** 1-2 hours

---

## 🔄 Medium Priority (Next Quarter)

### 3. Migrate to ESLint 9 Flat Config
**Impact:** Medium | **Effort:** Medium | **Risk:** Medium

**Current State:**
- Using ESLint 8.57.0 with `.eslintrc.js`
- ESLint 9+ requires flat config format

**Action Plan:**
1. Read ESLint 9 migration guide
2. Create `eslint.config.js` with equivalent rules
3. Test thoroughly with existing codebase
4. Update documentation
5. Remove `.eslintrc.js`

**Benefits:**
- Stay current with ESLint ecosystem
- Better performance (flat config is faster)
- More flexibility in rule configuration

**Estimated Time:** 3-4 hours

---

### 4. Enhance Error Messages
**Impact:** Medium | **Effort:** Low | **Risk:** Low

**Current State:**
Error messages are functional but could be more helpful.

**Examples to Improve:**
```typescript
// Current:
throw new Error('Expected string, got number');

// Better:
throw new Error('Expected string, got number. Value received: 123. Use q.number() for numeric values.');
```

**Action Plan:**
1. Audit all error messages
2. Add context and suggestions
3. Include examples where helpful
4. Update tests to match new messages

**Benefits:**
- Better developer experience
- Faster debugging
- Reduced support requests

**Estimated Time:** 2 hours

---

### 5. Performance Optimization
**Impact:** Low-Medium | **Effort:** Medium | **Risk:** Medium

**Opportunities:**
1. **Benchmark critical paths:**
   - Run `npm run benchmark` regularly
   - Compare with other libraries (qs, query-string)
   - Identify bottlenecks

2. **Optimize hot paths:**
   - Parser loop (called frequently)
   - Encoder/decoder functions
   - Array format handling

3. **Consider caching:**
   - Compiled regex patterns
   - Encoder function results for common strings

**Action Plan:**
1. Set up continuous benchmarking
2. Profile with real-world query strings
3. Optimize identified bottlenecks
4. Measure improvements

**Benefits:**
- Faster parsing/stringifying
- Better competitive positioning
- Lower CPU usage

**Estimated Time:** 4-6 hours

---

## 💡 Low Priority (Future Enhancements)

### 6. Add JSDoc Comments
**Impact:** Low | **Effort:** High | **Risk:** Low

**Current State:**
- Some functions have inline comments
- No standardized JSDoc format

**Action Plan:**
1. Add JSDoc to all public APIs
2. Include @example tags
3. Document parameters and return types
4. Generate API documentation

**Benefits:**
- Better IDE tooltips
- Auto-generated documentation
- Easier onboarding

**Estimated Time:** 6-8 hours

---

### 7. Refactor Schema Implementation
**Impact:** Low | **Effort:** High | **Risk:** High

**Observation:**
The schema module has some complex inheritance patterns and could benefit from simplification.

**Potential Improvements:**
- Extract common validation logic
- Reduce code duplication
- Simplify type inference

**Recommendation:**
- Defer until after addressing high-priority items
- Requires careful planning to avoid breaking changes

**Estimated Time:** 8-12 hours

---

### 8. Add More Built-in Plugins
**Impact:** Low | **Effort:** Medium | **Risk:** Low

**Current Plugins:**
- timestamp
- sortKeys
- lowercaseKeys
- filterEmpty
- base64
- compress
- normalize

**Potential New Plugins:**
- `camelCaseKeys` - Convert snake_case to camelCase
- `snakeCaseKeys` - Convert camelCase to snake_case
- `removeNull` - Filter out null values
- `trimStrings` - Trim all string values
- `parseJSON` - Parse JSON strings in values

**Action Plan:**
1. Gather user feedback on desired plugins
2. Implement most requested
3. Add comprehensive tests
4. Document in PLUGINS.md

**Estimated Time:** 2-4 hours per plugin

---

## 📊 Metrics to Track

### Code Quality Metrics
- **Lines of Code:** Currently ~2000 LOC
- **Test Coverage:** 99.33% (target: maintain 99%+)
- **Cyclomatic Complexity:** Monitor for functions >10
- **Maintainability Index:** Keep above 70

### Performance Metrics
- **Parse Time:** Benchmark against qs library
- **Stringify Time:** Benchmark against query-string
- **Memory Usage:** Profile with large objects

### Developer Experience Metrics
- **Build Time:** Currently ~5s (acceptable)
- **Test Execution:** Currently ~5s (good)
- **ESLint Violations:** Currently 54 warnings (reduce to 0)

---

## 🛣️ Implementation Sequence

**Month 1:**
1. Address ESLint warnings (Week 1)
2. Improve test coverage to 100% (Week 2)
3. Enhance error messages (Week 3)
4. Setup continuous benchmarking (Week 4)

**Month 2:**
1. Migrate to ESLint 9 (Week 1-2)
2. Performance optimization (Week 3-4)

**Month 3:**
1. Add JSDoc comments (Week 1-2)
2. Implement new plugins (Week 3-4)

**Future:**
- Schema refactoring (when needed)
- Additional features based on user feedback

---

## 🎯 Success Criteria

- [ ] Zero ESLint warnings
- [ ] 100% test coverage
- [ ] All error messages include helpful context
- [ ] Performance within 10% of fastest competitor
- [ ] Complete API documentation
- [ ] At least 3 new useful plugins

---

## 📈 Impact vs Effort Matrix

```
High Impact, Low Effort:
├─ Address ESLint warnings
├─ Improve test coverage
└─ Enhance error messages

High Impact, Medium Effort:
├─ Migrate to ESLint 9
└─ Performance optimization

Low Impact, High Effort:
├─ Add JSDoc comments
├─ Schema refactoring
└─ Additional plugins
```

---

## 🔄 Continuous Improvement

**Weekly:**
- Run full test suite
- Check coverage reports
- Monitor build times

**Monthly:**
- Review ESLint warnings
- Run performance benchmarks
- Update this roadmap

**Quarterly:**
- Audit dependencies
- Review architectural decisions
- Plan major improvements

---

**This roadmap is a living document and should be updated as priorities change.**
