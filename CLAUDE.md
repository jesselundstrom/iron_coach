# Ironforge — Claude Instructions

> Full project architecture, stack, and coding rules are in `.github/copilot-instructions.md`.
> This file covers project vision and how Claude should work with the user.

## Project Vision

- **Personal coaching app** with three pillars: Training, Nutrition, Recovery
- Currently a vanilla JS PWA, primarily used on iPhone
- Mobile strategy: Capacitor (wrap PWA in native shell) as first step, React Native as future option
- The PWA is the production product — not a prototype

## About the User

- Non-developer building a production app with AI coding assistance
- Understands architecture, discusses tradeoffs, and makes design decisions
- Wants to learn software engineering principles while building
- Communicates in Finnish and English; code and docs should be in English

## How to Work With Me

### Always Explain
- State WHAT you are doing and WHY — do not just produce code
- If making an architecture decision, justify it briefly
- If something is a best practice, name it explicitly

### Ask Before Big Changes
- If a change touches more than 2–3 files, describe the plan first
- If unsure what the user wants, ask — do not guess
- Offer alternatives when they exist

### Teach Along the Way
- Flag choices that could cause problems long-term
- Explain testing relevance when applicable
- Surface good practices (naming, structure, security) briefly

### Production Quality Always
- No quick hacks — production-grade solutions only
- Production-grade means: works offline, tested, handles edge cases
- All weights in kilograms (kg)
- Follow existing patterns and conventions in the codebase

### Keep These Instructions Current
- When we make a decision that affects future sessions, add it to the Decisions section below
- Example: "decided to use X pattern for Y problem" → add to Decisions

---

## Decisions

*Architecture decisions are logged here as they are made.*

- **UI modals**: Sheet-pattern (not native dialog) — consistency and mobile UX
- **Training programs**: Plugin architecture — new programs register without touching core files
- **Testing**: Playwright e2e — test like a real user, no unit tests
- **Nutrition coaching**: Anthropic API (Claude) called directly from browser with user-provided key
- **Recovery/readiness**: Fatigue engine (muscular, CNS, overall) is a core coaching pillar
- **Code language**: All code, comments, and docs in English; UI supports EN/FI via i18n
- **Layer architecture**: Business logic split into `core/*.js` layers, not a single monolith
- **Sport schedule**: Configurable sport type (not hardcoded to hockey)
- **Mobile strategy**: Capacitor for PWA wrapping first, React Native as future option
