import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test('should successfully log in as platform admin', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in the login form
    await page.fill('input[type="email"]', 'admin@ratedeck.com');
    await page.fill('input[type="password"]', 'Password123!'); 
    await page.click('button[type="submit"]');

    // Wait for navigation and verify dashboard renders
    await expect(page).toHaveURL('/');
    
    // Verify the admin shell is loaded
    await expect(page.locator('text=Platform Admin')).toBeVisible();
    await expect(page.locator('text=Rate Decks')).toBeVisible();
  });
});
