import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublished } from '../utils/published';

export async function GET(context) {
	const posts = await getCollection('blog', ({ data }) => data.locale === 'en' && isPublished(data));
	posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

	return rss({
		title: 'port.80.cz — English',
		description: "Zbyněk Vanžura's blog — practical insights from more than 20 years of experience, mostly about PostgreSQL, software development, and AI.",
		site: context.site,
		items: posts.map(post => ({
			title: post.data.title,
			pubDate: post.data.date,
			description: post.data.description,
			link: `/${post.id.split('/').pop()}`,
		})),
		customData: '<language>en</language>',
	});
}
