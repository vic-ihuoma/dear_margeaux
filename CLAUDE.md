# Dear Margeaux - Project Instructions

## Project Skills

Skills are available locally in `.claude/skills/`. Read the SKILL.md file in each directory for full instructions.

### React & Frontend

- **react-best-practices** - Use when writing, reviewing, or refactoring React/Next.js code. Contains 45 optimization rules for eliminating waterfalls, bundle size, re-renders, and performance. Read `.claude/skills/react-best-practices/SKILL.md` for the full rule reference.

- **web-design-guidelines** - Use when reviewing UI code for accessibility, forms, animations, typography, and best practices. Invoke with `/web-design-guidelines <file-or-pattern>` to audit files. Read `.claude/skills/web-design-guidelines/SKILL.md`.

- **frontend-design** - Use when building web components, pages, or interfaces that need distinctive, production-grade design. Read `.claude/skills/frontend-design/SKILL.md`.

### Deployment

- **vercel-deploy** - Use when deploying the application. No authentication required - returns preview URL and claimable deployment link. Read `.claude/skills/vercel-deploy/SKILL.md`.

### Browser Testing

- **agent-browser** - Use for UI/browser testing when implementing frontend features. Start the dev server first, then use this skill for automation and verification. Read `.claude/skills/agent-browser/SKILL.md`.

### Other Available Skills

All skills from `.claude/skills/` are available including: algorithmic-art, brand-guidelines, canvas-design, doc-coauthoring, docx, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx.

## Workflow Integration

When the docker-ralph-feedback loop runs:

1. For React/Next.js code changes, apply rules from `react-best-practices`
2. For UI features requiring browser testing, use `agent-browser` skill
3. Before committing UI changes, consider running `web-design-guidelines` audit
