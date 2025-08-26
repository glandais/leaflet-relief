import { test, expect } from '@playwright/test';

test.describe('Leaflet Relief Plugin Visual Regression Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the demo page
        await page.goto('/');

        // Wait for the map to be initialized and visible
        await expect(page.locator('#map')).toBeVisible();

        // Wait for Leaflet to be loaded
        await page.waitForFunction(() => typeof window['L'] !== 'undefined');

        // Wait for tiles to load and rendering to stabilize
        await page.waitForTimeout(4000);

        // Disable CSS animations to ensure consistent screenshots
        await page.addStyleTag({
            content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
        });
    });

    test('should render hillshade mode correctly with default settings', async ({ page }) => {
        // Ensure we're in hillshade mode with default settings
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(2000);

        // Set consistent viewport for reproducible screenshots
        await page.setViewportSize({ width: 1200, height: 800 });

        // Take screenshot of the entire map area
        await expect(page.locator('#map')).toHaveScreenshot('hillshade-default.png', {
            // Mask dynamic elements that might change (like attribution)
            mask: [page.locator('.leaflet-control-attribution')],
        });
    });

    test('should render hillshade mode with different sun positions', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.click('#hillshadeBtn');

        // Test different azimuth angles
        const azimuthTests = [
            { azimuth: 90, name: 'east' }, // East lighting
            { azimuth: 180, name: 'south' }, // South lighting
            { azimuth: 270, name: 'west' }, // West lighting
        ];

        for (const test of azimuthTests) {
            await page.locator('#azimuthSlider').fill(test.azimuth.toString());
            await page.waitForTimeout(2000); // Wait for rendering

            await expect(page.locator('#map')).toHaveScreenshot(
                `hillshade-azimuth-${test.name}.png`,
                {
                    mask: [page.locator('.leaflet-control-attribution')],
                }
            );
        }
    });

    test('should render hillshade mode with different elevation angles', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.click('#hillshadeBtn');

        // Test different elevation angles
        const elevationTests = [
            { elevation: 15, name: 'low' }, // Low sun
            { elevation: 45, name: 'medium' }, // Medium sun (default)
            { elevation: 75, name: 'high' }, // High sun
        ];

        for (const test of elevationTests) {
            await page.locator('#elevationSlider').fill(test.elevation.toString());
            await page.waitForTimeout(2000); // Wait for rendering

            await expect(page.locator('#map')).toHaveScreenshot(
                `hillshade-elevation-${test.name}.png`,
                {
                    mask: [page.locator('.leaflet-control-attribution')],
                }
            );
        }
    });

    test('should render hillshade mode with different color schemes', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(1000);

        // Test different color schemes
        const colorSchemes = ['grayscale', 'sepia', 'blue', 'green', 'warm'];

        for (const scheme of colorSchemes) {
            await page.selectOption('#colorSchemeSelect', scheme);
            await page.waitForTimeout(2000); // Wait for rendering

            await expect(page.locator('#map')).toHaveScreenshot(`hillshade-color-${scheme}.png`, {
                mask: [page.locator('.leaflet-control-attribution')],
            });
        }
    });

    test('should render slope mode correctly with default settings', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });

        // Switch to slope mode
        await page.click('#slopeBtn');
        await page.waitForTimeout(3000); // Wait for mode switch and rendering

        await expect(page.locator('#map')).toHaveScreenshot('slope-default.png', {
            mask: [page.locator('.leaflet-control-attribution')],
        });
    });

    test('should render slope mode with different color schemes', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.click('#slopeBtn');
        await page.waitForTimeout(2000);

        // Test different slope color schemes
        const slopeSchemes = ['default', 'glacial', 'thermal', 'earth'];

        for (const scheme of slopeSchemes) {
            await page.selectOption('#slopeColorSelect', scheme);
            await page.waitForTimeout(2000); // Wait for rendering

            await expect(page.locator('#map')).toHaveScreenshot(`slope-color-${scheme}.png`, {
                mask: [page.locator('.leaflet-control-attribution')],
            });
        }
    });

    test('should render with different opacity levels', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(1000);

        // Test different opacity levels
        const opacityLevels = [30, 60, 90];

        for (const opacity of opacityLevels) {
            await page.locator('#opacitySlider').fill(opacity.toString());
            await page.waitForTimeout(1500); // Wait for rendering

            await expect(page.locator('#map')).toHaveScreenshot(
                `hillshade-opacity-${opacity}.png`,
                {
                    mask: [page.locator('.leaflet-control-attribution')],
                }
            );
        }
    });

    test('should render correctly at different locations', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(1000);

        // Test different locations with distinct terrain
        const locations = [
            { name: 'Mont Ventoux, Provence', filename: 'mont-ventoux' },
            { name: 'Cirque de Gavarnie, Pyrénées', filename: 'gavarnie' },
            { name: 'Pic du Midi, Pyrénées', filename: 'pic-du-midi' },
        ];

        for (const location of locations) {
            // Navigate to location
            await page.selectOption('.location-select', { label: location.name });
            await page.waitForTimeout(4000); // Wait for map to pan and tiles to load

            await expect(page.locator('#map')).toHaveScreenshot(
                `location-${location.filename}.png`,
                {
                    mask: [page.locator('.leaflet-control-attribution')],
                }
            );
        }
    });

    test('should render mobile layout correctly', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.click('#hillshadeBtn');
        await page.waitForTimeout(2000);

        // Take screenshot of the entire page in mobile layout
        await expect(page).toHaveScreenshot('mobile-layout.png', {
            fullPage: true,
            mask: [page.locator('.leaflet-control-attribution')],
        });
    });

    test('should render with layer hidden (base map only)', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.waitForTimeout(1000);

        // Hide the relief layer
        await page.click('#toggleBtn');
        await page.waitForTimeout(1500);

        await expect(page.locator('#map')).toHaveScreenshot('base-map-only.png', {
            mask: [page.locator('.leaflet-control-attribution')],
        });
    });

    test('should handle visual consistency during rapid mode switching', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });

        // Perform rapid mode switching and ensure final state is consistent
        await page.click('#slopeBtn');
        await page.waitForTimeout(1000);
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(1000);
        await page.click('#slopeBtn');
        await page.waitForTimeout(2000); // Final wait for stabilization

        // Should match the standard slope rendering
        await expect(page.locator('#map')).toHaveScreenshot('slope-after-switching.png', {
            mask: [page.locator('.leaflet-control-attribution')],
        });
    });

    // Test for specific terrain features to ensure rendering accuracy
    test('should render complex terrain features accurately', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });

        // Navigate to Mont Blanc (complex alpine terrain)
        await page.waitForTimeout(1000);

        // Test both modes on complex terrain
        // Hillshade
        await page.click('#hillshadeBtn');
        await page.waitForTimeout(3000);
        await expect(page.locator('#map')).toHaveScreenshot('complex-terrain-hillshade.png', {
            mask: [page.locator('.leaflet-control-attribution')],
        });

        // Slope
        await page.click('#slopeBtn');
        await page.waitForTimeout(3000);
        await expect(page.locator('#map')).toHaveScreenshot('complex-terrain-slope.png', {
            mask: [page.locator('.leaflet-control-attribution')],
        });
    });
});
