import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * These tests capture screenshots for visual comparison to detect unintended
 * UI changes. On first run, baselines are created. Subsequent runs compare
 * against baselines.
 *
 * To update baselines after intentional changes:
 *   npx playwright test --update-snapshots
 */

test.describe('Homepage Visual Regression', () => {
  test('desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    // Wait for fonts and images to load
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
    });
  });

  test('mobile viewport (iPhone 14)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });
});

test.describe('ProductCard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('default state', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Find first product card
    const productCard = page
      .locator('[data-testid="product-card"], article.group')
      .first();
    await expect(productCard).toBeVisible();
    await expect(productCard).toHaveScreenshot('product-card-default.png');
  });

  test('hover state', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const productCard = page
      .locator('[data-testid="product-card"], article.group')
      .first();
    await expect(productCard).toBeVisible();

    // Hover over the card
    await productCard.hover();
    // Small delay for hover animation
    await page.waitForTimeout(300);

    await expect(productCard).toHaveScreenshot('product-card-hover.png');
  });
});

test.describe('CartDrawer Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('empty state', async ({ page }) => {
    // Open cart drawer
    const cartButton = page
      .locator('button[aria-label*="cart"], [data-testid="cart-icon"]')
      .first();
    await cartButton.click();

    // Wait for drawer to open
    await page.waitForTimeout(300);

    // Find the cart drawer
    const cartDrawer = page.locator(
      '[data-testid="cart-drawer"], [role="dialog"], .fixed.right-0'
    );
    await expect(cartDrawer.first()).toBeVisible();

    await expect(cartDrawer.first()).toHaveScreenshot('cart-drawer-empty.png');
  });

  test('with items', async ({ page }) => {
    // Navigate to shop and add an item to cart
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Click first product card to go to product page
    const productCard = page
      .locator('[data-testid="product-card"], article.group')
      .first();
    const productLink = productCard.locator('a').first();
    await productLink.click();
    await page.waitForLoadState('networkidle');

    // Click Add to Cart
    const addToCartButton = page.getByRole('button', { name: /add to cart/i });
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      await page.waitForTimeout(500);

      // Cart drawer should be visible
      const cartDrawer = page.locator(
        '[data-testid="cart-drawer"], [role="dialog"], .fixed.right-0'
      );
      await expect(cartDrawer.first()).toBeVisible();

      await expect(cartDrawer.first()).toHaveScreenshot(
        'cart-drawer-with-items.png'
      );
    }
  });
});

test.describe('Blog Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('listing page', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('blog-listing.png', {
      fullPage: true,
    });
  });

  test('post page', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    // Check if there are any blog post links
    const postLinks = page.locator('article a, a[href^="/blog/"]');
    const count = await postLinks.count();

    if (count > 0) {
      // Click first post
      await postLinks.first().click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('blog-post.png', {
        fullPage: true,
      });
    } else {
      // No posts exist, screenshot empty state
      await expect(page).toHaveScreenshot('blog-post-empty.png', {
        fullPage: true,
      });
    }
  });
});

test.describe('Lookbook Visual Regression', () => {
  test('gallery page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/lookbook');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('lookbook-gallery.png', {
      fullPage: true,
    });
  });
});

test.describe('Drops Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('drops listing', async ({ page }) => {
    await page.goto('/drops');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('drops-listing.png', {
      fullPage: true,
    });
  });

  test('drops archive', async ({ page }) => {
    await page.goto('/drops/archive');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('drops-archive.png', {
      fullPage: true,
    });
  });
});

test.describe('Checkout Visual Regression', () => {
  test('checkout success page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/checkout/success');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('checkout-success.png', {
      fullPage: true,
    });
  });

  test('checkout cancel page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/checkout/cancel');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('checkout-cancel.png', {
      fullPage: true,
    });
  });
});

test.describe('Account Pages Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('login page', async ({ page }) => {
    await page.goto('/account/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('account-login.png', {
      fullPage: true,
    });
  });

  test('register page', async ({ page }) => {
    await page.goto('/account/register');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('account-register.png', {
      fullPage: true,
    });
  });
});
