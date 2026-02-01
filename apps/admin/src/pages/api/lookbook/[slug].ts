import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Path to the storefront lookbook content directory (relative to project root)
const LOOKBOOK_CONTENT_DIR = path.resolve(
  process.cwd(),
  '../storefront/src/content/lookbook'
);

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
 * GET /api/lookbook/:slug - Get a single lookbook
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
    const filePath = path.join(LOOKBOOK_CONTENT_DIR, `${slug}.mdx`);

    try {
      await fs.access(filePath);
    } catch {
      return new Response(JSON.stringify({ error: 'Lookbook not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseMDX(content);

    const images = (frontmatter.images as string[]) || [];

    return new Response(
      JSON.stringify({
        slug,
        title: (frontmatter.title as string) || '',
        description: frontmatter.description as string | undefined,
        date: (frontmatter.date as string) || '',
        drop: frontmatter.drop as string | undefined,
        coverImage: frontmatter.coverImage as string | undefined,
        images,
        draft: (frontmatter.draft as boolean) ?? false,
        body,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to get lookbook:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to get lookbook';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * PATCH /api/lookbook/:slug - Update a lookbook
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
    const filePath = path.join(LOOKBOOK_CONTENT_DIR, `${slug}.mdx`);

    // Check if lookbook exists
    try {
      await fs.access(filePath);
    } catch {
      return new Response(JSON.stringify({ error: 'Lookbook not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read current content
    const currentContent = await fs.readFile(filePath, 'utf-8');
    const { frontmatter: currentData } = parseMDX(currentContent);

    // Get update data
    const data = await request.json();

    // Merge with existing data
    const updatedData = {
      title: data.title?.trim() || (currentData.title as string),
      description:
        data.description !== undefined
          ? data.description?.trim()
          : (currentData.description as string | undefined),
      date: data.date || (currentData.date as string),
      drop:
        data.drop !== undefined
          ? data.drop || undefined
          : (currentData.drop as string | undefined),
      coverImage:
        data.coverImage !== undefined
          ? data.coverImage || undefined
          : (currentData.coverImage as string | undefined),
      images:
        data.images !== undefined
          ? data.images
          : (currentData.images as string[]) || [],
      draft:
        data.draft !== undefined ? data.draft : (currentData.draft as boolean),
    };

    // Validate required fields
    if (!updatedData.title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!updatedData.date) {
      return new Response(JSON.stringify({ error: 'Date is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate and write updated MDX
    const mdxContent = generateMDX(updatedData);
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    return new Response(
      JSON.stringify({
        slug,
        ...updatedData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to update lookbook:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update lookbook';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * DELETE /api/lookbook/:slug - Delete a lookbook
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
    const filePath = path.join(LOOKBOOK_CONTENT_DIR, `${slug}.mdx`);

    // Check if lookbook exists
    try {
      await fs.access(filePath);
    } catch {
      return new Response(JSON.stringify({ error: 'Lookbook not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the file
    await fs.unlink(filePath);

    return new Response(
      JSON.stringify({ success: true, message: 'Lookbook deleted' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to delete lookbook:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to delete lookbook';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
