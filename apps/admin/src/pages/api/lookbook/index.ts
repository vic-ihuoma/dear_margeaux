import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Path to the storefront lookbook content directory (relative to project root)
const LOOKBOOK_CONTENT_DIR = path.resolve(
  process.cwd(),
  '../storefront/src/content/lookbook'
);

export interface LookbookListItem {
  slug: string;
  title: string;
  date: string;
  drop?: string;
  imageCount: number;
  draft: boolean;
}

/**
 * Parse frontmatter from MDX file
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

  let currentKey: string | null = null;
  let arrayBuffer: string[] = [];
  let inArray = false;

  for (const line of lines) {
    // Check if we're continuing an array
    if (inArray) {
      const arrayItemMatch = line.match(/^\s+-\s*"?([^"]*)"?$/);
      if (arrayItemMatch) {
        arrayBuffer.push(arrayItemMatch[1]);
        continue;
      } else {
        // End of array
        if (currentKey) {
          frontmatter[currentKey] = arrayBuffer;
        }
        inArray = false;
        currentKey = null;
        arrayBuffer = [];
      }
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Check if this is the start of a YAML array
    if (value === '') {
      currentKey = key;
      inArray = true;
      arrayBuffer = [];
      continue;
    }

    // Remove quotes if present
    if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1);
    }

    // Parse inline arrays (e.g., ["item1", "item2"])
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

  // Handle array that ends at end of frontmatter
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayBuffer;
  }

  return { frontmatter, body };
}

/**
 * GET /api/lookbook - List all lookbooks
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // Ensure lookbook directory exists
    try {
      await fs.access(LOOKBOOK_CONTENT_DIR);
    } catch {
      // Directory doesn't exist, return empty list
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const files = await fs.readdir(LOOKBOOK_CONTENT_DIR);
    const mdxFiles = files.filter((f) => f.endsWith('.mdx'));

    const lookbooks: LookbookListItem[] = [];

    for (const file of mdxFiles) {
      const filePath = path.join(LOOKBOOK_CONTENT_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = parseMDX(content);

      const images = frontmatter.images as string[] | undefined;

      lookbooks.push({
        slug: file.replace('.mdx', ''),
        title: (frontmatter.title as string) || '',
        date: (frontmatter.date as string) || '',
        drop: frontmatter.drop as string | undefined,
        imageCount: images?.length || 0,
        draft: (frontmatter.draft as boolean) ?? false,
      });
    }

    // Sort by date (newest first)
    lookbooks.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Apply status filter
    const statusFilter = url.searchParams.get('status');
    let filteredLookbooks = lookbooks;
    if (statusFilter === 'draft') {
      filteredLookbooks = lookbooks.filter((l) => l.draft);
    } else if (statusFilter === 'published') {
      filteredLookbooks = lookbooks.filter((l) => !l.draft);
    }

    // Apply search filter
    const searchQuery = url.searchParams.get('search');
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredLookbooks = filteredLookbooks.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.slug.toLowerCase().includes(query) ||
          l.drop?.toLowerCase().includes(query)
      );
    }

    return new Response(JSON.stringify({ items: filteredLookbooks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to list lookbooks:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to list lookbooks';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

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
 * Generate MDX content from lookbook data
 */
function generateMDX(data: {
  title: string;
  description?: string;
  date: string;
  drop?: string;
  coverImage?: string;
  images: string[];
  draft: boolean;
}): string {
  let frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"`;

  if (data.description) {
    frontmatter += `
description: "${data.description.replace(/"/g, '\\"')}"`;
  }

  frontmatter += `
date: "${data.date}"`;

  if (data.drop) {
    frontmatter += `
drop: "${data.drop}"`;
  }

  if (data.coverImage) {
    frontmatter += `
coverImage: "${data.coverImage}"`;
  }

  frontmatter += `
draft: ${data.draft}`;

  if (data.images && data.images.length > 0) {
    frontmatter += `
images:`;
    for (const img of data.images) {
      frontmatter += `
  - "${img}"`;
    }
  } else {
    frontmatter += `
images: []`;
  }

  frontmatter += `
---

`;

  return frontmatter;
}

/**
 * POST /api/lookbook - Create a new lookbook
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

    if (!data.date) {
      return new Response(JSON.stringify({ error: 'Date is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate slug
    const slug = generateSlug(data.title);

    // Ensure lookbook directory exists
    try {
      await fs.access(LOOKBOOK_CONTENT_DIR);
    } catch {
      await fs.mkdir(LOOKBOOK_CONTENT_DIR, { recursive: true });
    }

    // Check for slug conflicts
    const filePath = path.join(LOOKBOOK_CONTENT_DIR, `${slug}.mdx`);
    let counter = 1;
    let finalPath = filePath;
    let finalSlug = slug;

    while (true) {
      try {
        await fs.access(finalPath);
        // File exists, try with suffix
        finalSlug = `${slug}-${counter}`;
        finalPath = path.join(LOOKBOOK_CONTENT_DIR, `${finalSlug}.mdx`);
        counter++;
      } catch {
        // File doesn't exist, we can use this path
        break;
      }
    }

    // Generate MDX content
    const mdxContent = generateMDX({
      title: data.title.trim(),
      description: data.description?.trim(),
      date: data.date,
      drop: data.drop,
      coverImage: data.coverImage,
      images: data.images || [],
      draft: data.draft ?? true,
    });

    // Write file
    await fs.writeFile(finalPath, mdxContent, 'utf-8');

    // Return created lookbook
    return new Response(
      JSON.stringify({
        slug: finalSlug,
        title: data.title.trim(),
        description: data.description?.trim(),
        date: data.date,
        drop: data.drop,
        coverImage: data.coverImage,
        images: data.images || [],
        draft: data.draft ?? true,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to create lookbook:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create lookbook';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
