#!/bin/bash
# docker-implementations-feedback.sh - AFK Ralph Loop for implementations.json
# Based on: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
# Usage: ./docker-implementations-feedback.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 10"
  exit 1
fi

# Create implementations-progress.txt if it doesn't exist
if [ ! -f "implementations-progress.txt" ]; then
  echo "# Implementations Progress Log" > implementations-progress.txt
  echo "# This file tracks progress for implementations.json tasks" >> implementations-progress.txt
  echo "" >> implementations-progress.txt
fi

echo "=========================================="
echo "AFK Ralph Loop (Implementations)"
echo "=========================================="
echo "Iterations: $1"
echo "Task file: implementations.json"
echo "Progress file: implementations-progress.txt"
echo "=========================================="
echo ""

for ((i=1; i<=$1; i++)); do
  echo "=== Iteration $i of $1 ==="
  
  result=$(docker sandbox run --env HUSKY=0 --env CI=true claude --permission-mode acceptEdits -p "@implementations.json @implementations-progress.txt

========================================
TASK INSTRUCTIONS
========================================

Go through implementations.json, for the first task that has passes as false.
Implement the feature following TDD: write tests first, then implement.

For each item we use pnpm. When ALL tests pass (unit AND visual), update
passes to true, commit, run pnpm build, and push if build passes.

Use pnpm dev to start servers when needed. Kill all servers after pushing.

========================================
CRITICAL: VISUAL TESTING REQUIREMENTS
========================================

If the task has 'visual' tests in implementations.json, you MUST:

1. Load the agent-browser skill and use it
2. Start the dev server (pnpm dev)
3. Execute EVERY visual test step listed
4. Take screenshots as evidence for EACH verification step
5. Save screenshots to screenshots/ directory with descriptive names
6. Include screenshot filenames in implementations-progress.txt

DO NOT mark 'passes': true if visual tests were not executed.
DO NOT skip visual tests - they are MANDATORY, not optional.
DO NOT write unit tests that just check file contents as a substitute.

Visual test evidence is REQUIRED. No screenshots = task NOT complete.

========================================
QUALITY EXPECTATIONS
========================================
This codebase will outlive you. Every shortcut you take becomes
someone else's burden. Every hack compounds into technical debt
that slows the whole team down.

You are not just writing code. You are shaping the future of this
project. The patterns you establish will be copied. The corners
you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

========================================
WORKFLOW
========================================

1. Find the first task in implementations.json with 'passes': false

2. Before committing, run ALL feedback loops:
   - TypeScript: pnpm typecheck (must pass with no errors)
   - Tests: pnpm test (must pass)
   - Lint: pnpm lint (must pass)
   - Visual Tests: MANDATORY if task has visual tests in implementations.json
     * Load agent-browser skill
     * Start dev server: pnpm dev
     * Execute EACH visual test step from the task
     * Take screenshots as proof (save to screenshots/)
     * Log screenshot filenames in implementations-progress.txt
   
   DO NOT commit if any feedback loop fails. Fix issues first.
   DO NOT skip visual tests - they are required evidence of completion.

3. Use appropriate skills when needed:
   - agent-browser: For visual testing, UI verification, screenshots
   - Other available skills as appropriate for the task
   
   Skills extend your capabilities - use them.

4. Keep changes small and focused:
   - One logical change per commit
   - If a task feels too large, break it into subtasks
   - Prefer multiple small commits over one large commit
   - Run feedback loops after each change, not at the end
   
   Quality over speed. Small steps compound into big progress.

5. After completing the task, append to implementations-progress.txt:
   - Task completed and task ID reference
   - Key decisions made and reasoning
   - Files changed
   - Any blockers or notes for next iteration
   
   Keep entries concise. Sacrifice grammar for the sake of concision.
   This file helps future iterations skip exploration.

6. Update implementations.json:
   - Set 'passes' to true for the completed task

7. Make a git commit of that feature.
   Use a descriptive commit message referencing the task ID.

8. Run pnpm build - if it passes, push the changes.

========================================
RULES
========================================

- ONLY WORK ON A SINGLE TASK PER ITERATION
- Each iteration is a fresh context - implementations-progress.txt is your memory
- Git history shows what previous iterations did
- Never commit with failing tests or type errors
- Kill any dev servers after pushing

If, while implementing the feature, you notice that all work
is complete (all tasks in implementations.json have 'passes': true),
output <promise>COMPLETE</promise>.")

  echo "$result"
  echo ""

  # Push changes committed by Claude inside Docker
  echo "--- Pushing changes from iteration $i ---"
  git push origin HEAD || echo "Warning: Push failed (will retry next iteration)"
  echo ""

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "=========================================="
    echo "All implementations complete after $i iterations!"
    echo "=========================================="
    exit 0
  fi

  echo "--- Iteration $i complete ---"
  echo ""
done

echo "=========================================="
echo "Reached maximum iterations ($1)."
echo "Some tasks may still have 'passes': false."
echo "Check implementations.json and implementations-progress.txt"
echo "=========================================="
