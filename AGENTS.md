# AGENTS.md

## Project

Vidi: a home English-learning video site. Nuxt 4 full-stack + Tailwind v4 + shadcn-vue (built on reka-ui). Streams video directly, tracks playback progress, runs persistently via launchd on this Mac, browsed from iPad.

See [docs/01-architecture.md](docs/01-architecture.md).

## Rules

### Docs

- **Numbered doc naming**: files under `docs/` follow `NN-description.md` (`00-research.md`, `01-architecture.md`). New docs get the next number (02, 03…), ordered by content logic; never renumber existing ones.
- Cross-doc links use relative paths and are updated together with renames.

### Code & UI

- Follow existing repo conventions (Nuxt 4 `app/` directory layout, shadcn-vue components copied into `app/components/ui/`).
- No heavy component libraries (Element Plus / Naive UI, etc.); prefer shadcn-vue + Tailwind for UI.
- No comments in code unless asked.

### Storage

- Playback progress lives in `progress.json` with debounced writes; no database.

### Git

- Commit title format: `emoji [scope] The main change`, e.g. `✨ [core] Adopt shared account slug tenancy`.
- No agent trailers in commits (`Made-with:`, `Co-Authored-By: Claude`, Cursor, etc.). Only add body text when it provides real context.
