import { test, expect } from '@playwright/test';

test.describe('Leaflet Relief Plugin E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the demo page
        await page.goto('/');

        // Wait for the map to be initialized and visible
        await expect(page.locator('#map')).toBeVisible();

        // Wait for Leaflet to be loaded
        await page.waitForFunction(() => typeof window['L'] !== 'undefined');

        // Wait a bit for the relief layer to potentially load
        await page.waitForTimeout(2000);
    });

    test('should load the demo page with all required elements', async ({ page }) => {
        // Check page title
        await expect(page).toHaveTitle('Leaflet Relief Plugin Demo');

        // Check main elements are present
        await expect(page.locator('#map')).toBeVisible();
        await expect(page.locator('#hillshadeBtn')).toBeVisible();
        await expect(page.locator('#slopeBtn')).toBeVisible();
        await expect(page.locator('#toggleBtn')).toBeVisible();
        await expect(page.locator('#opacitySlider')).toBeVisible();

        // Check initial state
        await expect(page.locator('#hillshadeBtn')).toHaveClass(/active/);
        await expect(page.locator('#hillshadeControls')).toBeVisible();
        await expect(page.locator('#slopeControls')).not.toBeVisible();
    });

    test('should switch between hillshade and slope modes', async ({ page }) => {
        // Initially hillshade should be active
        await expect(page.locator('#hillshadeBtn')).toHaveClass(/active/);
        await expect(page.locator('#hillshadeControls')).toBeVisible();
        await expect(page.locator('#slopeControls')).not.toBeVisible();

        // Click slope button
        await page.click('#slopeBtn');
        await page.waitForTimeout(1000); // Wait for layer update

        // Verify slope mode is active
        await expect(page.locator('#slopeBtn')).toHaveClass(/active/);
        await expect(page.locator('#hillshadeBtn')).not.toHaveClass(/active/);
        await expect(page.locator('#slopeControls')).toBeVisible();
        await expect(page.locator('#hillshadeControls')).not.toBeVisible();

        // Switch back to hillshade
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(1000); // Wait for layer update

        // Verify hillshade mode is active again
        await expect(page.locator('#hillshadeBtn')).toHaveClass(/active/);
        await expect(page.locator('#slopeBtn')).not.toHaveClass(/active/);
        await expect(page.locator('#hillshadeControls')).toBeVisible();
        await expect(page.locator('#slopeControls')).not.toBeVisible();
    });

    test('should toggle relief layer visibility', async ({ page }) => {
        // Initially should show "Hide Relief"
        await expect(page.locator('#toggleBtn')).toHaveText('Hide Relief');

        // Click to hide relief
        await page.click('#toggleBtn');
        await page.waitForTimeout(1000); // Wait for layer update

        // Should now show "Show Relief"
        await expect(page.locator('#toggleBtn')).toHaveText('Show Relief');

        // Click to show relief again
        await page.click('#toggleBtn');
        await page.waitForTimeout(1000); // Wait for layer update

        // Should show "Hide Relief" again
        await expect(page.locator('#toggleBtn')).toHaveText('Hide Relief');
    });

    test('should update opacity value when slider is moved', async ({ page }) => {
        // Check initial opacity value
        await expect(page.locator('#opacityValue')).toHaveText('60%');

        // Move opacity slider to 80%
        await page.locator('#opacitySlider').fill('80');
        await page.waitForTimeout(500); // Wait for update

        // Check updated value
        await expect(page.locator('#opacityValue')).toHaveText('80%');

        // Move to 30%
        await page.locator('#opacitySlider').fill('30');
        await page.waitForTimeout(500); // Wait for update

        // Check updated value
        await expect(page.locator('#opacityValue')).toHaveText('30%');
    });

    test('should update hillshade controls and display values', async ({ page }) => {
        // Ensure we're in hillshade mode
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(500);

        // Check initial values
        await expect(page.locator('#azimuthValue')).toHaveText('315°');
        await expect(page.locator('#elevationValue')).toHaveText('45°');

        // Update azimuth
        await page.locator('#azimuthSlider').fill('180');
        await page.waitForTimeout(500);
        await expect(page.locator('#azimuthValue')).toHaveText('180°');

        // Update elevation
        await page.locator('#elevationSlider').fill('60');
        await page.waitForTimeout(500);
        await expect(page.locator('#elevationValue')).toHaveText('60°');
    });

    test('should change hillshade color schemes', async ({ page }) => {
        // Ensure we're in hillshade mode
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(500);

        // Check initial color scheme
        await expect(page.locator('#colorSchemeSelect')).toHaveValue('grayscale');

        // Change to sepia
        await page.selectOption('#colorSchemeSelect', 'sepia');
        await page.waitForTimeout(1000); // Wait for layer update

        // Verify selection
        await expect(page.locator('#colorSchemeSelect')).toHaveValue('sepia');

        // Change to blue
        await page.selectOption('#colorSchemeSelect', 'blue');
        await page.waitForTimeout(1000); // Wait for layer update

        // Verify selection
        await expect(page.locator('#colorSchemeSelect')).toHaveValue('blue');
    });

    test('should change slope color schemes', async ({ page }) => {
        // Switch to slope mode
        await page.click('#slopeBtn');
        await page.waitForTimeout(1000);

        // Check initial slope color scheme
        await expect(page.locator('#slopeColorSelect')).toHaveValue('default');

        // Change to glacial
        await page.selectOption('#slopeColorSelect', 'glacial');
        await page.waitForTimeout(1000); // Wait for layer update

        // Verify selection
        await expect(page.locator('#slopeColorSelect')).toHaveValue('glacial');

        // Change to thermal
        await page.selectOption('#slopeColorSelect', 'thermal');
        await page.waitForTimeout(1000); // Wait for layer update

        // Verify selection
        await expect(page.locator('#slopeColorSelect')).toHaveValue('thermal');
    });

    test('should navigate to different locations', async ({ page }) => {
        // Find the location select dropdown
        const locationSelect = page.locator('.location-select');
        await expect(locationSelect).toBeVisible();

        // Check initial value is empty
        await expect(locationSelect).toHaveValue('');

        // Select Mont Ventoux
        await locationSelect.selectOption({ label: 'Mont Ventoux, Provence' });
        await page.waitForTimeout(2000); // Wait for map to pan and tiles to load

        // The map should have moved (we can't easily check exact coordinates, but we can check that the selection worked)
        await expect(locationSelect).not.toHaveValue('');

        // Select Cirque de Gavarnie
        await locationSelect.selectOption({ label: 'Cirque de Gavarnie, Pyrénées' });
        await page.waitForTimeout(2000); // Wait for map to pan and tiles to load
    });

    test('should handle responsive layout on mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Check that elements are still visible and functional
        await expect(page.locator('#map')).toBeVisible();
        await expect(page.locator('#hillshadeBtn')).toBeVisible();
        await expect(page.locator('#slopeBtn')).toBeVisible();
        await expect(page.locator('#toggleBtn')).toBeVisible();

        // Test mode switching on mobile
        await page.click('#slopeBtn');
        await page.waitForTimeout(1000);

        await expect(page.locator('#slopeBtn')).toHaveClass(/active/);
        await expect(page.locator('#slopeControls')).toBeVisible();
    });

    test('should load and display map tiles', async ({ page }) => {
        // Wait for map to be ready
        await page.waitForFunction(() => {
            return window['L'] && window['L']['gridLayer'] && window['L']['gridLayer']['relief'];
        });

        // Check that the map container has tiles loaded
        // We look for tile images being present in the map
        await page.waitForTimeout(3000); // Give time for tiles to load

        // Check that there are tile elements in the map
        const tiles = await page.locator('.leaflet-tile').count();
        expect(tiles).toBeGreaterThan(0);
    });

    test('should handle error states gracefully', async ({ page }) => {
        // Monitor console errors
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Test rapid mode switching (potential stress test)
        for (let i = 0; i < 3; i++) {
            await page.click('#slopeBtn');
            await page.waitForTimeout(200);
            await page.click('#hillshadeBtn');
            await page.waitForTimeout(200);
        }

        // Test rapid toggling
        for (let i = 0; i < 3; i++) {
            await page.click('#toggleBtn');
            await page.waitForTimeout(200);
            await page.click('#toggleBtn');
            await page.waitForTimeout(200);
        }

        // Wait a bit for any async operations to complete
        await page.waitForTimeout(2000);

        // Check that no critical JavaScript errors occurred
        // Filter out network errors which are common in test environments
        const criticalErrors = consoleErrors.filter(
            error =>
                !error.includes('net::ERR') &&
                !error.includes('Failed to load resource') &&
                !error.includes('tile')
        );

        expect(criticalErrors.length).toBe(0);
    });

    test('should maintain layer state during interactions', async ({ page }) => {
        // Set specific values
        await page.locator('#opacitySlider').fill('75');
        await page.locator('#azimuthSlider').fill('270');
        await page.locator('#elevationSlider').fill('30');
        await page.selectOption('#colorSchemeSelect', 'warm');
        await page.waitForTimeout(1000);

        // Switch to slope and back
        await page.click('#slopeBtn');
        await page.waitForTimeout(1000);
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(1000);

        // Values should be maintained
        await expect(page.locator('#opacityValue')).toHaveText('75%');
        await expect(page.locator('#azimuthValue')).toHaveText('270°');
        await expect(page.locator('#elevationValue')).toHaveText('30°');
        await expect(page.locator('#colorSchemeSelect')).toHaveValue('warm');
    });
});
