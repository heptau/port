.PHONY: help dev build preview clean install lint format

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  help      Show this help"
	@echo "  dev       Start Astro dev server"
	@echo "  build     Build site for production (output: dist/)"
	@echo "  preview   Preview production build locally"
	@echo "  clean     Remove dist/ and node_modules/.astro"
	@echo "  install   Install dependencies"
	@echo "  lint      Check for Astro issues"
	@echo "  format    Format code with Prettier (if configured)"

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

clean:
	rm -rf dist .astro node_modules/.astro

install:
	npm install

lint:
	npx astro check

format:
	npx prettier --write .
