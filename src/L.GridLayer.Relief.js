(function () {
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

    const _EARTH_CIRCUMFERENCE = 40075017;
    const TILE_SIZE = 256;
    const RGBA_EMPTY = [0, 0, 0, 0];

    // ====================== CANVAS POOL MANAGEMENT ======================

    /**
     * Internal canvas pool for DEM tile fetching
     * Grows unbounded during usage, trims to idle size after timeout
     * @namespace _canvasPool
     */
    const _canvasPool = {
        /** @type {HTMLCanvasElement[]} Available canvas elements */
        available: [],
        /** @type {number} Target pool size when idle */
        idleSize: 5,
        /** @type {number} Timeout before trimming pool (ms) */
        idleTimeout: 30000, // 30 seconds
        /** @type {number|null} Timer ID for idle trimming */
        idleTimer: null,

        /**
         * Acquire a canvas from the pool
         * @returns {HTMLCanvasElement} Canvas element
         */
        acquire() {
            let canvas = this.available.pop();
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.width = TILE_SIZE;
                canvas.height = TILE_SIZE;
            }
            this._resetIdleTimer();
            return canvas;
        },

        /**
         * Release a canvas back to the pool
         * @param {HTMLCanvasElement} canvas - Canvas to return to pool
         */
        release(canvas) {
            if (canvas) {
                this.available.push(canvas);
                this._resetIdleTimer();
            }
        },

        /**
         * Reset the idle timer for pool trimming
         * @private
         */
        _resetIdleTimer() {
            if (this.idleTimer) {
                clearTimeout(this.idleTimer);
            }
            this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
        },

        /**
         * Trim pool to idle size
         * @private
         */
        _trim() {
            // Trim pool to idle size
            while (this.available.length > this.idleSize) {
                this.available.pop();
            }
        },
    };

    // ====================== ELEVATION SOURCE ======================

    /**
     * Default elevation tile URL pattern (AWS Terrarium)
     * @param {number} z - Zoom level
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @returns {string} Tile URL
     */
    const _defaultElevationUrl = function (z, x, y) {
        return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    };

    /**
     * Default Terrarium elevation extraction function
     * @param {number} r - Red channel value (0-255)
     * @param {number} g - Green channel value (0-255)
     * @param {number} b - Blue channel value (0-255)
     * @param {number} _a - Alpha channel value (0-255) - unused in Terrarium format
     * @returns {number} Elevation in meters
     */
    const _defaultElevationExtractor = function (r, g, b, _a) {
        return r * 256 + g + b / 256 - 32768;
    };

    /**
     * Mapbox Terrain-RGB elevation extraction function
     * @param {number} r - Red channel value (0-255)
     * @param {number} g - Green channel value (0-255)
     * @param {number} b - Blue channel value (0-255)
     * @param {number} _a - Alpha channel value (0-255) - unused
     * @returns {number} Elevation in meters
     */
    const _mapboxElevationExtractor = function (r, g, b, _a) {
        return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
    };

    /**
     * Calculate horizontal gradient (dz/dx) using Horn's method
     * @param {number[]} z - 3x3 elevation array from _getZ
     * @param {number} divider - Pixel size scaling factor in meters
     * @returns {number} Horizontal gradient
     */
    const _getDzdx = function (z, divider) {
        return (z[2] + 2 * z[5] + z[8] - (z[0] + 2 * z[3] + z[6])) / (8 * divider);
    };

    /**
     * Calculate vertical gradient (dz/dy) using Horn's method
     * @param {number[]} z - 3x3 elevation array from _getZ
     * @param {number} divider - Pixel size scaling factor in meters
     * @returns {number} Vertical gradient
     */
    const _getDzdy = function (z, divider) {
        return (z[0] + 2 * z[1] + z[2] - (z[6] + 2 * z[7] + z[8])) / (8 * divider);
    };

    // ====================== INTERNAL HILLSHADE FUNCTIONS ======================

    /**
     * Calculate hillshade light intensity using surface normal dot product
     * @param {number[]} z - 3x3 elevation array from _getZ
     * @param {number} a1 - Precomputed sin(elevation) constant
     * @param {number} a2 - Precomputed cos(elevation) * sin(azimuth) constant
     * @param {number} a3 - Precomputed cos(elevation) * cos(azimuth) constant
     * @returns {number} Light intensity (0-1)
     */
    const _getL = function (z, a1, a2, a3) {
        const dzdx = _getDzdx(z, 5);
        const dzdy = _getDzdy(z, 5);
        let L = (a1 - a2 * dzdx - a3 * dzdy) / Math.sqrt(1 + dzdx ** 2 + dzdy ** 2);
        if (L < 0) {
            L = 0;
        }
        L = Math.sqrt(L * 0.8 + 0.2);
        return L;
    };

    /**
     * Default hillshade color function (grayscale)
     * @param {number} intensity - Light intensity (0-1)
     * @returns {Array} RGB values [r, g, b]
     */
    const _defaultHillshadeColorFunction = function (intensity) {
        const value = Math.round(intensity * 255);
        return [value, value, value];
    };

    // ====================== INTERNAL SLOPE FUNCTIONS ======================

    /**
     * Calculate pixel size in meters for latitude correction
     * @param {number} y - Tile Y coordinate
     * @param {number} z - Zoom level
     * @returns {number} Pixel size in meters at this latitude
     */
    const _pixelSizeMeters = function (y, z) {
        const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
        const latitude = Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        const metersPerPixelEquator = _EARTH_CIRCUMFERENCE / (TILE_SIZE * Math.pow(2, z));
        const clampedLatitude = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, latitude));
        return Math.max(0.1, metersPerPixelEquator * Math.cos(clampedLatitude));
    };

    /**
     * Calculate slope in degrees using Horn's method
     * @param {number[]} z - 3x3 elevation array from _getZ
     * @param {number} pixelSizeMeters - Pixel size scaling factor
     * @returns {number} Slope angle in degrees
     */
    const _getSlope = function (z, pixelSizeMeters) {
        const dzdx = _getDzdx(z, pixelSizeMeters);
        const dzdy = _getDzdy(z, pixelSizeMeters);
        const slopeDegrees = (Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180) / Math.PI;
        return slopeDegrees;
    };

    /**
     * Convert HSV color values to RGB
     * @param {number} h - Hue (0-360 degrees)
     * @param {number} s - Saturation (0-1)
     * @param {number} v - Value/brightness (0-1)
     * @returns {number[]} RGBA array [r, g, b, a]
     */
    const _slopeHsvToRgb = (h, s, v) => {
        while (h < 0) {
            h = h + 360;
        }
        while (h > 360) {
            h = h - 360;
        }

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
            255,
        ];
    };

    /**
     * Default slope-to-color mapping configuration (green to red)
     * Each entry maps a slope range to a hue range for smooth color transitions
     * @type {Array<{slope: {min: number, max: number}, h: {min: number, max: number}}>}
     */
    const _defaultSlopeColorConfig = [
        { slope: { min: 0, max: 3 }, h: { min: 120, max: 60 } }, // Green to yellow for flat
        { slope: { min: 3, max: 9 }, h: { min: 60, max: 20 } }, // Yellow to orange for gentle
        { slope: { min: 9, max: 30 }, h: { min: 20, max: -20 } }, // Orange to red for moderate
        { slope: { min: 30, max: 60 }, h: { min: -20, max: -60 } }, // Red for steep
    ];

    /**
     * Predefined slope color schemes
     * @type {Object<string, Array>} Named color schemes with slope-to-hue mappings
     */
    const _slopeColorSchemes = {
        default: _defaultSlopeColorConfig,
        glacial: [
            { slope: { min: 0, max: 5 }, h: { min: 240, max: 200 } }, // Blue to cyan for flat
            { slope: { min: 5, max: 15 }, h: { min: 200, max: 160 } }, // Cyan to light blue
            { slope: { min: 15, max: 30 }, h: { min: 160, max: 120 } }, // Light blue to green
            { slope: { min: 30, max: 60 }, h: { min: 120, max: 60 } }, // Green to yellow
            { slope: { min: 60, max: 90 }, h: { min: 60, max: 0 } }, // Yellow to red for very steep
        ],
        thermal: [
            { slope: { min: 0, max: 10 }, h: { min: 280, max: 320 } }, // Purple to magenta
            { slope: { min: 10, max: 25 }, h: { min: 320, max: 360 } }, // Magenta to red
            { slope: { min: 25, max: 45 }, h: { min: 0, max: 40 } }, // Red to orange
            { slope: { min: 45, max: 65 }, h: { min: 40, max: 60 } }, // Orange to yellow
        ],
        earth: [
            { slope: { min: 0, max: 5 }, h: { min: 60, max: 40 } }, // Yellow-green to yellow
            { slope: { min: 5, max: 15 }, h: { min: 40, max: 20 } }, // Yellow to orange
            { slope: { min: 15, max: 35 }, h: { min: 20, max: 10 } }, // Orange to brown
            { slope: { min: 35, max: 55 }, h: { min: 10, max: 0 } }, // Brown to red-brown
        ],
    };

    /**
     * Create a slope color function from HSV configuration
     * @param {Array} colorConfig - Array of slope/hue range mappings
     * @returns {Function} Function that takes slope degrees and returns [r, g, b]
     */
    const _createSlopeColorFunction = function (colorConfig) {
        return function (slopeDegrees) {
            // Handle edge case: slope below first range minimum
            if (slopeDegrees < colorConfig[0].slope.min) {
                return _slopeHsvToRgb(colorConfig[0].h.min, 1, 1);
            }

            for (let i = 0; i < colorConfig.length; i++) {
                const range = colorConfig[i];
                if (slopeDegrees >= range.slope.min && slopeDegrees <= range.slope.max) {
                    const slopeRatio =
                        (slopeDegrees - range.slope.min) / (range.slope.max - range.slope.min);
                    const h = range.h.min + slopeRatio * (range.h.max - range.h.min);
                    return _slopeHsvToRgb(h, 1, 1);
                }
            }

            // Handle edge case: slope above last range maximum
            const lastRange = colorConfig[colorConfig.length - 1];
            return _slopeHsvToRgb(lastRange.h.max, 1, 1);
        };
    };

    // ====================== MAIN PLUGIN CLASS ======================

    /**
     * L.GridLayer.Relief - Main plugin class for terrain visualization
     * Extends Leaflet's GridLayer to render elevation data as hillshade or slope overlays
     *
     * @class L.GridLayer.Relief
     * @extends L.GridLayer
     */
    L.GridLayer.Relief = L.GridLayer.extend({
        options: {
            attribution:
                '&copy; <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Mapzen Elevation</a>',
        },

        /**
         * Initialize the Relief layer with options
         * @param {Object} options - Configuration options
         * @param {string} [options.mode='hillshade'] - Rendering mode: 'hillshade' or 'slope'
         * @param {number} [options.azimuth=315] - Sun azimuth angle (0-360 degrees)
         * @param {number} [options.elevation=45] - Sun elevation angle (0-90 degrees)
         * @param {Function} [options.hillshadeColorFunction] - Custom hillshade color function
         * @param {Function} [options.slopeColorFunction] - Custom slope color function
         * @param {Array} [options.slopeColorConfig] - HSV slope color configuration
         * @param {string} [options.slopeColorScheme] - Named slope color scheme
         * @param {string|Function} [options.elevationUrl] - URL template or function for elevation tiles
         * @param {Function} [options.elevationExtractor] - Elevation extraction function
         * @param {boolean} [options.noWrap] - Prevent tile wrapping beyond world bounds
         */
        initialize: function (options) {
            // Set global bounds if noWrap is enabled to prevent tile wrapping
            if (options && options.noWrap && !options.bounds) {
                options.bounds = [
                    [-90, -180],
                    [90, 180],
                ];
            }

            L.GridLayer.prototype.initialize.call(this, options);

            // Select rendering mode: 'hillshade' or 'slope'
            this.mode = (options && options.mode) || 'hillshade';

            // Configure hillshade parameters (only used in hillshade mode)
            this.azimuth = options && typeof options.azimuth === 'number' ? options.azimuth : 315;
            this.elevation =
                options && typeof options.elevation === 'number' ? options.elevation : 45;
            this._recomputeHillshadeConstants();
            this.hillshadeColorFunction =
                (options && options.hillshadeColorFunction) || _defaultHillshadeColorFunction;

            // Configure slope color function (only used in slope mode) - XOR priority
            if (options && options.slopeColorFunction) {
                this.slopeColorFunction = options.slopeColorFunction;
            } else if (options && options.slopeColorConfig) {
                this.slopeColorFunction = _createSlopeColorFunction(options.slopeColorConfig);
            } else if (options && options.slopeColorScheme) {
                const scheme =
                    _slopeColorSchemes[options.slopeColorScheme] || _slopeColorSchemes.default;
                this.slopeColorFunction = _createSlopeColorFunction(scheme);
            } else {
                this.slopeColorFunction = _createSlopeColorFunction(_defaultSlopeColorConfig);
            }

            ((this.elevationUrl = (options && options.elevationUrl) || _defaultElevationUrl),
                (this.elevationExtractor =
                    (options && options.elevationExtractor) || _defaultElevationExtractor));

            // Assign the appropriate rendering function based on mode
            if (this.mode === 'hillshade') {
                this.fillTile = this._fillHillshadeTile.bind(this);
            } else {
                this.fillTile = this._fillSlopeTile.bind(this);
            }

            // Track abort controllers for cancelling in-flight tile requests
            // This prevents memory leaks when tiles are unloaded before loading completes
            this.abortControllers = new Map();

            // Listen for tile unload events to clean up pending requests
            this.on('tileunload', function (e) {
                this.tileUnloaded(e.coords);
            });
        },

        /**
         * Recompute hillshade lighting constants based on current sun position
         * @private
         */
        _recomputeHillshadeConstants() {
            const alpha = (Math.PI / 180) * this.azimuth;
            const beta = (Math.PI / 180) * this.elevation;
            this._hillshadeA1 = Math.sin(beta);
            this._hillshadeA2 = Math.cos(beta) * Math.sin(alpha);
            this._hillshadeA3 = Math.cos(beta) * Math.cos(alpha);
        },

        /**
         * Extract elevation from RGBA pixel data
         * @param {Uint8ClampedArray} tileData - Tile pixel data
         * @param {number} j - Pixel column
         * @param {number} i - Pixel row
         * @returns {number} Elevation in meters
         */
        _getElevation: function (tileData, j, i) {
            const pixelIndex = (i * TILE_SIZE + j) * 4;
            const r = tileData[pixelIndex];
            const g = tileData[pixelIndex + 1];
            const b = tileData[pixelIndex + 2];
            const a = tileData[pixelIndex + 3];
            return this.elevationExtractor(r, g, b, a);
        },

        /**
         * Get 3x3 elevation grid around pixel using Horn's method with edge clamping
         * @private
         * @param {Uint8ClampedArray} tileData - Tile pixel data
         * @param {number} i - Pixel row
         * @param {number} j - Pixel column
         * @returns {number[]} Array of 9 elevation values in 3x3 grid
         */
        _getZ: function (tileData, i, j) {
            // Clamp coordinates to valid tile boundaries (1-254) to avoid edge pixels
            if (i <= 0 || j <= 0 || i >= TILE_SIZE - 1 || j >= TILE_SIZE - 1) {
                const clampedI = Math.max(1, Math.min(i, TILE_SIZE - 2));
                const clampedJ = Math.max(1, Math.min(j, TILE_SIZE - 2));
                return this._getZ(tileData, clampedI, clampedJ);
            }

            // Return 3x3 elevation grid using Horn's method for gradient calculation
            return [
                this._getElevation(tileData, i - 1, j - 1),
                this._getElevation(tileData, i - 1, j),
                this._getElevation(tileData, i - 1, j + 1),
                this._getElevation(tileData, i, j - 1),
                this._getElevation(tileData, i, j),
                this._getElevation(tileData, i, j + 1),
                this._getElevation(tileData, i + 1, j - 1),
                this._getElevation(tileData, i + 1, j),
                this._getElevation(tileData, i + 1, j + 1),
            ];
        },

        /**
         * Generic tile filling function for both hillshade and slope modes
         * @private
         * @param {Uint8ClampedArray} data - Canvas image data array
         * @param {Uint8ClampedArray} tileData - Elevation tile data
         * @param {Function} colorFunction - Function to compute color from elevation grid
         * @param {AbortSignal} abortSignal - Abort signal for canceling operation
         */
        _fillTile: function (data, tileData, colorFunction, abortSignal) {
            // Main rendering loop
            for (let i = 0; i < TILE_SIZE; i++) {
                if (abortSignal && abortSignal.aborted) {
                    throw new DOMException('Tile loading aborted', 'AbortError');
                }

                for (let j = 0; j < TILE_SIZE; j++) {
                    // Get 3x3 elevation grid using Horn's method
                    const zData = this._getZ(tileData, i, j);

                    const hasNoData = zData.some(v => v <= 0);

                    let rgba = null;
                    if (!hasNoData) {
                        rgba = colorFunction(zData);
                    } else {
                        rgba = RGBA_EMPTY;
                    }

                    const pixelIndex = (j * TILE_SIZE + i) * 4;
                    data[pixelIndex] = rgba[0];
                    data[pixelIndex + 1] = rgba[1];
                    data[pixelIndex + 2] = rgba[2];
                    data[pixelIndex + 3] = rgba[3];
                }
            }
        },

        /**
         * Render hillshade effect for a single map tile
         * @private
         * @param {Uint8ClampedArray} data - Canvas image data array
         * @param {Uint8ClampedArray} tileData - Elevation tile data
         * @param {Object} _coords - Tile coordinates {x, y, z} - unused in hillshade mode
         * @param {AbortSignal} abortSignal - Abort signal for canceling operation
         */
        _fillHillshadeTile: function (data, tileData, _coords, abortSignal) {
            this._fillTile(
                data,
                tileData,
                zData => {
                    const L = _getL(zData, this._hillshadeA1, this._hillshadeA2, this._hillshadeA3);
                    const [colorR, colorG, colorB] = this.hillshadeColorFunction(L);
                    return [colorR, colorG, colorB, 255];
                },
                abortSignal
            );
        },

        /**
         * Render slope visualization for a single map tile
         * @private
         * @param {Uint8ClampedArray} data - Canvas image data array
         * @param {Uint8ClampedArray} tileData - Elevation tile data
         * @param {Object} coords - Tile coordinates {x, y, z}
         * @param {AbortSignal} abortSignal - Abort signal for canceling operation
         */
        _fillSlopeTile: function (data, tileData, coords, abortSignal) {
            const y = coords.y;
            const z = coords.z;

            const pixelSizeMeters = _pixelSizeMeters(y, z);

            this._fillTile(
                data,
                tileData,
                zData => {
                    const slopeDegrees = _getSlope(zData, pixelSizeMeters);
                    if (slopeDegrees < 0.5) {
                        return RGBA_EMPTY;
                    } else {
                        const slopeColor = this.slopeColorFunction(slopeDegrees);
                        return [slopeColor[0], slopeColor[1], slopeColor[2], 255];
                    }
                },
                abortSignal
            );
        },

        /**
         * Clean up when a tile is unloaded (e.g., when panning away)
         * Aborts any pending HTTP requests for elevation data to prevent memory leaks
         * @param {Object} coords - Tile coordinates {x, y, z}
         */
        tileUnloaded: function (coords) {
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
        createTile: function (coords, done) {
            const x = coords.x;
            const y = coords.y;
            const z = coords.z;
            const tileKey = `${z}/${x}/${y}`;

            // Create a canvas for this tile
            const tile = document.createElement('canvas');
            tile.setAttribute('width', TILE_SIZE);
            tile.setAttribute('height', TILE_SIZE);

            const ctx = tile.getContext('2d');

            // Create an ImageData object to manipulate pixels directly
            // This is more efficient than drawing operations for pixel-by-pixel rendering
            const imageData = ctx.createImageData(256, 256);

            // Create an abort controller for this tile's async operations
            const abortController = new AbortController();
            this.abortControllers.set(tileKey, abortController);

            const url =
                typeof this.elevationUrl === 'function'
                    ? this.elevationUrl(z, x, y)
                    : this.elevationUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);

            // Asynchronously fill the tile with terrain visualization
            (async () => {
                // Declare variables outside try block for cleanup in finally
                let demBitmap = null;
                let demCanvas = null;
                let demCtx = null;

                try {
                    // Acquire canvas from pool
                    demCanvas = _canvasPool.acquire();
                    demCtx = demCanvas.getContext('2d', { willReadFrequently: true });

                    const demResponse = await fetch(url, { signal: abortController.signal });
                    if (!demResponse.ok) {
                        throw new Error(`Failed to fetch tile: ${demResponse.status}`);
                    }

                    const demBlob = await demResponse.blob();
                    demBitmap = await createImageBitmap(demBlob);

                    demCtx.drawImage(demBitmap, 0, 0);

                    const demImageData = demCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
                    const demTileData = demImageData.data;

                    // Call the mode-specific rendering function (hillshade or slope)
                    // This will fetch elevation data and calculate colors for each pixel
                    await this.fillTile(
                        imageData.data,
                        demTileData,
                        coords,
                        abortController.signal
                    );

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

                    // Free DEM-related memory
                    if (demBitmap) {
                        demBitmap.close();
                    }

                    // Release canvas back to pool
                    if (demCanvas) {
                        _canvasPool.release(demCanvas);
                    }
                }
            })();

            // Return the canvas immediately (it will be filled asynchronously)
            return tile;
        },

        /**
         * Set azimuth angle for hillshade lighting and redraw tiles
         * @param {number} azimuth - Azimuth angle in degrees (0-360)
         */
        setAzimuth: function (azimuth) {
            if (typeof azimuth === 'number' && azimuth >= 0 && azimuth <= 360) {
                this.azimuth = azimuth;
                this._recomputeHillshadeConstants();
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
        setElevation: function (elevation) {
            if (typeof elevation === 'number' && elevation >= 0 && elevation <= 90) {
                this.elevation = elevation;
                this._recomputeHillshadeConstants();
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
        getAzimuth: function () {
            return this.azimuth;
        },

        /**
         * Get current elevation angle
         * @returns {number} Current elevation in degrees
         */
        getElevation: function () {
            return this.elevation;
        },

        /**
         * Set both azimuth and elevation angles and redraw tiles
         * @param {number} azimuth - Azimuth angle in degrees (0-360)
         * @param {number} elevation - Elevation angle in degrees (0-90)
         */
        setSunPosition: function (azimuth, elevation) {
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
                this._recomputeHillshadeConstants();
                this.redraw();
            }

            return this;
        },
    });

    /**
     * Factory function for creating relief layers
     * @param {Object} options - Layer options
     * @returns {L.GridLayer.Relief} New relief layer instance
     */
    L.gridLayer.relief = function (options) {
        return new L.GridLayer.Relief(options);
    };

    /**
     * Predefined elevation extractors for common formats
     */
    L.GridLayer.Relief.elevationExtractors = {
        terrarium: _defaultElevationExtractor,
        mapbox: _mapboxElevationExtractor,
    };
})();
