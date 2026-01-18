import { describe, it, expect } from 'vitest';
import { getRelatedPosts, type BlogPost } from '../../src/lib/blog';

/**
 * Tests for the getRelatedPosts utility function
 */

// Helper to create mock blog posts with the CollectionEntry structure
function createMockPost(
  slug: string,
  tags: string[],
  date: Date,
  draft = false
): BlogPost {
  return {
    id: `${slug}.mdx`,
    slug,
    body: 'Test content',
    collection: 'blog',
    data: {
      title: `Post: ${slug}`,
      description: `Description for ${slug}`,
      date,
      author: 'Test Author',
      tags,
      draft,
      pinned: false,
    },
    render: async () => ({
      Content: () => null,
      headings: [],
      remarkPluginFrontmatter: {},
    }),
  } as unknown as BlogPost;
}

describe('getRelatedPosts', () => {
  describe('Basic functionality', () => {
    it('returns posts with matching tags', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion', 'news'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('related-1', ['fashion'], new Date('2026-01-14')),
        createMockPost('unrelated', ['tech', 'sports'], new Date('2026-01-13')),
        createMockPost('related-2', ['news'], new Date('2026-01-12')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related).toHaveLength(2);
      expect(related.map((p) => p.slug)).toContain('related-1');
      expect(related.map((p) => p.slug)).toContain('related-2');
      expect(related.map((p) => p.slug)).not.toContain('unrelated');
    });

    it('limits results to specified limit', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('related-1', ['fashion'], new Date('2026-01-14')),
        createMockPost('related-2', ['fashion'], new Date('2026-01-13')),
        createMockPost('related-3', ['fashion'], new Date('2026-01-12')),
        createMockPost('related-4', ['fashion'], new Date('2026-01-11')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related).toHaveLength(3);
    });

    it('excludes the current post from results', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('other', ['fashion'], new Date('2026-01-14')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related.map((p) => p.slug)).not.toContain('current');
      expect(related).toHaveLength(1);
      expect(related[0].slug).toBe('other');
    });
  });

  describe('Tag matching', () => {
    it('is case-insensitive when matching tags', () => {
      const currentPost = createMockPost(
        'current',
        ['Fashion', 'NEWS'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('related', ['fashion', 'news'], new Date('2026-01-14')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related).toHaveLength(1);
      expect(related[0].slug).toBe('related');
    });

    it('prioritizes posts with more matching tags', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion', 'news', 'brand'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('one-match', ['fashion'], new Date('2026-01-14')),
        createMockPost(
          'two-matches',
          ['fashion', 'news'],
          new Date('2026-01-13')
        ),
        createMockPost(
          'three-matches',
          ['fashion', 'news', 'brand'],
          new Date('2026-01-12')
        ),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      // Should be sorted by match count descending
      expect(related[0].slug).toBe('three-matches');
      expect(related[1].slug).toBe('two-matches');
      expect(related[2].slug).toBe('one-match');
    });
  });

  describe('Date sorting', () => {
    it('sorts by date when posts have equal matching tags', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-20')
      );
      const allPosts = [
        currentPost,
        createMockPost('older', ['fashion'], new Date('2026-01-10')),
        createMockPost('newest', ['fashion'], new Date('2026-01-18')),
        createMockPost('middle', ['fashion'], new Date('2026-01-15')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related[0].slug).toBe('newest');
      expect(related[1].slug).toBe('middle');
      expect(related[2].slug).toBe('older');
    });

    it('combines tag count and date sorting correctly', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion', 'news'],
        new Date('2026-01-20')
      );
      const allPosts = [
        currentPost,
        createMockPost('newer-one-tag', ['fashion'], new Date('2026-01-19')),
        createMockPost(
          'older-two-tags',
          ['fashion', 'news'],
          new Date('2026-01-10')
        ),
        createMockPost(
          'newer-two-tags',
          ['fashion', 'news'],
          new Date('2026-01-18')
        ),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      // Posts with 2 matching tags should come first, sorted by date
      expect(related[0].slug).toBe('newer-two-tags');
      expect(related[1].slug).toBe('older-two-tags');
      // Then posts with 1 matching tag
      expect(related[2].slug).toBe('newer-one-tag');
    });
  });

  describe('Draft post handling', () => {
    it('excludes draft posts from results', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('published', ['fashion'], new Date('2026-01-14'), false),
        createMockPost('draft', ['fashion'], new Date('2026-01-13'), true),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related).toHaveLength(1);
      expect(related[0].slug).toBe('published');
    });
  });

  describe('Edge cases', () => {
    it('returns empty array when no posts have matching tags', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('unrelated-1', ['tech'], new Date('2026-01-14')),
        createMockPost('unrelated-2', ['sports'], new Date('2026-01-13')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related).toHaveLength(0);
    });

    it('handles posts with no tags by returning most recent posts', () => {
      const currentPost = createMockPost('current', [], new Date('2026-01-15'));
      const allPosts = [
        currentPost,
        createMockPost('newer', ['fashion'], new Date('2026-01-14')),
        createMockPost('oldest', ['news'], new Date('2026-01-10')),
        createMockPost('middle', ['tech'], new Date('2026-01-12')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      // When current post has no tags, return most recent posts
      expect(related).toHaveLength(3);
      expect(related[0].slug).toBe('newer');
      expect(related[1].slug).toBe('middle');
      expect(related[2].slug).toBe('oldest');
    });

    it('returns empty array when allPosts only contains current post', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );
      const allPosts = [currentPost];

      const related = getRelatedPosts(currentPost, allPosts, 3);

      expect(related).toHaveLength(0);
    });

    it('returns empty array when allPosts is empty', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );

      const related = getRelatedPosts(currentPost, [], 3);

      expect(related).toHaveLength(0);
    });

    it('defaults to limit of 3 when not specified', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-20')
      );
      const allPosts = [
        currentPost,
        createMockPost('related-1', ['fashion'], new Date('2026-01-15')),
        createMockPost('related-2', ['fashion'], new Date('2026-01-14')),
        createMockPost('related-3', ['fashion'], new Date('2026-01-13')),
        createMockPost('related-4', ['fashion'], new Date('2026-01-12')),
        createMockPost('related-5', ['fashion'], new Date('2026-01-11')),
      ];

      const related = getRelatedPosts(currentPost, allPosts);

      expect(related).toHaveLength(3);
    });

    it('returns fewer posts than limit when not enough matches exist', () => {
      const currentPost = createMockPost(
        'current',
        ['fashion'],
        new Date('2026-01-15')
      );
      const allPosts = [
        currentPost,
        createMockPost('only-match', ['fashion'], new Date('2026-01-14')),
      ];

      const related = getRelatedPosts(currentPost, allPosts, 5);

      expect(related).toHaveLength(1);
    });
  });
});
