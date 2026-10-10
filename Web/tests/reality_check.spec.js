const { test, expect } = require('@playwright/test');

test.describe('Laundry Basket Reality Check', () => {
    
    const MANAGER_URL = 'http://localhost:3000'; // Assuming manager panel runs on port 3000
    
    test('should load Manager Panel and capture Reviews tab', async ({ page }) => {
        // Navigate to the manager panel
        await page.goto(MANAGER_URL);
        
        // Take a screenshot of the initial load
        await page.screenshot({ path: 'public/qa-screenshots/manager-home.png', fullPage: true });

        // Wait for the "Reviews" tab to be visible in the navigation
        const reviewsTab = page.locator('text=Reviews');
        await expect(reviewsTab).toBeVisible();

        // Click the Reviews tab
        await reviewsTab.click();

        // Wait for the reviews grid or the "No Reviews Yet" message to appear
        const reviewsHeader = page.locator('h3:has-text("Customer Reviews")');
        await expect(reviewsHeader).toBeVisible();
        
        // Take a screenshot to prove the Reviews tab renders correctly
        await page.screenshot({ path: 'public/qa-screenshots/manager-reviews.png', fullPage: true });
        
        // Check for specific elements to ensure no UI errors
        const noReviewsText = page.locator('text=Completed orders will appear here');
        if (await noReviewsText.isVisible()) {
            console.log('No reviews yet, UI is rendering correctly.');
        } else {
            console.log('Reviews grid is rendered.');
        }
    });

});
