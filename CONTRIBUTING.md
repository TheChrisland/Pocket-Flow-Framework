# Contributing to Pocketflow Framework

Thanks for your interest in contributing! Here's how to get started.

## Setup

```bash
git clone https://github.com/Osly-AI/Pocket-Flow-Framework.git
cd Pocket-Flow-Framework
npm install
```

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in `src/` or `tests/`.

3. **Run lint and tests** before committing:
   ```bash
   npm run lint
   npm test
   ```

4. **Open a PR** against `main` with a clear description of what changed and why.

## Code Style

- We use ESLint and Prettier. Run `npm run format` to auto-format.
- Keep functions focused and small.
- Add tests for new features or bug fixes.

## Project Layout

| Directory  | Purpose                                  |
|------------|------------------------------------------|
| `src/`     | Core framework code                      |
| `tests/`   | Jest test suite and test helpers          |
| `cli/`     | CLI scaffolding tool                      |
| `examples/`| Example projects using the framework     |
| `docs/`    | MkDocs documentation (static HTML)       |

## Writing Tests

Tests live in `tests/` and use Jest. Run them with:

```bash
npm test
```

We aim for >95% coverage. You can check coverage with:

```bash
npx jest --coverage
```

## Reporting Issues

Open a GitHub Issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Node.js and npm versions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
