# Leaflet Relief

A Leaflet plugin for terrain visualization that renders relief maps showing hillshading and slope analysis. The plugin fetches elevation data from AWS Terrarium tiles and processes it to create visual overlays on Leaflet maps.

📦 **[npm package](https://www.npmjs.com/package/leaflet-relief)** | 🌐 **[Live Demo](https://glandais.github.io/leaflet-relief/)**

## Demo

🌐 **[Live Demo](https://glandais.github.io/leaflet-relief/)** - Try the plugin with interactive terrain visualization

## Features

- **Hillshade Mode**: Creates a shaded relief effect simulating sunlight on terrain
- **Slope Mode**: Colors terrain based on steepness/gradient analysis
- **High Performance**: Async tile loading with abort controllers and canvas pooling to prevent memory leaks
- **Edge Pixel Handling**: Intelligent edge clamping for accurate gradient calculations within tiles
- **Attribution**: Automatically includes proper attribution for Mapzen elevation data

## Requirements

- **Leaflet**: `^1.0.0`
- **Browser Compatibility**: Modern browsers supporting Canvas API and ES6 classes
- **Network Access**: Requires access to AWS Terrarium elevation tiles

## Data Attribution

The plugin uses elevation data from AWS Terrain Tiles (formerly Mapzen Terrarium). Default attribution is automatically added to the map: `© Mapzen Elevation`. The elevation data comes from various sources including [SRTM, GMTED, NED and ETOPO1](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).

## Installation

### npm

```bash
npm install leaflet-relief
```

```javascript
// ES6 import
import 'leaflet-relief';

// CommonJS
require('leaflet-relief');
```

### CDN

```html
<!-- Include from jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/leaflet-relief@latest/src/L.GridLayer.Relief.js"></script>

<!-- Or from unpkg -->
<script src="https://unpkg.com/leaflet-relief@latest/src/L.GridLayer.Relief.js"></script>
```

### Local Download

```html
<!-- Download and host locally -->
<script src="path/to/L.GridLayer.Relief.js"></script>
```

## Usage

### Basic Hillshade Layer

```javascript
// Create a hillshade relief layer
const hillshadeLayer = L.gridLayer.relief({
    mode: 'hillshade',
    opacity: 0.6,
});

// Add to map
hillshadeLayer.addTo(map);
```

### Custom Sun Position

```javascript
// Create hillshade with custom sun position
const customHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    azimuth: 135, // Southeast sun direction
    elevation: 60, // High sun angle
    opacity: 0.7,
});

customHillshade.addTo(map);
```

### Custom Hillshade Colors

```javascript
// Blue-tinted hillshade
const blueHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    hillshadeColorFunction: function (intensity) {
        // Create blue-tinted relief
        const r = Math.round(intensity * 200);
        const g = Math.round(intensity * 220);
        const b = Math.round(intensity * 255);
        return [r, g, b];
    },
});

// Sepia-toned hillshade
const sepiaHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    hillshadeColorFunction: function (intensity) {
        // Create sepia-toned relief
        const r = Math.round(intensity * 255);
        const g = Math.round(intensity * 240);
        const b = Math.round(intensity * 200);
        return [r, g, b];
    },
});
```

### Runtime Sun Position Changes

```javascript
// Create hillshade layer
const hillshade = L.gridLayer.relief({ mode: 'hillshade' });
hillshade.addTo(map);

// Change sun position at runtime (automatically redraws)
hillshade.setAzimuth(90); // East lighting
hillshade.setElevation(30); // Lower sun angle

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
    elevationUrl: function (z, x, y) {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${x}/${y}.pngraw?access_token=YOUR_ACCESS_TOKEN`;
    },
    elevationExtractor: L.GridLayer.Relief.elevationExtractors.mapbox,
});
```

#### Using custom elevation tile source

```javascript
// Use a custom tile server with URL template
const customRelief = L.gridLayer.relief({
    mode: 'hillshade',
    elevationUrl: 'https://mytileserver.com/elevation/{z}/{x}/{y}.png',
    elevationExtractor: function (r, g, b, a) {
        // Custom decoding logic for your elevation format
        // Example: simple grayscale elevation (0-255m range)
        return r; // Use red channel as elevation in meters
    },
});
```

#### Using NextZen Terrarium tiles

```javascript
// NextZen Terrarium tiles (requires API key)
const nextzenRelief = L.gridLayer.relief({
    mode: 'hillshade',
    elevationUrl: function (z, x, y) {
        return `https://tile.nextzen.org/tilezen/terrain/v1/256/terrarium/${z}/${x}/${y}.png?api_key=YOUR_API_KEY`;
    },
    elevationExtractor: L.GridLayer.Relief.elevationExtractors.terrarium,
});
```

### Slope Analysis Layer

```javascript
// Create a slope analysis layer
const slopeLayer = L.gridLayer.relief({
    mode: 'slope',
    opacity: 0.7,
});

// Add to map
slopeLayer.addTo(map);
```

### Custom Slope Colors

#### Using Color Scheme Presets

```javascript
// Glacial theme (blue to white gradient)
const glacialSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorScheme: 'glacial',
});

// Thermal theme (purple to yellow gradient)
const thermalSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorScheme: 'thermal',
});

// Earth theme (green to brown gradient)
const earthSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorScheme: 'earth',
});
```

#### Custom HSV Configuration

```javascript
// Custom slope ranges and colors
const customHsvSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorConfig: [
        { slope: { min: 0, max: 5 }, h: { min: 240, max: 200 } }, // Blue to cyan for flat
        { slope: { min: 5, max: 15 }, h: { min: 200, max: 120 } }, // Cyan to green for gentle
        { slope: { min: 15, max: 35 }, h: { min: 120, max: 60 } }, // Green to yellow for moderate
        { slope: { min: 35, max: 1000 }, h: { min: 60, max: 0 } }, // Yellow to red for steep
    ],
});

// Edge case handling:
// - Slopes below first range minimum: Use first range h.min (blue, 240°)
// - Slopes above last range maximum: Use last range h.max (red, 0°)
// - Slopes within defined ranges: HSV interpolation between h.min and h.max
// This ensures consistent colors at extremes without fallback defaults
```

#### Full Custom Function

```javascript
// Complete control over slope colors
const customFunctionSlope = L.gridLayer.relief({
    mode: 'slope',
    slopeColorFunction: function (slopeDegrees) {
        if (slopeDegrees < 5) {
            // Flat areas: blue
            return [100, 150, 255];
        } else if (slopeDegrees < 20) {
            // Moderate slopes: interpolate blue to yellow
            const ratio = (slopeDegrees - 5) / 15;
            return [
                Math.round(100 + ratio * 155), // Blue to yellow (red)
                Math.round(150 + ratio * 105), // Blue to yellow (green)
                Math.round(255 - ratio * 255), // Blue to yellow (blue)
            ];
        } else {
            // Steep slopes: red
            return [255, 100, 100];
        }
    },
});
```

### Complete Example

#### HTML Setup

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Leaflet Relief Example</title>

        <!-- Leaflet CSS -->
        <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            crossorigin=""
        />
        <style>
            #map {
                height: 500px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>

        <!-- Leaflet JS -->
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
        <!-- Relief Plugin -->
        <script src="https://glandais.github.io/leaflet-relief/src/L.GridLayer.Relief.js"></script>
    </body>
</html>
```

#### JavaScript Usage

```javascript
// Initialize map
const map = L.map('map').setView([45.8326, 6.8652], 12); // Mont Blanc, France

// Add base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
}).addTo(map);

// Add relief layer with custom options
const reliefLayer = L.gridLayer.relief({
    mode: 'hillshade',
    opacity: 0.6,
    zIndex: 100,
    // Standard Leaflet GridLayer options
    minZoom: 5,
    maxZoom: 15,
});

reliefLayer.addTo(map);

// Switch between modes dynamically
function switchToSlope() {
    // Remove current layer
    map.removeLayer(reliefLayer);
    // Create new slope layer
    const slopeLayer = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'glacial',
        opacity: 0.6,
        zIndex: 100,
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

#### Constructor Options

| Option                   | Type              | Default           | Description                                                                          |
| ------------------------ | ----------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `mode`                   | `String`          | `'hillshade'`     | Visualization mode: `'hillshade'` or `'slope'`                                       |
| `azimuth`                | `Number`          | `315`             | Sun azimuth angle in degrees (0-360°) for hillshade mode                             |
| `elevation`              | `Number`          | `45`              | Sun elevation angle in degrees (0-90°) for hillshade mode                            |
| `hillshadeColorFunction` | `Function`        | Grayscale         | Custom color function for hillshade mode `function(intensity)` returns `[r, g, b]`   |
| `slopeColorScheme`       | `String`          | `'default'`       | Preset color scheme for slope mode: `'default'`, `'glacial'`, `'thermal'`, `'earth'` |
| `slopeColorConfig`       | `Array`           | Default HSV       | Custom HSV slope-to-hue mapping array for slope mode                                 |
| `slopeColorFunction`     | `Function`        | Default green→red | Custom color function for slope mode `function(slopeDegrees)` returns `[r, g, b]`    |
| `elevationUrl`           | `String/Function` | AWS Terrarium     | Custom elevation tile URL pattern or function                                        |
| `elevationExtractor`     | `Function`        | Terrarium decoder | Custom function to extract elevation from RGBA values                                |
| `opacity`                | `Number`          | `1.0`             | Layer opacity (0-1)                                                                  |
| `zIndex`                 | `Number`          | `1`               | Layer stacking order                                                                 |
| `attribution`            | `String`          | Mapzen Elevation  | Attribution text for the elevation data source                                       |

**Note**: Slope color options are mutually exclusive (XOR): only one of `slopeColorScheme`, `slopeColorConfig`, or `slopeColorFunction` should be used.

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
- **Color mapping**: Configurable HSV-based or custom RGB function
- **Default scheme**: Green (flat, 120°) → Yellow (60°) → Orange (20°) → Red (steep, 0°/-60°)
- **Edge case handling**: Uses first/last range colors for out-of-bounds slopes
- Uses HSV color space for smooth gradients in preset schemes

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

- Abort controllers cancel pending requests when tiles are unloaded
- Canvas pooling reduces memory allocation and garbage collection pressure
- Edge pixel clamping provides accurate gradient calculations within single tiles
- Latitude correction applied to pixel scaling for accurate slope measurements
- `willReadFrequently` canvas optimization for efficient elevation data extraction

## Browser Support

- Chrome/Edge 60+
- Firefox 55+
- Safari 11+
- Mobile browsers with Canvas support

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/glandais/leaflet-relief.git
cd leaflet-relief

# Install dependencies
npm install
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Contributing

Contributions are welcome! Please follow these guidelines:

1. **Commit Convention**: Use [Conventional Commits](https://www.conventionalcommits.org/)
    - `feat:` New features
    - `fix:` Bug fixes
    - `docs:` Documentation changes
    - `test:` Test additions or changes
    - `chore:` Maintenance tasks

2. **Testing**: Add tests for new features
3. **Code Style**: Follow existing patterns in the codebase

### Release Process

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and releases:

- **Automatic Version Bumping**: Based on commit messages
    - `fix:` → Patch release (1.0.0 → 1.0.1)
    - `feat:` → Minor release (1.0.0 → 1.1.0)
    - `BREAKING CHANGE:` → Major release (1.0.0 → 2.0.0)
- **npm Publishing**: Automatically publishes to npm registry
- **GitHub Releases**: Creates releases with changelogs
- **Continuous Integration**: Tests run on all commits

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please ensure code follows existing patterns and includes appropriate tests.
