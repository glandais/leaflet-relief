/**
 * HillshadeLayer - Base class for terrain visualization overlays on Leaflet maps
 *
 * This class extends Leaflet's GridLayer to render terrain data as visual overlays.
 * It supports two visualization modes:
 * - hillshade: Creates a shaded relief effect simulating sunlight on terrain
 * - slope: Colors terrain based on steepness/gradient
 *
 * The layer fetches elevation data from AWS Terrarium tiles and processes it
 * to create the visual effects on 256x256 pixel canvas tiles.
 */
class HillshadeLayer extends L.GridLayer {
    constructor(options) {
        // Set global bounds if noWrap is enabled to prevent tile wrapping
        if (options.noWrap && !options.bounds) options.bounds = [[-90,-180],[90,180]]
        super(options)

        // Select rendering mode: 'hillshade' or 'slope'
        this.mode = options.mode || 'hillshade'

        // Assign the appropriate rendering function based on mode
        // These functions are defined in relief_hillshade.js and relief_slope.js
        if (this.mode === 'hillshade')
            this.fillTile = fillHillshadeTile
        else
            this.fillTile = fillSlopeTile

        // Track abort controllers for cancelling in-flight tile requests
        // This prevents memory leaks when tiles are unloaded before loading completes
        this.abortControllers = new Map();

        // Listen for tile unload events to clean up pending requests
        this.on('tileunload', function(e) {
            this.tileUnloaded(e.coords)
        });
    }

    /**
     * Clean up when a tile is unloaded (e.g., when panning away)
     * Aborts any pending HTTP requests for elevation data to prevent memory leaks
     */
    tileUnloaded(coords) {
        const tileKey = `${coords.z}/${coords.x}/${coords.y}`;
        if (this.abortControllers.has(tileKey)) {
            const abortController = this.abortControllers.get(tileKey)
            // Cancel the pending request
            abortController.abort()
            this.abortControllers.delete(tileKey)
        }
    }

    /**
     * Create a single map tile - called by Leaflet for each visible tile
     * @param {Object} coords - Tile coordinates {x, y, z} where z is zoom level
     * @param {Function} done - Callback to call when tile is ready
     * @returns {HTMLCanvasElement} The canvas element for this tile
     */
    createTile(coords, done) {
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
        const promise = (async () => {
            try {
                // Call the mode-specific rendering function (hillshade or slope)
                // This will fetch elevation data and calculate colors for each pixel
                await this.fillTile(imageData.data, coords, abortController.signal);

                // Only render if the request wasn't aborted
                if (!abortController.signal.aborted) {
                    // Put the processed pixel data onto the canvas
                    ctx.putImageData(imageData, 0, 0);
                    // Notify Leaflet that the tile is ready
                    done(null, tile)
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
    }
}
