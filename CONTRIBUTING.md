# Contributing to @oxog/querystring

Thank you for your interest in contributing to @oxog/querystring! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use issue templates when available
3. Provide clear reproduction steps
4. Include environment details (Node version, OS, etc.)
5. Add relevant code examples

### Suggesting Features

1. Open an issue with the "feature request" label
2. Clearly describe the problem it solves
3. Provide use cases and examples
4. Consider backward compatibility

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add/update tests
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Open a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/ersinkoc/querystring.git
cd querystring

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run linting
npm run lint

# Run benchmarks
npm run benchmark
```

## Development Guidelines

### Code Style

- Follow existing code style
- Use TypeScript for all new code
- Enable strict mode
- No `any` types without justification
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Testing

- Write tests for all new features
- Maintain 100% code coverage
- Test edge cases
- Include both positive and negative test cases
- Use descriptive test names

### Performance

- Benchmark performance-critical changes
- Avoid unnecessary allocations
- Prefer simple solutions over complex ones
- Document performance considerations

### Security

- Consider security implications
- Test for prototype pollution
- Validate and sanitize inputs
- Follow OWASP guidelines

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(parser): add support for custom delimiters
fix(security): prevent prototype pollution in parse
docs(readme): add migration guide from qs
perf(stringify): optimize array serialization
```

## Testing Guidelines

### Unit Tests

```typescript
describe('feature', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Tests

Test real-world scenarios and interactions between components.

### Coverage

Maintain 100% code coverage:
```bash
npm test -- --coverage
```

## Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Add JSDoc comments for new functions
- Include examples for new features
- Update migration guides if needed

## Release Process

1. Update CHANGELOG.md
2. Update version in package.json
3. Create a pull request
4. After merge, tag the release
5. Publish to npm

## Getting Help

- Open an issue for questions
- Join discussions in pull requests
- Check existing documentation
- Review test cases for examples

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for specific contributions
- GitHub contributors page
- Package documentation

Thank you for contributing to @oxog/querystring!