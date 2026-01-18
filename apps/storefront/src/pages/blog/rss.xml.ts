import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  // Get all published blog posts (exclude drafts)
  const posts = await getCollection('blog', ({ data }) => {
    return !data.draft;
  });

  // Sort posts by date (newest first)
  const sortedPosts = posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    // `<title>` field in output xml
    title: 'Dear Margeaux | The Journal',
    // `<description>` field in output xml
    description:
      'News, stories, and behind-the-scenes from Dear Margeaux - a boutique handbag brand.',
    // Pull in your site URL from context
    site: context.site ?? 'https://dearmargeaux.com',
    // Array of `<item>`s in output xml
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      // Optional: include the author
      author: post.data.author,
      // Optional: include categories/tags
      categories: post.data.tags,
    })),
    // (optional) inject custom xml
    customData: `<language>en-us</language>`,
  });
}
