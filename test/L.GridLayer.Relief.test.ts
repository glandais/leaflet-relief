import * as L from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

declare global {
    interface Window {
        L: typeof L;
    }
}

// Reference DEM pixel size in meters used by hillshade unit tests
const PIXEL_SIZE_METERS = 5;

// Mock the Leaflet global
(global as any).L = {
    GridLayer: L.GridLayer,
    gridLayer: {},
};

// Mock the canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(function (type: string) {
    if (type === '2d') {
        return {
            putImageData: vi.fn(),
            createImageData: vi.fn(() => ({
                data: new Uint8ClampedArray(256 * 256 * 4),
            })),
            drawImage: vi.fn(),
            getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray(256 * 256 * 4),
            })),
        };
    }
    return null;
}) as any;

// Mock createImageBitmap
global.createImageBitmap = vi.fn(() =>
    Promise.resolve({
        width: 256,
        height: 256,
        close: vi.fn(),
    })
) as any;

// Mock fetch
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob([new ArrayBuffer(1024)], { type: 'image/png' })),
    })
) as any;

// Note: AbortController is mocked in test/setup.ts with addEventListener support
// (required by Vitest's test runner cancellation hooks)

// Load the TypeScript plugin (side-effect import registers L.gridLayer.relief)
import '../src/L.GridLayer.Relief';

describe('L.GridLayer.Relief', () => {
    beforeEach(() => {
        // Clear mocks before each test
        vi.clearAllMocks();
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
            expect(layer.options.mode).toBe('hillshade');
        });

        it('should create a relief layer with slope mode', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer).toBeDefined();
            expect(layer.options.mode).toBe('slope');
        });

        it('should create a relief layer with archeo mode', () => {
            const layer = L.gridLayer.relief({ mode: 'archeo' });
            expect(layer).toBeDefined();
            expect(layer.options.mode).toBe('archeo');
        });

        it('should create a relief layer with tricolor mode', () => {
            const layer = L.gridLayer.relief({ mode: 'tricolor' });
            expect(layer).toBeDefined();
            expect(layer.options.mode).toBe('tricolor');
        });

        it('should accept custom elevation URL', () => {
            const customUrl = 'https://example.com/{z}/{x}/{y}.png';
            const layer = L.gridLayer.relief({ elevationUrl: customUrl });
            expect(layer.options.elevationUrl).toBe(customUrl);
        });

        it('should accept elevation URL function', () => {
            const urlFunction = (z: number, x: number, y: number) =>
                `https://example.com/${z}/${x}/${y}.png`;
            const layer = L.gridLayer.relief({ elevationUrl: urlFunction });
            expect(layer.options.elevationUrl).toBe(urlFunction);
        });

        it('should accept custom elevation extractor', () => {
            const extractor = (r: number, g: number, b: number, _a: number) => r + g + b;
            const layer = L.gridLayer.relief({ elevationExtractor: extractor });
            expect(layer.options.elevationExtractor).toBe(extractor);
        });
    });

    describe('Hillshade Configuration', () => {
        it('should accept custom azimuth angle', () => {
            const layer = L.gridLayer.relief({ hillshadeAzimuth: 180 });
            expect(layer.options.hillshadeAzimuth).toBe(180);
        });

        it('should accept custom elevation angle', () => {
            const layer = L.gridLayer.relief({ hillshadeElevation: 30 });
            expect(layer.options.hillshadeElevation).toBe(30);
        });

        it('should use default azimuth if not provided', () => {
            const layer = L.gridLayer.relief();
            expect(layer.options.hillshadeAzimuth).toBe(315);
        });

        it('should use default elevation if not provided', () => {
            const layer = L.gridLayer.relief();
            expect(layer.options.hillshadeElevation).toBe(45);
        });

        it('should accept custom hillshade color function', () => {
            const colorFunc = (_intensity: number) => [255, 0, 0] as [number, number, number];
            const layer = L.gridLayer.relief({ hillshadeColorFunction: colorFunc });
            expect(layer.options.hillshadeColorFunction).toBe(colorFunc);
        });
    });

    describe('Slope Configuration', () => {
        it('should accept custom slope color function', () => {
            const colorFunc = (_slope: number) => [0, 255, 0] as [number, number, number];
            const layer = L.gridLayer.relief({
                mode: 'slope',
                slopeColorFunction: colorFunc,
            });
            expect(layer.options.slopeColorFunction).toBe(colorFunc);
        });

        it('should accept slope color config', () => {
            const colorConfig = [
                { slope: { min: 0, max: 10 }, h: { min: 120, max: 60 } },
                { slope: { min: 10, max: 30 }, h: { min: 60, max: 0 } },
            ];
            const layer = L.gridLayer.relief({
                mode: 'slope',
                slopeColorConfig: colorConfig,
            });
            expect(layer.options.slopeColorFunction).toBeDefined();
        });

        it('should accept preset slope color scheme', () => {
            const layer = L.gridLayer.relief({
                mode: 'slope',
                slopeColorScheme: 'glacial',
            });
            expect(layer.options.slopeColorFunction).toBeDefined();
        });

        it('should use default slope color function when no config provided', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer.options.slopeColorFunction).toBeDefined();
        });
    });

    describe('Archeo Configuration', () => {
        it('should use default archeo options if not provided', () => {
            const layer = L.gridLayer.relief({ mode: 'archeo' });
            expect(layer.options.archeoAzimuths).toEqual([225, 270, 315, 360]);
            expect(layer.options.archeoElevation).toBe(45);
            expect(layer.options.archeoExaggeration).toBe(3);
            expect(layer.options.archeoGlowStrength).toBe(15);
            expect(layer.options.archeoWarmColor).toEqual([236, 150, 82]);
            expect(layer.options.archeoCoolColor).toEqual([126, 172, 246]);
            expect(layer.options.archeoBaseColor).toEqual([192, 191, 196]);
        });

        it('should accept custom azimuths and glow strength', () => {
            const layer = L.gridLayer.relief({
                mode: 'archeo',
                archeoAzimuths: [0, 90, 180],
                archeoGlowStrength: 5,
            });
            expect(layer.options.archeoAzimuths).toEqual([0, 90, 180]);
            expect(layer.options.archeoGlowStrength).toBe(5);
        });

        it('should resolve preset archeo color scheme', () => {
            const layer = L.gridLayer.relief({
                mode: 'archeo',
                archeoColorScheme: 'vivid',
            });
            expect(layer.options.archeoWarmColor).toEqual([246, 126, 40]);
            expect(layer.options.archeoCoolColor).toEqual([86, 144, 250]);
            expect(layer.options.archeoBaseColor).toEqual([198, 197, 202]);
        });

        it('should let explicit colors take precedence over a scheme', () => {
            const layer = L.gridLayer.relief({
                mode: 'archeo',
                archeoColorScheme: 'vivid',
                archeoWarmColor: [200, 100, 50],
            });
            expect(layer.options.archeoWarmColor).toEqual([200, 100, 50]);
            expect(layer.options.archeoCoolColor).toEqual([86, 144, 250]);
        });
    });

    describe('Tricolor Configuration', () => {
        it('should use NLS default azimuths and elevation', () => {
            const layer = L.gridLayer.relief({ mode: 'tricolor' });
            expect(layer.options.tricolorAzimuths).toEqual([315, 15, 75]);
            expect(layer.options.tricolorElevation).toBe(35);
            expect(layer.options.tricolorExaggeration).toBe(1);
        });

        it('should accept custom tricolor azimuths', () => {
            const layer = L.gridLayer.relief({
                mode: 'tricolor',
                tricolorAzimuths: [0, 120, 240],
            });
            expect(layer.options.tricolorAzimuths).toEqual([0, 120, 240]);
        });
    });

    describe('Hillshade Constants', () => {
        it('should compute hillshade constants correctly', () => {
            const layer = L.gridLayer.relief({
                hillshadeAzimuth: 315,
                hillshadeElevation: 45,
            });
            // Constants should be computed based on azimuth and elevation
            expect(layer._state.hillshadeA1).toBeDefined();
            expect(layer._state.hillshadeA2).toBeDefined();
            expect(layer._state.hillshadeA3).toBeDefined();
        });

        it('should recompute constants with different angles', () => {
            const layer = L.gridLayer.relief({
                hillshadeAzimuth: 180,
                hillshadeElevation: 30,
            });
            expect(layer._state.hillshadeA1).toBeDefined();
            // Should have different values than defaults
            const defaultLayer = L.gridLayer.relief();
            expect(layer._state.hillshadeA1).not.toBe(defaultLayer._state.hillshadeA1);
        });
    });

    describe('Archeo Constants', () => {
        it('should compute one constant pair per azimuth', () => {
            const layer = L.gridLayer.relief({ mode: 'archeo' });
            expect(layer._state.archeoA2).toHaveLength(4);
            expect(layer._state.archeoA3).toHaveLength(4);
            expect(layer._state.archeoA1).toBeCloseTo(Math.sin(Math.PI / 4), 5);
        });

        it('should compute correct constants for azimuth 360 at elevation 45', () => {
            const layer = L.gridLayer.relief({
                mode: 'archeo',
                archeoAzimuths: [360],
                archeoElevation: 45,
            });
            expect(layer._state.archeoA1).toBeCloseTo(0.7071, 3);
            expect(layer._state.archeoA2[0]).toBeCloseTo(0, 3);
            expect(layer._state.archeoA3[0]).toBeCloseTo(0.7071, 3);
        });
    });

    describe('Tricolor Constants', () => {
        it('should compute one constant pair per channel', () => {
            const layer = L.gridLayer.relief({ mode: 'tricolor' });
            expect(layer._state.tricolorA2).toHaveLength(3);
            expect(layer._state.tricolorA3).toHaveLength(3);
            expect(layer._state.tricolorA1).toBeCloseTo(Math.sin((35 * Math.PI) / 180), 5);
        });
    });

    describe('Tile Creation', () => {
        it('should create a canvas element for tile', () => {
            const layer = L.gridLayer.relief() as any;
            const coords = { x: 0, y: 0, z: 0 } as L.Coords;
            const done = vi.fn();

            const tile = layer.createTile(coords, done) as HTMLCanvasElement;

            expect(tile).toBeInstanceOf(HTMLCanvasElement);
            expect(tile.width).toBe(256);
            expect(tile.height).toBe(256);
        });

        it('should fetch elevation data when creating tile', async () => {
            const layer = L.gridLayer.relief() as any;
            const coords = { x: 0, y: 0, z: 0 } as L.Coords;
            const done = vi.fn();

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
            const done = vi.fn();
            layer.createTile(coords, done);

            // Should have abort controllers map
            expect(layer._state.abortControllers).toBeDefined();
            expect(layer._state.abortControllers.size).toBeGreaterThanOrEqual(0);

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

        it('should have mapterhorn elevation extractor matching terrarium', () => {
            expect(L.GridLayer.Relief.elevationExtractors.mapterhorn).toBeDefined();
            expect(L.GridLayer.Relief.elevationExtractors.mapterhorn).toBe(
                L.GridLayer.Relief.elevationExtractors.terrarium
            );
        });
    });

    describe('Elevation URLs', () => {
        it('should have terrarium elevation URL', () => {
            expect(L.GridLayer.Relief.elevationUrls.terrarium).toBeDefined();
        });

        it('should have mapterhorn elevation URL', () => {
            expect(L.GridLayer.Relief.elevationUrls.mapterhorn).toBeDefined();
            expect(L.GridLayer.Relief.elevationUrls.mapterhorn).toContain('mapterhorn.com');
            expect(L.GridLayer.Relief.elevationUrls.mapterhorn).toContain('.webp');
        });

        it('should build an IGN WMS request covering exactly one tile', () => {
            const url = L.GridLayer.Relief.elevationUrls.ignLidarHdMnt(16, 33810, 23526, 256);
            const params = new URLSearchParams(url.split('?')[1]);

            expect(url).toContain('https://data.geopf.fr/wms-r/wms?');
            expect(params.get('LAYERS')).toBe(
                'IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.WGS84G'
            );
            expect(params.get('FORMAT')).toBe('image/x-bil;bits=32');
            // EPSG:3857 is accepted but resampled one row out of two, which bands the
            // hillshade; the request has to stay in EPSG:4326.
            expect(params.get('CRS')).toBe('EPSG:4326');
            expect(params.get('WIDTH')).toBe('256');
            expect(params.get('HEIGHT')).toBe('256');

            // Geographic bounds of tile 16/33810/23526, over Grenoble. WMS 1.3.0 orders
            // EPSG:4326 axes latitude first: south, west, north, east.
            const bbox = params.get('BBOX')!.split(',').map(Number);
            expect(bbox[0]).toBeCloseTo(45.18591, 4);
            expect(bbox[1]).toBeCloseTo(5.72388, 4);
            expect(bbox[2]).toBeCloseTo(45.18978, 4);
            expect(bbox[3]).toBeCloseTo(5.72937, 4);
        });

        it('should size the IGN request after the tile size', () => {
            const url = L.GridLayer.Relief.elevationUrls.ignLidarHdMns(16, 33810, 23526, 512);
            const params = new URLSearchParams(url.split('?')[1]);

            expect(params.get('LAYERS')).toBe(
                'IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.WGS84G'
            );
            expect(params.get('WIDTH')).toBe('512');
            expect(params.get('HEIGHT')).toBe('512');
        });
    });

    describe('Elevation Tile Decoders', () => {
        const bil32 = L.GridLayer.Relief.elevationTileDecoders.bil32;

        // One BIL tile: little-endian float32 samples, no header, row-major.
        const bilTile = (values: number[], sampleCount: number) => {
            const buffer = new ArrayBuffer(sampleCount * 4);
            const view = new DataView(buffer);
            values.forEach((value, index) => view.setFloat32(index * 4, value, true));
            return buffer;
        };

        it('should decode little-endian float32 samples to metres', () => {
            const decoded = bil32(bilTile([211.25, 1234.5], 4), 2);

            expect(decoded).toBeInstanceOf(Float32Array);
            expect(decoded).toHaveLength(4);
            expect(decoded[0]).toBeCloseTo(211.25, 4);
            expect(decoded[1]).toBeCloseTo(1234.5, 4);
        });

        it('should not read the payload in the platform byte order', () => {
            const buffer = new ArrayBuffer(4);
            // Big-endian 211.25 must not decode to 211.25.
            new DataView(buffer).setFloat32(0, 211.25, false);

            expect(bil32(buffer, 1)[0]).not.toBeCloseTo(211.25, 4);
        });

        it('should map the no-data value to zero', () => {
            const decoded = bil32(bilTile([-9999, -9999.5, 12], 4), 2);

            expect(decoded[0]).toBe(0);
            expect(decoded[1]).toBe(0);
            expect(decoded[2]).toBeCloseTo(12, 4);
        });

        it('should keep ground at sea level above the no-data threshold', () => {
            // The renderer drops every sample <= 0, so a shoreline sitting at zero
            // would be punched out of the tile without this clamp.
            const decoded = bil32(bilTile([0, -0.4], 4), 2);

            expect(decoded[0]).toBeGreaterThan(0);
            expect(decoded[0]).toBeLessThan(0.1);
            expect(decoded[1]).toBeGreaterThan(0);
        });

        it('should leave the tail as no-data when the payload is short', () => {
            const decoded = bil32(bilTile([300, 301], 2), 2);

            expect(decoded).toHaveLength(4);
            expect(decoded[0]).toBeCloseTo(300, 4);
            expect(decoded[2]).toBe(0);
            expect(decoded[3]).toBe(0);
        });
    });

    describe('Max native zoom', () => {
        it('should expose max native zoom per elevation source', () => {
            expect(L.GridLayer.Relief.elevationMaxNativeZooms.mapterhorn).toBe(17);
            expect(L.GridLayer.Relief.elevationMaxNativeZooms.terrarium).toBe(15);
            expect(L.GridLayer.Relief.elevationMaxNativeZooms.mapbox).toBe(15);
            expect(L.GridLayer.Relief.elevationMaxNativeZooms.ignLidarHd).toBe(17);
        });

        it('should use the IGN max native zoom for both LiDAR HD layers', () => {
            expect(
                L.gridLayer.relief({
                    elevationUrl: L.GridLayer.Relief.elevationUrls.ignLidarHdMnt,
                }).options.maxNativeZoom
            ).toBe(17);
            expect(
                L.gridLayer.relief({
                    elevationUrl: L.GridLayer.Relief.elevationUrls.ignLidarHdMns,
                }).options.maxNativeZoom
            ).toBe(17);
        });

        it('should default to the mapterhorn max native zoom', () => {
            const layer = L.gridLayer.relief();
            expect(layer.options.maxNativeZoom).toBe(17);
        });

        it('should use the terrarium max native zoom when using the terrarium URL', () => {
            const layer = L.gridLayer.relief({
                elevationUrl: L.GridLayer.Relief.elevationUrls.terrarium,
            });
            expect(layer.options.maxNativeZoom).toBe(15);
        });

        it('should not clamp custom elevation sources', () => {
            const layer = L.gridLayer.relief({
                elevationUrl: 'https://example.com/tiles/{z}/{x}/{y}.png',
            });
            expect(layer.options.maxNativeZoom).toBeUndefined();
        });

        it('should keep an explicit maxNativeZoom', () => {
            const layer = L.gridLayer.relief({ maxNativeZoom: 12 });
            expect(layer.options.maxNativeZoom).toBe(12);
        });
    });

    describe('Elevation Attributions', () => {
        it('should have terrarium attribution', () => {
            expect(L.GridLayer.Relief.elevationAttributions.terrarium).toBeDefined();
            expect(L.GridLayer.Relief.elevationAttributions.terrarium).toContain('Mapzen');
        });

        it('should have mapbox attribution', () => {
            expect(L.GridLayer.Relief.elevationAttributions.mapbox).toBeDefined();
            expect(L.GridLayer.Relief.elevationAttributions.mapbox).toContain('Mapbox');
        });

        it('should have mapterhorn attribution', () => {
            expect(L.GridLayer.Relief.elevationAttributions.mapterhorn).toBeDefined();
            expect(L.GridLayer.Relief.elevationAttributions.mapterhorn).toContain('mapterhorn.com');
        });

        it('should have IGN LiDAR HD attribution', () => {
            expect(L.GridLayer.Relief.elevationAttributions.ignLidarHd).toBeDefined();
            expect(L.GridLayer.Relief.elevationAttributions.ignLidarHd).toContain('IGN');
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

        it('should get elevation from 512x512 tile data', () => {
            const layer = L.gridLayer.relief({ tileSize: 512 });
            const tileData = new Uint8ClampedArray(512 * 512 * 4);
            // Set pixel at (j=1, i=0): pixelIndex = (0*512 + 1)*4 = 4
            tileData[4] = 128; // R
            tileData[5] = 0; // G
            tileData[6] = 0; // B
            tileData[7] = 255; // A

            const elevation = layer._getElevation(tileData, 1, 0);
            expect(elevation).toBeCloseTo(0, 1);
        });
    });

    describe('Canvas Pool Management', () => {
        beforeEach(() => {
            // Clear timers between tests
            vi.clearAllTimers();
        });

        afterEach(() => {
            // Clear timers after tests
            vi.clearAllTimers();
        });

        it('should handle canvas pool operations without errors', () => {
            // Use fake timers to control the idle timeout
            vi.useFakeTimers();

            const layer = L.gridLayer.relief() as any;

            // Create multiple tiles to potentially grow the canvas pool
            const coords1 = { x: 0, y: 0, z: 0 } as L.Coords;
            const coords2 = { x: 1, y: 0, z: 0 } as L.Coords;
            const coords3 = { x: 0, y: 1, z: 0 } as L.Coords;

            const done1 = vi.fn();
            const done2 = vi.fn();
            const done3 = vi.fn();

            // Create tiles (this should acquire canvases from pool)
            const tile1 = layer.createTile(coords1, done1);
            const tile2 = layer.createTile(coords2, done2);
            const tile3 = layer.createTile(coords3, done3);

            // Verify tiles were created
            expect(tile1).toBeInstanceOf(HTMLCanvasElement);
            expect(tile2).toBeInstanceOf(HTMLCanvasElement);
            expect(tile3).toBeInstanceOf(HTMLCanvasElement);

            // Fast forward time to trigger canvas pool trimming
            // The idle timeout is 30 seconds, so advance by 35 seconds
            vi.advanceTimersByTime(35000);

            // Should not throw errors during pool trimming
            expect(() => {
                vi.runAllTimers();
            }).not.toThrow();

            vi.useRealTimers();
        });

        it('should manage canvas pool lifecycle correctly', () => {
            vi.useFakeTimers();

            const layer = L.gridLayer.relief() as any;

            // Create a tile to initialize pool usage
            const coords = { x: 0, y: 0, z: 0 } as L.Coords;
            const done = vi.fn();

            const tile = layer.createTile(coords, done);
            expect(tile).toBeInstanceOf(HTMLCanvasElement);

            // Unload the tile
            layer._tileUnloaded(coords);

            // Fast forward time to test pool trimming behavior
            vi.advanceTimersByTime(35000);

            // Should handle timer operations without errors
            expect(() => {
                vi.runAllTimers();
            }).not.toThrow();

            vi.useRealTimers();
        });

        it('should handle rapid tile creation and unloading', () => {
            vi.useFakeTimers();

            const layer = L.gridLayer.relief() as any;

            // Create and unload multiple tiles rapidly
            for (let i = 0; i < 10; i++) {
                const coords = { x: i, y: 0, z: 0 } as L.Coords;
                const done = vi.fn();

                const tile = layer.createTile(coords, done);
                expect(tile).toBeInstanceOf(HTMLCanvasElement);

                // Immediately unload
                layer._tileUnloaded(coords);
            }

            // Fast forward time multiple times to test pool stability
            vi.advanceTimersByTime(10000);
            vi.advanceTimersByTime(20000);
            vi.advanceTimersByTime(10000);

            // Pool should remain stable
            expect(() => {
                vi.runAllTimers();
            }).not.toThrow();

            vi.useRealTimers();
        });

        it('should handle timer cleanup on repeated operations', () => {
            vi.useFakeTimers();

            const layer = L.gridLayer.relief() as any;

            // Create tiles repeatedly to test timer reset behavior
            for (let i = 0; i < 5; i++) {
                const coords = { x: i, y: 0, z: 0 } as L.Coords;
                const done = vi.fn();

                layer.createTile(coords, done);

                // Advance time partially
                vi.advanceTimersByTime(10000);
            }

            // Final advance to trigger any pending timers
            vi.advanceTimersByTime(30000);

            expect(() => {
                vi.runAllTimers();
            }).not.toThrow();

            vi.useRealTimers();
        });
    });

    describe('Mode-specific rendering', () => {
        it('should have fillTile method for hillshade mode', () => {
            const layer = L.gridLayer.relief({ mode: 'hillshade' });
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillHillshadeTile).toBeDefined();
            expect(layer.options.mode).toBe('hillshade');
        });

        it('should have fillTile method for slope mode', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillSlopeTile).toBeDefined();
            expect(layer.options.mode).toBe('slope');
        });

        it('should have fillTile method for archeo mode', () => {
            const layer = L.gridLayer.relief({ mode: 'archeo' });
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillArcheoTile).toBeDefined();
            expect(layer.options.mode).toBe('archeo');
        });

        it('should have fillTile method for tricolor mode', () => {
            const layer = L.gridLayer.relief({ mode: 'tricolor' });
            expect(layer._fillTile).toBeDefined();
            expect(layer._fillTricolorTile).toBeDefined();
            expect(layer.options.mode).toBe('tricolor');
        });
    });

    describe('Tile Rendering', () => {
        describe('_fillSlopeTile', () => {
            it('should process tile data and fill output buffer', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                // Create test data buffers
                const outputData = new Uint8ClampedArray(256 * 256 * 4); // RGBA output
                const tileData = new Uint8ClampedArray(256 * 256 * 4); // Elevation input

                // Fill with test elevation data (terrarium format)
                // Create a simple gradient from low to high elevation
                for (let i = 0; i < 256; i++) {
                    for (let j = 0; j < 256; j++) {
                        const idx = (i * 256 + j) * 4;
                        const elevation = (i / 255) * 1000; // 0-1000m gradient

                        // Convert to terrarium RGB encoding: elevation = (R*256 + G + B/256) - 32768
                        const encoded = Math.floor(elevation + 32768);
                        tileData[idx] = Math.floor(encoded / 256); // R
                        tileData[idx + 1] = encoded % 256; // G
                        tileData[idx + 2] = 0; // B
                        tileData[idx + 3] = 255; // A
                    }
                }

                const coords = { x: 10, y: 20, z: 8 } as L.Coords;

                // Should not throw when processing
                expect(() => {
                    layer._fillSlopeTile(outputData, tileData, coords);
                }).not.toThrow();

                // Output should be modified (not all zeros)
                const hasNonZeroPixels = outputData.some(value => value > 0);
                expect(hasNonZeroPixels).toBe(true);
            });

            it('should handle flat terrain correctly', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                // Fill with uniform elevation (flat terrain)
                const flatElevation = 500; // 500m flat
                const encoded = Math.floor(flatElevation + 32768);
                for (let i = 0; i < 256 * 256 * 4; i += 4) {
                    tileData[i] = Math.floor(encoded / 256); // R
                    tileData[i + 1] = encoded % 256; // G
                    tileData[i + 2] = 0; // B
                    tileData[i + 3] = 255; // A
                }

                const coords = { x: 0, y: 0, z: 10 } as L.Coords;
                layer._fillSlopeTile(outputData, tileData, coords);

                // Most pixels should be transparent for flat terrain
                let transparentPixels = 0;
                for (let i = 3; i < outputData.length; i += 4) {
                    if (outputData[i] === 0) {
                        transparentPixels++;
                    }
                }

                // Expect most pixels to be transparent (> 90%)
                expect(transparentPixels / (256 * 256)).toBeGreaterThan(0.9);
            });

            it('should handle varied terrain correctly', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                // Create varied terrain with different slopes
                for (let i = 0; i < 256; i++) {
                    for (let j = 0; j < 256; j++) {
                        const idx = (i * 256 + j) * 4;
                        let elevation;

                        if (i < 128) {
                            // First half: gentle slope
                            elevation = i * 2;
                        } else {
                            // Second half: steep slope
                            elevation = (i - 128) * 10;
                        }

                        const encoded = Math.floor(elevation + 32768);
                        tileData[idx] = Math.floor(encoded / 256);
                        tileData[idx + 1] = encoded % 256;
                        tileData[idx + 2] = 0;
                        tileData[idx + 3] = 255;
                    }
                }

                const coords = { x: 5, y: 10, z: 12 } as L.Coords;
                layer._fillSlopeTile(outputData, tileData, coords);

                // Should have mix of transparent and colored pixels
                let transparentPixels = 0;
                let coloredPixels = 0;

                for (let i = 3; i < outputData.length; i += 4) {
                    if (outputData[i] === 0) {
                        transparentPixels++;
                    } else if (outputData[i] === 255) {
                        coloredPixels++;
                    }
                }

                // Should have both transparent and colored pixels
                expect(transparentPixels).toBeGreaterThan(0);
                expect(coloredPixels).toBeGreaterThan(0);
            });

            it('should respect zoom level for pixel scale calculations', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                const outputData1 = new Uint8ClampedArray(256 * 256 * 4);
                const outputData2 = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                // Create moderate slope terrain
                for (let i = 0; i < 256; i++) {
                    for (let j = 0; j < 256; j++) {
                        const idx = (i * 256 + j) * 4;
                        const elevation = i * 3; // Moderate slope

                        const encoded = Math.floor(elevation + 32768);
                        tileData[idx] = Math.floor(encoded / 256);
                        tileData[idx + 1] = encoded % 256;
                        tileData[idx + 2] = 0;
                        tileData[idx + 3] = 255;
                    }
                }

                // Same location, different zoom levels
                const coordsZ8 = { x: 100, y: 50, z: 8 } as L.Coords; // Lower zoom (larger pixels)
                const coordsZ15 = { x: 100, y: 50, z: 15 } as L.Coords; // Higher zoom (smaller pixels)

                layer._fillSlopeTile(outputData1, tileData, coordsZ8);
                layer._fillSlopeTile(outputData2, tileData, coordsZ15);

                // Both should process without error
                const hasPixels1 = outputData1.some(value => value > 0);
                const hasPixels2 = outputData2.some(value => value > 0);

                expect(hasPixels1).toBe(true);
                expect(hasPixels2).toBe(true);
            });

            it('should handle abort signal correctly', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                // Create simple test data
                for (let i = 0; i < tileData.length; i += 4) {
                    tileData[i] = 128; // R
                    tileData[i + 1] = 0; // G
                    tileData[i + 2] = 0; // B
                    tileData[i + 3] = 255; // A
                }

                const coords = { x: 0, y: 0, z: 10 } as L.Coords;

                // Create an already-aborted signal
                const abortController = new AbortController();
                abortController.abort();

                // Should throw AbortError when signal is already aborted
                expect(() => {
                    layer._fillSlopeTile(outputData, tileData, coords, abortController.signal);
                }).toThrow();
            });

            it('should use custom slope color function', () => {
                // Custom function that returns red for any slope > 1 degree
                const customColorFunction = (slope: number): [number, number, number] => {
                    return slope > 1 ? [255, 0, 0] : [0, 0, 255];
                };

                const layer = L.gridLayer.relief({
                    mode: 'slope',
                    slopeColorFunction: customColorFunction,
                });

                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                // Create steep terrain that should trigger coloring
                for (let i = 0; i < 256; i++) {
                    for (let j = 0; j < 256; j++) {
                        const idx = (i * 256 + j) * 4;
                        const elevation = i * 10; // Steep slope

                        const encoded = Math.floor(elevation + 32768);
                        tileData[idx] = Math.floor(encoded / 256);
                        tileData[idx + 1] = encoded % 256;
                        tileData[idx + 2] = 0;
                        tileData[idx + 3] = 255;
                    }
                }

                const coords = { x: 0, y: 0, z: 10 } as L.Coords;
                layer._fillSlopeTile(outputData, tileData, coords);

                // Should have colored pixels with custom colors
                let redPixels = 0;
                for (let i = 0; i < outputData.length; i += 4) {
                    if (
                        outputData[i] === 255 &&
                        outputData[i + 1] === 0 &&
                        outputData[i + 2] === 0 &&
                        outputData[i + 3] === 255
                    ) {
                        redPixels++;
                    }
                }

                expect(redPixels).toBeGreaterThan(0);
            });

            it('should handle edge pixels correctly', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                // Create terrain with interesting features at edges
                for (let i = 0; i < 256; i++) {
                    for (let j = 0; j < 256; j++) {
                        const idx = (i * 256 + j) * 4;
                        let elevation = 100; // Base elevation

                        // Add steep features at edges
                        if (i === 0 || i === 255 || j === 0 || j === 255) {
                            elevation = 1000; // High edge
                        }

                        const encoded = Math.floor(elevation + 32768);
                        tileData[idx] = Math.floor(encoded / 256);
                        tileData[idx + 1] = encoded % 256;
                        tileData[idx + 2] = 0;
                        tileData[idx + 3] = 255;
                    }
                }

                const coords = { x: 0, y: 0, z: 10 } as L.Coords;

                // Should process edge pixels without throwing
                expect(() => {
                    layer._fillSlopeTile(outputData, tileData, coords);
                }).not.toThrow();

                // Should produce some colored output
                const hasColoredPixels = outputData.some(
                    (value, idx) => idx % 4 === 3 && value === 255
                );
                expect(hasColoredPixels).toBe(true);
            });
        });
    });

    describe('Color Function Creation', () => {
        describe('_createSlopeColorFunction', () => {
            it('should create a function that returns correct colors for slope ranges', () => {
                const colorConfig = [
                    { slope: { min: 0, max: 10 }, h: { min: 120, max: 60 } }, // Green to yellow
                    { slope: { min: 10, max: 30 }, h: { min: 60, max: 0 } }, // Yellow to red
                ];

                const layer = L.gridLayer.relief({
                    mode: 'slope',
                    slopeColorConfig: colorConfig,
                });
                const colorFunction = layer.options.slopeColorFunction;
                expect(colorFunction).toBeDefined();

                // Test slope below first range - should use first range h.min
                const flatColor = colorFunction!(0);
                expect(flatColor).toHaveLength(3);
                expect(flatColor).toEqual(
                    expect.arrayContaining([
                        expect.any(Number),
                        expect.any(Number),
                        expect.any(Number),
                    ])
                );

                // Test slope in first range
                const gentleColor = colorFunction!(5);
                expect(gentleColor).toHaveLength(3);

                // Test slope in second range
                const moderateColor = colorFunction!(20);
                expect(moderateColor).toHaveLength(3);

                // Test slope above last range - should use last range h.max
                const steepColor = colorFunction!(50);
                expect(steepColor).toHaveLength(3);
            });

            it('should handle edge case slopes correctly', () => {
                const colorConfig = [
                    { slope: { min: 5, max: 15 }, h: { min: 120, max: 60 } },
                    { slope: { min: 15, max: 45 }, h: { min: 60, max: 0 } },
                ];

                const layer = L.gridLayer.relief({
                    mode: 'slope',
                    slopeColorConfig: colorConfig,
                });
                const colorFunction = layer.options.slopeColorFunction;
                expect(colorFunction).toBeDefined();

                // Below minimum range
                const belowMin = colorFunction!(2);
                const atMin = colorFunction!(5);
                expect(belowMin).toEqual(atMin); // Should use same color as minimum

                // Above maximum range
                const aboveMax = colorFunction!(100);
                const atMax = colorFunction!(45);
                expect(aboveMax).toEqual(atMax); // Should use same color as maximum
            });

            it('should interpolate colors within ranges', () => {
                const colorConfig = [
                    { slope: { min: 0, max: 20 }, h: { min: 120, max: 0 } }, // Green to red
                ];

                const layer = L.gridLayer.relief({
                    mode: 'slope',
                    slopeColorConfig: colorConfig,
                });
                const colorFunction = layer.options.slopeColorFunction;
                expect(colorFunction).toBeDefined();

                const color1 = colorFunction!(0); // Should be closer to green (h=120)
                const color2 = colorFunction!(10); // Should be in middle
                const color3 = colorFunction!(20); // Should be closer to red (h=0)

                // Colors should be different as they interpolate across the range
                expect(color1).not.toEqual(color2);
                expect(color2).not.toEqual(color3);
                expect(color1).not.toEqual(color3);
            });

            it('should work with preset color schemes', () => {
                const schemes = ['default', 'glacial', 'thermal', 'earth'] as const;

                schemes.forEach(scheme => {
                    const layer = L.gridLayer.relief({
                        mode: 'slope',
                        slopeColorScheme: scheme,
                    });
                    const colorFunction = layer.options.slopeColorFunction;

                    expect(colorFunction).toBeDefined();
                    expect(typeof colorFunction).toBe('function');

                    // Test that function returns valid RGB values
                    const color = colorFunction!(15);
                    expect(color).toHaveLength(3);
                    expect(color[0]).toBeGreaterThanOrEqual(0);
                    expect(color[0]).toBeLessThanOrEqual(255);
                    expect(color[1]).toBeGreaterThanOrEqual(0);
                    expect(color[1]).toBeLessThanOrEqual(255);
                    expect(color[2]).toBeGreaterThanOrEqual(0);
                    expect(color[2]).toBeLessThanOrEqual(255);
                });
            });
        });

        describe('_createHillshadeColor', () => {
            it('should compute hillshade lighting intensity correctly', () => {
                const layer = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeAzimuth: 315,
                    hillshadeElevation: 45,
                });

                // Test flat terrain (all elevations equal)
                const flatTerrain = [100, 100, 100, 100, 100, 100, 100, 100, 100];
                const flatColor = layer._createHillshadeColor(flatTerrain, PIXEL_SIZE_METERS);

                expect(flatColor).toHaveLength(4);
                expect(flatColor[3]).toBe(255); // Alpha should be 255
                // Flat terrain should have moderate lighting
                expect(flatColor[0]).toBeGreaterThan(0);
                expect(flatColor[1]).toBeGreaterThan(0);
                expect(flatColor[2]).toBeGreaterThan(0);
            });

            it('should handle sloped terrain differently than flat terrain', () => {
                const layer = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeAzimuth: 315,
                    hillshadeElevation: 45,
                });

                // Flat terrain
                const flatTerrain = [100, 100, 100, 100, 100, 100, 100, 100, 100];
                const flatColor = layer._createHillshadeColor(flatTerrain, PIXEL_SIZE_METERS);

                // Sloped terrain (northwest facing slope - should be brighter with NW sun)
                const slopedTerrain = [50, 75, 100, 50, 75, 100, 50, 75, 100];
                const slopedColor = layer._createHillshadeColor(slopedTerrain, PIXEL_SIZE_METERS);

                expect(flatColor).not.toEqual(slopedColor);
                // Both should have valid RGBA values
                expect(flatColor[0]).toBeGreaterThanOrEqual(0);
                expect(flatColor[0]).toBeLessThanOrEqual(255);
                expect(slopedColor[0]).toBeGreaterThanOrEqual(0);
                expect(slopedColor[0]).toBeLessThanOrEqual(255);
            });

            it('should respond to different sun positions', () => {
                // Layer with sun from northwest (315°)
                const layerNW = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeAzimuth: 315,
                    hillshadeElevation: 45,
                });

                // Layer with sun from southeast (135°)
                const layerSE = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeAzimuth: 135,
                    hillshadeElevation: 45,
                });

                // Same terrain for both
                const terrain = [50, 75, 100, 50, 75, 100, 50, 75, 100]; // NW-facing slope

                const colorNW = layerNW._createHillshadeColor(terrain, PIXEL_SIZE_METERS);
                const colorSE = layerSE._createHillshadeColor(terrain, PIXEL_SIZE_METERS);

                // Different sun positions should produce different lighting
                expect(colorNW).not.toEqual(colorSE);
            });

            it('should ensure lighting values are bounded correctly', () => {
                const layer = L.gridLayer.relief({ mode: 'hillshade' });

                // Test various terrain configurations
                const testTerrains = [
                    [0, 0, 0, 0, 0, 0, 0, 0, 0], // All zeros
                    [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000], // High flat
                    [0, 500, 1000, 0, 500, 1000, 0, 500, 1000], // Steep gradient
                    [1000, 500, 0, 1000, 500, 0, 1000, 500, 0], // Opposite gradient
                ];

                testTerrains.forEach(terrain => {
                    const color = layer._createHillshadeColor(terrain, PIXEL_SIZE_METERS);

                    // All color values should be valid
                    expect(color[0]).toBeGreaterThanOrEqual(0);
                    expect(color[0]).toBeLessThanOrEqual(255);
                    expect(color[1]).toBeGreaterThanOrEqual(0);
                    expect(color[1]).toBeLessThanOrEqual(255);
                    expect(color[2]).toBeGreaterThanOrEqual(0);
                    expect(color[2]).toBeLessThanOrEqual(255);
                    expect(color[3]).toBe(255); // Alpha should always be 255
                });
            });

            it('should use custom hillshade color function when provided', () => {
                // Custom color function that returns red tint
                const customColorFunction = (intensity: number) =>
                    [
                        Math.round(intensity * 255),
                        Math.round(intensity * 128), // Less green
                        Math.round(intensity * 128), // Less blue
                    ] as [number, number, number];

                const layer = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeColorFunction: customColorFunction,
                });

                const terrain = [100, 100, 100, 100, 100, 100, 100, 100, 100];
                const color = layer._createHillshadeColor(terrain, PIXEL_SIZE_METERS);

                // Should have red tint (R >= G and R >= B for non-zero intensities)
                if (color[0] > 0) {
                    expect(color[0]).toBeGreaterThanOrEqual(color[1]);
                    expect(color[0]).toBeGreaterThanOrEqual(color[2]);
                }
            });
        });

        describe('hillshade zoom independence', () => {
            // Build a 3x3 elevation window for a constant physical slope (rise/run),
            // sampled at a DEM resolution of `pixelSizeMeters` per pixel.
            const terrainForResolution = (grade: number, pixelSizeMeters: number): number[] => {
                const step = grade * pixelSizeMeters;
                return [0, 1, 2, 0, 1, 2, 0, 1, 2].map(column => 1000 + column * step);
            };

            it('should shade identical physical slopes identically across zoom levels', () => {
                const layer = L.gridLayer.relief({ mode: 'hillshade' });

                const coarse = 40; // ~zoom 11 at the equator with 256px tiles
                const fine = 2.5; // ~zoom 15 at the equator with 256px tiles

                const coarseColor = layer._createHillshadeColor(
                    terrainForResolution(0.3, coarse),
                    coarse
                );
                const fineColor = layer._createHillshadeColor(
                    terrainForResolution(0.3, fine),
                    fine
                );

                expect(fineColor).toEqual(coarseColor);
            });

            it('should not fade towards flat shading as the pixel size shrinks', () => {
                const layer = L.gridLayer.relief({ mode: 'hillshade' });

                const flatTerrain = [100, 100, 100, 100, 100, 100, 100, 100, 100];
                const flatColor = layer._createHillshadeColor(flatTerrain, 1);

                // A 30% slope must stay clearly distinct from flat terrain at every zoom
                [40, 20, 10, 5, 2.5, 1.2].forEach(pixelSizeMeters => {
                    const color = layer._createHillshadeColor(
                        terrainForResolution(0.3, pixelSizeMeters),
                        pixelSizeMeters
                    );
                    expect(Math.abs(color[0] - flatColor[0])).toBeGreaterThan(10);
                });
            });

            it('should scale hillshade gradients by tile zoom level', () => {
                const layer = L.gridLayer.relief({ mode: 'hillshade' });

                const outputLowZoom = new Uint8ClampedArray(256 * 256 * 4);
                const outputHighZoom = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);

                for (let i = 0; i < 256; i++) {
                    for (let j = 0; j < 256; j++) {
                        const idx = (i * 256 + j) * 4;
                        const encoded = Math.floor(500 + i * 2 + 32768);
                        tileData[idx] = Math.floor(encoded / 256);
                        tileData[idx + 1] = encoded % 256;
                        tileData[idx + 2] = 0;
                        tileData[idx + 3] = 255;
                    }
                }

                layer._fillHillshadeTile(outputLowZoom, tileData, {
                    x: 100,
                    y: 50,
                    z: 8,
                } as L.Coords);
                layer._fillHillshadeTile(outputHighZoom, tileData, {
                    x: 100,
                    y: 50,
                    z: 15,
                } as L.Coords);

                // Identical DEM samples cover far less ground at z15, so the same
                // elevation deltas describe a much steeper slope and shade differently.
                expect(Array.from(outputHighZoom)).not.toEqual(Array.from(outputLowZoom));
            });

            it('should default hillshadeExaggeration to 1 and accept overrides', () => {
                const layer = L.gridLayer.relief({ mode: 'hillshade' });
                expect(layer.options.hillshadeExaggeration).toBe(1);

                const exaggerated = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeExaggeration: 2,
                });
                expect(exaggerated.options.hillshadeExaggeration).toBe(2);

                const terrain = terrainForResolution(0.1, 10);
                expect(exaggerated._createHillshadeColor(terrain, 10)).not.toEqual(
                    layer._createHillshadeColor(terrain, 10)
                );
            });

            it('should behave like flat terrain when exaggeration is zero', () => {
                const layer = L.gridLayer.relief({
                    mode: 'hillshade',
                    hillshadeExaggeration: 0,
                });

                const flatTerrain = [100, 100, 100, 100, 100, 100, 100, 100, 100];
                const steepTerrain = terrainForResolution(1, 10);

                expect(layer._createHillshadeColor(steepTerrain, 10)).toEqual(
                    layer._createHillshadeColor(flatTerrain, 10)
                );
            });
        });

        describe('_createSlopeColor', () => {
            it('should return transparent color for very flat terrain', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                // Completely flat terrain
                const flatTerrain = [100, 100, 100, 100, 100, 100, 100, 100, 100];
                const pixelSizeMeters = 10; // arbitrary scale

                const color = layer._createSlopeColor(flatTerrain, pixelSizeMeters);

                expect(color).toHaveLength(4);
                expect(color[3]).toBe(0); // Should be transparent (alpha = 0) for flat terrain
                expect(color).toEqual([0, 0, 0, 0]);
            });

            it('should return colored pixels for sloped terrain', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                // Moderate slope terrain
                const slopedTerrain = [0, 50, 100, 0, 50, 100, 0, 50, 100];
                const pixelSizeMeters = 10;

                const color = layer._createSlopeColor(slopedTerrain, pixelSizeMeters);

                expect(color).toHaveLength(4);
                expect(color[3]).toBe(255); // Should be opaque for sloped terrain
                // RGB values should be valid
                expect(color[0]).toBeGreaterThanOrEqual(0);
                expect(color[0]).toBeLessThanOrEqual(255);
                expect(color[1]).toBeGreaterThanOrEqual(0);
                expect(color[1]).toBeLessThanOrEqual(255);
                expect(color[2]).toBeGreaterThanOrEqual(0);
                expect(color[2]).toBeLessThanOrEqual(255);
            });

            it('should respond to different pixel scales', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });

                // Same terrain, different pixel scales
                const terrain = [0, 25, 50, 0, 25, 50, 0, 25, 50];
                const smallScale = 5; // Smaller pixels = steeper perceived slope
                const largeScale = 20; // Larger pixels = gentler perceived slope

                const colorSmall = layer._createSlopeColor(terrain, smallScale);
                const colorLarge = layer._createSlopeColor(terrain, largeScale);

                // Different scales should potentially produce different colors
                // (slope calculation depends on pixel size)
                expect(colorSmall).toHaveLength(4);
                expect(colorLarge).toHaveLength(4);
            });

            it('should use the configured slope color function', () => {
                // Custom slope color function that always returns red
                const redSlopeFunction = (_slope: number) =>
                    [255, 0, 0] as [number, number, number];
                const layer = L.gridLayer.relief({
                    mode: 'slope',
                    slopeColorFunction: redSlopeFunction,
                });

                // Steep terrain that should trigger coloring
                const steepTerrain = [0, 100, 200, 0, 100, 200, 0, 100, 200];
                const pixelSizeMeters = 10;

                const color = layer._createSlopeColor(steepTerrain, pixelSizeMeters);

                if (color[3] === 255) {
                    // If not transparent
                    expect(color[0]).toBe(255); // Should be red
                    expect(color[1]).toBe(0);
                    expect(color[2]).toBe(0);
                }
            });

            it('should handle extreme terrain configurations', () => {
                const layer = L.gridLayer.relief({ mode: 'slope' });
                const pixelSizeMeters = 10;

                const extremeTerrains = [
                    [0, 0, 0, 0, 0, 0, 0, 0, 0], // All zeros
                    [1000, 0, 1000, 0, 1000, 0, 1000, 0, 1000], // Alternating high/low
                    [0, 500, 1000, 1500, 2000, 1500, 1000, 500, 0], // Mountain shape
                ];

                extremeTerrains.forEach(terrain => {
                    const color = layer._createSlopeColor(terrain, pixelSizeMeters);

                    // Should always return valid RGBA
                    expect(color).toHaveLength(4);
                    expect(color[0]).toBeGreaterThanOrEqual(0);
                    expect(color[0]).toBeLessThanOrEqual(255);
                    expect(color[1]).toBeGreaterThanOrEqual(0);
                    expect(color[1]).toBeLessThanOrEqual(255);
                    expect(color[2]).toBeGreaterThanOrEqual(0);
                    expect(color[2]).toBeLessThanOrEqual(255);
                    expect([0, 255]).toContain(color[3]); // Alpha should be 0 or 255
                });
            });
        });
    });

    describe('Elevation data availability', () => {
        const defaultFetch = global.fetch;
        const defaultGetContext = HTMLCanvasElement.prototype.getContext;

        const flush = () => new Promise(resolve => setTimeout(resolve, 10));

        const tileResponse = (status: number) => ({
            ok: status >= 200 && status < 300,
            status,
            blob: () => Promise.resolve(new Blob([new ArrayBuffer(1024)], { type: 'image/png' })),
        });

        // Statuses keyed by zoom level: anything not listed answers 200.
        const mockFetchByZoom = (statuses: Record<number, number>) => {
            const urls: string[] = [];
            global.fetch = vi.fn((url: string) => {
                urls.push(url);
                const zoom = Number(url.split('/')[3]);
                return Promise.resolve(tileResponse(statuses[zoom] ?? 200));
            }) as any;
            return urls;
        };

        const url = 'https://example.com/{z}/{x}/{y}.png';

        afterEach(() => {
            global.fetch = defaultFetch;
            HTMLCanvasElement.prototype.getContext = defaultGetContext;
        });

        it('should decode a binary DEM without going through an image decoder', async () => {
            const buffer = new ArrayBuffer(4);
            new DataView(buffer).setFloat32(0, 750.5, true);
            const requested: string[] = [];
            global.fetch = vi.fn((tileUrl: string) => {
                requested.push(tileUrl);
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    arrayBuffer: () => Promise.resolve(buffer),
                    blob: () => {
                        throw new Error('binary DEMs must not be decoded as images');
                    },
                });
            }) as any;

            const decoder = vi.fn(() => new Float32Array(256 * 256).fill(750.5));
            const layer = L.gridLayer.relief({
                elevationUrl: url,
                elevationTileDecoder: decoder,
            }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(requested).toEqual(['https://example.com/13/3903/2709.png']);
            expect(decoder).toHaveBeenCalledWith(buffer, 256);
            expect(done).toHaveBeenCalledWith(undefined, expect.anything());
        });

        it('should not walk up to parent tiles when a decoder is set', async () => {
            // A WMS answers 200 with a no-data grid rather than 404, so the walk-up
            // would only burn requests; the parent resampler also only reads RGBA.
            const urls: string[] = [];
            global.fetch = vi.fn((tileUrl: string) => {
                urls.push(tileUrl);
                return Promise.resolve({
                    ok: false,
                    status: 404,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                });
            }) as any;

            const layer = L.gridLayer.relief({
                elevationUrl: url,
                elevationFallbackDepth: 5,
                elevationTileDecoder: L.GridLayer.Relief.elevationTileDecoders.bil32,
            }) as any;

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, vi.fn());
            await flush();

            expect(urls).toEqual(['https://example.com/13/3903/2709.png']);
        });

        it('should default the fallback depth to 5 parent levels', () => {
            expect(L.gridLayer.relief().options.elevationFallbackDepth).toBe(5);
        });

        it('should accept a custom fallback depth', () => {
            const layer = L.gridLayer.relief({ elevationFallbackDepth: 2 });
            expect(layer.options.elevationFallbackDepth).toBe(2);
        });

        it('should fall back to the parent tile when the zoom has no data', async () => {
            const urls = mockFetchByZoom({ 13: 404 });
            const layer = L.gridLayer.relief({ elevationUrl: url }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(urls).toEqual([
                'https://example.com/13/3903/2709.png',
                'https://example.com/12/1951/1354.png',
            ]);
            expect(done).toHaveBeenCalledWith(undefined, expect.anything());
        });

        it('should walk up several levels until data is found', async () => {
            const urls = mockFetchByZoom({
                17: 404,
                16: 404,
                15: 404,
                14: 404,
                13: 404,
            });
            const layer = L.gridLayer.relief({ elevationUrl: url }) as any;
            const done = vi.fn();

            layer.createTile({ x: 64, y: 64, z: 17 } as L.Coords, done);
            await flush();

            expect(urls).toHaveLength(6);
            expect(urls[5]).toBe('https://example.com/12/2/2.png');
            expect(done).toHaveBeenCalledWith(undefined, expect.anything());
        });

        it('should stop at the configured fallback depth', async () => {
            const urls = mockFetchByZoom({ 13: 404, 12: 404, 11: 404, 10: 404 });
            const layer = L.gridLayer.relief({
                elevationUrl: url,
                elevationFallbackDepth: 2,
            }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(urls).toHaveLength(3);
        });

        it('should not fall back at all when the depth is zero', async () => {
            const urls = mockFetchByZoom({ 13: 404 });
            const layer = L.gridLayer.relief({
                elevationUrl: url,
                elevationFallbackDepth: 0,
            }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(urls).toHaveLength(1);
        });

        it('should render a transparent tile without error when no zoom has data', async () => {
            mockFetchByZoom({ 13: 404, 12: 404, 11: 404, 10: 404, 9: 404, 8: 404 });
            const layer = L.gridLayer.relief({ elevationUrl: url }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(done).toHaveBeenCalledTimes(1);
            expect(done.mock.calls[0][0]).toBeUndefined();
        });

        it('should memoize missing tiles instead of re-requesting them', async () => {
            const urls = mockFetchByZoom({ 13: 404 });
            const layer = L.gridLayer.relief({ elevationUrl: url }) as any;
            const coords = { x: 3903, y: 2709, z: 13 } as L.Coords;

            layer.createTile(coords, vi.fn());
            await flush();
            layer.createTile(coords, vi.fn());
            await flush();

            expect(urls).toEqual([
                'https://example.com/13/3903/2709.png',
                'https://example.com/12/1951/1354.png',
                'https://example.com/12/1951/1354.png',
            ]);
        });

        it('should skip zooms ruled out by a missing ancestor', async () => {
            const urls = mockFetchByZoom({ 12: 404 });
            const layer = L.gridLayer.relief({ elevationUrl: url }) as any;

            // Learn that z12 has no data here.
            layer.createTile({ x: 1951, y: 1354, z: 12 } as L.Coords, vi.fn());
            await flush();
            urls.length = 0;

            // A z14 descendant cannot have data either: go straight to z11.
            layer.createTile({ x: 7804, y: 5416, z: 14 } as L.Coords, vi.fn());
            await flush();

            expect(urls).toEqual(['https://example.com/11/975/677.png']);
        });

        it('should report transient failures as errors instead of falling back', async () => {
            const urls = mockFetchByZoom({ 13: 500 });
            const layer = L.gridLayer.relief({ elevationUrl: url }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(urls).toHaveLength(1);
            expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it('should read elevations from an already decoded parent grid', () => {
            const layer = L.gridLayer.relief() as any;
            const elevations = new Float32Array(256 * 256);
            elevations[3 * 256 + 7] = 1234;

            expect(layer._getElevation(elevations, 7, 3)).toBe(1234);
        });

        it('should shade a tile upsampled from its parent', async () => {
            // Terrarium-encoded parent tile sloping along x, so every output pixel
            // has valid data and a non-zero gradient.
            const parent = new Uint8ClampedArray(256 * 256 * 4);
            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    const value = 1000 + x * 10 + 32768;
                    const index = (y * 256 + x) * 4;
                    parent[index] = Math.floor(value / 256);
                    parent[index + 1] = value % 256;
                    parent[index + 2] = 0;
                    parent[index + 3] = 255;
                }
            }

            const output = new Uint8ClampedArray(256 * 256 * 4);
            HTMLCanvasElement.prototype.getContext = vi.fn(function (type: string) {
                if (type !== '2d') {
                    return null;
                }
                return {
                    putImageData: vi.fn(),
                    createImageData: vi.fn(() => ({ data: output })),
                    drawImage: vi.fn(),
                    getImageData: vi.fn(() => ({ data: parent })),
                };
            }) as any;

            mockFetchByZoom({ 13: 404 });
            const layer = L.gridLayer.relief({
                elevationUrl: url,
                mode: 'hillshade',
            }) as any;
            const done = vi.fn();

            layer.createTile({ x: 3903, y: 2709, z: 13 } as L.Coords, done);
            await flush();

            expect(done).toHaveBeenCalledWith(undefined, expect.anything());
            // Opaque everywhere: the parent covers the whole child tile.
            expect(output[3]).toBe(255);
            expect(output[(128 * 256 + 128) * 4 + 3]).toBe(255);
        });
    });

    describe('Archeo Rendering', () => {
        const fillFlatTile = (tileData: Uint8ClampedArray, elevation: number) => {
            const encoded = Math.floor(elevation + 32768);
            for (let i = 0; i < tileData.length; i += 4) {
                tileData[i] = Math.floor(encoded / 256);
                tileData[i + 1] = encoded % 256;
                tileData[i + 2] = 0;
                tileData[i + 3] = 255;
            }
        };

        const setElevation = (
            tileData: Uint8ClampedArray,
            i: number,
            j: number,
            elevation: number
        ) => {
            const encoded = Math.floor(elevation + 32768);
            const idx = (i * 256 + j) * 4;
            tileData[idx] = Math.floor(encoded / 256);
            tileData[idx + 1] = encoded % 256;
            tileData[idx + 2] = 0;
        };

        describe('_createArcheoColor', () => {
            it('should render flat terrain as the base color', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const color = layer._createArcheoColor(new Array(9).fill(100), 5);
                expect(color[3]).toBe(255);
                // Zero gradient and zero curvature: the shading normalizes to 1 and no
                // tint is applied, so the base color comes through untouched.
                expect([color[0], color[1], color[2]]).toEqual(layer.options.archeoBaseColor);
            });

            it('should shade planar slopes without tinting them', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const flat = layer._createArcheoColor(new Array(9).fill(100), 5);
                // Uniform planes: zero Laplacian, non-zero gradient. The lights sit in
                // the western half, so one faces them (brighter than flat) and the other
                // faces away (darker) - neither may pick up a tint.
                const lit = [99, 100, 101, 99, 100, 101, 99, 100, 101];
                const dark = [101, 100, 99, 101, 100, 99, 101, 100, 99];
                const litColor = layer._createArcheoColor(lit, 5);
                const darkColor = layer._createArcheoColor(dark, 5);
                expect(darkColor[0]).toBeLessThan(flat[0]);
                expect(litColor[0]).toBeGreaterThan(flat[0]);
                // Same base hue ratios as flat terrain (no tint)
                const flatRatio = flat[2] / flat[0];
                expect(Math.abs(flatRatio - litColor[2] / litColor[0])).toBeLessThan(0.02);
                expect(Math.abs(flatRatio - darkColor[2] / darkColor[0])).toBeLessThan(0.02);
            });

            it('should tint convex terrain warm and concave terrain cool', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const bump = [100, 100, 100, 100, 103, 100, 100, 100, 100];
                const dip = [100, 100, 100, 100, 97, 100, 100, 100, 100];
                const bumpColor = layer._createArcheoColor(bump, 5);
                const dipColor = layer._createArcheoColor(dip, 5);
                expect(bumpColor[0]).toBeGreaterThan(bumpColor[2]); // warm: r > b
                expect(dipColor[2]).toBeGreaterThan(dipColor[0]); // cool: b > r
            });

            it('should tint more strongly with higher glow strength', () => {
                const weak = L.gridLayer.relief({
                    mode: 'archeo',
                    archeoGlowStrength: 0.5,
                });
                const strong = L.gridLayer.relief({
                    mode: 'archeo',
                    archeoGlowStrength: 4,
                });
                const bump = [100, 100, 100, 100, 100.5, 100, 100, 100, 100];
                const weakColor = weak._createArcheoColor(bump, 5);
                const strongColor = strong._createArcheoColor(bump, 5);
                expect(strongColor[0] - strongColor[2]).toBeGreaterThan(
                    weakColor[0] - weakColor[2]
                );
            });

            it('should scale curvature with the real-world pixel size', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const bump = [100, 100, 100, 100, 100.2, 100, 100, 100, 100];
                // Same height anomaly spread over coarser pixels: weaker tint
                const fine = layer._createArcheoColor(bump, 1);
                const coarse = layer._createArcheoColor(bump, 20);
                expect(fine[0] - fine[2]).toBeGreaterThan(coarse[0] - coarse[2]);
            });

            it('should deepen shading with archeoExaggeration', () => {
                const plane = [101, 100, 99, 101, 100, 99, 101, 100, 99];
                const plain = L.gridLayer.relief({
                    mode: 'archeo',
                    archeoExaggeration: 1,
                });
                const boosted = L.gridLayer.relief({
                    mode: 'archeo',
                    archeoExaggeration: 6,
                });
                expect(boosted._createArcheoColor(plane, 5)[0]).toBeLessThan(
                    plain._createArcheoColor(plane, 5)[0]
                );
            });

            it('should cap tint saturation on extreme curvature', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const spike = [100, 100, 100, 100, 1100, 100, 100, 100, 100];
                const color = layer._createArcheoColor(spike, 5);
                for (let i = 0; i < 3; i++) {
                    expect(color[i]).toBeGreaterThanOrEqual(0);
                    expect(color[i]).toBeLessThanOrEqual(255);
                }
                // MAX_TINT keeps a fraction of the base color: blue stays above pure warm
                expect(color[2]).toBeGreaterThan(20);
            });

            it('should honor custom warm/cool/base colors', () => {
                const layer = L.gridLayer.relief({
                    mode: 'archeo',
                    archeoWarmColor: [0, 255, 0],
                    archeoCoolColor: [255, 0, 255],
                    archeoBaseColor: [255, 255, 255],
                });
                const bump = [100, 100, 100, 100, 110, 100, 100, 100, 100];
                const color = layer._createArcheoColor(bump, 5);
                // Strong green tint from the custom warm color
                expect(color[1]).toBeGreaterThan(color[0]);
                expect(color[1]).toBeGreaterThan(color[2]);
            });
        });

        describe('_fillArcheoTile', () => {
            it('should fill valid terrain with opaque pixels', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);
                fillFlatTile(tileData, 500);

                const coords = { x: 10, y: 20, z: 8 } as L.Coords;
                expect(() => {
                    layer._fillArcheoTile(outputData, tileData, coords);
                }).not.toThrow();

                for (let i = 3; i < outputData.length; i += 4) {
                    expect(outputData[i]).toBe(255);
                }
            });

            it('should glow a central bump warm and a pit cool', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const coords = { x: 10, y: 20, z: 8 } as L.Coords;
                const centerIndex = (128 * 256 + 128) * 4;

                const bumpTile = new Uint8ClampedArray(256 * 256 * 4);
                fillFlatTile(bumpTile, 500);
                setElevation(bumpTile, 128, 128, 510);
                const bumpOutput = new Uint8ClampedArray(256 * 256 * 4);
                layer._fillArcheoTile(bumpOutput, bumpTile, coords);
                expect(bumpOutput[centerIndex]).toBeGreaterThan(bumpOutput[centerIndex + 2]);

                const pitTile = new Uint8ClampedArray(256 * 256 * 4);
                fillFlatTile(pitTile, 500);
                setElevation(pitTile, 128, 128, 490);
                const pitOutput = new Uint8ClampedArray(256 * 256 * 4);
                layer._fillArcheoTile(pitOutput, pitTile, coords);
                expect(pitOutput[centerIndex + 2]).toBeGreaterThan(pitOutput[centerIndex]);
            });

            it('should render no-data areas as transparent', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4); // all zero elevation
                const coords = { x: 10, y: 20, z: 8 } as L.Coords;
                layer._fillArcheoTile(outputData, tileData, coords);
                const hasOpaquePixel = outputData.some((v, i) => i % 4 === 3 && v !== 0);
                expect(hasOpaquePixel).toBe(false);
            });

            it('should throw AbortError when signal is aborted', () => {
                const layer = L.gridLayer.relief({ mode: 'archeo' });
                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);
                const coords = { x: 10, y: 20, z: 8 } as L.Coords;
                const controller = new AbortController();
                controller.abort();
                expect(() => {
                    layer._fillArcheoTile(outputData, tileData, coords, controller.signal);
                }).toThrow();
            });
        });

        describe('_createTricolorColor', () => {
            it('should render flat terrain as neutral gray', () => {
                const layer = L.gridLayer.relief({ mode: 'tricolor' });
                const color = layer._createTricolorColor(new Array(9).fill(100), 5);
                expect(color[3]).toBe(255);
                expect(color[0]).toBe(color[1]);
                expect(color[1]).toBe(color[2]);
                // Raw Lambertian on flat ground: sin(sun elevation)
                expect(color[0]).toBe(Math.round(255 * Math.sin((35 * Math.PI) / 180)));
            });

            it('should scale gradients with the real-world pixel size', () => {
                const layer = L.gridLayer.relief({ mode: 'tricolor' });
                const slope = [0, 10, 20, 10, 20, 30, 20, 30, 40];
                // Same slope, coarser pixels: gentler in meters, so closer to neutral
                const fine = layer._createTricolorColor(slope, 10);
                const coarse = layer._createTricolorColor(slope, 100);
                expect(Math.abs(coarse[0] - coarse[2])).toBeLessThan(Math.abs(fine[0] - fine[2]));
            });

            it('should exaggerate gradients with tricolorExaggeration', () => {
                const slope = [0, 10, 20, 10, 20, 30, 20, 30, 40];
                const plain = L.gridLayer.relief({ mode: 'tricolor' });
                const boosted = L.gridLayer.relief({
                    mode: 'tricolor',
                    tricolorExaggeration: 4,
                });
                const plainColor = plain._createTricolorColor(slope, 100);
                const boostedColor = boosted._createTricolorColor(slope, 100);
                expect(Math.abs(boostedColor[0] - boostedColor[2])).toBeGreaterThan(
                    Math.abs(plainColor[0] - plainColor[2])
                );
            });

            it('should light NW-facing slopes in the red channel', () => {
                const layer = L.gridLayer.relief({ mode: 'tricolor' });
                // Upslope toward SE: surface faces NW (lit by the 315° red channel)
                const nwFacing = [0, 10, 20, 10, 20, 30, 20, 30, 40];
                const seFacing = [40, 30, 20, 30, 20, 10, 20, 10, 0];
                const nwColor = layer._createTricolorColor(nwFacing, 50);
                const seColor = layer._createTricolorColor(seFacing, 50);
                expect(nwColor[0]).toBeGreaterThan(nwColor[2]);
                expect(seColor[2]).toBeGreaterThan(seColor[0]);
            });
        });

        describe('_fillTricolorTile', () => {
            it('should fill valid terrain with opaque colored pixels', () => {
                const layer = L.gridLayer.relief({ mode: 'tricolor' });
                const outputData = new Uint8ClampedArray(256 * 256 * 4);
                const tileData = new Uint8ClampedArray(256 * 256 * 4);
                fillFlatTile(tileData, 500);

                const coords = { x: 10, y: 20, z: 8 } as L.Coords;
                expect(() => {
                    layer._fillTricolorTile(outputData, tileData, coords);
                }).not.toThrow();
                const hasNonZeroPixels = outputData.some(value => value > 0);
                expect(hasNonZeroPixels).toBe(true);
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle invalid mode gracefully', () => {
            const layer = L.gridLayer.relief({ mode: 'invalid' as any });
            expect(layer.options.mode).toBe('invalid');
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
