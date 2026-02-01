# Dear Margeaux - Agent Context

IMPORTANT: Prefer retrieval-led reasoning. This file provides context for all tasks.

## CRITICAL: REINSTALL NODE_MODULES AT START OF EACH ITERATION

The host (macOS) and Docker sandbox (Linux) have different platforms.
Native binaries (workerd, esbuild, rollup, sharp) are platform-specific.

**At the START of each iteration, you MUST clean and reinstall:**

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules merchant/node_modules
pnpm install
```

This ensures you have Linux-compatible binaries inside Docker.

## Platform Constraints

- Host: Mac (darwin-arm64)
- Docker: Linux (linux-arm64)
- Native modules must match the runtime platform

### Version mismatch warnings are SAFE TO IGNORE

If you see warnings like:

- "Host version X does not match binary version Y"
- "esbuild version mismatch"

These are **NOT platform errors** - they are version warnings that do not affect functionality.

### Platform ERRORS require clean reinstall

If you see errors like:

- "Unsupported platform: linux-arm64"
- "Cannot find module '@esbuild/linux-arm64'"
- "Cannot find module '@rollup/rollup-linux-arm64-gnu'"
- "installed workerd on another platform"

Run the clean reinstall command above. If errors persist AFTER reinstall, output `<promise>PLATFORM_ERROR</promise>` and stop.

## Quality Standards

This codebase will outlive you. Every shortcut becomes someone else's burden.
Every hack compounds into technical debt. Fight entropy.

- Production code quality required
- Small, focused commits (one logical change each)
- Leave codebase better than you found it
- Patterns you establish will be copied

## Feedback Loops (MANDATORY)

| Command        | Requirement     | On Failure        |
| -------------- | --------------- | ----------------- |
| pnpm typecheck | 0 errors        | Fix before commit |
| pnpm lint      | 0 errors        | Fix before commit |
| pnpm test      | All pass        | Fix before commit |
| git commit     | Hooks must pass | Fix, never bypass |

Pre-commit hooks run: lint-staged → typecheck → test
DO NOT use --no-verify. DO NOT bypass hooks. Fix failures.

## Test Quality Standards

### BAD Tests (Reject These)

- Tests checking only if files exist
- Tests mocking everything including code under test
- Tests with no real assertions
- Tests that pass regardless of implementation
- Tests that just snapshot file contents

### GOOD Tests (Write These)

- Behavior-driven: test what code does, not how
- Integration: test real module interactions
- Real assertions: verify actual output/state
- Edge cases: test boundaries and errors
- Visual: use agent-browser for UI verification

## Skills Index

Load via mcp_skill tool when needed:

| Skill                 | Use When                             |
| --------------------- | ------------------------------------ |
| react-best-practices  | Writing/reviewing React/Next.js code |
| web-design-guidelines | Auditing UI for accessibility        |
| frontend-design       | Building production-grade components |
| agent-browser         | REQUIRED for visual tests            |
| vercel-deploy         | Deploying application                |

## Visual Testing Protocol

If task in implementations.json has `visual` tests:

1. Load agent-browser skill (mcp_skill)
2. Start server: `pnpm dev`
3. Execute EACH step prefixed with "agent-browser:"
4. Take screenshots as evidence
5. Save to screenshots/ directory
6. Kill server when done
7. Log screenshot filenames in v2-progress.txt

DO NOT mark passes:true without executing visual tests.

## Task Workflow

1. Read implementations.json → find first task with passes:false
2. If all passes:true → output `<promise>COMPLETE</promise>`
3. Implement using TDD:
   - Write tests FIRST with real assertions
   - Implement feature
   - Verify tests pass
4. Run visual tests if task has them
5. Commit (hooks will run automatically)
6. If hooks fail → fix and retry commit
7. Update implementations.json: passes:true
8. Append to v2-progress.txt

DO NOT push changes - the host script handles git push after your session.

ONLY WORK ON ONE TASK PER ITERATION.

## Progress File Format (v2-progress.txt)

```
## YYYY-MM-DD: task-id - Brief description

### Task Completed
What was implemented

### Key Decisions
Why certain choices were made

### Files Changed
- file1.ts - what changed
- file2.tsx - what changed

### Test Results
- Typecheck: PASSED/FAILED
- Lint: PASSED/FAILED
- Tests: PASSED (X tests)
- Visual: screenshots taken (if applicable)

### Next Steps
Notes for future iterations
```

## Completion Signals

| Signal                              | Meaning                                            |
| ----------------------------------- | -------------------------------------------------- |
| `<promise>COMPLETE</promise>`       | All tasks in implementations.json have passes:true |
| `<promise>PLATFORM_ERROR</promise>` | Native module platform mismatch detected           |

## Task Priority Order

When multiple tasks have passes:false, prioritize:

1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work
4. Standard features and implementation
5. Polish, cleanup, and quick wins

Fail fast on risky work. Save easy wins for later.
