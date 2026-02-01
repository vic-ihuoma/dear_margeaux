#!/bin/bash
# docker-ralph-v2.sh - AFK Ralph Loop with Enforced Feedback
# Based on: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
# Reference: https://www.aihero.dev/getting-started-with-ralph
# Context: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
#
# Key differences from previous scripts:
# - NO HUSKY=0 (hooks run as feedback loops)
# - Fail-fast on first failure
# - Uses AGENTS.md for passive context (Vercel research: 100% vs 79% pass rate)
# - Platform error detection for Mac/Linux cross-compilation
#
# Usage: ./docker-ralph-v2.sh <iterations>

set -e

# ===========================================
# VALIDATION
# ===========================================

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 10"
  exit 1
fi

if [ ! -f "AGENTS.md" ]; then
  echo "Error: AGENTS.md not found in project root."
  echo "This file provides passive context to the agent. Create it first."
  exit 1
fi

if [ ! -f "implementations.json" ]; then
  echo "Error: implementations.json not found."
  exit 1
fi

# ===========================================
# SETUP
# ===========================================

if [ ! -f "v2-progress.txt" ]; then
  echo "# Ralph v2 Progress Log" > v2-progress.txt
  echo "# Tracks implementation progress with enforced feedback loops" >> v2-progress.txt
  echo "" >> v2-progress.txt
fi

echo "=========================================="
echo "  AFK Ralph v2 - Enforced Feedback Loop"
echo "=========================================="
echo "Iterations requested: $1"
echo "Task source: implementations.json"
echo "Progress file: v2-progress.txt"
echo "Context: AGENTS.md (passive, always available)"
echo "Hooks: ENABLED (feedback loops enforced)"
echo "Failure mode: FAIL-FAST (halt on first failure)"
echo "=========================================="
echo ""

# ===========================================
# MAIN LOOP
# ===========================================

for ((i=1; i<=$1; i++)); do
  echo "=== Iteration $i of $1 ==="
  echo ""
  
  result=$(docker sandbox run --env CI=true claude --permission-mode acceptEdits -p "@AGENTS.md @implementations.json @v2-progress.txt

========================================
ITERATION $i INSTRUCTIONS
========================================

1. PLATFORM CHECK - CLEAN REINSTALL NODE_MODULES
   The host (macOS) and Docker (Linux) have different platforms.
   You MUST reinstall node_modules for Linux before any other work:
   
   rm -rf node_modules apps/*/node_modules packages/*/node_modules merchant/node_modules
   pnpm install
   
   Then run: pnpm typecheck
   If you STILL see platform errors after reinstall, output <promise>PLATFORM_ERROR</promise> and stop.

2. TASK SELECTION  
   Find the first task in implementations.json with passes:false
   If ALL tasks have passes:true, output <promise>COMPLETE</promise>

3. IMPLEMENTATION (TDD Workflow)
   a. Read the task description and test requirements
   b. Write tests FIRST - with REAL assertions (see AGENTS.md for quality standards)
   c. Run: pnpm test (verify tests fail initially if testing new behavior)
   d. Implement the feature
   e. Run: pnpm test (verify tests pass)

4. VISUAL TESTS (If task has visual tests)
   a. Load the agent-browser skill
   b. Run: pnpm dev (start dev server)
   c. Execute EACH visual test step from the task
   d. Take screenshots as evidence
   e. Kill the dev server
   f. Include screenshot filenames in progress

5. PRE-COMMIT VERIFICATION
   Run these and ensure they pass:
   - pnpm typecheck (0 errors required)
   - pnpm lint (0 errors required)
   - pnpm test (all tests must pass)

6. COMMIT
   - Stage changes: git add .
   - Commit: git commit -m 'feat(TASK_ID): description'
   
   The pre-commit hook will run lint-staged, typecheck, and test.
   If the hook fails, FIX THE ISSUES and commit again.
   DO NOT use --no-verify.

7. UPDATE TRACKING
   - Set passes:true for the task in implementations.json
   - Append progress entry to v2-progress.txt (see format in AGENTS.md)

========================================
COMPLETION SIGNALS
========================================
- <promise>COMPLETE</promise> = All tasks done
- <promise>PLATFORM_ERROR</promise> = Native module issue

ONLY WORK ON ONE TASK THIS ITERATION.")

  echo "$result"
  echo ""

  # -------------------------------------------
  # PLATFORM ERROR DETECTION
  # -------------------------------------------
  if [[ "$result" == *"<promise>PLATFORM_ERROR</promise>"* ]]; then
    echo "=========================================="
    echo "FATAL: PLATFORM ERROR DETECTED"
    echo "=========================================="
    echo "A native module (rollup/esbuild/sharp) has platform issues."
    echo ""
    echo "To fix, add the Linux variant to package.json optionalDependencies:"
    echo "  @rollup/rollup-linux-arm64-gnu"
    echo "  @esbuild/linux-arm64"
    echo ""
    echo "Then run: pnpm install (on your Mac)"
    echo "=========================================="
    exit 1
  fi

  # -------------------------------------------
  # PUSH CHANGES (always push before checking completion)
  # -------------------------------------------
  echo "--- Pushing changes from iteration $i ---"
  if ! git push origin HEAD; then
    echo "=========================================="
    echo "FATAL: Git push failed"
    echo "=========================================="
    echo "Halting loop. Resolve push issues manually."
    exit 1
  fi
  echo ""

  # -------------------------------------------
  # COMPLETION CHECK (after push, verify against actual file)
  # -------------------------------------------
  remaining=$(grep -c '"passes": false' implementations.json 2>/dev/null || echo "0")
  if [[ "$remaining" == "0" ]]; then
    echo "=========================================="
    echo "SUCCESS: All implementations complete!"
    echo "=========================================="
    echo "Completed after $i iteration(s)."
    echo "Review v2-progress.txt for summary."
    echo "=========================================="
    exit 0
  fi

  echo "--- Iteration $i complete ($remaining tasks remaining) ---"
  echo ""
done

echo "=========================================="
echo "Reached maximum iterations ($1)."
echo "=========================================="
echo "Some tasks may still have passes:false."
echo "Check implementations.json and v2-progress.txt"
echo "=========================================="
