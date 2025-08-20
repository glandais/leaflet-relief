(function() {
'use strict';

/**
 * L.GridLayer.Relief - Leaflet plugin for terrain visualization overlays
 *
 * This class extends Leaflet's GridLayer to render terrain data as visual overlays.
 * It supports two visualization modes:
 * - hillshade: Creates a shaded relief effect simulating sunlight on terrain
 * - slope: Colors terrain based on steepness/gradient
 *
 * The layer fetches elevation data from AWS Terrarium tiles and processes it
 * to create the visual effects on 256x256 pixel canvas tiles.
 */

// ====================== INTERNAL ELEVATION MANAGEMENT ======================

/**
 * Default Terrarium elevation extraction function
 * @param {number} r - Red channel value (0-255)
 * @param {number} g - Green channel value (0-255)
 * @param {number} b - Blue channel value (0-255)
 * @param {number} a - Alpha channel value (0-255) - unused in Terrarium format
 * @returns {number} Elevation in meters
 */
const _defaultElevationExtractor = function(r, g, b, a) {
    return (r * 256 + g + b / 256) - 32768;
};

/**
 * Mapbox Terrain-RGB elevation extraction function
 * @param {number} r - Red channel value (0-255)
 * @param {number} g - Green channel value (0-255)
 * @param {number} b - Blue channel value (0-255)
 * @param {number} a - Alpha channel value (0-255) - unused
 * @returns {number} Elevation in meters
 */
const _mapboxElevationExtractor = function(r, g, b, a) {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
};

/**
 * Default elevation tile URL pattern (AWS Terrarium)
 * @param {number} z - Zoom level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @returns {string} Tile URL
 */
const _defaultElevationUrl = function(z, x, y) {
    return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
};

/**
 * Default hillshade color function (grayscale)
 * @param {number} intensity - Light intensity (0-1)
 * @returns {Array} RGB values [r, g, b]
 */
const _defaultHillshadeColorFunction = function(intensity) {
    const value = Math.round(intensity * 255);
    return [value, value, value];
};

/**
 * Extract elevation from RGBA pixel data
 * @param {Uint8ClampedArray} tileData - Tile pixel data
 * @param {number} i - Pixel row
 * @param {number} j - Pixel column
 * @param {Function} elevationExtractor - Extraction function
 * @returns {number} Elevation in meters
 */
const _extractElevation = function(tileData, i, j, elevationExtractor) {
    const pixelIndex = (i * 256 + j) * 4;
    const r = tileData[pixelIndex];
    const g = tileData[pixelIndex + 1];
    const b = tileData[pixelIndex + 2];
    const a = tileData[pixelIndex + 3];
    return elevationExtractor(r, g, b, a);
};

/**
 * _TileCache - Manages elevation data fetching and caching
 *
 * This class handles fetching elevation tiles from configurable sources,
 * with support for custom URL patterns and elevation extraction functions.
 */
class _TileCache {
    constructor(options = {}) {
        this.tileCache = new Map();
        this.accessOrder = [];
        this.maxCacheSize = options.maxCacheSize || 50;
        this.elevationUrl = options.elevationUrl || _defaultElevationUrl;
        this.elevationExtractor = options.elevationExtractor || _defaultElevationExtractor;
        this.pendingRequests = new Map();
    }

    async getTile(z, x, y, abortSignal) {
        const tileKey = `${z}/${x}/${y}`;
        
        if (this.tileCache.has(tileKey)) {
            return this.tileCache.get(tileKey);
        }

        if (this.pendingRequests.has(tileKey)) {
            return this.pendingRequests.get(tileKey);
        }

        try {
            const fetchPromise = this.fetchTile(z, x, y, abortSignal);
            this.pendingRequests.set(tileKey, fetchPromise);
            const tileData = await fetchPromise;
            this.addToCache(tileKey, tileData);
            return tileData;
        } finally {
            this.pendingRequests.delete(tileKey);
        }
    }

    async fetchTile(z, x, y, abortSignal) {
        const url = typeof this.elevationUrl === 'function' 
            ? this.elevationUrl(z, x, y)
            : this.elevationUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
        
        try {
            const response = await fetch(url, { signal: abortSignal });
            if (!response.ok) {
                throw new Error(`Failed to fetch tile: ${response.status}`);
            }
            
            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);
            
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, 256, 256);
            return imageData.data;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(`Error fetching tile ${z}/${x}/${y}:`, error);
            }
            throw error;
        }
    }

    addToCache(tileKey, tileData) {
        while (this.tileCache.size >= this.maxCacheSize && this.accessOrder.length > 0) {
            const oldestKey = this.accessOrder.shift();
            this.tileCache.delete(oldestKey);
        }
        
        this.tileCache.set(tileKey, tileData);
        this.accessOrder.push(tileKey);
    }

}

// We'll create the tile cache per layer instance instead of singleton
// to support different elevation sources per layer

/**
 * _ElevationCache - Local cache for a 3x3 grid of elevation tiles
 */
class _ElevationCache {
    constructor(tileCache) {
        this.tiles = new Map();
        this.tileCache = tileCache;
    }

    async init(z, x, y, abortSignal) {
        for (let dx = -1; dx < 2; dx++) {
            for (let dy = -1; dy < 2; dy++) {
                let rx = x + dx;
                let ry = y + dy;
                const tileKey = `${z}/${rx}/${ry}`;
                this.tiles.set(tileKey, await this.tileCache.getTile(z, rx, ry, abortSignal));
            }
        }
    }

    getElevation(z, x, y, i, j) {
        let tileX = x;
        let tileY = y;
        let pixelI = j;
        let pixelJ = i;

        while (pixelI < 0) {
            tileY--;
            pixelI += 256;
        }
        while (pixelI > 255) {
            tileY++;
            pixelI -= 256;
        }
        while (pixelJ < 0) {
            tileX--;
            pixelJ += 256;
        }
        while (pixelJ > 255) {
            tileX++;
            pixelJ -= 256;
        }

        const tileKey = `${z}/${tileX}/${tileY}`;
        const tileData = this.tiles.get(tileKey);
        return _extractElevation(tileData, pixelI, pixelJ, this.tileCache.elevationExtractor);
    }
}

// ====================== INTERNAL HILLSHADE FUNCTIONS ======================

/**
 * fillHillshadeTile - Renders hillshade effect for a single map tile
 */
const _fillHillshadeTile = async (data, coords, abortSignal, layer) => {
    const x = coords.x;
    const y = coords.y;
    const z = coords.z;

    // Use configurable azimuth and elevation from layer options
    const azimuth = layer.azimuth;
    const elevation = layer.elevation;
    const alpha = Math.PI / 180 * azimuth;
    const beta = Math.PI / 180 * elevation;
    const a1 = Math.sin(beta);
    const a2 = Math.cos(beta) * Math.sin(alpha);
    const a3 = Math.cos(beta) * Math.cos(alpha);

    const elevationCache = new _ElevationCache(layer.tileCache);
    await elevationCache.init(z, x, y, abortSignal);

    for (let i = 0; i < 256; i++) {
        if (abortSignal && abortSignal.aborted) {
            throw new DOMException('Tile loading aborted', 'AbortError');
        }

        for (let j = 0; j < 256; j++) {
            let z2 = elevationCache.getElevation(z, x, y, i - 1, j);
            let z4 = elevationCache.getElevation(z, x, y, i, j - 1);
            let z6 = elevationCache.getElevation(z, x, y, i, j + 1);
            let z8 = elevationCache.getElevation(z, x, y, i + 1, j);

            const hasNoData = [z2, z4, z6, z8].some(v => v <= 0);

            let r, g, b, a = 255;
            if (!hasNoData) {
                let dzdx = 0.2 * (z6 - z4) / 2;
                let dzdy = 0.2 * (z2 - z8) / 2;
                var L = (a1 - a2 * dzdx - a3 * dzdy) / Math.sqrt(1 + dzdx ** 2 + dzdy ** 2);
                if (L < 0) L = 0;
                L = Math.sqrt(L * .8 + .2);
                const [colorR, colorG, colorB] = layer.hillshadeColorFunction(L);
                r = colorR;
                g = colorG;
                b = colorB;
            } else {
                a = 0;
            }

            const pixelIndex = (j * 256 + i) * 4;
            data[pixelIndex] = r;
            data[pixelIndex + 1] = g;
            data[pixelIndex + 2] = b;
            data[pixelIndex + 3] = a;
        }
    }
};

// ====================== INTERNAL SLOPE FUNCTIONS ======================

/**
 * Convert HSV to RGB
 */
const _slopeHsvToRgb = (h, s, v) => {
    while (h < 0) h = h + 360;
    while (h > 360) h = h - 360;

    h = h / 60;
    const c = v * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = v - c;

    let r, g, b;
    if (h >= 0 && h < 1) {
        [r, g, b] = [c, x, 0];
    } else if (h >= 1 && h < 2) {
        [r, g, b] = [x, c, 0];
    } else if (h >= 2 && h < 3) {
        [r, g, b] = [0, c, x];
    } else if (h >= 3 && h < 4) {
        [r, g, b] = [0, x, c];
    } else if (h >= 4 && h < 5) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
        255
    ];
};

/**
 * Default slope-to-color mapping configuration (green to red)
 */
const _defaultSlopeColorConfig = [
    { slope: { min: 0, max: 3 }, h: { min: 120, max: 60 } },    // Green to yellow for flat
    { slope: { min: 3, max: 9 }, h: { min: 60, max: 20 } },     // Yellow to orange for gentle
    { slope: { min: 9, max: 30 }, h: { min: 20, max: -20 } },   // Orange to red for moderate
    { slope: { min: 30, max: 60 }, h: { min: -20, max: -60 } }  // Red for steep
];

/**
 * Predefined slope color schemes
 */
const _slopeColorSchemes = {
    default: _defaultSlopeColorConfig,
    glacial: [
        { slope: { min: 0, max: 5 }, h: { min: 240, max: 200 } },   // Blue to cyan for flat
        { slope: { min: 5, max: 15 }, h: { min: 200, max: 160 } },  // Cyan to light blue
        { slope: { min: 15, max: 30 }, h: { min: 160, max: 120 } }, // Light blue to green
        { slope: { min: 30, max: 60 }, h: { min: 120, max: 60 } },  // Green to yellow
        { slope: { min: 60, max: 90 }, h: { min: 60, max: 0 } }     // Yellow to red for very steep
    ],
    thermal: [
        { slope: { min: 0, max: 10 }, h: { min: 280, max: 320 } },  // Purple to magenta
        { slope: { min: 10, max: 25 }, h: { min: 320, max: 360 } }, // Magenta to red  
        { slope: { min: 25, max: 45 }, h: { min: 0, max: 40 } },    // Red to orange
        { slope: { min: 45, max: 65 }, h: { min: 40, max: 60 } }    // Orange to yellow
    ],
    earth: [
        { slope: { min: 0, max: 5 }, h: { min: 60, max: 40 } },     // Yellow-green to yellow
        { slope: { min: 5, max: 15 }, h: { min: 40, max: 20 } },    // Yellow to orange
        { slope: { min: 15, max: 35 }, h: { min: 20, max: 10 } },   // Orange to brown
        { slope: { min: 35, max: 55 }, h: { min: 10, max: 0 } }     // Brown to red-brown
    ]
};

/**
 * Create a slope color function from HSV configuration
 * @param {Array} colorConfig - Array of slope/hue range mappings
 * @returns {Function} Function that takes slope degrees and returns [r, g, b]
 */
const _createSlopeColorFunction = function(colorConfig) {
    return function(slopeDegrees) {
        // Handle edge case: slope below first range minimum
        if (slopeDegrees < colorConfig[0].slope.min) {
            return _slopeHsvToRgb(colorConfig[0].h.min, 1, 1);
        }
        
        for (let i = 0; i < colorConfig.length; i++) {
            const range = colorConfig[i];
            if (slopeDegrees >= range.slope.min && slopeDegrees <= range.slope.max) {
                const slopeRatio = (slopeDegrees - range.slope.min) / (range.slope.max - range.slope.min);
                const h = range.h.min + slopeRatio * (range.h.max - range.h.min);
                return _slopeHsvToRgb(h, 1, 1);
            }
        }
        
        // Handle edge case: slope above last range maximum
        const lastRange = colorConfig[colorConfig.length - 1];
        return _slopeHsvToRgb(lastRange.h.max, 1, 1);
    };
};

/**
 * Convert tile Y coordinate to latitude
 */
const _tileToLat = (y, z) => {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const _EARTH_CIRCUMFERENCE = 40075017;

/**
 * fillSlopeTile - Renders slope visualization for a single map tile
 */
const _fillSlopeTile = async (data, coords, abortSignal, layer) => {
    const x = coords.x;
    const y = coords.y;
    const z = coords.z;

    const latitude = _tileToLat(y + 0.5, z);
    const metersPerPixelEquator = _EARTH_CIRCUMFERENCE / (256 * Math.pow(2, z));
    const clampedLatitude = Math.max(-89.9, Math.min(89.9, latitude));
    const pixelSizeMeters = Math.max(0.1, metersPerPixelEquator * Math.cos(clampedLatitude * Math.PI / 180));

    const elevationCache = new _ElevationCache(layer.tileCache);
    await elevationCache.init(z, x, y, abortSignal);

    for (let i = 0; i < 256; i++) {
        if (abortSignal && abortSignal.aborted) {
            throw new DOMException('Tile loading aborted', 'AbortError');
        }

        for (let j = 0; j < 256; j++) {
            let z1 = elevationCache.getElevation(z, x, y, i - 1, j - 1);
            let z2 = elevationCache.getElevation(z, x, y, i - 1, j);
            let z3 = elevationCache.getElevation(z, x, y, i - 1, j + 1);
            let z4 = elevationCache.getElevation(z, x, y, i, j - 1);
            let z5 = elevationCache.getElevation(z, x, y, i, j);
            let z6 = elevationCache.getElevation(z, x, y, i, j + 1);
            let z7 = elevationCache.getElevation(z, x, y, i + 1, j - 1);
            let z8 = elevationCache.getElevation(z, x, y, i + 1, j);
            let z9 = elevationCache.getElevation(z, x, y, i + 1, j + 1);

            const hasNoData = [z1, z2, z3, z4, z5, z6, z7, z8, z9].some(v => v <= 0);

            let r, g, b, a = 255;
            if (!hasNoData) {
                const dzdx = ((z3 + 2 * z6 + z9) - (z1 + 2 * z4 + z7)) / (8 * pixelSizeMeters);
                const dzdy = ((z1 + 2 * z2 + z3) - (z7 + 2 * z8 + z9)) / (8 * pixelSizeMeters);
                const slopeDegrees = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI;

                if (slopeDegrees < 0.5) {
                    a = 0;
                } else {
                    const slopeColor = layer.slopeColorFunction(slopeDegrees);
                    r = slopeColor[0];
                    g = slopeColor[1];
                    b = slopeColor[2];
                }
            } else {
                a = 0;
            }

            const pixelIndex = (j * 256 + i) * 4;
            data[pixelIndex] = r;
            data[pixelIndex + 1] = g;
            data[pixelIndex + 2] = b;
            data[pixelIndex + 3] = a;
        }
    }
};

// ====================== MAIN PLUGIN CLASS ======================
L.GridLayer.Relief = L.GridLayer.extend({

    initialize: function(options) {
        // Set global bounds if noWrap is enabled to prevent tile wrapping
        if (options && options.noWrap && !options.bounds) {
            options.bounds = [[-90,-180],[90,180]];
        }
        
        L.GridLayer.prototype.initialize.call(this, options);

        // Select rendering mode: 'hillshade' or 'slope'
        this.mode = (options && options.mode) || 'hillshade';

        // Configure hillshade parameters (only used in hillshade mode)
        this.azimuth = (options && typeof options.azimuth === 'number') ? options.azimuth : 315;
        this.elevation = (options && typeof options.elevation === 'number') ? options.elevation : 45;
        this.hillshadeColorFunction = (options && options.hillshadeColorFunction) || _defaultHillshadeColorFunction;

        // Configure slope color function (only used in slope mode) - XOR priority
        if (options && options.slopeColorFunction) {
            this.slopeColorFunction = options.slopeColorFunction;
        } else if (options && options.slopeColorConfig) {
            this.slopeColorFunction = _createSlopeColorFunction(options.slopeColorConfig);
        } else if (options && options.slopeColorScheme) {
            const scheme = _slopeColorSchemes[options.slopeColorScheme] || _slopeColorSchemes.default;
            this.slopeColorFunction = _createSlopeColorFunction(scheme);
        } else {
            this.slopeColorFunction = _createSlopeColorFunction(_defaultSlopeColorConfig);
        }

        // Create tile cache with custom options
        this.tileCache = new _TileCache({
            maxCacheSize: (options && options.maxCacheSize) || 50,
            elevationUrl: (options && options.elevationUrl) || _defaultElevationUrl,
            elevationExtractor: (options && options.elevationExtractor) || _defaultElevationExtractor
        });

        // Assign the appropriate rendering function based on mode
        // These functions are defined internally above
        if (this.mode === 'hillshade') {
            this.fillTile = _fillHillshadeTile;
        } else {
            this.fillTile = _fillSlopeTile;
        }

        // Track abort controllers for cancelling in-flight tile requests
        // This prevents memory leaks when tiles are unloaded before loading completes
        this.abortControllers = new Map();

        // Listen for tile unload events to clean up pending requests
        this.on('tileunload', function(e) {
            this.tileUnloaded(e.coords);
        });
    },

    /**
     * Clean up when a tile is unloaded (e.g., when panning away)
     * Aborts any pending HTTP requests for elevation data to prevent memory leaks
     */
    tileUnloaded: function(coords) {
        const tileKey = `${coords.z}/${coords.x}/${coords.y}`;
        if (this.abortControllers.has(tileKey)) {
            const abortController = this.abortControllers.get(tileKey);
            // Cancel the pending request
            abortController.abort();
            this.abortControllers.delete(tileKey);
        }
    },

    /**
     * Create a single map tile - called by Leaflet for each visible tile
     * @param {Object} coords - Tile coordinates {x, y, z} where z is zoom level
     * @param {Function} done - Callback to call when tile is ready
     * @returns {HTMLCanvasElement} The canvas element for this tile
     */
    createTile: function(coords, done) {
        const tileKey = `${coords.z}/${coords.x}/${coords.y}`;

        // Create a 256x256 canvas for this tile
        var tile = document.createElement('canvas');
        tile.setAttribute('width', 256);
        tile.setAttribute('height', 256);

        var ctx = tile.getContext('2d');

        // Create an ImageData object to manipulate pixels directly
        // This is more efficient than drawing operations for pixel-by-pixel rendering
        const imageData = ctx.createImageData(256, 256);

        // Create an abort controller for this tile's async operations
        const abortController = new AbortController();
        this.abortControllers.set(tileKey, abortController);

        // Asynchronously fill the tile with terrain visualization
        (async () => {
            try {
                // Call the mode-specific rendering function (hillshade or slope)
                // This will fetch elevation data and calculate colors for each pixel
                await this.fillTile(imageData.data, coords, abortController.signal, this);

                // Only render if the request wasn't aborted
                if (!abortController.signal.aborted) {
                    // Put the processed pixel data onto the canvas
                    ctx.putImageData(imageData, 0, 0);
                    // Notify Leaflet that the tile is ready
                    done(null, tile);
                }
            } catch (error) {
                // Ignore abort errors (these are expected when panning)
                if (error.name !== 'AbortError') {
                    console.error(`Error loading tile ${tileKey}:`, error);
                }
            } finally {
                // Clean up the abort controller
                this.abortControllers.delete(tileKey);
            }
        })();

        // Return the canvas immediately (it will be filled asynchronously)
        return tile;
    },

    /**
     * Set azimuth angle for hillshade lighting and redraw tiles
     * @param {number} azimuth - Azimuth angle in degrees (0-360)
     */
    setAzimuth: function(azimuth) {
        if (typeof azimuth === 'number' && azimuth >= 0 && azimuth <= 360) {
            this.azimuth = azimuth;
            if (this.mode === 'hillshade') {
                this.redraw();
            }
        }
        return this;
    },

    /**
     * Set elevation angle for hillshade lighting and redraw tiles
     * @param {number} elevation - Elevation angle in degrees (0-90)
     */
    setElevation: function(elevation) {
        if (typeof elevation === 'number' && elevation >= 0 && elevation <= 90) {
            this.elevation = elevation;
            if (this.mode === 'hillshade') {
                this.redraw();
            }
        }
        return this;
    },

    /**
     * Get current azimuth angle
     * @returns {number} Current azimuth in degrees
     */
    getAzimuth: function() {
        return this.azimuth;
    },

    /**
     * Get current elevation angle
     * @returns {number} Current elevation in degrees
     */
    getElevation: function() {
        return this.elevation;
    },

    /**
     * Set both azimuth and elevation angles and redraw tiles
     * @param {number} azimuth - Azimuth angle in degrees (0-360)
     * @param {number} elevation - Elevation angle in degrees (0-90)
     */
    setSunPosition: function(azimuth, elevation) {
        let needsRedraw = false;
        
        if (typeof azimuth === 'number' && azimuth >= 0 && azimuth <= 360) {
            this.azimuth = azimuth;
            needsRedraw = true;
        }
        
        if (typeof elevation === 'number' && elevation >= 0 && elevation <= 90) {
            this.elevation = elevation;
            needsRedraw = true;
        }
        
        if (needsRedraw && this.mode === 'hillshade') {
            this.redraw();
        }
        
        return this;
    }
});

/**
 * Factory function for creating relief layers
 * @param {Object} options - Layer options
 * @returns {L.GridLayer.Relief} New relief layer instance
 */
L.gridLayer.relief = function(options) {
    return new L.GridLayer.Relief(options);
};

/**
 * Predefined elevation extractors for common formats
 */
L.GridLayer.Relief.elevationExtractors = {
    terrarium: _defaultElevationExtractor,
    mapbox: _mapboxElevationExtractor,
    custom: function(extractorFn) {
        return extractorFn;
    }
};

})();
