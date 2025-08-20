# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Leaflet plugin for terrain visualization that renders relief maps showing hillshading and slope analysis. The plugin fetches elevation data from AWS Terrarium tiles and processes it to create visual overlays on Leaflet maps.

## Architecture

### Core Components

**HillshadeLayer** (`src/relief.js`): Main plugin class extending `L.GridLayer`
- Creates 256x256 canvas tiles for terrain visualization
- Supports two modes: 'hillshade' and 'slope'
- Manages async tile loading with abort controllers to prevent memory leaks
- Handles tile lifecycle events (load/unload)

**Elevation Data System** (`src/relief_elevation.js`):
- `ElevationTileManager`: Singleton for fetching/caching elevation tiles from AWS Terrarium
- `ElevationCache`: Pre-loads 3x3 tile grids to handle cross-tile boundary calculations
- Uses Terrarium RGB encoding: `elevation = (R*256 + G + B/256) - 32768` meters

**Rendering Modes**:
- **Hillshade** (`src/relief_hillshade.js`): Simulates sunlight on terrain using surface normals and dot product calculations with configurable sun position (315° azimuth, 45° elevation)
- **Slope** (`src/relief_slope.js`): Colors terrain by steepness using Horn's method for gradient calculation and HSV-to-RGB color mapping (green=flat, red=steep)

### Data Flow

1. Leaflet requests tiles via `createTile(coords, done)`
2. Plugin creates canvas and ImageData buffer
3. Elevation cache pre-loads 3x3 tile grid from AWS Terrarium
4. Mode-specific renderer processes each pixel:
   - Calculates gradients using neighboring elevations
   - Applies hillshading or slope coloring algorithms
   - Handles no-data areas (elevation ≤ 0) as transparent
5. Canvas receives processed pixel data and tile completes

### Key Algorithms

**Hillshading**: Uses surface normal vectors and sun direction dot product with gamma correction and ambient lighting
**Slope Calculation**: Horn's method with 8-neighbor kernel, latitude-corrected pixel scaling, and color gradients based on steepness ranges

## Development

### File Structure
- `src/relief.js` - Main plugin class and tile management
- `src/relief_hillshade.js` - Hillshade rendering algorithm  
- `src/relief_slope.js` - Slope rendering algorithm
- `src/relief_elevation.js` - Elevation data fetching and caching

### External Dependencies
- Leaflet (peer dependency)
- AWS Terrarium elevation tiles (https://s3.amazonaws.com/elevation-tiles-prod/terrarium/)

### Performance Considerations
- Tile caching prevents redundant network requests (LIFO cache, max 50 tiles)
- Abort controllers cancel pending requests when tiles are unloaded
- Cross-tile boundary handling requires 3x3 tile grids for accurate gradient calculations
- Latitude correction applied to pixel scaling for accurate slope measurements