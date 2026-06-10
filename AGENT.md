# port.80.cz — Personal Blog

## Overview
Multilingual blog built with **Astro** + **Markdown**, deployed via **GitHub Pages**.

## URL
https://port.80.cz

## Tech Stack
- **Astro** ^6.4 — static site generator
- **Markdown** — content via `src/content/blog/`
- **GitHub Pages** — hosting
- **GitHub Actions** — CI/CD

## Content Structure
Articles in `src/content/blog/{locale}/` — flat (no category subdirs).

## Collection Schema
Defined in `src/content.config.ts`. Frontmatter:
- `title`, `description`, `locale` (en|cs|es|de|pt), `categories` (AI|PostgreSQL), `date`
- `translation_id` links translations across locales
- Optional: `tags`, `draft`

## Routing
- Default locale: `en` (no prefix). Others: `/{locale}/`.
- No `/blog` prefix. URL: `/{slug}` or `/{locale}/{slug}`.
- Categories: `/AI`, `/PostgreSQL`, `/{locale}/AI`, `/{locale}/PostgreSQL`.
- Dynamic `[...path].astro` catch-all routes.

## Design
- Light/dark theme via `prefers-color-scheme` + manual override (Auto/Light/Dark).
- Theme stored in `localStorage` key `port_theme`.
- Dropdown menus for categories, theme, and language.

## Commands
| Command       | Description                    |
|---------------|--------------------------------|
| `make`        | Show help                      |
| `make dev`    | Start dev server               |
| `make build`  | Build for production (dist/)   |
| `make preview`| Preview production build       |
| `make clean`  | Remove dist/ and caches        |
| `make lint`   | Astro type check               |

## Deployment
GitHub Actions workflow in `.github/workflows/deploy.yml`.
Triggers on push to `main`.
