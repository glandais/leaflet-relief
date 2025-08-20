# Leaflet Relief

A Leaflet plugin for terrain visualization that renders relief maps showing hillshading and slope analysis. The plugin fetches elevation data from AWS Terrarium tiles and processes it to create visual overlays on Leaflet maps.

## Demo

🌐 **[Live Demo](https://glandais.github.io/leaflet-relief/)** - Try the plugin with interactive terrain visualization

## Features

- **Hillshade Mode**: Creates a shaded relief effect simulating sunlight on terrain
- **Slope Mode**: Colors terrain based on steepness/gradient analysis
- **High Performance**: Async tile loading with abort controllers to prevent memory leaks
- **Cross-tile Boundaries**: Accurate calculations using 3x3 tile grids for gradient computation

## Requirements

- **Leaflet**: `^1.0.0`
- **Browser Compatibility**: Modern browsers supporting Canvas API and ES6 classes
- **Network Access**: Requires access to AWS Terrarium elevation tiles

## Installation

### NPM
```bash
npm install leaflet-relief
```

### CDN
```html
<script src="path/to/leaflet-relief/src/L.GridLayer.Relief.js"></script>
```

## Usage

### Basic Hillshade Layer
```javascript
// Create a hillshade relief layer
const hillshadeLayer = L.gridLayer.relief({
    mode: 'hillshade',
    opacity: 0.6
});

// Add to map
hillshadeLayer.addTo(map);
```

### Custom Sun Position
```javascript
// Create hillshade with custom sun position
const customHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    azimuth: 135,     // Southeast sun direction
    elevation: 60,    // High sun angle
    opacity: 0.7
});

customHillshade.addTo(map);
```

### Custom Hillshade Colors
```javascript
// Blue-tinted hillshade
const blueHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    hillshadeColorFunction: function(intensity) {
        // Create blue-tinted relief
        const r = Math.round(intensity * 200);
        const g = Math.round(intensity * 220);
        const b = Math.round(intensity * 255);
        return [r, g, b];
    }
});

// Sepia-toned hillshade
const sepiaHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    hillshadeColorFunction: function(intensity) {
        // Create sepia-toned relief
        const r = Math.round(intensity * 255);
        const g = Math.round(intensity * 240);
        const b = Math.round(intensity * 200);
        return [r, g, b];
    }
});
```

### Runtime Sun Position Changes
```javascript
// Create hillshade layer
const hillshade = L.gridLayer.relief({ mode: 'hillshade' });
hillshade.addTo(map);

// Change sun position at runtime (automatically redraws)
hillshade.setAzimuth(90);        // East lighting
hillshade.setElevation(30);      // Lower sun angle

// Or set both at once (single redraw)
hillshade.setSunPosition(180, 60); // South lighting, high sun

// Get current values
console.log('Azimuth:', hillshade.getAzimuth());
console.log('Elevation:', hillshade.getElevation());
```

### Custom Elevation Sources

#### Using Mapbox Terrain-RGB tiles
```javascript
// Use Mapbox Terrain-RGB tiles (requires access token)
const mapboxRelief = L.gridLayer.relief({
    mode: 'hillshade',
    elevationUrl: function(z, x, y) {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${x}/${y}.pngraw?access_token=YOUR_ACCESS_TOKEN`;
    },
    elevationExtractor: L.GridLayer.Relief.elevationExtractors.mapbox
});
```

#### Using custom elevation tile source
```javascript
// Use a custom tile server with URL template
const customRelief = L.gridLayer.relief({
    mode: 'hillshade',
    elevationUrl: 'https://mytileserver.com/elevation/{z}/{x}/{y}.png',
    elevationExtractor: function(r, g, b, a) {
        // Custom decoding logic for your elevation format
        // Example: simple grayscale elevation (0-255m range)
        return r; // Use red channel as elevation in meters
    },
    maxCacheSize: 100  // Increase cache size for better performance
});
```

#### Using NextZen Terrarium tiles
```javascript
// NextZen Terrarium tiles (requires API key)
const nextzenRelief = L.gridLayer.relief({
    mode: 'hillshade',
    elevationUrl: function(z, x, y) {
        return `https://tile.nextzen.org/tilezen/terrain/v1/256/terrarium/${z}/${x}/${y}.png?api_key=YOUR_API_KEY`;
    },
    elevationExtractor: L.GridLayer.Relief.elevationExtractors.terrarium
});
```

### Slope Analysis Layer
```javascript
// Create a slope analysis layer
const slopeLayer = L.gridLayer.relief({
    mode: 'slope',
    opacity: 0.7
});

// Add to map
slopeLayer.addTo(map);
```

### Complete Example
```javascript
// Initialize map
const map = L.map('map').setView([45.5, -122.5], 12);

// Add base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add relief layer with custom options
const reliefLayer = L.gridLayer.relief({
    mode: 'hillshade',
    opacity: 0.6,
    zIndex: 100,
    // Standard Leaflet GridLayer options
    minZoom: 5,
    maxZoom: 15
});

reliefLayer.addTo(map);

// Switch between modes dynamically
function switchToSlope() {
    // Remove current layer
    map.removeLayer(reliefLayer);
    // Create new slope layer
    const slopeLayer = L.gridLayer.relief({
        mode: 'slope',
        opacity: 0.6,
        zIndex: 100
    });
    slopeLayer.addTo(map);
}
```

## API Reference

### L.GridLayer.Relief

Extends `L.GridLayer` to provide terrain visualization capabilities.

### Factory Function

`L.gridLayer.relief(options)` - Creates a new relief layer instance.

### Predefined Elevation Extractors

Available via `L.GridLayer.Relief.elevationExtractors`:

- `terrarium` - AWS Terrarium format decoder (default)
- `mapbox` - Mapbox Terrain-RGB format decoder
- `custom(fn)` - Wrapper for custom decoder functions

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `String` | `'hillshade'` | Visualization mode: `'hillshade'` or `'slope'` |
| `azimuth` | `Number` | `315` | Sun azimuth angle in degrees (0-360°) for hillshade mode |
| `elevation` | `Number` | `45` | Sun elevation angle in degrees (0-90°) for hillshade mode |
| `hillshadeColorFunction` | `Function` | Grayscale | Custom color function for hillshade mode `function(intensity)` returns `[r, g, b]` |
| `elevationUrl` | `String/Function` | AWS Terrarium | Custom elevation tile URL pattern or function |
| `elevationExtractor` | `Function` | Terrarium decoder | Custom function to extract elevation from RGBA values |
| `maxCacheSize` | `Number` | `50` | Maximum number of elevation tiles to cache |
| `opacity` | `Number` | `1.0` | Layer opacity (0-1) |
| `zIndex` | `Number` | `1` | Layer stacking order |

All standard [Leaflet GridLayer options](https://leafletjs.com/reference.html#gridlayer) are also supported.

#### Methods

Inherits all methods from `L.GridLayer`. Key methods:

- `addTo(map)` - Add layer to map
- `remove()` - Remove layer from map  
- `redraw()` - Force layer to redraw all tiles
- `setOpacity(opacity)` - Change layer opacity

**Hillshade-specific methods:**

- `setAzimuth(azimuth)` - Set sun azimuth angle (0-360°) and redraw
- `setElevation(elevation)` - Set sun elevation angle (0-90°) and redraw
- `setSunPosition(azimuth, elevation)` - Set both angles and redraw
- `getAzimuth()` - Get current azimuth angle
- `getElevation()` - Get current elevation angle

#### Events

Inherits all events from `L.GridLayer`:

- `loading` - Fired when tiles start loading
- `load` - Fired when all tiles have loaded
- `tileload` - Fired when a tile loads
- `tileerror` - Fired when a tile fails to load

### Algorithms

#### Hillshading
- Uses surface normal vectors and sun direction dot product
- Default sun position: 315° azimuth (northwest), 45° elevation
- Azimuth angles: 0°=North, 90°=East, 180°=South, 270°=West
- Elevation angles: 0°=horizon, 90°=directly overhead
- Applies gamma correction and ambient lighting
- No-data areas (elevation ≤ 0) rendered as transparent

#### Slope Analysis
- Calculates gradients using Horn's method with 8-neighbor kernel
- Latitude-corrected pixel scaling for accurate measurements
- Color mapping: Green (flat) → Red (steep)
- Uses HSV color space for smooth gradients

## Data Sources

### Default: AWS Terrarium
- **URL Pattern**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- **Encoding**: RGB to elevation: `(R*256 + G + B/256) - 32768` meters
- **Resolution**: ~30m at equator
- **Coverage**: Global
- **Free**: No API key required

### Supported Formats
The plugin supports any RGB-encoded elevation tiles with configurable decoders:

- **AWS Terrarium** - Default format, free to use
- **Mapbox Terrain-RGB** - Requires Mapbox access token
- **NextZen Terrarium** - Requires API key
- **Custom formats** - Define your own elevation extractor function

## Performance Notes

- Tiles are cached to prevent redundant network requests (LIFO cache, default 50 tiles, configurable via `maxCacheSize`)
- Abort controllers cancel pending requests when tiles are unloaded
- Cross-tile boundary handling requires 3x3 tile grids for accurate gradient calculations
- Latitude correction applied to pixel scaling for accurate slope measurements
- Increase `maxCacheSize` for large maps or when panning frequently

## Browser Support

- Chrome/Edge 60+
- Firefox 55+
- Safari 11+
- Mobile browsers with Canvas support

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please ensure code follows existing patterns and includes appropriate tests.