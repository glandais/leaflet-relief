
/**
 * Convert HSV (Hue, Saturation, Value) color to RGB
 *
 * This is used to generate colors for slope visualization where:
 * - Hue represents the slope angle (green for flat, red for steep)
 * - Saturation is always 1 for vivid colors
 * - Value is always 1 for full brightness
 *
 * @param {number} h - Hue in degrees (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} v - Value/brightness (0-1)
 * @returns {Array} RGBA color array [r, g, b, a]
 */
const slopeHsvToRgb = (h, s, v) => {
    // Normalize hue to 0-360 range
    while (h < 0) {
        h = h + 360
    }
    while (h > 360) {
        h = h - 360
    }

    // Convert to 0-6 range for calculation
    h = h / 60;

    // HSV to RGB conversion algorithm
    const c = v * s;  // Chroma
    const x = c * (1 - Math.abs((h % 2) - 1));  // Intermediate value
    const m = v - c;  // Match value for brightness

    let r, g, b;

    // Determine RGB based on which 60° sector of the color wheel we're in
    if (h >= 0 && h < 1) {
        [r, g, b] = [c, x, 0];  // Red to Yellow
    } else if (h >= 1 && h < 2) {
        [r, g, b] = [x, c, 0];  // Yellow to Green
    } else if (h >= 2 && h < 3) {
        [r, g, b] = [0, c, x];  // Green to Cyan
    } else if (h >= 3 && h < 4) {
        [r, g, b] = [0, x, c];  // Cyan to Blue
    } else if (h >= 4 && h < 5) {
        [r, g, b] = [x, 0, c];  // Blue to Magenta
    } else {
        [r, g, b] = [c, 0, x];  // Magenta to Red
    }

    // Convert to 0-255 range and add brightness adjustment
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
        255  // Full opacity
    ];
}

/**
 * Slope-to-color mapping configuration
 *
 * Defines color gradients for different slope ranges:
 * - 0-3°: Green (120°) to Yellow-green (60°) - Easy terrain
 * - 3-9°: Yellow-green (60°) to Yellow (20°) - Moderate terrain
 * - 9-30°: Yellow (20°) to Orange (-20°) - Steep terrain
 * - 30-60°: Orange (-20°) to Red (-60°) - Very steep terrain
 * - >60°: Red (-60°) - Extreme/cliff terrain
 *
 * Negative slopes (invalid) are shown as green
 */
const slopeH = [
    {
        slope: {
            min : -1000,  // Invalid negative slopes
            max : 0
        },
        h: {
            min : 120,    // Green
            max : 120
        }
    },
    {
        slope: {
            min : 0,      // Flat to gentle
            max : 3
        },
        h: {
            min : 120,    // Green
            max : 60      // Yellow-green
        }
    },
    {
        slope: {
            min : 3,      // Gentle to moderate
            max : 9
        },
        h: {
            min : 60,     // Yellow-green
            max : 20      // Yellow
        }
    },
    {
        slope: {
            min : 9,      // Moderate to steep
            max : 30
        },
        h: {
            min : 20,     // Yellow
            max : -20     // Orange (340° in 0-360 scale)
        }
    },
    {
        slope: {
            min : 30,     // Steep to very steep
            max : 60
        },
        h: {
            min : -20,    // Orange
            max : -60     // Red (300° in 0-360 scale)
        }
    },
    {
        slope: {
            min : 60,     // Extreme/cliff
            max : 1000
        },
        h: {
            min : -60,    // Red
            max : -60
        }
    }
]

/**
 * Get RGB color for a given slope angle
 *
 * Maps slope angles to colors using the gradient ranges defined above.
 * Interpolates colors within each range for smooth transitions.
 *
 * @param {number} slopeDegrees - Slope angle in degrees
 * @returns {Array} RGBA color array
 */
const getColorForSlope = (slopeDegrees) => {
    // Find the appropriate range in slopeH array
    for (let i = 0; i < slopeH.length; i++) {
        const range = slopeH[i];

        if (slopeDegrees >= range.slope.min && slopeDegrees <= range.slope.max) {
            // Calculate position within this range (0 to 1)
            const slopeRatio = (slopeDegrees - range.slope.min) / (range.slope.max - range.slope.min);
            // Interpolate hue value based on position
            const h = range.h.min + slopeRatio * (range.h.max - range.h.min);
            // Convert to RGB with full saturation and brightness
            return slopeHsvToRgb(h, 1, 1);
        }
    }
    // Default to green if no range matches
    return slopeHsvToRgb(120, 1, 1);
}

/**
 * Convert tile Y coordinate to latitude
 *
 * Web Mercator projection formula to get latitude from tile coordinates.
 * Tiles use an inverted Y axis (0 at top), so we need this conversion.
 *
 * @param {number} y - Tile Y coordinate
 * @param {number} z - Zoom level
 * @returns {number} Latitude in degrees
 */
const tileToLat = (y, z) => {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

// Earth's circumference at the equator in meters (WGS84 ellipsoid)
const EARTH_CIRCUMFERENCE = 40075017

/**
 * fillSlopeTile - Renders slope visualization for a single map tile
 *
 * Calculates terrain slope (steepness) at each pixel and colors it according
 * to a gradient from green (flat) through yellow and orange to red (steep).
 *
 * Uses the Horn method for slope calculation, which considers 8 neighboring
 * pixels for more accurate gradient estimation than simple 4-neighbor methods.
 *
 * @param {Uint8ClampedArray} data - RGBA pixel data array to fill (256x256x4)
 * @param {Object} coords - Tile coordinates {x, y, z}
 * @param {AbortSignal} abortSignal - Signal to cancel rendering if tile is unloaded
 */
const fillSlopeTile = async (data, coords, abortSignal) => {
    const x = coords.x
    const y = coords.y
    const z = coords.z

    // Calculate the latitude of the tile center for accurate distance calculations
    const latitude = tileToLat(y + 0.5, z)

    // Calculate pixel size in meters, accounting for latitude
    // Pixels are smaller (in meters) at higher latitudes due to meridian convergence
    const metersPerPixelEquator = EARTH_CIRCUMFERENCE / (256 * Math.pow(2, z))
    // Prevent division by zero at poles by clamping latitude
    const clampedLatitude = Math.max(-89.9, Math.min(89.9, latitude))
    // Adjust pixel size for latitude using cosine correction
    const pixelSizeMeters = Math.max(0.1, metersPerPixelEquator * Math.cos(clampedLatitude * Math.PI / 180))

    // Pre-load elevation data for this tile and its neighbors
    const elevationCache = new ElevationCache()
    await elevationCache.init(z, x, y, abortSignal)

    // Process each pixel in the 256x256 tile
    for (let i = 0; i < 256; i++) {
        // Check abort signal periodically (every row) to stop if tile is unloaded
        if (abortSignal && abortSignal.aborted) {
            throw new DOMException('Tile loading aborted', 'AbortError');
        }

        for (let j = 0; j < 256; j++) {
            // Horn's method: Get elevation of 8 surrounding pixels
            // This 3x3 kernel provides more accurate slope calculation than 4-neighbor methods
            //
            // Pixel layout:
            // z1  z2  z3
            // z4  z5  z6
            // z7  z8  z9

            let z1 = elevationCache.getElevation(z, x, y, i - 1, j - 1) // Northwest
            let z2 = elevationCache.getElevation(z, x, y, i - 1, j)     // North
            let z3 = elevationCache.getElevation(z, x, y, i - 1, j + 1) // Northeast
            let z4 = elevationCache.getElevation(z, x, y, i, j - 1)     // West
            let z5 = elevationCache.getElevation(z, x, y, i, j)         // Center (current pixel)
            let z6 = elevationCache.getElevation(z, x, y, i, j + 1)     // East
            let z7 = elevationCache.getElevation(z, x, y, i + 1, j - 1) // Southwest
            let z8 = elevationCache.getElevation(z, x, y, i + 1, j)     // South
            let z9 = elevationCache.getElevation(z, x, y, i + 1, j + 1) // Southeast

            // Check for invalid elevation data (water bodies or missing data)
            const hasNoData = [z1, z2, z3, z4, z5, z6, z7, z8, z9].some(v => v <= 0)

            let r, g, b, a = 255
            if (!hasNoData) {
                // Horn's method for slope calculation
                // Weights: corners = 1, edges = 2, giving more importance to cardinal directions
                // Division by 8 normalizes the weighted sum
                // Division by pixelSizeMeters converts elevation difference to slope

                // East-West gradient (change in elevation per meter in X direction)
                const dzdx = ((z3 + 2 * z6 + z9) - (z1 + 2 * z4 + z7)) / (8 * pixelSizeMeters)
                // North-South gradient (change in elevation per meter in Y direction)
                const dzdy = ((z1 + 2 * z2 + z3) - (z7 + 2 * z8 + z9)) / (8 * pixelSizeMeters)

                // Calculate slope magnitude using Pythagorean theorem
                // atan converts rise/run ratio to angle in radians
                // Multiply by 180/π to convert to degrees
                const slopeDegrees = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI

                // Hide very flat areas (< 0.5°) for cleaner visualization
                if (slopeDegrees < 0.5) {
                    a = 0  // Make transparent
                } else {
                    // Get color based on slope steepness
                    const slopeColor = getColorForSlope(slopeDegrees)
                    r = slopeColor[0]
                    g = slopeColor[1]
                    b = slopeColor[2]
                }
            } else {
                // Make no-data areas transparent
                a = 0
            }

            // Write pixel to the image data array
            // Array is organized as [R,G,B,A,R,G,B,A,...] with row-major order
            const pixelIndex = (j * 256 + i) * 4;
            data[pixelIndex] = r;     // Red
            data[pixelIndex + 1] = g; // Green
            data[pixelIndex + 2] = b; // Blue
            data[pixelIndex + 3] = a; // Alpha (opacity)
        }
    }
}