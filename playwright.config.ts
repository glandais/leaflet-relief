import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // Test directory
    testDir: './e2e',

    // Timeout per test
    timeout: 30 * 1000,

    // Expect timeout and visual comparison settings
    expect: {
        timeout: 5000,
        // Threshold for pixel differences (0-1, where 0.2 = 20% difference allowed)
        toHaveScreenshot: {
            threshold: 0.2,
            // Animation handling - wait for animations to complete
            animations: 'disabled',
        },
        toMatchSnapshot: {
            threshold: 0.2,
        },
    },

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,

    // Reporter to use
    reporter: 'html',

    // Shared settings for all the projects below
    use: {
        // Base URL for tests
        baseURL: 'http://localhost:3000',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Take screenshot on failure
        screenshot: 'only-on-failure',
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment below to test on additional browsers (requires: npx playwright install)
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    // Web server configuration for development
    webServer: {
        command: 'npx serve . -p 3000',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
