import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

const LOCALE_LABELS = {
	cs: { title: 'port.80.cz — Česky', lang: 'cs' },
	es: { title: 'port.80.cz — Español', lang: 'es' },
	de: { title: 'port.80.cz — Deutsch', lang: 'de' },
	pt: { title: 'port.80.cz — Português', lang: 'pt' },
};

export async function getStaticPaths() {
	return Object.keys(LOCALE_LABELS).map(locale => ({ params: { locale } }));
}

export async function GET({ params, site }) {
	const locale = params.locale;
	const meta = LOCALE_LABELS[locale];
	if (!meta) return new Response(null, { status: 404 });

	const posts = await getCollection('blog', ({ data }) => data.locale === locale && !data.draft);
	posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

	return rss({
		title: meta.title,
		description: "Blog Zbyňka Vanžury s praktickými postřehy z více než 20 let zkušeností — především o PostgreSQL, vývoji softwaru a AI.",
		site,
		items: posts.map(post => ({
			title: post.data.title,
			pubDate: post.data.date,
			description: post.data.description,
			link: `/${locale}/${post.id.split('/').pop()}`,
		})),
		customData: `<language>${meta.lang}</language>`,
	});
}
