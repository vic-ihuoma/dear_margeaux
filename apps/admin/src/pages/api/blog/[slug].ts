import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Path to the storefront blog content directory (relative to project root)
const BLOG_CONTENT_DIR = path.resolve(
  process.cwd(),
  '../storefront/src/content/blog'
);

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
 * GET /api/blog/[slug] - Get a single blog post
 */
export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);

    try {
      await fs.access(filePath);
    } catch {
      return new Response(JSON.stringify({ error: 'Blog post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseMDX(fileContent);

    return new Response(
      JSON.stringify({
        slug,
        title: (frontmatter.title as string) || '',
        description: (frontmatter.description as string) || '',
        date: (frontmatter.date as string) || '',
        author: (frontmatter.author as string) || '',
        tags: (frontmatter.tags as string[]) || [],
        image: frontmatter.image as string | undefined,
        draft: (frontmatter.draft as boolean) ?? false,
        pinned: (frontmatter.pinned as boolean) ?? false,
        content: body.trim(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to get blog post:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to get blog post';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * PATCH /api/blog/[slug] - Update a blog post
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();
    const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return new Response(JSON.stringify({ error: 'Blog post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read existing content
    const existingContent = await fs.readFile(filePath, 'utf-8');
    const { frontmatter: existingFrontmatter, body: existingBody } =
      parseMDX(existingContent);

    // Merge with new data
    const updatedFrontmatter = {
      title: data.title?.trim() ?? existingFrontmatter.title,
      description: data.description?.trim() ?? existingFrontmatter.description,
      date: data.date ?? existingFrontmatter.date,
      author: data.author?.trim() ?? existingFrontmatter.author,
      tags: data.tags ?? existingFrontmatter.tags,
      image: data.image ?? existingFrontmatter.image,
      draft: data.draft ?? existingFrontmatter.draft,
      pinned: data.pinned ?? existingFrontmatter.pinned ?? false,
    };

    // Remove undefined image
    if (!updatedFrontmatter.image) {
      delete updatedFrontmatter.image;
    }

    const updatedContent = data.content?.trim() ?? existingBody.trim();

    // Build new file content
    const frontmatterStr = generateFrontmatter(updatedFrontmatter);
    const fileContent = `${frontmatterStr}\n${updatedContent}\n`;

    // Write file
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return new Response(
      JSON.stringify({
        slug,
        ...updatedFrontmatter,
        content: updatedContent,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to update blog post:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update blog post';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * DELETE /api/blog/[slug] - Delete a blog post
 */
export const DELETE: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return new Response(JSON.stringify({ error: 'Blog post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete file
    await fs.unlink(filePath);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to delete blog post:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to delete blog post';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
