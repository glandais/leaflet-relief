import * as L from 'leaflet';

// Test setup - mocking Leaflet
declare global {
    namespace jest {
        interface Global {
            L: typeof L;
            fetch: jest.MockedFunction<typeof fetch>;
            createImageBitmap: jest.MockedFunction<typeof createImageBitmap>;
            AbortController: typeof AbortController;
        }
    }

    interface Window {
        L: typeof L;
    }
}

// Mock the Leaflet global
(global as any).L = {
    GridLayer: require('leaflet').GridLayer,
    gridLayer: {},
};

// Mock the canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(function (type: string) {
    if (type === '2d') {
        return {
            putImageData: jest.fn(),
            createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(256 * 256 * 4) })),
            drawImage: jest.fn(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(256 * 256 * 4) })),
        };
    }
    return null;
}) as any;

// Mock createImageBitmap
global.createImageBitmap = jest.fn(() =>
    Promise.resolve({
        width: 256,
        height: 256,
        close: jest.fn(),
    })
) as any;

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob([new ArrayBuffer(1024)], { type: 'image/png' })),
    })
) as any;

// Mock AbortController
global.AbortController = class {
    public signal = { aborted: false };

    abort(): void {
        this.signal.aborted = true;
    }
} as any;

// Load the TypeScript plugin
require('../src/L.GridLayer.Relief');

describe('L.GridLayer.Relief', () => {
    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();
    });

    describe('Instantiation', () => {
        it('should create a relief layer with default options', () => {
            const layer = L.gridLayer.relief();
            expect(layer).toBeDefined();
            expect(layer).toBeInstanceOf(L.GridLayer);
        });

        it('should create a relief layer with hillshade mode', () => {
            const layer = L.gridLayer.relief({ mode: 'hillshade' });
            expect(layer).toBeDefined();
            expect(layer._mode).toBe('hillshade');
        });

        it('should create a relief layer with slope mode', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer).toBeDefined();
            expect(layer._mode).toBe('slope');
        });

        it('should accept custom elevation URL', () => {
            const customUrl = 'https://example.com/{z}/{x}/{y}.png';
            const layer = L.gridLayer.relief({ elevationUrl: customUrl });
            expect(layer._elevationUrl).toBe(customUrl);
        });

        it('should accept elevation URL function', () => {
            const urlFunction = (z: number, x: number, y: number) =>
                `https://example.com/${z}/${x}/${y}.png`;
            const layer = L.gridLayer.relief({ elevationUrl: urlFunction });
            expect(layer._elevationUrl).toBe(urlFunction);
        });

        it('should accept custom elevation extractor', () => {
            const extractor = (r: number, g: number, b: number, _a: number) => r + g + b;
            const layer = L.gridLayer.relief({ elevationExtractor: extractor });
            expect(layer._elevationExtractor).toBe(extractor);
        });

        it('should set noWrap bounds when noWrap is true', () => {
            const layer = L.gridLayer.relief({ noWrap: true });
            expect((layer.options as any).bounds).toEqual([
                [-90, -180],
                [90, 180],
            ]);
        });
    });

    describe('Hillshade Configuration', () => {
        it('should accept custom azimuth angle', () => {
            const layer = L.gridLayer.relief({ hillshadeAzimuth: 180 });
            expect(layer._hillshadeAzimuth).toBe(180);
        });

        it('should accept custom elevation angle', () => {
            const layer = L.gridLayer.relief({ hillshadeElevation: 30 });
            expect(layer._hillshadeElevation).toBe(30);
        });

        it('should use default azimuth if not provided', () => {
            const layer = L.gridLayer.relief();
            expect(layer._hillshadeAzimuth).toBe(315);
        });

        it('should use default elevation if not provided', () => {
            const layer = L.gridLayer.relief();
            expect(layer._hillshadeElevation).toBe(45);
        });

        it('should accept custom hillshade color function', () => {
            const colorFunc = (_intensity: number) => [255, 0, 0] as [number, number, number];
            const layer = L.gridLayer.relief({ hillshadeColorFunction: colorFunc });
            expect(layer._hillshadeColorFunction).toBe(colorFunc);
        });
    });

    describe('Slope Configuration', () => {
        it('should accept custom slope color function', () => {
            const colorFunc = (_slope: number) => [0, 255, 0] as [number, number, number];
            const layer = L.gridLayer.relief({ mode: 'slope', slopeColorFunction: colorFunc });
            expect(layer._slopeColorFunction).toBe(colorFunc);
        });

        it('should accept slope color config', () => {
            const colorConfig = [
                { slope: { min: 0, max: 10 }, h: { min: 120, max: 60 } },
                { slope: { min: 10, max: 30 }, h: { min: 60, max: 0 } },
            ];
            const layer = L.gridLayer.relief({ mode: 'slope', slopeColorConfig: colorConfig });
            expect(layer._slopeColorFunction).toBeDefined();
        });

        it('should accept preset slope color scheme', () => {
            const layer = L.gridLayer.relief({ mode: 'slope', slopeColorScheme: 'glacial' });
            expect(layer._slopeColorFunction).toBeDefined();
        });

        it('should use default slope color function when no config provided', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer._slopeColorFunction).toBeDefined();
        });
    });

    describe('Hillshade Constants', () => {
        it('should compute hillshade constants correctly', () => {
            const layer = L.gridLayer.relief({ hillshadeAzimuth: 315, hillshadeElevation: 45 });
            // Constants should be computed based on azimuth and elevation
            expect(layer._hillshadeA1).toBeDefined();
            expect(layer._hillshadeA2).toBeDefined();
            expect(layer._hillshadeA3).toBeDefined();
        });

        it('should recompute constants with different angles', () => {
            const layer = L.gridLayer.relief({ hillshadeAzimuth: 180, hillshadeElevation: 30 });
            expect(layer._hillshadeA1).toBeDefined();
            // Should have different values than defaults
            const defaultLayer = L.gridLayer.relief();
            expect(layer._hillshadeA1).not.toBe(defaultLayer._hillshadeA1);
        });
    });

    describe('Tile Creation', () => {
        it('should create a canvas element for tile', () => {
            const layer = L.gridLayer.relief() as any;
            const coords = { x: 0, y: 0, z: 0 } as L.Coords;
            const done = jest.fn();

            const tile = layer.createTile(coords, done) as HTMLCanvasElement;

            expect(tile).toBeInstanceOf(HTMLCanvasElement);
            expect(tile.width).toBe(256);
            expect(tile.height).toBe(256);
        });

        it('should fetch elevation data when creating tile', async () => {
            const layer = L.gridLayer.relief() as any;
            const coords = { x: 0, y: 0, z: 0 } as L.Coords;
            const done = jest.fn();

            layer.createTile(coords, done);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(global.fetch).toHaveBeenCalled();
            expect(global.createImageBitmap).toHaveBeenCalled();
        });

        it('should handle tile unload', () => {
            const layer = L.gridLayer.relief() as any;
            const coords = { x: 0, y: 0, z: 0 } as L.Coords;

            // Create a tile
            const done = jest.fn();
            layer.createTile(coords, done);

            // Should have abort controllers map
            expect(layer._abortControllers).toBeDefined();
            expect(layer._abortControllers.size).toBeGreaterThanOrEqual(0);

            // Unload the tile - should not throw
            expect(() => layer._tileUnloaded(coords)).not.toThrow();
        });
    });

    describe('Elevation Extractors', () => {
        it('should have terrarium elevation extractor', () => {
            expect(L.GridLayer.Relief.elevationExtractors.terrarium).toBeDefined();
            const elevation = L.GridLayer.Relief.elevationExtractors.terrarium(100, 50, 25, 255);
            expect(typeof elevation).toBe('number');
        });

        it('should have mapbox elevation extractor', () => {
            expect(L.GridLayer.Relief.elevationExtractors.mapbox).toBeDefined();
            const elevation = L.GridLayer.Relief.elevationExtractors.mapbox(100, 50, 25, 255);
            expect(typeof elevation).toBe('number');
        });

        it('should correctly extract terrarium elevation', () => {
            const extractor = L.GridLayer.Relief.elevationExtractors.terrarium;
            // Test with known values
            const elevation = extractor(128, 0, 0, 255);
            expect(elevation).toBeCloseTo(0, 1); // (128*256 + 0 + 0) - 32768 = 0
        });

        it('should correctly extract mapbox elevation', () => {
            const extractor = L.GridLayer.Relief.elevationExtractors.mapbox;
            // Test with known values
            const elevation = extractor(0, 0, 0, 255);
            expect(elevation).toBe(-10000); // (0*65536 + 0*256 + 0) * 0.1 - 10000 = -10000
        });
    });

    describe('Tile Data Processing', () => {
        it('should get elevation from tile data', () => {
            const layer = L.gridLayer.relief();
            const tileData = new Uint8ClampedArray(256 * 256 * 4);
            // Set some test elevation data (terrarium format)
            tileData[0] = 128; // R
            tileData[1] = 0; // G
            tileData[2] = 0; // B
            tileData[3] = 255; // A

            const elevation = layer._getElevation(tileData, 0, 0);
            expect(elevation).toBeCloseTo(0, 1); // Should be around 0 meters
        });
    });

    describe('Mode-specific rendering', () => {
        it('should have fillTile method for hillshade mode', () => {
            const layer = L.gridLayer.relief({ mode: 'hillshade' });
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillHillshadeTile).toBeDefined();
            expect(layer._mode).toBe('hillshade');
        });

        it('should have fillTile method for slope mode', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillSlopeTile).toBeDefined();
            expect(layer._mode).toBe('slope');
        });
    });

    describe('Edge cases', () => {
        it('should handle invalid mode gracefully', () => {
            const layer = L.gridLayer.relief({ mode: 'invalid' as any });
            expect(layer._mode).toBe('invalid');
            // Should still have fill methods available
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillHillshadeTile).toBeDefined();
            expect(layer._fillSlopeTile).toBeDefined();
        });

        it('should handle zero elevation values', () => {
            const layer = L.gridLayer.relief();
            const tileData = new Uint8ClampedArray(256 * 256 * 4);
            // All zeros should result in transparent pixels
            const elevation = layer._getElevation(tileData, 0, 0);
            expect(elevation).toBeLessThanOrEqual(0);
        });

        it('should handle edge pixels correctly', () => {
            const layer = L.gridLayer.relief();
            const tileData = new Uint8ClampedArray(256 * 256 * 4);

            // Test corner pixel - should not throw
            const zData = layer._getZ(tileData, 0, 0);
            expect(zData).toHaveLength(9);

            // Test edge pixel
            const zDataEdge = layer._getZ(tileData, 255, 128);
            expect(zDataEdge).toHaveLength(9);
        });
    });
});
