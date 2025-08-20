/**
 * ElevationTileManager - Manages elevation data fetching and caching
 *
 * This class handles fetching elevation tiles from AWS Terrarium dataset,
 * which encodes elevation data in PNG images using RGB values.
 *
 * Terrarium format: Each pixel encodes elevation as:
 * - Red channel: High byte of elevation
 * - Green channel: Low byte of elevation
 * - Blue channel: Fractional part (1/256 meter precision)
 * - Formula: elevation = (R * 256 + G + B/256) - 32768 meters
 *
 * The manager implements a LIFO (Last In First Out) cache to store tiles
 * and avoid repeated network requests.
 */
class ElevationTileManager {
    constructor(maxCacheSize = 50) {
        this.tileCache = new Map();
        this.accessOrder = [];
        this.maxCacheSize = maxCacheSize;
        this.baseUrl = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
        this.pendingRequests = new Map();
    }

    /**
     * Get elevation at specific pixel coordinates within a tile
     * Handles out-of-bounds requests by fetching neighbor tiles
     * @param {number} z - Zoom level
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @param {number} i - Pixel row (0-255), can be negative or > 255 for neighbors
     * @param {number} j - Pixel column (0-255), can be negative or > 255 for neighbors
     * @returns {Promise<number>} Elevation in meters
     */
    async getElevation(z, x, y, i, j) {
        // Calculate which tile we need based on pixel coordinates
        let tileX = x;
        let tileY = y;
        let pixelI = j;
        let pixelJ = i;

        // Handle out-of-bounds pixel coordinates
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

        // Get the tile data
        const tileData = await this.getTile(z, tileX, tileY);

        // Extract elevation from the pixel
        return this.extractElevation(tileData, pixelI, pixelJ);
    }

    /**
     * Get or fetch a tile
     * @private
     */
    async getTile(z, x, y, abortSignal) {
        const tileKey = `${z}/${x}/${y}`;
        
        // Check if tile is already in cache
        if (this.tileCache.has(tileKey)) {
            return this.tileCache.get(tileKey);
        }

        // Check if there's already a pending request for this tile
        if (this.pendingRequests.has(tileKey)) {
            return this.pendingRequests.get(tileKey);
        }

        try {
            // Create fetch promise
            const fetchPromise = this.fetchTile(z, x, y, abortSignal);
            this.pendingRequests.set(tileKey, fetchPromise);

            const tileData = await fetchPromise;
            
            // Add to cache
            this.addToCache(tileKey, tileData);
            
            return tileData;
        } finally {
            this.pendingRequests.delete(tileKey);
        }
    }

    /**
     * Fetch a tile from the server
     * @private
     */
    async fetchTile(z, x, y, abortSignal) {
        const url = `${this.baseUrl}/${z}/${x}/${y}.png`;
        
        try {
            const response = await fetch(url, { signal: abortSignal });
            if (!response.ok) {
                throw new Error(`Failed to fetch tile: ${response.status}`);
            }
            
            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);
            
            // Draw to canvas to get pixel data
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

    /**
     * Add tile to cache with LIFO eviction
     * @private
     */
    addToCache(tileKey, tileData) {
        // Evict oldest tiles if cache is full (LIFO queue)
        while (this.tileCache.size >= this.maxCacheSize && this.accessOrder.length > 0) {
            const oldestKey = this.accessOrder.shift();
            this.tileCache.delete(oldestKey);
        }
        
        this.tileCache.set(tileKey, tileData);
        this.accessOrder.push(tileKey);
    }

    /**
     * Extract elevation from Terrarium RGB values
     *
     * Terrarium encoding uses RGB channels to store elevation with high precision:
     * - Red: Represents 256-meter increments (high byte)
     * - Green: Represents 1-meter increments (low byte)
     * - Blue: Represents 1/256-meter increments (fractional part)
     * - 32768 is subtracted to allow negative elevations (below sea level)
     *
     * Example: RGB(128, 100, 128) = (128*256 + 100 + 128/256) - 32768
     *                              = 32768 + 100 + 0.5 - 32768 = 100.5 meters
     *
     * @private
     */
    extractElevation(tileData, i, j) {
        // Calculate the pixel's position in the flat RGBA array
        // Each pixel has 4 values (R,G,B,A), arranged row by row
        const pixelIndex = (i * 256 + j) * 4;
        const r = tileData[pixelIndex];
        const g = tileData[pixelIndex + 1];
        const b = tileData[pixelIndex + 2];

        // Decode elevation using Terrarium formula
        // The 32768 offset allows encoding both positive and negative elevations
        const elevation = (r * 256 + g + b / 256) - 32768;
        return elevation;
    }

    /**
     * Clear the tile cache
     */
    clearCache() {
        this.tileCache.clear();
        this.accessOrder = [];
    }

    /**
     * Get current cache size
     */
    getCacheSize() {
        return this.tileCache.size;
    }
}

// Create singleton instance for global use
const elevationManager = new ElevationTileManager();

/**
 * ElevationCache - Local cache for a 3x3 grid of elevation tiles
 *
 * This class pre-loads elevation data for a tile and its 8 neighbors.
 * This is necessary because slope and hillshade calculations need to
 * access elevation values from adjacent pixels, which may be in neighboring tiles
 * when processing pixels at tile edges.
 *
 * The 3x3 grid ensures we have all elevation data needed for any pixel
 * in the central tile, even when calculating gradients at tile boundaries.
 */
class ElevationCache {
    constructor() {
        this.tiles = new Map()
    }

    /**
     * Pre-load elevation tiles for the target tile and its 8 neighbors
     * Creates a 3x3 grid of tiles centered on the target tile
     */
    async init(z, x, y, abortSignal) {
        // Load tiles in a 3x3 grid around the target tile
        // dx,dy = -1: left/top neighbors
        // dx,dy =  0: center tile
        // dx,dy =  1: right/bottom neighbors
        for (let dx = -1; dx < 2; dx++) {
            for (let dy = -1; dy < 2; dy++) {
                let rx = x + dx;
                let ry = y + dy;
                const tileKey = `${z}/${rx}/${ry}`;
                // Fetch and store each tile's elevation data
                this.tiles.set(tileKey, await elevationManager.getTile(z, rx, ry, abortSignal))
            }
        }
    }

    /**
     * Get elevation at any pixel coordinate, handling tile boundaries
     *
     * When requesting pixels outside the 0-255 range of the center tile,
     * this method automatically fetches the value from the appropriate neighbor tile.
     * For example, pixel (256, 100) would come from the tile to the right.
     */
    getElevation(z, x, y, i, j) {
        // Start with the center tile coordinates
        let tileX = x;
        let tileY = y;
        // Note: i and j are swapped to match the coordinate system
        let pixelI = j;  // Row within tile
        let pixelJ = i;  // Column within tile

        // Adjust tile coordinates if pixel is outside 0-255 range
        // Moving to neighbor tiles as needed
        while (pixelI < 0) {
            tileY--;      // Move to tile above
            pixelI += 256; // Wrap pixel coordinate
        }
        while (pixelI > 255) {
            tileY++;      // Move to tile below
            pixelI -= 256; // Wrap pixel coordinate
        }
        while (pixelJ < 0) {
            tileX--;      // Move to tile to the left
            pixelJ += 256; // Wrap pixel coordinate
        }
        while (pixelJ > 255) {
            tileX++;      // Move to tile to the right
            pixelJ -= 256; // Wrap pixel coordinate
        }

        const tileKey = `${z}/${tileX}/${tileY}`;
        // Get the pre-loaded tile data
        const tileData = this.tiles.get(tileKey);

        // Extract and return the elevation value
        return elevationManager.extractElevation(tileData, pixelI, pixelJ);
    }
}

// Export the main function
async function getElevation(z, x, y, i, j) {
    return elevationManager.getElevation(z, x, y, i, j);
}
