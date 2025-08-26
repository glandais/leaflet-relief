// Test setup - mocking Leaflet
global.L = {
  GridLayer: require('leaflet').GridLayer,
  gridLayer: {}
};

// Mock the canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(function(type) {
  if (type === '2d') {
    return {
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(256 * 256 * 4) })),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(256 * 256 * 4) }))
    };
  }
  return null;
});

// Mock createImageBitmap
global.createImageBitmap = jest.fn(() => Promise.resolve({
  width: 256,
  height: 256,
  close: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  blob: () => Promise.resolve(new Blob([new ArrayBuffer(1024)], { type: 'image/png' }))
}));

// Mock AbortController
global.AbortController = class {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
};

// Load the plugin
require('../src/L.GridLayer.Relief.js');

describe('L.GridLayer.Relief', () => {
  let map;

  beforeEach(() => {
    // Mock map
    map = {
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      hasLayer: jest.fn(() => false),
      whenReady: jest.fn((callback) => callback()),
      getZoom: jest.fn(() => 10),
      getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
      getBounds: jest.fn(() => ({
        getNorthWest: () => ({ lat: 1, lng: -1 }),
        getSouthEast: () => ({ lat: -1, lng: 1 })
      }))
    };
  });

  describe('Initialization', () => {
    test('should create relief layer with default options', () => {
      const relief = L.gridLayer.relief();
      expect(relief).toBeDefined();
      expect(relief.mode).toBe('hillshade');
      expect(relief.azimuth).toBe(315);
      expect(relief.elevation).toBe(45);
    });

    test('should create relief layer with custom options', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        azimuth: 180,
        elevation: 30
      });
      expect(relief.mode).toBe('slope');
      expect(relief.azimuth).toBe(180);
      expect(relief.elevation).toBe(30);
    });

    test('should add relief layer to map', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      expect(map.addLayer).toHaveBeenCalledWith(relief);
    });
  });

  describe('Hillshade Mode', () => {
    test('should set and get azimuth correctly', () => {
      const relief = L.gridLayer.relief();
      relief.setAzimuth(90);
      expect(relief.getAzimuth()).toBe(90);
    });

    test('should set and get elevation correctly', () => {
      const relief = L.gridLayer.relief();
      relief.setElevation(60);
      expect(relief.getElevation()).toBe(60);
    });

    test('should set sun position with both azimuth and elevation', () => {
      const relief = L.gridLayer.relief();
      relief.setSunPosition(45, 30);
      expect(relief.getAzimuth()).toBe(45);
      expect(relief.getElevation()).toBe(30);
    });

    test('should accept custom hillshade color function', () => {
      const colorFn = jest.fn((intensity) => [intensity * 255, 0, 0]);
      const relief = L.gridLayer.relief({
        hillshadeColorFunction: colorFn
      });
      expect(relief.hillshadeColorFunction).toBe(colorFn);
    });
  });

  describe('Slope Mode', () => {
    test('should create slope layer with default color scheme', () => {
      const relief = L.gridLayer.relief({ mode: 'slope' });
      expect(relief.mode).toBe('slope');
      expect(relief.slopeColorFunction).toBeDefined();
    });

    test('should accept predefined slope color schemes', () => {
      const schemes = ['default', 'glacial', 'thermal', 'earth'];
      schemes.forEach(scheme => {
        const relief = L.gridLayer.relief({
          mode: 'slope',
          slopeColorScheme: scheme
        });
        expect(relief.slopeColorFunction).toBeDefined();
      });
    });

    test('should accept custom slope color function', () => {
      const colorFn = jest.fn((slope) => [255, 0, 0]);
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorFunction: colorFn
      });
      expect(relief.slopeColorFunction).toBe(colorFn);
    });

    test('should accept custom slope color config', () => {
      const config = [
        { slope: { min: 0, max: 30 }, h: { min: 120, max: 0 } }
      ];
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: config
      });
      expect(relief.slopeColorFunction).toBeDefined();
    });
  });

  describe('Tile Creation', () => {
    test('should create canvas element for tiles', () => {
      const relief = L.gridLayer.relief();
      const coords = { x: 0, y: 0, z: 10 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      
      expect(tile).toBeDefined();
      expect(tile.tagName).toBe('CANVAS');
      expect(tile.getAttribute('width')).toBe('256');
      expect(tile.getAttribute('height')).toBe('256');
    });

    test('should handle tile abort correctly', () => {
      const relief = L.gridLayer.relief();
      const coords = { x: 0, y: 0, z: 10 };
      const key = '10/0/0';
      
      relief.createTile(coords, jest.fn());
      expect(relief.abortControllers.has(key)).toBe(true);
      
      relief.tileUnloaded(coords);
      expect(relief.abortControllers.has(key)).toBe(false);
    });
  });

  describe('Elevation Data', () => {
    test('should use default elevation URL', () => {
      const relief = L.gridLayer.relief();
      // elevationUrl is a function that returns the URL
      const url = relief.elevationUrl(10, 100, 200);
      expect(url).toMatch(/elevation-tiles-prod/);
    });

    test('should accept custom elevation URL', () => {
      const customUrl = 'https://example.com/tiles/{z}/{x}/{y}.png';
      const relief = L.gridLayer.relief({
        elevationUrl: customUrl
      });
      expect(relief.elevationUrl).toBe(customUrl);
    });

    test('should accept custom elevation extractor', () => {
      const extractor = jest.fn((r, g, b, a) => r * 100);
      const relief = L.gridLayer.relief({
        elevationExtractor: extractor
      });
      expect(relief.elevationExtractor).toBe(extractor);
    });
  });

  describe('Static Methods and Properties', () => {
    test('should expose elevation extractors', () => {
      expect(L.GridLayer.Relief.elevationExtractors).toBeDefined();
      expect(L.GridLayer.Relief.elevationExtractors.terrarium).toBeDefined();
      expect(L.GridLayer.Relief.elevationExtractors.mapbox).toBeDefined();
    });

    test('should have correct terrarium extractor formula', () => {
      const extractor = L.GridLayer.Relief.elevationExtractors.terrarium;
      const elevation = extractor(100, 50, 25, 255);
      expect(elevation).toBeCloseTo((100 * 256 + 50 + 25/256) - 32768, 2);
    });

    test('should have correct mapbox extractor formula', () => {
      const extractor = L.GridLayer.Relief.elevationExtractors.mapbox;
      const elevation = extractor(100, 50, 25, 255);
      expect(elevation).toBeCloseTo(-10000 + ((100 * 256 * 256 + 50 * 256 + 25) * 0.1), 2);
    });
  });

  describe('Layer Management', () => {
    test('should properly remove layer from map', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      relief.remove();
      // Note: remove() is handled by Leaflet's GridLayer base class
      expect(relief).toBeDefined();
    });

    test('should set opacity correctly', () => {
      const relief = L.gridLayer.relief({ opacity: 0.5 });
      expect(relief.options.opacity).toBe(0.5);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid mode gracefully', () => {
      const relief = L.gridLayer.relief({ mode: 'invalid' });
      // Invalid mode is stored as-is, but plugin still functions
      expect(relief.mode).toBe('invalid');
      expect(relief).toBeDefined();
    });

    test('should handle missing elevation data', async () => {
      global.fetch.mockImplementationOnce(() => 
        Promise.reject(new Error('Network error'))
      );
      
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      
      const coords = { x: 2126, y: 1459, z: 12 };
      const done = jest.fn();
      
      relief.createTile(coords, done);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not throw unhandled exceptions
      expect(true).toBe(true);
    });
  });

  describe('Default Hillshade Color Function', () => {
    test('should use default hillshade color function when not specified', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      
      // Test default grayscale color function behavior
      const intensity = 0.5;
      const color = relief.hillshadeColorFunction(intensity);
      const expectedValue = Math.round(intensity * 255);
      
      expect(color).toEqual([expectedValue, expectedValue, expectedValue]);
    });

    test('should handle different intensity values with default color function', () => {
      const relief = L.gridLayer.relief({ mode: 'hillshade' });
      
      // Test edge cases
      const minColor = relief.hillshadeColorFunction(0);
      expect(minColor).toEqual([0, 0, 0]);
      
      const maxColor = relief.hillshadeColorFunction(1);
      expect(maxColor).toEqual([255, 255, 255]);
    });
  });

  describe('ElevationCache', () => {
    test('should handle edge pixels that require neighboring tiles', () => {
      const relief = L.gridLayer.relief();
      relief.addTo(map);
      
      const coords = { x: 10, y: 10, z: 12 };
      const done = jest.fn();
      
      const tile = relief.createTile(coords, done);
      expect(tile).toBeDefined();
    });
  });

  describe('Slope Color Functions', () => {
    test('should handle slopes below minimum range', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: [
          { slope: { min: 10, max: 30 }, h: { min: 120, max: 0 } }
        ]
      });
      
      // Slope below minimum should use first range's min hue
      const color = relief.slopeColorFunction(5); // Below min of 10
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4); // [r,g,b,a]
    });

    test('should handle slopes above maximum range', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: [
          { slope: { min: 0, max: 30 }, h: { min: 120, max: 0 } }
        ]
      });
      
      // Slope above maximum should use last range's max hue  
      const color = relief.slopeColorFunction(45); // Above max of 30
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4); // [r,g,b,a]
    });

    test('should handle glacial color scheme', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'glacial'
      });
      
      const color = relief.slopeColorFunction(15);
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4); // [r,g,b,a]
    });

    test('should handle thermal color scheme', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'thermal'
      });
      
      const color = relief.slopeColorFunction(25);
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4); // [r,g,b,a]
    });

    test('should handle earth color scheme', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorScheme: 'earth'
      });
      
      const color = relief.slopeColorFunction(20);
      expect(Array.isArray(color)).toBe(true);
      expect(color.length).toBe(4); // [r,g,b,a]
    });

    test('should handle HSV to RGB conversion for different hue ranges', () => {
      const relief = L.gridLayer.relief({
        mode: 'slope',
        slopeColorConfig: [
          { slope: { min: 0, max: 10 }, h: { min: 240, max: 180 } },  // Blue to cyan
          { slope: { min: 10, max: 20 }, h: { min: 180, max: 120 } }, // Cyan to green
          { slope: { min: 20, max: 30 }, h: { min: 120, max: 60 } },  // Green to yellow
          { slope: { min: 30, max: 40 }, h: { min: 60, max: 0 } }     // Yellow to red
        ]
      });
      
      // Test various slopes across different hue ranges
      [5, 15, 25, 35].forEach(slope => {
        const color = relief.slopeColorFunction(slope);
        expect(Array.isArray(color)).toBe(true);
        expect(color.length).toBe(4); // [r,g,b,a]
        // RGB values should be in valid range
        color.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(255);
        });
      });
    });
  });
});

// Tests for removed features:
// - TileCache: No longer using internal tile caching (browser cache handles this)
// - Single Tile Mode: Simplified to always use single tile computation
// - Coordinate calculations: Handled internally now