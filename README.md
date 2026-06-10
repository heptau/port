# port.80.cz

Personal multilingual blog about PostgreSQL, AI, and development.

Built with **Astro** + **Markdown**, deployed on **GitHub Pages**.

## Commands

```sh
make dev       # Start dev server
make build     # Build for production
make preview   # Preview production build
make clean     # Remove dist/ and caches
make lint      # Astro type check
```

## Project Structure

```
src/
  content/blog/{locale}/   # Markdown articles
  content.config.ts        # Collection schema
  layouts/BaseLayout.astro # Main layout (header, theme, nav)
  pages/                   # Astro routes
  styles/global.css        # Global styles
.astro/                    # Generated types (gitignored)
```

## Deployment

Push to `main` → GitHub Actions builds and deploys to GitHub Pages.
