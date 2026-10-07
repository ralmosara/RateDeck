import { test, expect } from '@playwright/test';

test.describe('Rate Deck Import Wizard', () => {
  test('should allow admin to upload and preview a rate deck CSV', async ({ page }) => {
    // Note: Assuming we have a logged-in state setup via fixtures or beforeAll
    await page.goto('/rate-decks');
    
    await page.click('text=Upload Deck');
    
    // Locate the file input and upload a test CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-rates.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('prefix,destination,rate_per_min\n639,Philippines,0.05\n44,UK,0.01')
    });
    
    await page.click('button:has-text("Upload and Parse")');
    
    // Verify the diff preview step appears
    await expect(page.locator('text=Preview Changes')).toBeVisible();
    await expect(page.locator('text=Philippines')).toBeVisible();
    
    // Confirm publish
    await page.click('button:has-text("Publish")');
    await expect(page.locator('text=Published Successfully')).toBeVisible();
  });
});
