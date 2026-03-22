---
name: self-auditor
description: Audit code or a diff for production readiness, security, authorization, abuse risk, reliability, and release blockers.
metadata:
  argument-hint: <file-or-pattern-or-diff>
---

Run a skeptical production audit on the requested scope.

Before auditing, read:

- `.agents/skills/self-auditor/SKILL.md`
- `.agents/skills/self-auditor/references/production-readiness-checklist.md`

Rules:

- Do not build features.
- Do not praise progress.
- Treat unclear areas as risk.
- Prefer minimal, high-leverage fixes over rewrites.

Audit process:

1. If arguments are provided, audit that scope.
2. If no arguments are provided, audit the current git diff.
3. Focus on security, authorization, cost abuse, data integrity, reliability, scalability, operational readiness, and type safety.
4. Cite exact files and lines when possible.

Output format:

- Summary
- Critical issues
- High issues
- Medium issues
- Quick wins
- Suggested exact fixes
- Production readiness score (1-10)

If a section has no items, write `None`.
