# Contributing to Claude Community Kenya

Thank you for your interest in contributing! This document explains how to get involved, submit changes, and maintain quality standards.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

This project follows our [Code of Conduct](https://www.claudekenya.org/code-of-conduct). By participating, you agree to uphold a respectful and inclusive environment for everyone.

---

## Ways to Contribute

- **Bug reports** — Find something broken? Open an issue.
- **Feature requests** — Have an idea? Open an issue with the `enhancement` label.
- **Code contributions** — Fix bugs, build features, improve performance.
- **Content** — Improve documentation, fix typos, add resources.
- **Design** — UI improvements, accessibility fixes, responsive layout.

---

## Development Setup

### Prerequisites

- Node.js v22 LTS
- npm
- PostgreSQL database
- Git

### Fork and Clone

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Claude-Community-Kenya.git
cd Claude-Community-Kenya

# 2. Add the upstream remote
git remote add upstream https://github.com/Spidey-Acer/Claude-Community-Kenya.git

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env.local
# Fill in your local credentials
```

### Running the Dev Server

```bash
# Generate Prisma client
npx prisma generate

# Run migrations against your local database
npx prisma migrate dev

# Start the dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Making Changes

1. **Sync with upstream** before starting work:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/the-bug-description
   ```

3. **Make your changes.** Keep each commit focused on one thing.

4. **Verify before pushing:**
   ```bash
   npx tsc --noEmit    # TypeScript must pass with zero errors
   npm run lint        # No lint errors (warnings are OK)
   npm run build       # Build must succeed
   ```

5. **Push and open a PR:**
   ```bash
   git push origin feat/your-feature-name
   ```

---

## Commit Conventions

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace (no logic change) |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependency updates, tooling |
| `build` | Build system or config changes |
| `ci` | CI/CD pipeline changes |
| `assets` | Images, fonts, static files |

### Scopes (examples)

`events`, `admin`, `community`, `db`, `api`, `lib`, `ui`, `layout`, `auth`

### Examples

```
feat(community): add upvote functionality to resource cards
fix(events): correct date display on event detail page
docs(readme): update environment variable instructions
chore(deps): upgrade next.js to 16.2.0
```

---

## Pull Request Process

1. Open your PR against the `development` branch (not `main`).
2. Fill in the PR template — summary, changes, and test plan.
3. Ensure all CI checks pass (TypeScript, lint, build).
4. Request a review from a maintainer.
5. Address review feedback. Do not force-push after review has started.
6. A maintainer will merge once approved.

### PR Checklist

Before submitting, confirm:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] No hardcoded secrets or credentials
- [ ] No `console.log` left in production code
- [ ] New pages/routes are accessible (ARIA, keyboard nav)
- [ ] Commit messages follow conventional commits

---

## Code Style

### TypeScript

- Strict mode is enforced — no `any` types
- No `.js` files inside `src/`
- Prefer explicit return types on exported functions

### React / Next.js

- Use `"use client"` only on components that need browser APIs (state, effects, event handlers)
- Server components by default — keep data fetching server-side where possible
- Import with `@/` alias (`@/components/...`, `@/lib/...`)

### Styling

- Tailwind utility classes only — no inline styles
- Use CSS custom properties from `globals.css` for design tokens (e.g., `var(--green-primary)`)
- Follow the **Terminal Noir** design system (dark backgrounds, green/amber/cyan accents)

### File Organization

```
src/components/layout/     # Shell: Navbar, Footer, PageTransition
src/components/ui/         # Reusable: Button, Card, Badge, etc.
src/components/sections/   # Page sections: EventCard, BlogCard, etc.
src/components/terminal/   # Terminal FX: TypingAnimation, MatrixRain, etc.
src/components/community/  # Community hub components
src/components/admin/      # Admin panel components
src/data/                  # Static TypeScript data + interfaces
src/lib/                   # Constants, utils, RBAC, sanitization
src/app/                   # Next.js routes (App Router)
```

### Content Accuracy

- Never fabricate URLs — only use real, publicly accessible links
- Keep community stats accurate — do not inflate numbers
- Do not include overly personal information about individuals

---

## Reporting Issues

Use [GitHub Issues](https://github.com/Spidey-Acer/Claude-Community-Kenya/issues) with one of the templates:

- **Bug report** — What happened, what you expected, steps to reproduce
- **Feature request** — What you'd like and why it benefits the community

For security vulnerabilities, please **do not** open a public issue. Contact a maintainer directly via Discord.

---

## Questions?

Join the community on [Discord](https://discord.gg/CkD9QWjsHm) — we're happy to help you get started.
