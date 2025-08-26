# Visual Regression Testing Guide

This document explains how to use the visual regression testing system for the Leaflet Relief plugin.

## Overview

Visual regression testing captures screenshots of the relief plugin rendering and compares them against reference images to detect visual changes. This ensures that rendering remains consistent across code changes and different environments.

## Test Structure

### Test Files

- `e2e/visual.spec.ts` - Visual regression test suite
- `e2e/visual.spec.ts-snapshots/` - Reference screenshot directory

### Coverage Areas

The visual tests cover:

- ✅ Hillshade rendering with different sun positions (azimuth/elevation)
- ✅ Hillshade color schemes (grayscale, sepia, blue, green, warm)
- ✅ Slope visualization with different color schemes
- ✅ Opacity level variations
- ✅ Different terrain locations
- ✅ Mobile responsive layout
- ✅ Base map rendering (no relief layer)
- ✅ Mode switching consistency
- ✅ Complex terrain feature accuracy

## Running Visual Tests

### Basic Commands

```bash
# Run visual regression tests
npm run test:visual

# Run visual tests with browser visible (debugging)
npm run test:visual:headed

# Update reference screenshots (when intentional changes are made)
npm run test:visual:update
```

### Test Scenarios

1. **Initial Setup** - Generate reference screenshots:

    ```bash
    npm run test:visual:update
    ```

2. **Regular Testing** - Compare against references:

    ```bash
    npm run test:visual
    ```

3. **After Code Changes** - Verify no unintended visual changes:

    ```bash
    npm run test:visual
    ```

4. **When Visual Changes Are Intentional** - Update references:
    ```bash
    npm run test:visual:update
    ```

## Understanding Test Results

### Successful Tests

```
✅ 12 passed (26.8s)
```

All renderings match reference images within the defined threshold.

### Failed Tests

When visual differences are detected, tests will fail with details about:

- Which screenshot differed
- Percentage of pixel differences
- Location of diff images for inspection

### Diff Images

Failed tests generate comparison images in the `test-results/` directory:

- `actual.png` - Current rendering
- `expected.png` - Reference image
- `diff.png` - Visual difference highlighting

## Configuration

### Similarity Threshold

In `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    threshold: 0.2,  // 20% difference allowed
    animations: 'disabled'
  }
}
```

### Screenshot Masks

Dynamic elements (like attribution) are masked to prevent false failures:

```typescript
await expect(page.locator('#map')).toHaveScreenshot('test.png', {
    mask: [page.locator('.leaflet-control-attribution')],
});
```

## Best Practices

### When to Update References

Update reference screenshots when:

- ✅ Intentionally changing rendering algorithms
- ✅ Improving visual quality
- ✅ Adding new color schemes or features
- ❌ Not for unintended visual regressions

### Debugging Failed Tests

1. **Run with visible browser**:

    ```bash
    npm run test:visual:headed
    ```

2. **Check diff images** in `test-results/` directory

3. **Verify changes are intentional** before updating references

4. **Use smaller test subsets**:
    ```bash
    npx playwright test visual.spec.ts -g "hillshade mode"
    ```

### Managing Screenshot Differences

#### Small Differences (< 5%)

Usually caused by:

- Font rendering differences
- Minor browser version changes
- System-level rendering variations

**Solution**: May be acceptable, consider updating threshold

#### Large Differences (> 20%)

Usually indicates:

- Rendering algorithm changes
- Color scheme modifications
- Layout changes

**Solution**: Investigate thoroughly before updating references

## File Structure

```
e2e/
├── visual.spec.ts                    # Visual test definitions
└── visual.spec.ts-snapshots/         # Reference screenshots
    ├── hillshade-default-chromium-linux.png
    ├── slope-default-chromium-linux.png
    ├── hillshade-azimuth-east-chromium-linux.png
    ├── hillshade-color-sepia-chromium-linux.png
    └── ... (27 reference images)
```

## Continuous Integration

In CI environments:

- Tests run automatically on pull requests
- Failed visual tests prevent merging
- Reference updates require explicit approval
- Cross-platform compatibility is validated

### CI Commands

```bash
# CI test run
npm run test:visual

# Generate new references (admin only)
npm run test:visual:update
```

## Troubleshooting

### Common Issues

1. **Tests fail on different OS**:
    - Screenshot names include platform (e.g., `chromium-linux`)
    - Different platforms may need separate references

2. **Fonts look different**:
    - Ensure consistent font loading in test environment
    - Consider system font differences

3. **Tile loading timing**:
    - Increase wait times in tests if tiles load slowly
    - Check network conditions in test environment

4. **False positives**:
    - Adjust threshold in configuration
    - Add masks for dynamic content

### Advanced Debugging

```bash
# Run specific test with debug
npx playwright test visual.spec.ts -g "hillshade default" --debug

# Generate test report with visual diffs
npx playwright show-report
```

## Maintenance

### Regular Tasks

- Review and update reference screenshots quarterly
- Monitor test execution times and optimize if needed
- Update threshold values based on acceptable difference levels
- Clean up obsolete reference images when tests change

### Version Updates

When updating major dependencies:

1. Run full visual test suite
2. Review any failures carefully
3. Update references only if changes are expected
4. Document visual changes in release notes
