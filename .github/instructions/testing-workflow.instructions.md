---
applyTo: "package.json,package-lock.json,playwright.config.ts,tests/**/*.ts,tests/**/*.js,.vscode/settings.json,.vscode/extensions.json"
description: "Use when changing development workflow, automated tests, or contributor tooling in Ironforge."
---

# Ironforge Testing And Workflow Instructions

- Treat repository tooling as part of the product workflow, not optional garnish. When a requested change would benefit from a script, config file, test, or editor/workspace setting, prefer wiring it in directly.
- Use the existing toolchain first: `npm` scripts, `Vite`, `TypeScript` type-checking, `ESLint`, `Prettier`, and `Playwright`.
- For meaningful UI or behavior changes, add or update automated tests unless the change is too small or the environment makes testing impractical. If you skip test coverage, say why.
- Prefer Playwright tests that cover real user-visible flows. When auth, network, or remote state would make a test flaky, prefer a deterministic local validation path or a controlled shell setup over brittle live-service assertions.
- Keep tests small, readable, and purpose-driven. One user flow per test is preferred over giant all-in-one scripts.
- When adjusting workflow or tooling, update `package.json` scripts and any relevant `.github` instructions so future agents follow the same standard.
- Before considering meaningful work complete, run the relevant verification commands such as `npm.cmd run lint`, `npm.cmd run typecheck`, targeted `npm.cmd run test:e2e`, and `npm.cmd run build` when the change can affect runtime behavior.
