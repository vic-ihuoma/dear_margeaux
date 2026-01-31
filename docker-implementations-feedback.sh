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

Go through implementations.json, for the first task that has passes as false,
change its status to implementing, implement its test first then implement
its features to pass the tests, and use agent-browser skill for visual
testing if it requires.

For each item we use pnpm. When the item and all its test passes, update
passes to true for the item, then commit, run pnpm build and if all build
passes then push that change.

Use pnpm dev to start all servers if needed and kill all servers after
pushing an item.

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
