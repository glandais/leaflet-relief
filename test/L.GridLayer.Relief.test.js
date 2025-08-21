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
});