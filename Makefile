.PHONY: help dev build preview preview-build clean install lint format typo typo-fix

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  help      Show this help"
	@echo "  dev       Start Astro dev server"
	@echo "  build         Build site for production (output: dist/)"
	@echo "  preview       Preview production build locally"
	@echo "  preview-build Build with PUBLIC_PREVIEW=true (shows future posts)"
	@echo "  clean     Remove dist/ and node_modules/.astro"
	@echo "  install   Install dependencies"
	@echo "  lint      Check for Astro issues"
	@echo "  format    Format code with Prettier (if configured)"
	@echo "  typo      Preview typographic fixes (dry-run)"
	@echo "  typo-fix  Apply typographic fixes in-place (with .bak backup)"

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

preview-build:
	PUBLIC_PREVIEW=true npm run build

clean:
	rm -rf dist .astro node_modules/.astro

install:
	npm install

lint:
	npx astro check

format:
	npx prettier --write .

typo:
	@for lang in cs en de es pt; do \
		echo "── $$lang ──────────────────────────"; \
		typolima --lang $$lang --recursive --dry-run --diff src/content/blog/$$lang/; \
	done

typo-fix:
	@for lang in cs en de es pt; do \
		echo "── $$lang ──────────────────────────"; \
		typolima --lang $$lang --recursive --in-place src/content/blog/$$lang/; \
	done
