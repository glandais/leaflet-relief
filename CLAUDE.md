# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Leaflet plugin for terrain visualization that renders relief maps showing hillshading and slope analysis. The plugin fetches elevation data from AWS Terrarium tiles and processes it to create visual overlays on Leaflet maps.

## Architecture

### Core Components

**L.GridLayer.Relief** (`src/L.GridLayer.Relief.js`): Main plugin class extending `L.GridLayer`
- Self-contained single-file plugin with all functionality
- Creates 256x256 canvas tiles for terrain visualization
- Supports two modes: 'hillshade' and 'slope'
- Manages async tile loading with abort controllers to prevent memory leaks
- Handles tile lifecycle events (load/unload)
- Runtime configurable sun position (azimuth/elevation) for hillshade mode

**Elevation Data System** (internal classes and functions in main file):
- `_TileCache`: Manages fetching/caching elevation tiles with configurable sources
- `_ElevationCache`: Pre-loads 3x3 tile grids to handle cross-tile boundary calculations
- `_extractElevation`: Standalone function for extracting elevation data from RGBA pixel values
- Supports multiple elevation formats: AWS Terrarium, Mapbox Terrain-RGB, custom extractors
- Uses Terrarium RGB encoding by default: `elevation = (R*256 + G + B/256) - 32768` meters

**Rendering Modes** (internal functions):
- **Hillshade** (`_fillHillshadeTile`): Simulates sunlight on terrain using surface normals and dot product calculations with runtime configurable sun position
- **Slope** (`_fillSlopeTile`): Colors terrain by steepness using Horn's method for gradient calculation and HSV-to-RGB color mapping (green=flat, red=steep)

### Data Flow

1. Leaflet requests tiles via `createTile(coords, done)`
2. Plugin creates canvas and ImageData buffer
3. `_ElevationCache` pre-loads 3x3 tile grid using `_TileCache`
4. Mode-specific renderer processes each pixel:
   - Uses `_extractElevation` to get elevation from RGBA data
   - Calculates gradients using neighboring elevations
   - Applies hillshading or slope coloring algorithms
   - Handles no-data areas (elevation ≤ 0) as transparent
5. Canvas receives processed pixel data and tile completes

### Key Algorithms

**Hillshading**: Uses surface normal vectors and sun direction dot product with gamma correction and ambient lighting. Default sun position: 315° azimuth (northwest), 45° elevation. Runtime configurable via `setAzimuth()`, `setElevation()`, or `setSunPosition()` methods.

**Slope Calculation**: Horn's method with 8-neighbor kernel, latitude-corrected pixel scaling, and color gradients based on steepness ranges (green=flat, red=steep). Uses HSV color space for smooth transitions.

## Development

### File Structure
- `src/L.GridLayer.Relief.js` - Complete plugin implementation (all functionality in single file)
- `index.html` - Interactive demo with controls for azimuth/elevation adjustment
- `README.md` - Comprehensive plugin documentation
- `package.json` - NPM package configuration
- `LICENSE` - MIT license

### Key Features
- **Runtime Configuration**: Azimuth and elevation angles adjustable at runtime with automatic tile rerendering
- **Custom Elevation Sources**: Support for different tile providers (AWS Terrarium, Mapbox, custom URLs)
- **Configurable Extractors**: Built-in decoders for common formats plus custom extraction functions
- **IIFE Wrapped**: Self-contained plugin that doesn't pollute global namespace
- **Factory Function**: `L.gridLayer.relief(options)` for convenient layer creation

### External Dependencies
- Leaflet (peer dependency ^1.0.0)
- Default elevation source: AWS Terrarium tiles (https://s3.amazonaws.com/elevation-tiles-prod/terrarium/)

### Performance Considerations
- `_TileCache` prevents redundant network requests (LIFO cache, default 50 tiles, configurable via `maxCacheSize`)
- Abort controllers cancel pending requests when tiles are unloaded to prevent memory leaks
- Cross-tile boundary handling requires 3x3 tile grids for accurate gradient calculations
- `_extractElevation` function provides efficient RGBA-to-elevation conversion
- Latitude correction applied to pixel scaling for accurate slope measurements
- Async tile loading with proper error handling and cleanup

### Internal Architecture

**Class Hierarchy:**
- `L.GridLayer.Relief` (main class extending `L.GridLayer`)
  - `this.tileCache` (`_TileCache` instance) - Manages elevation tile fetching and caching
  - Uses `_ElevationCache` for 3x3 tile grid management per render operation
  - Uses `_extractElevation` for pixel-level elevation extraction

**Function Organization:**
- `_extractElevation(tileData, i, j, elevationExtractor)` - Pure function for elevation extraction
- `_defaultHillshadeColorFunction(intensity)` - Default grayscale color function for hillshade
- `_fillHillshadeTile(data, coords, abortSignal, layer)` - Hillshade rendering
- `_fillSlopeTile(data, coords, abortSignal, layer)` - Slope rendering
- Built-in elevation extractors: `_defaultElevationExtractor`, `_mapboxElevationExtractor`

## Configuration Options

### Basic Layer Creation
```javascript
const reliefLayer = L.gridLayer.relief({
    mode: 'hillshade',        // 'hillshade' or 'slope'
    azimuth: 315,             // Sun azimuth (0-360°) for hillshade
    elevation: 45,            // Sun elevation (0-90°) for hillshade
    hillshadeColorFunction: function(intensity) {
        // Custom color function (optional, defaults to grayscale)
        const value = Math.round(intensity * 255);
        return [value, value, value];
    },
    opacity: 0.6,             // Layer opacity
    maxCacheSize: 50          // Max elevation tiles in cache
});
```

### Runtime Sun Position Changes
```javascript
reliefLayer.setAzimuth(180);           // Change to south lighting
reliefLayer.setElevation(30);          // Lower sun angle
reliefLayer.setSunPosition(90, 60);    // East lighting, high sun
```

### Custom Elevation Sources
```javascript
const customRelief = L.gridLayer.relief({
    elevationUrl: 'https://example.com/tiles/{z}/{x}/{y}.png',
    elevationExtractor: function(r, g, b, a) {
        // Custom elevation decoding logic
        return r; // Example: grayscale elevation
    }
});
```

### Built-in Elevation Extractors
- `L.GridLayer.Relief.elevationExtractors.terrarium` - AWS Terrarium (default)
- `L.GridLayer.Relief.elevationExtractors.mapbox` - Mapbox Terrain-RGB
- `L.GridLayer.Relief.elevationExtractors.custom(fn)` - Custom wrapper function