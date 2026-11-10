export const CATEGORIES = ['AI', 'PostgreSQL', 'Software Engineering', 'Standards & Society'] as const;

const SLUGS: Record<string, string> = {
	'AI': 'AI',
	'PostgreSQL': 'PostgreSQL',
	'Software Engineering': 'software-engineering',
	'Standards & Society': 'standards-society',
};

const LABELS: Record<string, string> = Object.fromEntries(
	Object.entries(SLUGS).map(([label, slug]) => [slug, label])
);

export function categorySlug(label: string): string {
	return SLUGS[label] ?? label;
}

export function categoryLabel(slug: string): string {
	return LABELS[slug] ?? slug;
}

const DISPLAY: Record<string, string> = {
	'AI': 'AI / LLM',
	'PostgreSQL': 'PostgreSQL',
	'Software Engineering': 'Software Engineering',
	'Standards & Society': 'Standards & Society',
};

export function categoryDisplay(label: string): string {
	return DISPLAY[label] ?? label;
}
