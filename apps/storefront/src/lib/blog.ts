import type { CollectionEntry } from 'astro:content';

/**
 * Blog post entry type for convenience
 */
export type BlogPost = CollectionEntry<'blog'>;

/**
 * Calculate the number of matching tags between two posts
 */
function countMatchingTags(postA: BlogPost, postB: BlogPost): number {
  const tagsA = new Set(postA.data.tags.map((t) => t.toLowerCase()));
  const tagsB = postB.data.tags.map((t) => t.toLowerCase());

  return tagsB.filter((tag) => tagsA.has(tag)).length;
}

/**
 * Get related posts based on matching tags
 *
 * Posts are scored by number of matching tags and sorted by:
 * 1. Number of matching tags (descending)
 * 2. Date (newest first) for posts with equal matching tags
 *
 * @param currentPost - The current post to find related posts for
 * @param allPosts - All available blog posts
 * @param limit - Maximum number of related posts to return (default: 3)
 * @returns Array of related posts, excluding the current post and drafts
 */
export function getRelatedPosts(
  currentPost: BlogPost,
  allPosts: BlogPost[],
  limit: number = 3
): BlogPost[] {
  // Filter out the current post and drafts
  const otherPosts = allPosts.filter(
    (post) => post.slug !== currentPost.slug && !post.data.draft
  );

  // If current post has no tags, return most recent posts
  if (currentPost.data.tags.length === 0) {
    return otherPosts
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
      .slice(0, limit);
  }

  // Score posts by matching tags and sort
  const scoredPosts = otherPosts
    .map((post) => ({
      post,
      matchCount: countMatchingTags(currentPost, post),
    }))
    .filter(({ matchCount }) => matchCount > 0) // Only include posts with at least 1 matching tag
    .sort((a, b) => {
      // First sort by match count (descending)
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      // Then by date (newest first)
      return b.post.data.date.valueOf() - a.post.data.date.valueOf();
    });

  return scoredPosts.slice(0, limit).map(({ post }) => post);
}
