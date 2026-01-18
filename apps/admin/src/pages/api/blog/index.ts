import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Path to the storefront blog content directory (relative to project root)
const BLOG_CONTENT_DIR = path.resolve(
  process.cwd(),
  '../storefront/src/content/blog'
);

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  draft: boolean;
  pinned: boolean;
  content: string;
}

export interface BlogPostListItem {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  draft: boolean;
  pinned: boolean;
}

/**
 * Parse frontmatter and content from MDX file
 */
function parseMDX(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // Parse YAML-like frontmatter
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterStr.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1);
    }

    // Parse arrays (e.g., ["item1", "item2"])
    if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
      try {
        value = JSON.parse(value as string);
      } catch {
        // Keep as string if parsing fails
      }
    }

    // Parse booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Generate frontmatter string from object
 */
function generateFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === 'string') {
      // Quote strings that might need it
      if (value.includes(':') || value.includes('#') || value.includes('"')) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (value instanceof Date) {
      lines.push(`${key}: ${value.toISOString().split('T')[0]}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate a slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * GET /api/blog - List all blog posts
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // Ensure blog directory exists
    try {
      await fs.access(BLOG_CONTENT_DIR);
    } catch {
      // Directory doesn't exist, return empty list
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const files = await fs.readdir(BLOG_CONTENT_DIR);
    const mdxFiles = files.filter((f) => f.endsWith('.mdx'));

    const posts: BlogPostListItem[] = [];

    for (const file of mdxFiles) {
      const filePath = path.join(BLOG_CONTENT_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = parseMDX(content);

      posts.push({
        slug: file.replace('.mdx', ''),
        title: (frontmatter.title as string) || '',
        description: (frontmatter.description as string) || '',
        date: (frontmatter.date as string) || '',
        author: (frontmatter.author as string) || '',
        tags: (frontmatter.tags as string[]) || [],
        image: frontmatter.image as string | undefined,
        draft: (frontmatter.draft as boolean) ?? false,
        pinned: (frontmatter.pinned as boolean) ?? false,
      });
    }

    // Sort by date (newest first)
    posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Apply status filter
    const statusFilter = url.searchParams.get('status');
    let filteredPosts = posts;
    if (statusFilter === 'draft') {
      filteredPosts = posts.filter((p) => p.draft);
    } else if (statusFilter === 'published') {
      filteredPosts = posts.filter((p) => !p.draft);
    }

    // Apply search filter
    const searchQuery = url.searchParams.get('search');
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return new Response(JSON.stringify({ items: filteredPosts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to list blog posts:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to list blog posts';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/blog - Create a new blog post
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.title?.trim()) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.description?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!data.author?.trim()) {
      return new Response(JSON.stringify({ error: 'Author is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate slug from title if not provided
    const slug = data.slug?.trim() || generateSlug(data.title);

    // Check if slug already exists
    const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
    try {
      await fs.access(filePath);
      return new Response(
        JSON.stringify({ error: 'A post with this slug already exists' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch {
      // File doesn't exist, we can proceed
    }

    // Ensure blog directory exists
    await fs.mkdir(BLOG_CONTENT_DIR, { recursive: true });

    // Build frontmatter
    const frontmatter = generateFrontmatter({
      title: data.title.trim(),
      description: data.description.trim(),
      date: data.date || new Date().toISOString().split('T')[0],
      author: data.author.trim(),
      tags: data.tags || [],
      image: data.image || undefined,
      draft: data.draft ?? true,
      pinned: data.pinned ?? false,
    });

    // Build content
    const content =
      data.content?.trim() || `# ${data.title}\n\nStart writing...`;
    const fileContent = `${frontmatter}\n${content}\n`;

    // Write file
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return new Response(
      JSON.stringify({
        slug,
        title: data.title.trim(),
        description: data.description.trim(),
        date: data.date || new Date().toISOString().split('T')[0],
        author: data.author.trim(),
        tags: data.tags || [],
        image: data.image || undefined,
        draft: data.draft ?? true,
        pinned: data.pinned ?? false,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to create blog post:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create blog post';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
