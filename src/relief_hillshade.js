/**
 * Debug function to generate test colors based on tile position
 * Not used in production - kept for debugging purposes
 */
const getHillshadeColor = (z, x, y, i, j) => {
    const r = i;
    const g = j;
    const b = Math.floor(((x + y) / (Math.pow(2, z) * 2)) * 255);
    return [r, g, b, 255];
};

/**
 * fillHillshadeTile - Renders hillshade effect for a single map tile
 *
 * Hillshading simulates the effect of sunlight on terrain by calculating
 * how much light each point would receive based on its slope and orientation
 * relative to a virtual sun position.
 *
 * The algorithm:
 * 1. Defines a sun position using azimuth (compass direction) and elevation angles
 * 2. For each pixel, calculates the terrain's normal vector using neighboring elevations
 * 3. Computes the dot product between sun direction and terrain normal
 * 4. Converts this to a grayscale value representing illumination
 *
 * @param {Uint8ClampedArray} data - RGBA pixel data array to fill (256x256x4)
 * @param {Object} coords - Tile coordinates {x, y, z}
 * @param {AbortSignal} abortSignal - Signal to cancel rendering if tile is unloaded
 */
const fillHillshadeTile = async (data, coords, abortSignal) => {
    const x = coords.x
    const y = coords.y
    const z = coords.z

    // Sun position configuration
    // Azimuth: 315° (northwest) - standard for cartographic hillshading
    // Elevation: 45° above horizon - provides good contrast
    const azimuth = 315
    const elevation = 45

    // Convert angles to radians for calculations
    const alpha = Math.PI / 180 * azimuth
    const beta = Math.PI / 180 * elevation

    // Pre-compute sun direction vector components
    // a1: vertical component (z-axis)
    // a2: horizontal component in x-direction
    // a3: horizontal component in y-direction
    const a1 = Math.sin(beta)
    const a2 = Math.cos(beta) * Math.sin(alpha)
    const a3 = Math.cos(beta) * Math.cos(alpha)

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
            // Get elevation of 4 neighboring pixels for gradient calculation
            // Using cardinal directions (North, East, South, West)
            let z2 = elevationCache.getElevation(z, x, y, i - 1, j)       // North (above)
            let z4 = elevationCache.getElevation(z, x, y, i, j - 1)       // West (left)
            let z6 = elevationCache.getElevation(z, x, y, i, j + 1)       // East (right)
            let z8 = elevationCache.getElevation(z, x, y, i + 1, j)       // South (below)

            // Check for invalid elevation data (water bodies or missing data)
            // Elevations <= 0 typically indicate water or no-data areas
            const hasNoData = [z2, z4, z6, z8].some(v => v <= 0)

            let r, g, b, a = 255
            if (!hasNoData) {
                // Calculate terrain gradients (slopes) in x and y directions
                // Using finite difference method with neighboring elevations
                // The 0.2 factor reduces the gradient magnitude for visual balance
                let dzdx = 0.2 * (z6 - z4) / 2  // East-West gradient
                let dzdy = 0.2 * (z2 - z8) / 2  // North-South gradient

                // Calculate illumination using the dot product of sun vector and surface normal
                // Surface normal is (-dzdx, -dzdy, 1) normalized
                // L represents the cosine of angle between sun and surface
                var L = (a1 - a2 * dzdx - a3 * dzdy) / Math.sqrt(1 + dzdx ** 2 + dzdy ** 2)

                // Clamp negative values (surface facing away from sun)
                if (L < 0) L = 0;

                // Apply gamma correction and ambient light
                // sqrt provides gamma correction for more natural appearance
                // 0.8*L + 0.2 ensures minimum 20% ambient light (no pure black shadows)
                L = Math.sqrt(L * .8 + .2)

                // Convert to grayscale RGB (all channels equal for gray)
                r = Math.round(L * 255)
                g = Math.round(L * 255)
                b = Math.round(L * 255)
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