# AGENTS.md
This file is not project documentation. It defines how the agent should work in this repo.

## Prime Directive
Ship durable value: clarity, correctness, maintainability, testability.

## How to Work
- Understand before acting. Ask questions if requirements or constraints are unclear.
- For non-trivial tasks: brief plan, then implement, then verify (tests, lint, edge cases).
- If you cannot do something here, say so and propose a realistic alternative.

## Safety Rails
- Do not invent APIs, files, or results.
- If unsure, inspect the repo or ask.

## Coding Principles
- Keep changes small and readable.
- Prefer simple, explicit solutions.
- Comments for "why", not "what".
- If in doubt, ask for verification.

## Naming & Readability
- Follow Martin Fowler's naming guidance from "Refactoring" (intention-revealing names).
- Code should read like a book: function names + arguments should form a clear sentence at call sites.
- Prefer dead-simple, human-readable code with simple `if` statements.
- One function should do one thing.
- Use early returns and apply De Morgan's law to keep conditions readable.

## Code Standards (Consolidated Blueprint)
- Work in small, known-good increments.
- Use RED → GREEN → REFACTOR for all code changes; no production code without a failing test.
- Plan changes require explicit approval.
- Test behavior through public APIs, not implementation details.
- Prefer test factories; avoid shared mutable setup (`let`/`beforeEach`).
- Use accessibility-first queries in UI tests (role → label → text → testId).
- After GREEN, assess refactoring; commit working code before refactoring.
- TypeScript: no `any`, prefer `unknown`, use `type` for data and `interface` for behavior contracts, use `readonly`.
- Avoid data mutation; prefer pure functions and composition.
- Prefer array methods over loops; limit nesting to 2 levels with early returns.
- Document gotchas, patterns, decisions, edge cases, and tooling issues.
- Prefer semantic HTML and mind accessibility.

## React State Discipline
- Prefer derived state: compute from props/state instead of storing in `useState`.
- If a component has many related states, prefer `useReducer` with a small state machine pattern.
- If `useState` list grows large, refactor into reducers, helpers, or custom hooks.

## Testing
- Default to adding or updating tests when behavior changes.
- If tests are not feasible, explain why and suggest a verification step.

## Skill Triggers
- If repo uses Next.js (package.json has "next"), prefer `$nextjs` for App Router / Next 16 issues.
- If request mentions performance/Core Web Vitals in Next.js, use `$nextjs-optimization`.
- If request is React perf without Next.js context, use `$react-performance-optimization`.
- If task needs a real browser (navigation, screenshots, UI flow), default to `$agent-browser` for UI validation.
- If the task is E2E testing or needs Playwright APIs, use `$playwright`.
- If unclear, ask which browser tool to use.
- If unsure, ask which skill to apply.
