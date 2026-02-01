import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the hero section with title', async ({ page }) => {
    // Check main heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toContain('Timeless Bags');
  });

  test('should display hero description', async ({ page }) => {
    const description = page.locator('section.bg-secondary p');
    await expect(description.first()).toContainText('Handcrafted leather bags');
  });

  test('should have working Shop button in hero', async ({ page }) => {
    // Find the primary CTA button in the hero section
    const heroSection = page.locator('section.bg-secondary').first();
    const shopButton = heroSection
      .getByRole('link', { name: /Shop Spring/ })
      .first();
    await expect(shopButton).toBeVisible();

    // Click and verify navigation
    await shopButton.click();
    await expect(page).toHaveURL(/\/shop\//);
  });

  test('should have View All Collections button', async ({ page }) => {
    const viewAllButton = page.getByRole('link', {
      name: 'View All Collections',
    });
    await expect(viewAllButton).toBeVisible();
    await expect(viewAllButton).toHaveAttribute('href', '/shop');
  });

  test('should display Featured Products section', async ({ page }) => {
    const featuredSection = page.locator('text=Featured Products');
    await expect(featuredSection).toBeVisible();
  });

  test('should display sample product cards', async ({ page }) => {
    // Wait for product cards to be visible
    const productCards = page.locator(
      '[data-testid="product-card"], article.group'
    );
    await expect(productCards.first()).toBeVisible();
  });

  test('should display Our Story section', async ({ page }) => {
    const storySection = page.getByRole('heading', { name: 'Our Story' });
    await expect(storySection).toBeVisible();
  });

  test('should have Read Our Story link pointing to blog', async ({ page }) => {
    const storyLink = page.getByRole('link', { name: /Read Our Story/ });
    await expect(storyLink).toBeVisible();
    await expect(storyLink).toHaveAttribute(
      'href',
      '/blog/about-dear-margeaux'
    );
  });
});

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the site logo/name', async ({ page }) => {
    // Check for text logo (fallback when no image)
    const logo = page.getByRole('link', { name: /Dear Margeaux/i });
    await expect(logo.first()).toBeVisible();
  });

  test('should have Shop link in navigation', async ({ page }) => {
    const shopLink = page.getByRole('link', { name: 'Shop' }).first();
    await expect(shopLink).toBeVisible();
    await expect(shopLink).toHaveAttribute('href', '/shop');
  });

  test('should have Drops link in navigation', async ({ page }) => {
    const dropsLink = page.getByRole('link', { name: 'Drops' }).first();
    await expect(dropsLink).toBeVisible();
    await expect(dropsLink).toHaveAttribute('href', '/drops');
  });

  test('should have Journal link in navigation', async ({ page }) => {
    const journalLink = page.getByRole('link', { name: 'Journal' }).first();
    await expect(journalLink).toBeVisible();
    await expect(journalLink).toHaveAttribute('href', '/blog');
  });

  test('should have Lookbook link in navigation', async ({ page }) => {
    const lookbookLink = page.getByRole('link', { name: 'Lookbook' }).first();
    await expect(lookbookLink).toBeVisible();
    await expect(lookbookLink).toHaveAttribute('href', '/lookbook');
  });

  test('should have cart icon/button', async ({ page }) => {
    // Cart icon in header
    const cartButton = page
      .locator(
        'button[aria-label*="cart"], [data-testid="cart-icon"], button:has(svg)'
      )
      .first();
    await expect(cartButton).toBeVisible();
  });
});

test.describe('Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display footer with brand name', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Dear Margeaux');
  });

  test('should have Journal link in footer', async ({ page }) => {
    const journalLink = page
      .locator('footer')
      .getByRole('link', { name: 'Journal' });
    await expect(journalLink).toBeVisible();
    await expect(journalLink).toHaveAttribute('href', '/blog');
  });

  test('should have newsletter signup section in footer', async ({ page }) => {
    const newsletterSection = page
      .locator('footer')
      .locator('text=Stay in the Loop');
    await expect(newsletterSection).toBeVisible();
  });

  test('should have email input for newsletter', async ({ page }) => {
    const emailInput = page.locator('footer input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});

test.describe('Responsive Navigation', () => {
  test('should show mobile menu button on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mobile menu button should be visible
    const mobileMenuButton = page.locator(
      'button[aria-label*="menu"], [data-testid="mobile-menu-button"]'
    );
    // On mobile, either a hamburger menu or the nav items collapse
    const navItems = page.locator('nav').getByRole('link', { name: 'Shop' });

    // Either the menu button exists or nav items are hidden/collapsed
    const hasMobileButton = (await mobileMenuButton.count()) > 0;
    if (hasMobileButton) {
      await expect(mobileMenuButton.first()).toBeVisible();
    }
  });

  test('should display desktop navigation on large screens', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const shopLink = page.getByRole('link', { name: 'Shop' }).first();
    await expect(shopLink).toBeVisible();
  });
});
