import { test, expect } from '@playwright/test';

test.describe('Drops Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drops');
  });

  test('should display the drops page header', async ({ page }) => {
    // Use getByRole to target the main heading specifically
    const heading = page.getByRole('heading', { name: 'Drops', level: 1 });
    await expect(heading).toBeVisible();
  });

  test('should display page description', async ({ page }) => {
    // The page always shows either the description or an error message
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Check for either the description or error state
    const description = page.locator('text=limited release');
    const errorState = page.locator('text=Unable to load drops');

    const hasDescription = await description
      .first()
      .isVisible()
      .catch(() => false);
    const hasError = await errorState.isVisible().catch(() => false);

    expect(hasDescription || hasError).toBe(true);
  });

  test('should display drops content or error state', async ({ page }) => {
    // The page should either show drops sections or an error message
    const availableSection = page.getByRole('heading', {
      name: /Available Now/i,
    });
    const errorState = page.locator('text=Unable to load drops');

    const hasDrops = await availableSection.isVisible().catch(() => false);
    const hasError = await errorState.isVisible().catch(() => false);

    // One of these should be visible
    expect(hasDrops || hasError).toBe(true);
  });

  test('should have newsletter signup section', async ({ page }) => {
    // The "Never Miss a Drop" section should always be visible
    const neverMissSection = page.getByRole('heading', {
      name: /Never Miss a Drop/i,
    });
    await expect(neverMissSection).toBeVisible();
  });

  test('should have Subscribe to Newsletter link', async ({ page }) => {
    const subscribeLink = page.getByRole('link', {
      name: /Subscribe to Newsletter/i,
    });
    await expect(subscribeLink).toBeVisible();
  });

  test('should display footer with Past Drops link', async ({ page }) => {
    // The footer should have a Past Drops link
    const footer = page.locator('footer');
    const pastDropsLink = footer.getByRole('link', { name: 'Past Drops' });
    await expect(pastDropsLink).toBeVisible();
    await expect(pastDropsLink).toHaveAttribute('href', '/drops/archive');
  });
});

test.describe('Drops Archive Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drops/archive');
  });

  test('should display archive page header', async ({ page }) => {
    // Use getByRole with level to be more specific
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
    // The heading should contain "Archive" or similar
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toMatch(/archive|drops/i);
  });

  test('should have navigation back to drops', async ({ page }) => {
    // Should have some way to navigate back - either link or nav
    const dropsLink = page.getByRole('link', { name: /Drops/i }).first();
    await expect(dropsLink).toBeVisible();
  });

  test('should display archive content or empty state', async ({ page }) => {
    // Should show either ended drops or empty/error state
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Newsletter Form Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drops');
  });

  test('should have email input in footer', async ({ page }) => {
    // The footer newsletter signup
    const footer = page.locator('footer');
    const emailInput = footer.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should validate email format in footer form', async ({ page }) => {
    const footer = page.locator('footer');
    const emailInput = footer.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Enter invalid email
    await emailInput.fill('invalid-email');

    // The input should be invalid (HTML5 validation)
    const isValid = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(isValid).toBe(false);
  });

  test('should accept valid email format in footer form', async ({ page }) => {
    const footer = page.locator('footer');
    const emailInput = footer.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Enter valid email
    await emailInput.fill('test@example.com');

    // The input should be valid
    const isValid = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(isValid).toBe(true);
  });

  test('should have subscribe button in footer', async ({ page }) => {
    const footer = page.locator('footer');
    const subscribeButton = footer.locator('button:has-text("Subscribe")');
    await expect(subscribeButton).toBeVisible();
  });
});

test.describe('Drops Page Navigation', () => {
  test('should navigate to drops from homepage', async ({ page }) => {
    await page.goto('/');

    const dropsLink = page.getByRole('link', { name: 'Drops' }).first();
    await expect(dropsLink).toBeVisible();
    await dropsLink.click();

    await expect(page).toHaveURL('/drops');
  });

  test('should navigate to drops archive from drops page', async ({ page }) => {
    await page.goto('/drops');

    // Use the footer link to navigate to archive
    const footer = page.locator('footer');
    const archiveLink = footer.getByRole('link', { name: 'Past Drops' });
    await expect(archiveLink).toBeVisible();
    await archiveLink.click();

    await expect(page).toHaveURL('/drops/archive');
  });

  test('should have drops page in main navigation', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    const dropsLink = nav.getByRole('link', { name: 'Drops' });
    await expect(dropsLink).toBeVisible();
    await expect(dropsLink).toHaveAttribute('href', '/drops');
  });
});
