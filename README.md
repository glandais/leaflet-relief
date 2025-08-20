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

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `String` | `'hillshade'` | Visualization mode: `'hillshade'` or `'slope'` |
| `opacity` | `Number` | `1.0` | Layer opacity (0-1) |
| `zIndex` | `Number` | `1` | Layer stacking order |

All standard [Leaflet GridLayer options](https://leafletjs.com/reference.html#gridlayer) are also supported.

#### Methods

Inherits all methods from `L.GridLayer`. Key methods:

- `addTo(map)` - Add layer to map
- `remove()` - Remove layer from map  
- `redraw()` - Force layer to redraw all tiles
- `setOpacity(opacity)` - Change layer opacity

#### Events

Inherits all events from `L.GridLayer`:

- `loading` - Fired when tiles start loading
- `load` - Fired when all tiles have loaded
- `tileload` - Fired when a tile loads
- `tileerror` - Fired when a tile fails to load

### Algorithms

#### Hillshading
- Uses surface normal vectors and sun direction dot product
- Sun position: 315° azimuth, 45° elevation
- Applies gamma correction and ambient lighting
- No-data areas (elevation ≤ 0) rendered as transparent

#### Slope Analysis
- Calculates gradients using Horn's method with 8-neighbor kernel
- Latitude-corrected pixel scaling for accurate measurements
- Color mapping: Green (flat) → Red (steep)
- Uses HSV color space for smooth gradients

## Data Source

Elevation data is fetched from AWS Terrarium tiles:
- **URL Pattern**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- **Encoding**: RGB to elevation: `(R*256 + G + B/256) - 32768` meters
- **Resolution**: ~30m at equator
- **Coverage**: Global

## Performance Notes

- Tiles are cached to prevent redundant network requests (LIFO cache, max 50 tiles)
- Abort controllers cancel pending requests when tiles are unloaded
- Cross-tile boundary handling requires 3x3 tile grids for accurate gradient calculations
- Latitude correction applied to pixel scaling for accurate slope measurements

## Browser Support

- Chrome/Edge 60+
- Firefox 55+
- Safari 11+
- Mobile browsers with Canvas support

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please ensure code follows existing patterns and includes appropriate tests.