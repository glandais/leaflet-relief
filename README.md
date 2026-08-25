# Leaflet Relief

A Leaflet plugin for terrain visualization that renders relief maps showing hillshading and slope analysis. The plugin fetches elevation data from AWS Terrarium tiles and processes it to create visual overlays on Leaflet maps.

📦 **[npm package](https://www.npmjs.com/package/leaflet-relief)** | 🌐 **[Live Demo](https://glandais.github.io/leaflet-relief/)**

## Demo

🌐 **[Live Demo](https://glandais.github.io/leaflet-relief/)** - Try the plugin with interactive terrain visualization

## Features

- **Hillshade Mode**: Creates a shaded relief effect simulating sunlight on terrain
- **Slope Mode**: Colors terrain based on steepness/gradient analysis
- **Archeo Mode**: Multi-directional hillshade with warm/cool tinting that makes subtle convex/concave micro-relief "glow"
- **Tricolor Mode**: Three hillshades from different azimuths mapped to the red, green and blue channels
- **High Performance**: Async tile loading with abort controllers and canvas pooling to prevent memory leaks
- **Edge Pixel Handling**: Intelligent edge clamping for accurate gradient calculations within tiles
- **Partial Coverage**: Falls back to parent tiles where the elevation source has no data at the requested zoom
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
// ES6 import (recommended)
import 'leaflet-relief';

// CommonJS
require('leaflet-relief');
```

### TypeScript

Full TypeScript support with accurate type definitions:

```typescript
import 'leaflet-relief';
import * as L from 'leaflet';

// Type-safe options
const reliefOptions: L.GridLayer.ReliefOptions = {
    mode: 'hillshade',
    hillshadeAzimuth: 315,
    hillshadeElevation: 45,
    opacity: 0.6,
};

const relief = L.gridLayer.relief(reliefOptions);
```

### CDN

```html
<!-- Modern ES Module (recommended) -->
<script
    src="https://cdn.jsdelivr.net/npm/leaflet-relief@latest/dist/leaflet-relief.esm.js"
    type="module"
></script>

<!-- UMD (browser global) -->
<script src="https://cdn.jsdelivr.net/npm/leaflet-relief@latest/dist/leaflet-relief.umd.js"></script>

<!-- Minified version -->
<script src="https://cdn.jsdelivr.net/npm/leaflet-relief@latest/dist/leaflet-relief.min.js"></script>
```

### Local Download

```html
<!-- Download and host locally -->
<!-- For production, use the minified version -->
<script src="path/to/leaflet-relief.min.js"></script>

<!-- Or use the UMD version -->
<script src="path/to/leaflet-relief.umd.js"></script>
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
    hillshadeAzimuth: 135, // Southeast sun direction
    hillshadeElevation: 60, // High sun angle
    opacity: 0.7,
});

customHillshade.addTo(map);
```

### Hillshade Exaggeration

Hillshade slopes are computed in real-world units, so the shading looks the same for a
given terrain at every zoom level. Use `hillshadeExaggeration` to boost (or soften) the
contrast, in the same spirit as MapLibre GL's `hillshade-exaggeration` paint property:

```javascript
const punchyHillshade = L.gridLayer.relief({
    mode: 'hillshade',
    hillshadeExaggeration: 1.8, // Stronger relief; 1 = true slope, 0 = no shading
});
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

#### Using Mapterhorn tiles (512×512)

```javascript
// Mapterhorn terrain tiles — free, 512×512, Terrarium encoding
const mapterhornRelief = L.gridLayer.relief({
    mode: 'hillshade',
    tileSize: 512,
    elevationUrl: L.GridLayer.Relief.elevationUrls.mapterhorn,
    elevationExtractor: L.GridLayer.Relief.elevationExtractors.mapterhorn,
    attribution: L.GridLayer.Relief.elevationAttributions.mapterhorn,
});
```

#### Using IGN LiDAR HD tiles (France)

France's national mapping agency publishes 1 m LiDAR-derived elevation models, roughly
thirty times finer than the global sources above — a good match for `archeo` and
`tricolor`. Two models are available: `ignLidarHdMnt` (bare terrain, the one you want for
archaeology) and `ignLidarHdMns` (surface, including buildings and vegetation).

These are served as raw float32 elevations rather than RGB-encoded images, so they need
`elevationTileDecoder` instead of `elevationExtractor`:

```javascript
// IGN LiDAR HD terrain model — free, no API key, France only
const ignRelief = L.gridLayer.relief({
    mode: 'archeo',
    elevationUrl: L.GridLayer.Relief.elevationUrls.ignLidarHdMnt,
    elevationTileDecoder: L.GridLayer.Relief.elevationTileDecoders.bil32,
    attribution: L.GridLayer.Relief.elevationAttributions.ignLidarHd,
});
```

Things worth knowing before using it:

- **France only** (metropolitan France and the overseas departments). Everywhere else the
  service answers with no-data and tiles render transparent.
- This is a **WMS**, not a pyramid of pre-cut tiles on a CDN. Every tile is rendered on
  demand, uncompressed: 256 KiB per 256 px tile, 1 MiB at 512. **Keep the default
  `tileSize: 256`** and leave `maxNativeZoom` at its default of `17` — it is a public
  service, not a CDN.
- `elevationFallbackDepth` has no effect here: the service answers `200` with a no-data
  grid instead of `404`, so there is nothing to walk up to.
- If you only need a hillshade and not the plugin's rendering modes, IGN also publishes a
  ready-made one as plain raster tiles, usable with a bare `L.tileLayer`:

    ```javascript
    L.tileLayer(
        'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile' +
            '&LAYER=IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW' +
            '&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM_0_18' +
            '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        { maxNativeZoom: 18 }
    );
    ```

#### Using another binary elevation source

`elevationTileDecoder` turns a whole tile of bytes into metres, for any format no image
decoder understands. It receives the raw response and the tile size, and returns one
elevation per pixel, row-major from the north-west corner:

```javascript
const binaryRelief = L.gridLayer.relief({
    elevationUrl: 'https://mytileserver.com/elevation/{z}/{x}/{y}.bin',
    elevationTileDecoder: function (buffer, tileSize) {
        const view = new DataView(buffer);
        const elevations = new Float32Array(tileSize * tileSize);
        for (let i = 0; i < elevations.length; i++) {
            const value = view.getFloat32(i * 4, true);
            // Anything <= 0 is treated as no-data and rendered transparent.
            elevations[i] = value < -1000 ? 0 : Math.max(value, 0.01);
        }
        return elevations;
    },
});
```

When a decoder is set, `elevationExtractor` is unused and the parent-tile fallback is
disabled.

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

### Archeo (LiDAR-style micro-relief)

Renders a multi-directional hillshade base and tints local micro-relief: convex features (mounds, banks) glow warm (orange), concave features (ditches, hollows) glow cool (blue), while flat terrain stays at the neutral light gray base color. Best suited to gentle terrain where subtle features are otherwise hard to see; feature visibility is limited by the resolution of the elevation source.

```javascript
// Defaults
const archeo = L.gridLayer.relief({
    mode: 'archeo',
    opacity: 0.8,
});

// Customized
const customArcheo = L.gridLayer.relief({
    mode: 'archeo',
    archeoAzimuths: [225, 270, 315, 360], // Light directions for the shading base
    archeoElevation: 45, // Sun elevation for all directions
    archeoExaggeration: 3, // Vertical exaggeration (zFactor) of the shading base
    archeoGlowStrength: 15, // Tint gain per unit of local curvature
    archeoColorScheme: 'vivid', // 'default', 'vivid' or 'subtle'
});

// Full color control (overrides the scheme)
const tunedArcheo = L.gridLayer.relief({
    mode: 'archeo',
    archeoWarmColor: [236, 150, 82], // Convex micro-relief
    archeoCoolColor: [126, 172, 246], // Concave micro-relief
    archeoBaseColor: [192, 191, 196], // Flat terrain
});
```

### Tricolor (multi-direction hillshade)

Computes three hillshades lit from different compass directions and writes them to the red, green and blue channels — as if there were three suns. Minor landscape features stand out whatever their orientation. Defaults follow the National Library of Scotland's RVT-generated layers: red from 315°, green from 15°, blue from 75°.

```javascript
const tricolor = L.gridLayer.relief({
    mode: 'tricolor',
    tricolorAzimuths: [315, 15, 75], // Azimuths for the R, G and B channels
    tricolorElevation: 35, // RVT default sun elevation
    tricolorExaggeration: 1, // Vertical exaggeration (zFactor)
    opacity: 0.7,
});
```

### Complete Example

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
        <script src="https://cdn.jsdelivr.net/npm/leaflet-relief@latest/dist/leaflet-relief.min.js"></script>

        <script>
            // Initialize map
            const map = L.map('map').setView([45.8326, 6.8652], 12); // Mont Blanc, France

            // Add base layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
            }).addTo(map);

            // Add relief layer with custom options
            const reliefLayer = L.gridLayer.relief({
                mode: 'hillshade',
                hillshadeAzimuth: 315,
                hillshadeElevation: 45,
                opacity: 0.6,
                zIndex: 100,
                // Standard Leaflet GridLayer options
                minZoom: 5,
                maxZoom: 15,
            });

            reliefLayer.addTo(map);
        </script>
    </body>
</html>
```

## API Reference

### L.GridLayer.Relief

Extends [`L.GridLayer`](https://leafletjs.com/reference.html#gridlayer) to provide terrain visualization capabilities.

### Factory Function

`L.gridLayer.relief(options)` - Creates a new relief layer instance.

### Predefined Elevation Extractors

Available via `L.GridLayer.Relief.elevationExtractors`:

- `terrarium` - AWS Terrarium format decoder (default)
- `mapbox` - Mapbox Terrain-RGB format decoder
- `mapterhorn` - Mapterhorn format decoder (same as Terrarium encoding)

### Predefined Elevation URLs

Available via `L.GridLayer.Relief.elevationUrls`:

- `terrarium` - AWS Terrarium URL function
- `mapterhorn` - Mapterhorn tile URL template (`https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`)
- `ignLidarHdMnt` - IGN LiDAR HD terrain model, France (WMS request builder)
- `ignLidarHdMns` - IGN LiDAR HD surface model, France (WMS request builder)

### Predefined Elevation Tile Decoders

Available via `L.GridLayer.Relief.elevationTileDecoders`:

- `bil32` - BIL 32-bit little-endian float elevations, as served by IGN (`-9999` = no-data)

### Predefined Elevation Attributions

Available via `L.GridLayer.Relief.elevationAttributions` (HTML strings for Leaflet's `attribution` option):

- `terrarium` - Mapzen Elevation attribution
- `mapbox` - Mapbox attribution
- `mapterhorn` - Mapterhorn attribution
- `ignLidarHd` - IGN LiDAR HD attribution

### Max Native Zoom

Elevation sources only publish tiles up to a given zoom level; beyond it, requests return
`404` and no relief is rendered. The layer therefore sets a default `maxNativeZoom`, so
Leaflet upscales the deepest available tile instead of asking for a level that does not exist.

Available via `L.GridLayer.Relief.elevationMaxNativeZooms`:

- `terrarium` - `15`
- `mapbox` - `15`
- `mapterhorn` - `17` (default, matching the default elevation source)

Custom elevation sources are left unclamped (their depth is unknown), so set the option
yourself when using another provider.

```javascript
const relief = L.gridLayer.relief({
    elevationUrl: 'https://example.com/tiles/{z}/{x}/{y}.png',
    maxNativeZoom: 13,
});
```

### Partial Coverage

`maxNativeZoom` is a single global value, but coverage is not uniform. Mapterhorn, for
instance, publishes zoom 17 over countries with LiDAR datasets and stops much earlier
elsewhere: around Cork, Ireland, tiles are already missing at zoom 13. No provider
publishes an index of that, so the layer detects it while loading.

When a tile is missing (`404`, `403` or `204`), the layer walks up to the parent tiles
until it finds data, then resamples the relevant quadrant back to the requested tile.
Interpolation runs on decoded elevations rather than on the encoded pixels — Terrarium and
Terrain-RGB spread elevation across channels, so blending the raw RGBA would invent
terrain. Shading stays consistent: the result is smooth, only less detailed.

`elevationFallbackDepth` sets how many parent levels may be walked (default `5`, which
covers Mapterhorn's worst case of zoom 17 requested over zoom 12 data). Set it to `0` to
disable the fallback entirely.

```javascript
const relief = L.gridLayer.relief({
    elevationFallbackDepth: 5,
});
```

Missing tiles are memoized per layer, so panning does not re-request them — absent tiles
are usually served without cache headers. A missing tile also rules out its descendants,
which lets the layer skip the zoom levels it already knows to be empty. When no zoom has
data at all (open sea, area outside the source), the tile is simply left transparent
instead of being reported as an error.

#### Constructor Options

Inherits all options from [`L.GridLayer`](https://leafletjs.com/reference.html#gridlayer) plus the following relief-specific options:

| Option                   | Type              | Default                | Description                                                                                                                                                               |
| ------------------------ | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`                   | `String`          | `'hillshade'`          | Visualization mode: `'hillshade'`, `'slope'`, `'archeo'` or `'tricolor'`                                                                                                  |
| `hillshadeAzimuth`       | `Number`          | `315`                  | Sun azimuth angle in degrees (0-360°) for hillshade mode                                                                                                                  |
| `hillshadeElevation`     | `Number`          | `45`                   | Sun elevation angle in degrees (0-90°) for hillshade mode                                                                                                                 |
| `hillshadeExaggeration`  | `Number`          | `1`                    | Vertical exaggeration (zFactor) applied to the hillshade slope, `0` disables shading                                                                                      |
| `hillshadeColorFunction` | `Function`        | Grayscale              | Custom color function for hillshade mode `function(intensity)` returns `[r, g, b]`                                                                                        |
| `slopeColorScheme`       | `String`          | `'default'`            | Preset color scheme for slope mode: `'default'`, `'glacial'`, `'thermal'`, `'earth'`                                                                                      |
| `slopeColorConfig`       | `Array`           | Default HSV            | Custom HSV slope-to-hue mapping array for slope mode                                                                                                                      |
| `slopeColorFunction`     | `Function`        | Default green→red      | Custom color function for slope mode `function(slopeDegrees)` returns `[r, g, b]`                                                                                         |
| `archeoAzimuths`         | `Array`           | `[225, 270, 315, 360]` | Light azimuths (degrees) averaged for the archeo shading base                                                                                                             |
| `archeoElevation`        | `Number`          | `45`                   | Sun elevation angle in degrees (0-90°) for archeo mode                                                                                                                    |
| `archeoExaggeration`     | `Number`          | `3`                    | Vertical exaggeration (zFactor) of the archeo shading base                                                                                                                |
| `archeoGlowStrength`     | `Number`          | `15`                   | Tint gain per unit of local curvature (higher = stronger glow)                                                                                                            |
| `archeoColorScheme`      | `String`          | `'default'`            | Preset archeo colors: `'default'`, `'vivid'`, `'subtle'`                                                                                                                  |
| `archeoWarmColor`        | `Array`           | `[236, 150, 82]`       | `[r, g, b]` tint for convex micro-relief (overrides scheme)                                                                                                               |
| `archeoCoolColor`        | `Array`           | `[126, 172, 246]`      | `[r, g, b]` tint for concave micro-relief (overrides scheme)                                                                                                              |
| `archeoBaseColor`        | `Array`           | `[192, 191, 196]`      | `[r, g, b]` base color for flat terrain (overrides scheme)                                                                                                                |
| `tricolorAzimuths`       | `Array`           | `[315, 15, 75]`        | Azimuths (degrees) lighting the red, green and blue channels                                                                                                              |
| `tricolorElevation`      | `Number`          | `35`                   | Sun elevation angle in degrees (0-90°) for tricolor mode                                                                                                                  |
| `tricolorExaggeration`   | `Number`          | `1`                    | Vertical exaggeration (zFactor) for tricolor mode                                                                                                                         |
| `elevationUrl`           | `String/Function` | AWS Terrarium          | Custom elevation tile URL pattern or function                                                                                                                             |
| `elevationExtractor`     | `Function`        | Terrarium decoder      | Custom function to extract elevation from RGBA values                                                                                                                     |
| `elevationTileDecoder`   | `Function`        | none                   | Decodes a whole binary tile to metres, `(buffer, tileSize) => Float32Array`; bypasses the image decoder, `elevationExtractor` and the parent-tile fallback                |
| `elevationFallbackDepth` | `Number`          | `5`                    | Parent levels to walk up when a tile is missing, upsampling the first one found; `0` disables the fallback                                                                |
| `maxNativeZoom`          | `Number`          | Source dependent       | Deepest zoom the elevation source provides; deeper zooms upscale the last tile. Defaults to `17` (Mapterhorn, IGN LiDAR HD) or `15` (Terrarium); unset for custom sources |

**Note**: Slope color options are mutually exclusive (XOR): only one of `slopeColorScheme`, `slopeColorConfig`, or `slopeColorFunction` should be used.

#### Methods

Inherits all methods from [`L.GridLayer`](https://leafletjs.com/reference.html#gridlayer). Key methods:

- `addTo(map)` - Add layer to map
- `remove()` - Remove layer from map
- `redraw()` - Force layer to redraw all tiles
- `setOpacity(opacity)` - Change layer opacity

#### Events

Inherits all events from [`L.GridLayer`](https://leafletjs.com/reference.html#gridlayer):

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

#### Archeo

- Shading base: Horn gradients scaled by the real-world pixel size (zoom and latitude aware) and by `archeoExaggeration`, lit from several azimuths; each direction's Lambertian intensity is clamped at zero before averaging (the clamp is what preserves the multi-directional effect), then normalized so flat terrain renders at exactly the base color
- Micro-relief detection: 8-neighbor Laplacian of the 3×3 elevation window divided by the pixel size (positive = convex, negative = concave), squashed with `tanh(glowStrength × curvature)`
- Composition: base color blended toward the warm or cool color proportionally to curvature (saturation capped), then multiplied by the shading intensity
- Metric scaling: the same real-world feature produces the same tint at every zoom and latitude
- The 3×3 window detects pixel-scale anomalies, so visible detail is limited by the elevation source resolution
- No-data areas (elevation ≤ 0) rendered as transparent

#### Tricolor

- Three hillshades computed from one gradient evaluation (scaled by the real-world pixel size and `tricolorExaggeration`), each lit from its own azimuth and written to the red, green or blue channel
- Raw Lambertian intensity, without the ambient lift hillshade mode applies: the method relies on each channel keeping its full dynamic range, which is what turns differently oriented slopes into colors
- Defaults follow the National Library of Scotland's RVT-generated multi-direction hillshade layers: red 315°, green 15°, blue 75°, all at RVT's default 35° sun elevation
- Flat terrain renders as neutral mid gray (equal channels, `255 × sin(elevation)`); oriented slopes take directional tints
- No-data areas (elevation ≤ 0) rendered as transparent

## Data Sources

### Default: AWS Terrarium

- **URL Pattern**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- **Encoding**: RGB to elevation: `(R*256 + G + B/256) - 32768` meters
- **Resolution**: ~30m at equator
- **Coverage**: Global
- **Free**: No API key required

### Supported Formats

The plugin supports RGB-encoded elevation tiles with configurable decoders, plus binary
elevation grids through `elevationTileDecoder`:

- **AWS Terrarium** - Default format, free to use (256×256)
- **Mapterhorn** - Free, no API key required (512×512 WebP, Terrarium encoding)
- **IGN LiDAR HD** - Free, no API key, 1 m resolution, France only (BIL float32 over WMS)
- **Mapbox Terrain-RGB** - Requires Mapbox access token
- **NextZen Terrarium** - Requires API key
- **Custom formats** - Define your own elevation extractor or tile decoder

## Performance Notes

- Abort controllers cancel pending requests when tiles are unloaded
- Canvas pooling reduces memory allocation and garbage collection pressure
- Edge pixel clamping provides accurate gradient calculations within single tiles
- Latitude correction applied to pixel scaling for accurate slope measurements
- `willReadFrequently` canvas optimization for efficient elevation data extraction
- Missing elevation tiles are memoized, and a missing tile rules out every zoom below it

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

### Running the Demo Locally

```bash
# Build and serve the demo in one command
npm run demo
```

Then open http://localhost:3000 in your browser.

For iterative development, run the build watcher and server in two terminals:

```bash
# Terminal 1: rebuild on source changes
npm run dev

# Terminal 2: serve the demo
npx serve .
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
