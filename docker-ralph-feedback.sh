#!/bin/bash
# ralph.sh - AFK Ralph Loop
# Based on: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
# Usage: ./docker-ralph-feedback.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 10"
  exit 1
fi

echo "=========================================="
echo "AFK Ralph Loop"
echo "=========================================="
echo "Iterations: $1"
echo "=========================================="
echo ""

for ((i=1; i<=$1; i++)); do
  echo "=== Iteration $i of $1 ==="
  
  result=$(docker sandbox run --env HUSKY=0 --env CI=true claude --permission-mode acceptEdits -p "@prd.json @progress.txt

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
TASK WORKFLOW
========================================

1. Decide which task to work on next.
   This should be the one YOU decide has the highest priority,
   not necessarily the first in the list.
   
   Prioritize in this order:
   - Architectural decisions and core abstractions
   - Integration points between modules
   - Unknown unknowns and spike work
   - Standard features and implementation
   - Polish, cleanup, and quick wins

2. Before committing, run ALL feedback loops:
   - TypeScript: pnpm typecheck (must pass with no errors)
   - Tests: pnpm test (must pass)
   - Lint: pnpm lint (must pass)
   - Visual Tests: Use the agent-browser skill to verify UI changes
     Start dev server, navigate to pages, take screenshots, verify elements
   
   DO NOT commit if any feedback loop fails. Fix issues first.

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

4. After completing the task, append to progress.txt:
   - Task completed and PRD item reference
   - Key decisions made and reasoning
   - Files changed
   - Any blockers or notes for next iteration
   
   Keep entries concise. Sacrifice grammar for the sake of concision.
   This file helps future iterations skip exploration.

5. Update prd.json:
   - Set 'passes' to true for the completed task

6. Make a git commit of that feature.
   Use a descriptive commit message referencing the task.

========================================
RULES
========================================

- ONLY WORK ON A SINGLE FEATURE
- Each iteration is a fresh context - progress.txt is your memory
- Git history shows what previous iterations did
- Never commit with failing tests or type errors

If, while implementing the feature, you notice that all work
is complete (all tasks in prd.json have 'passes': true),
output <promise>COMPLETE</promise>.")

  echo "$result"
  echo ""

  # Push changes committed by Claude inside Docker
  echo "--- Pushing changes from iteration $i ---"
  git push origin HEAD || echo "Warning: Push failed (will retry next iteration)"
  echo ""

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "=========================================="
    echo "PRD complete after $i iterations!"
    echo "=========================================="
    exit 0
  fi

  echo "--- Iteration $i complete ---"
  echo ""
done

echo "=========================================="
echo "Reached maximum iterations ($1)."
echo "Some tasks may still have 'passes': false."
echo "Check prd.json and progress.txt"
echo "=========================================="
