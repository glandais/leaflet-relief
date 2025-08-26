# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Leaflet plugin for terrain visualization that renders relief maps showing hillshading and slope analysis. The plugin fetches elevation data from AWS Terrarium tiles and processes it to create visual overlays on Leaflet maps.

## Architecture

### Core Components

**L.GridLayer.Relief** (`src/L.GridLayer.Relief.ts`): Main plugin class extending `L.GridLayer` (TypeScript implementation)

- Self-contained single-file plugin with all functionality
- Creates 256x256 canvas tiles for terrain visualization
- Supports two modes: 'hillshade' and 'slope'
- Manages async tile loading with abort controllers to prevent memory leaks
- Handles tile lifecycle events (load/unload)
- Sun position (azimuth/elevation) configurable at initialization for hillshade mode

**Elevation Data System** (internal functions in main file):

- Direct fetch per tile with browser caching (no internal tile caching)
- `_getElevation`: Method for extracting elevation data from RGBA pixel values
- `_canvasPool`: Adaptive canvas pooling for DEM data processing (grows on demand, trims when idle)
- Supports multiple elevation formats: AWS Terrarium, Mapbox Terrain-RGB, custom extractors
- Uses Terrarium RGB encoding by default: `elevation = (R*256 + G + B/256) - 32768` meters

**Rendering Modes** (internal functions):

- **Hillshade** (`_fillHillshadeTile`): Simulates sunlight on terrain using surface normals and dot product calculations with sun position set at initialization
- **Slope** (`_fillSlopeTile`): Colors terrain by steepness using Horn's method for gradient calculation and HSV-to-RGB color mapping (green=flat, red=steep)

### Data Flow

1. Leaflet requests tiles via `createTile(coords, done)`
2. Plugin creates canvas and ImageData buffer
3. Acquires canvas from pool for DEM data processing
4. Fetches single elevation tile with abort controller
5. Mode-specific renderer processes each pixel:
    - Uses `_getElevation` to get elevation from RGBA data
    - Calculates gradients using `_getZ` (with edge pixel clamping)
    - Applies hillshading or slope coloring algorithms
    - Handles no-data areas (elevation ≤ 0) as transparent
6. Canvas receives processed pixel data, releases pooled canvas, and tile completes

### Key Algorithms

**Hillshading**: Uses surface normal vectors and sun direction dot product with gamma correction and ambient lighting. Default sun position: 315° azimuth (northwest), 45° elevation. Configurable at initialization via options.

**Slope Calculation**: Horn's method with 8-neighbor kernel, latitude-corrected pixel scaling, and configurable color schemes. Default: green→red gradient. HSV-based presets provide smooth transitions with automatic edge case handling (out-of-bounds slopes use first/last range colors). Edge pixels are clamped to valid tile boundaries for accurate gradient computation.

## Development

### File Structure

- `src/L.GridLayer.Relief.ts` - Complete plugin implementation in TypeScript (all functionality in single file)
- `dist/leaflet-relief.min.js` - Minified production build
- `dist/leaflet-relief.umd.js` - UMD module format
- `dist/leaflet-relief.esm.js` - ES module format
- `dist/L.GridLayer.Relief.d.ts` - TypeScript type definitions
- `index.html` - Interactive demo with controls for azimuth/elevation adjustment
- `test/L.GridLayer.Relief.test.ts` - Jest unit tests for plugin functionality (TypeScript)
- `README.md` - Comprehensive plugin documentation
- `package.json` - NPM package configuration with semantic-release
- `LICENSE` - MIT license
- `.github/workflows/release.yml` - CI/CD pipeline for automated releases
- `.releaserc.json` - Semantic-release configuration

### Key Features

- **Initial Configuration**: Azimuth and elevation angles set at layer initialization
- **Custom Elevation Sources**: Support for different tile providers (AWS Terrarium, Mapbox, custom URLs)
- **Configurable Extractors**: Built-in decoders for common formats plus custom extraction functions
- **Modern ES Module**: TypeScript implementation with proper type definitions
- **Factory Function**: `L.gridLayer.relief(options)` for convenient layer creation
- **Canvas Pooling**: Adaptive canvas pool for efficient memory management

### External Dependencies

- Leaflet (peer dependency ^1.0.0)
- Default elevation source: AWS Terrarium tiles (https://s3.amazonaws.com/elevation-tiles-prod/terrarium/)

### Testing & Quality

- **Jest Testing**: 25+ unit tests covering all major functionality
- **Coverage**: ~68% code coverage with thresholds set at 50%
- **Mocking**: Canvas API and network requests properly mocked for testing
- **CI Integration**: Tests run automatically on all commits and before releases

### Release Workflow

- **Semantic Release**: Automated version management based on commit messages
- **Conventional Commits**: Enforced via commitlint and husky hooks
- **npm Publishing**: Automatic publishing to npm registry on successful releases
- **GitHub Releases**: Automatic creation with generated changelogs
- **Dependabot**: Weekly dependency updates with grouped PRs for dev dependencies

### Performance Considerations

- Abort controllers cancel pending requests when tiles are unloaded to prevent memory leaks
- Adaptive canvas pooling reduces memory allocation and garbage collection pressure
- `willReadFrequently` canvas context optimization for efficient `getImageData` operations
- Browser caching handles elevation tile caching (no internal cache complexity)
- Edge pixel clamping provides accurate calculations without cross-tile fetching
- Latitude correction applied to pixel scaling for accurate slope measurements
- Async tile loading with proper error handling and cleanup

### Internal Architecture

**Class Hierarchy:**

- `L.GridLayer.Relief` (main class extending `L.GridLayer`)
    - `this.elevationUrl` - URL template or function for elevation tiles
    - `this.elevationExtractor` - Function to extract elevation from RGBA pixel data
    - Uses `_canvasPool` for efficient canvas resource management
    - Uses `_getElevation` method for pixel-level elevation extraction

**Function Organization:**

- `_canvasPool` - Adaptive canvas pool (grows on demand, trims to 5 canvases when idle)
- `_getElevation(tileData, j, i)` - Method for elevation extraction from RGBA data
- `_getZ(tileData, i, j)` - Extracts 3x3 elevation grid with edge clamping for gradient calculations
- `_defaultHillshadeColorFunction(intensity)` - Default grayscale color function for hillshade
- `_createSlopeColorFunction(colorConfig)` - Generate slope color function from HSV config with edge case handling
- `_defaultSlopeColorConfig` - Default green→red slope color scheme
- `_slopeColorSchemes` - Preset slope color schemes (default, glacial, thermal, earth)
- `_fillHillshadeTile(data, tileData, coords, abortSignal)` - Hillshade rendering
- `_fillSlopeTile(data, tileData, coords, abortSignal)` - Slope rendering
- Built-in elevation extractors: `_defaultElevationExtractor`, `_mapboxElevationExtractor`

## Configuration Options

### Basic Layer Creation

```javascript
const reliefLayer = L.gridLayer.relief({
    mode: 'hillshade', // 'hillshade' or 'slope'
    hillshadeAzimuth: 315, // Sun azimuth (0-360°) for hillshade
    hillshadeElevation: 45, // Sun elevation (0-90°) for hillshade
    hillshadeColorFunction: function (intensity) {
        // Custom color function (optional, defaults to grayscale)
        const value = Math.round(intensity * 255);
        return [value, value, value];
    },
    opacity: 0.6, // Layer opacity
});
```

### Slope Color Configuration

```javascript
// Simple: Use preset color scheme
const glacialSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorScheme: 'glacial', // 'default', 'glacial', 'thermal', 'earth'
});

// Intermediate: Custom HSV configuration
const customHsvSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorConfig: [
        { slope: { min: 0, max: 10 }, h: { min: 240, max: 120 } }, // Blue to green
        { slope: { min: 10, max: 30 }, h: { min: 120, max: 60 } }, // Green to yellow
        { slope: { min: 30, max: 1000 }, h: { min: 60, max: 0 } }, // Yellow to red
    ],
});

// Advanced: Full custom function
const advancedSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorFunction: function (slopeDegrees) {
        // Custom logic returning [r, g, b]
        if (slopeDegrees < 5) return [100, 200, 255]; // Light blue for flat
        if (slopeDegrees < 20) return [255, 200, 100]; // Orange for moderate
        return [255, 100, 100]; // Red for steep
    },
});

// Note: HSV configurations automatically handle edge cases:
// - Slopes below first range min → first range h.min color
// - Slopes above last range max → last range h.max color
// - No unexpected fallback colors
```

### Dynamic Sun Position

```javascript
// Sun position set at initialization (not changeable at runtime)
const reliefLayer = L.gridLayer.relief({
    mode: 'hillshade',
    hillshadeAzimuth: 180, // South lighting
    hillshadeElevation: 30, // Lower sun angle
});
```

### Custom Elevation Sources

```javascript
const customRelief = L.gridLayer.relief({
    elevationUrl: 'https://example.com/tiles/{z}/{x}/{y}.png',
    elevationExtractor: function (r, g, b, a) {
        // Custom elevation decoding logic
        return r; // Example: grayscale elevation
    },
});
```

### Built-in Elevation Extractors

- `L.GridLayer.Relief.elevationExtractors.terrarium` - AWS Terrarium (default)
- `L.GridLayer.Relief.elevationExtractors.mapbox` - Mapbox Terrain-RGB

## Development Commands

### Testing

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
```

### Release (Automated)

Releases happen automatically when commits are pushed to the `develop` branch:

- Semantic-release analyzes commits
- Determines version bump (patch/minor/major)
- Updates package.json version
- Generates CHANGELOG.md
- Publishes to npm
- Creates GitHub release

### Manual Release Check

```bash
npx semantic-release --dry-run  # Preview what would be released
```

### Commit Guidelines

```bash
# Features
git commit -m "feat: add dynamic sun position controls"

# Bug fixes
git commit -m "fix: correct azimuth calculation in hillshade mode"

# Breaking changes
git commit -m "feat!: change default elevation source

BREAKING CHANGE: Default elevation source changed from AWS to Mapbox"
```
