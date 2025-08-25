// Import Leaflet and the plugin
const L = require('leaflet');
require('../src/L.GridLayer.Relief');

describe('L.GridLayer.Relief', () => {
  let map;
  let container;

  beforeEach(() => {
    // Create a container div for the map
    container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '400px';
    document.body.appendChild(container);

    // Create a Leaflet map
    map = L.map(container, {
      center: [45.8326, 6.8652],
      zoom: 12
    });
  });

  afterEach(() => {
    // Clean up
    if (map) {
      map.remove();
      map = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    test('should create relief layer with default options', () => {
      const relief = L.gridLayer.relief();
      expect(relief).toBeDefined();
      expect(relief.mode).toBe('hillshade');
      expect(relief.azimuth).toBe(315);
      expect(relief.elevation).toBe(45);
      // Default opacity is 1 in L.GridLayer
      expect(relief.options.opacity).toBe(1);
    });

    test('should create relief layer with custom options', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        azimuth: 180,
        elevation: 30,
        opacity: 0.8
      });
      expect(relief.mode).toBe('slope');
      expect(relief.azimuth).toBe(180);
      expect(relief.elevation).toBe(30);
      expect(relief.options.opacity).toBe(0.8);
    });

    test('should add relief layer to map', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      expect(map.hasLayer(relief)).toBe(true);
    });
  });

  describe('Hillshade Mode', () => {
    test('should set and get azimuth correctly', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      relief.addTo(map);
      
      relief.setAzimuth(90);
      expect(relief.getAzimuth()).toBe(90);
      
      relief.setAzimuth(270);
      expect(relief.getAzimuth()).toBe(270);
    });

    test('should set and get elevation correctly', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      relief.addTo(map);
      
      relief.setElevation(60);
      expect(relief.getElevation()).toBe(60);
      
      relief.setElevation(15);
      expect(relief.getElevation()).toBe(15);
    });

    test('should set sun position with both azimuth and elevation', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      relief.addTo(map);
      
      relief.setSunPosition(180, 45);
      expect(relief.getAzimuth()).toBe(180);
      expect(relief.getElevation()).toBe(45);
    });

    test('should accept custom hillshade color function', () => {
      const colorFunction = jest.fn((intensity) => [255, 255, 255]);
      const relief = L.gridLayer.relief({
        mode: 'hillshade',
        hillshadeColorFunction: colorFunction
      });
      expect(relief.hillshadeColorFunction).toBe(colorFunction);
    });
  });

  describe('Slope Mode', () => {
    test('should create slope layer with default color scheme', () => {
      const relief = L.gridLayer.relief({ mode: 'slope' });
      expect(relief.mode).toBe('slope');
      // slopeColorScheme is not stored as an option, it's used to create slopeColorFunction
      expect(relief.slopeColorFunction).toBeDefined();
    });

    test('should accept predefined slope color schemes', () => {
      const schemes = ['default', 'glacial', 'thermal', 'earth'];
      
      schemes.forEach(scheme => {
        const relief = L.gridLayer.relief({
          mode: 'slope',
          slopeColorScheme: scheme
        });
        // Color scheme creates a function, not stored as option
        expect(relief.slopeColorFunction).toBeDefined();
      });
    });

    test('should accept custom slope color function', () => {
      const colorFunction = jest.fn((slope) => [255, 0, 0]);
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorFunction: colorFunction
      });
      expect(relief.slopeColorFunction).toBe(colorFunction);
    });

    test('should accept custom slope color config', () => {
      const colorConfig = [
        { slope: { min: 0, max: 10 }, h: { min: 120, max: 60 } },
        { slope: { min: 10, max: 30 }, h: { min: 60, max: 0 } }
      ];
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: colorConfig
      });
      // Config creates a function, not stored as option
      expect(relief.slopeColorFunction).toBeDefined();
    });
  });

  describe('Tile Creation', () => {
    test('should create canvas element for tiles', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      
      const coords = { x: 0, y: 0, z: 10 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      
      expect(tile).toBeDefined();
      expect(tile.tagName).toBe('CANVAS');
      expect(tile.width).toBe(256);
      expect(tile.height).toBe(256);
    });

    test('should handle tile abort correctly', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      
      const coords = { x: 0, y: 0, z: 10 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      
      // Simulate tile removal
      if (tile._abortController) {
        const abortSpy = jest.spyOn(tile._abortController, 'abort');
        relief._abortTile(coords, tile);
        expect(abortSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Elevation Data', () => {
    test('should use default elevation URL', () => {
      const relief = L.gridLayer.relief();
      // elevationUrl is a function that returns the URL
      const url = relief.tileCache.elevationUrl(10, 100, 200);
      expect(url).toMatch(/elevation-tiles-prod/);
    });

    test('should accept custom elevation URL', () => {
      const customUrl = 'https://example.com/tiles/{z}/{x}/{y}.png';
      const relief = L.gridLayer.relief({
        elevationUrl: customUrl
      });
      expect(relief.tileCache.elevationUrl).toBe(customUrl);
    });

    test('should accept custom elevation extractor', () => {
      const extractor = jest.fn((r, g, b, a) => r * 100);
      const relief = L.gridLayer.relief({
        elevationExtractor: extractor
      });
      expect(relief.tileCache.elevationExtractor).toBe(extractor);
    });
  });

  describe('Static Methods and Properties', () => {
    test('should expose elevation extractors', () => {
      expect(L.GridLayer.Relief.elevationExtractors).toBeDefined();
      expect(L.GridLayer.Relief.elevationExtractors.terrarium).toBeDefined();
      expect(L.GridLayer.Relief.elevationExtractors.mapbox).toBeDefined();
      expect(L.GridLayer.Relief.elevationExtractors.custom).toBeDefined();
    });

    test('should have correct terrarium extractor formula', () => {
      const extractor = L.GridLayer.Relief.elevationExtractors.terrarium;
      // Terrarium formula: (R * 256 + G + B / 256) - 32768
      const elevation = extractor(100, 50, 128, 255);
      expect(elevation).toBeCloseTo((100 * 256 + 50 + 128 / 256) - 32768, 2);
    });

    test('should have correct mapbox extractor formula', () => {
      const extractor = L.GridLayer.Relief.elevationExtractors.mapbox;
      // Mapbox formula: -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
      const elevation = extractor(100, 50, 128, 255);
      expect(elevation).toBeCloseTo(-10000 + ((100 * 256 * 256 + 50 * 256 + 128) * 0.1), 2);
    });

    test('should wrap custom extractor function', () => {
      const customFn = jest.fn((r, g, b, a) => r + g + b);
      const wrapped = L.GridLayer.Relief.elevationExtractors.custom(customFn);
      
      const result = wrapped(10, 20, 30, 255);
      expect(customFn).toHaveBeenCalledWith(10, 20, 30, 255);
      expect(result).toBe(60);
    });
  });

  describe('Layer Management', () => {
    test('should properly remove layer from map', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      expect(map.hasLayer(relief)).toBe(true);
      
      map.removeLayer(relief);
      expect(map.hasLayer(relief)).toBe(false);
    });

    test('should set opacity correctly', () => {
      const relief = L.gridLayer.relief({ opacity: 0.5 });
      relief.addTo(map);
      
      expect(relief.options.opacity).toBe(0.5);
      
      relief.setOpacity(0.8);
      expect(relief.options.opacity).toBe(0.8);
    });

    test('should handle max cache size option', () => {
      const relief = L.gridLayer.relief({ maxCacheSize: 100 });
      expect(relief.options.maxCacheSize).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid mode gracefully', () => {
      const relief = L.gridLayer.relief({ mode: 'invalid' });
      expect(relief.mode).toBe('invalid');
      // Should not throw an error during creation
    });

    test('should handle missing elevation data', async () => {
      // Mock fetch to return error
      global.fetch.mockImplementationOnce(() => 
        Promise.reject(new Error('Network error'))
      );

      const relief = L.gridLayer.relief();
      relief.addTo(map);
      
      const coords = { x: 0, y: 0, z: 10 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should handle error without crashing
      expect(tile).toBeDefined();
    });
  });

  describe('Default Hillshade Color Function', () => {
    test('should use default hillshade color function when not specified', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      expect(relief.hillshadeColorFunction).toBeDefined();
      
      // Test the default color function
      const intensity = 0.5;
      const color = relief.hillshadeColorFunction(intensity);
      const expectedValue = Math.round(intensity * 255);
      expect(color).toEqual([expectedValue, expectedValue, expectedValue]);
    });

    test('should handle different intensity values with default color function', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      
      // Test various intensity values
      const testValues = [0, 0.25, 0.5, 0.75, 1.0];
      testValues.forEach(intensity => {
        const color = relief.hillshadeColorFunction(intensity);
        const expectedValue = Math.round(intensity * 255);
        expect(color[0]).toBe(expectedValue);
        expect(color[1]).toBe(expectedValue);
        expect(color[2]).toBe(expectedValue);
      });
    });
  });

  describe('ElevationCache', () => {
    test('should handle edge pixels that require neighboring tiles', () => {
      const relief = L.gridLayer.relief();
      // This is tested internally when createTile is called with edge pixels
      const coords = { x: 10, y: 10, z: 12 };
      const done = jest.fn();
      
      relief.addTo(map);
      const tile = relief.createTile(coords, done);
      
      expect(tile).toBeDefined();
      // Edge pixel calculations are handled internally by _ElevationCache
    });
  });

  describe('Slope Color Functions', () => {
    test('should handle slopes below minimum range', () => {
      const colorConfig = [
        { slope: { min: 10, max: 30 }, h: { min: 120, max: 60 } },
        { slope: { min: 30, max: 50 }, h: { min: 60, max: 0 } }
      ];
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: colorConfig
      });
      
      // Test slope below minimum (should use first range's min hue)
      const color = relief.slopeColorFunction(5); // Below min of 10
      expect(color).toBeDefined();
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4);
    });

    test('should handle slopes above maximum range', () => {
      const colorConfig = [
        { slope: { min: 0, max: 20 }, h: { min: 120, max: 60 } },
        { slope: { min: 20, max: 40 }, h: { min: 60, max: 0 } }
      ];
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: colorConfig
      });
      
      // Test slope above maximum (should use last range's max hue)
      const color = relief.slopeColorFunction(60); // Above max of 40
      expect(color).toBeDefined();
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4);
    });

    test('should handle glacial color scheme', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'glacial'
      });
      
      // Test various slope values with glacial scheme
      const testSlopes = [2, 10, 25, 45, 75];
      testSlopes.forEach(slope => {
        const color = relief.slopeColorFunction(slope);
        expect(color).toBeDefined();
        expect(Array.isArray(color)).toBe(true);
        expect(color.length).toBe(4);
        // Check RGB values are valid
        expect(color[0]).toBeGreaterThanOrEqual(0);
        expect(color[0]).toBeLessThanOrEqual(255);
        expect(color[1]).toBeGreaterThanOrEqual(0);
        expect(color[1]).toBeLessThanOrEqual(255);
        expect(color[2]).toBeGreaterThanOrEqual(0);
        expect(color[2]).toBeLessThanOrEqual(255);
        expect(color[3]).toBe(255);
      });
    });

    test('should handle thermal color scheme', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'thermal'
      });
      
      // Test various slope values with thermal scheme
      const testSlopes = [5, 17, 35, 55];
      testSlopes.forEach(slope => {
        const color = relief.slopeColorFunction(slope);
        expect(color).toBeDefined();
        expect(Array.isArray(color)).toBe(true);
        expect(color.length).toBe(4);
      });
    });

    test('should handle earth color scheme', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'earth'
      });
      
      // Test various slope values with earth scheme
      const testSlopes = [2.5, 10, 25, 45];
      testSlopes.forEach(slope => {
        const color = relief.slopeColorFunction(slope);
        expect(color).toBeDefined();
        expect(Array.isArray(color)).toBe(true);
        expect(color.length).toBe(4);
      });
    });

    test('should handle HSV to RGB conversion for different hue ranges', () => {
      // Test all six hue ranges (0-60, 60-120, 120-180, 180-240, 240-300, 300-360)
      const hueRanges = [
        { slope: { min: 0, max: 10 }, h: { min: 30, max: 30 } },    // Red-orange range
        { slope: { min: 10, max: 20 }, h: { min: 90, max: 90 } },   // Yellow-green range
        { slope: { min: 20, max: 30 }, h: { min: 150, max: 150 } }, // Green-cyan range
        { slope: { min: 30, max: 40 }, h: { min: 210, max: 210 } }, // Cyan-blue range
        { slope: { min: 40, max: 50 }, h: { min: 270, max: 270 } }, // Blue-magenta range
        { slope: { min: 50, max: 60 }, h: { min: 330, max: 330 } }  // Magenta-red range
      ];
      
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: hueRanges
      });
      
      // Test each range
      const testSlopes = [5, 15, 25, 35, 45, 55];
      testSlopes.forEach(slope => {
        const color = relief.slopeColorFunction(slope);
        expect(color).toBeDefined();
        expect(Array.isArray(color)).toBe(true);
        expect(color.length).toBe(4);
      });
    });
  });

  describe('TileCache', () => {
    test('should handle cache eviction when max size is reached', async () => {
      const relief = L.gridLayer.relief({ maxCacheSize: 2 });
      
      // Mock fetch to return valid tile data
      const mockTileData = new Uint8ClampedArray(256 * 256 * 4);
      const mockBlob = new Blob([mockTileData.buffer], { type: 'image/png' });
      
      // Mock createImageBitmap
      global.createImageBitmap = jest.fn(() => Promise.resolve({
        width: 256,
        height: 256
      }));
      
      // Mock canvas context
      const mockContext = {
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
          data: mockTileData
        }))
      };
      
      // Mock createElement to return a canvas with our mock context
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
          return {
            width: 256,
            height: 256,
            getContext: jest.fn(() => mockContext)
          };
        }
        return originalCreateElement.call(document, tagName);
      });
      
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob)
        })
      );
      
      // Access to internal tile cache
      const cache = relief.tileCache;
      expect(cache.maxCacheSize).toBe(2);
      
      // Get tiles to trigger caching
      const abortController1 = new AbortController();
      const abortController2 = new AbortController();
      const abortController3 = new AbortController();
      
      await cache.getTile(10, 100, 100, abortController1.signal);
      await cache.getTile(10, 101, 100, abortController2.signal);
      await cache.getTile(10, 102, 100, abortController3.signal);
      
      // Cache should not exceed max size (should evict the oldest)
      const cacheKeys = Array.from(cache.tileCache.keys());
      expect(cacheKeys.length).toBeLessThanOrEqual(2);
      
      // Restore original createElement
      document.createElement = originalCreateElement;
    });

    test('should handle elevation URL as string or function', () => {
      // Test with URL template string
      const urlTemplate = 'https://example.com/{z}/{x}/{y}.png';
      const relief1 = L.gridLayer.relief({ elevationUrl: urlTemplate });
      
      // URL string should be stored as is
      expect(typeof relief1.tileCache.elevationUrl).toBe('string');
      expect(relief1.tileCache.elevationUrl).toBe(urlTemplate);
      
      // Test with URL function
      const urlFunction = (z, x, y) => `https://example.com/${z}/${x}/${y}.png`;
      const relief2 = L.gridLayer.relief({ elevationUrl: urlFunction });
      
      // URL function should be stored as function
      expect(typeof relief2.tileCache.elevationUrl).toBe('function');
      const url = relief2.tileCache.elevationUrl(10, 100, 200);
      expect(url).toBe('https://example.com/10/100/200.png');
    });

    test('should handle abort errors during tile fetch', async () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      
      const coords = { x: 0, y: 0, z: 10 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      
      // Simulate abort immediately
      if (tile._abortController) {
        tile._abortController.abort();
      }
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should handle abort without throwing unhandled errors
      expect(tile).toBeDefined();
    });
  });

  describe('Single Tile Mode', () => {
    test('should handle single tile mode for hillshade', () => {
      const relief = L.gridLayer.relief({
        mode: 'hillshade',
        singleTileMode: true
      });
      
      expect(relief.singleTileMode).toBe(true);
      relief.addTo(map);
      
      const coords = { x: 10, y: 10, z: 12 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      expect(tile).toBeDefined();
    });

    test('should handle single tile mode for slope', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        singleTileMode: true
      });
      
      expect(relief.singleTileMode).toBe(true);
      relief.addTo(map);
      
      const coords = { x: 10, y: 10, z: 12 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      expect(tile).toBeDefined();
    });
  });

  describe('Coordinate and Pixel Calculations', () => {
    test('should handle latitude calculations for tiles', () => {
      const relief = L.gridLayer.relief({ mode: 'slope' });
      relief.addTo(map);
      
      // This triggers internal latitude calculations
      const coords = { x: 10, y: 10, z: 5 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      expect(tile).toBeDefined();
    });

    test('should handle extreme latitude values', () => {
      const relief = L.gridLayer.relief({ mode: 'slope' });
      relief.addTo(map);
      
      // Test near poles (extreme latitude)
      const coords = { x: 0, y: 0, z: 5 }; // Near north pole
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      expect(tile).toBeDefined();
    });
  });
});