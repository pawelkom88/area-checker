## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- Extract Logic to Helper Function: Use when asked to extract code into a helper function and add tests. (file: /Users/pawelkomorkiewicz/.codex/skills/extract-logic-to-helper-function/SKILL.md)
- agent-browser: Use when the task requires real browser automation via the agent-browser CLI (navigation, form fill, screenshots, snapshots, UI-flow debugging). Prefer this over Playwright when explicitly requested or when agent-browser is installed. (file: /Users/pawelkomorkiewicz/.codex/skills/agent-browser/SKILL.md)
- behavior-first-unit-tests: Design unit tests that prioritize observable behavior and minimize coupling. (file: /Users/pawelkomorkiewicz/.codex/skills/behavior-first-unit-tests/SKILL.md)
- build-ui: Build React UI from Figma using Figma MCP, then validate in a real browser. (file: /Users/pawelkomorkiewicz/.codex/skills/build-ui/SKILL.md)
- e2e-test-triage: Run `yarn test:e2e`, list failing specs/tests, explain why each fails (based on output), and suggest a fix. (file: /Users/pawelkomorkiewicz/.codex/skills/e2e-checker/SKILL.md)
- find-skills: Helps users discover and install agent skills when they ask for capabilities that might exist as installable skills. (file: /Users/pawelkomorkiewicz/.agents/skills/find-skills/SKILL.md)
- global-code-standards: Apply Pawel's baseline coding standards across repos (React/TypeScript conventions, styling rules, testing expectations, and commit hygiene). Use when asked to follow or enforce code standards, or when making code changes without repo-specific guidance. (file: /Users/pawelkomorkiewicz/.codex/skills/global-code-standards/SKILL.md)
- logical-commit-organizer: Inspect the current worktree and turn uncommitted changes into a clean, well-structured set of logical Git commits. (file: /Users/pawelkomorkiewicz/.codex/skills/git-organizes/SKILL.md)
- nextjs: Build Next.js 16 apps with App Router, Server Components/Actions, Cache Components ("use cache"), and async route params. Includes proxy.ts and React 19.2. Prevents common Next.js 16 errors. Use for Next.js 16 builds or troubleshooting async params, "use cache", parallel route 404s, Turbopack, i18n caching, or navigation throttling. (file: /Users/pawelkomorkiewicz/.agents/skills/nextjs/SKILL.md)
- nextjs-optimization: Optimize Next.js 15+ apps for performance and Core Web Vitals using App Router best practices. (file: /Users/pawelkomorkiewicz/.agents/skills/nextjs-optimization/SKILL.md)
- openai-docs: Use when the user asks how to build with OpenAI products/APIs and needs up-to-date official documentation with citations. (file: /Users/pawelkomorkiewicz/.codex/skills/openai-docs/SKILL.md)
- playwright: Use when a real browser is required via Playwright CLI for navigation, form fill, snapshots, screenshots, data extraction, or UI-flow debugging. (file: /Users/pawelkomorkiewicz/.codex/skills/playwright/SKILL.md)
- playwright-manual-check: Use the Playwright MCP server to open a real browser, load stored auth from `.playwright/auth.json`, navigate the app like a user, and verify a bug fix or feature works as expected. Report clear pass/fail evidence and steps to reproduce/verify. (file: /Users/pawelkomorkiewicz/.codex/skills/playwright-mcp/SKILL.md)
- prompt-optimizer: Convert vague requests into execution-ready, structured prompts with a short plan. Ask up to 3 targeted clarifying questions first if needed. (file: /Users/pawelkomorkiewicz/.codex/skills/prompt-optimizer/SKILL.md)
- react-performance-optimization: React performance optimization patterns using memoization, code splitting, and efficient rendering strategies. (file: /Users/pawelkomorkiewicz/.agents/skills/react-performance-optimization/SKILL.md)
- security-best-practices: Provide security best-practice reviews for Python, JavaScript/TypeScript, or Go when explicitly requested. (file: /Users/pawelkomorkiewicz/.codex/skills/security-best-practices/SKILL.md)
- unit-test-triage: Run `yarn test:unit`, list failing tests, explain why each fails (based on output), and suggest a fix. (file: /Users/pawelkomorkiewicz/.codex/skills/unit-test-checker/SKILL.md)
- world-assets-pipeline: Export or convert 3D assets (especially Blender .blend files) into GLB for the project, optimize them, place them under public/assets/worlds, and wire them into world blueprints or world asset_key. Use when asked to add/replace interior models, bulk import asset packs, or standardize asset format. (file: /Users/pawelkomorkiewicz/.codex/skills/world-assets-pipeline/SKILL.md)
- skill-creator: Guide for creating effective skills. Use when users want to create or update a skill. (file: /Users/pawelkomorkiewicz/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills from a curated list or GitHub repo when explicitly requested. (file: /Users/pawelkomorkiewicz/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.

## Feature Build Reference
- For every new frontend feature in this repo, review and follow `/Users/pawelkomorkiewicz/PERSONAL/house-buyer-helper/ASYNC_FEATURE_STANDARD.md` before implementation.
- Default approach: Suspense-first rendering, transition-driven non-urgent updates, and TanStack `useSuspenseQuery` for async reads.

## Async React Learnings (House Buyer Helper)
- Do not sync `useSuspenseQuery` data into local state via `useEffect` (anti-pattern). Suspense data should be consumed directly in render.
- If a parent needs the latest fetched value, prefer deriving it from TanStack cache (`queryClient.getQueryData`) with shared query keys instead of effect-based state bridging.
- Keep async reads behind local `Suspense` boundaries and pair each with a nearby `ErrorBoundary`.
- Use transitions (`startTransition`) only for non-urgent updates (search submit, filter/url updates), not for controlled input typing.
- In tests/non-browser environments, guard browser-only APIs like `window.matchMedia` to prevent jsdom runtime failures.

## App.tsx Learnings
- Avoid syncing UI state from async state in `useEffect` when the state change originates from a user action; prefer event handlers (for example, open desktop sidebar in `handleSearch`).
- Treat `useEffect` as external synchronization. If logic can be derived during render or moved into handlers, avoid effects.
- If the product decision is "no live breakpoint support", do not add resize or media query listeners for breakpoint syncing.
- In that mode, let CSS media queries own responsive visibility/layout and keep any JS breakpoint decision fixed at initial page load only.

## Control Flow Learnings
- Prefer early returns in `useEffect` and event handlers to flatten branching and keep the "main path" easy to scan.
- In animation effects, handle guard cases first (for example, desktop reset) and return before running state-specific animation branches.
