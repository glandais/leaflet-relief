import * as L from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

declare global {
    interface Window {
        L: typeof L;
    }
}

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
            createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(256 * 256 * 4) })),
            drawImage: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(256 * 256 * 4) })),
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
            const layer = L.gridLayer.relief({ mode: 'slope', slopeColorFunction: colorFunc });
            expect(layer.options.slopeColorFunction).toBe(colorFunc);
        });

        it('should accept slope color config', () => {
            const colorConfig = [
                { slope: { min: 0, max: 10 }, h: { min: 120, max: 60 } },
                { slope: { min: 10, max: 30 }, h: { min: 60, max: 0 } },
            ];
            const layer = L.gridLayer.relief({ mode: 'slope', slopeColorConfig: colorConfig });
            expect(layer.options.slopeColorFunction).toBeDefined();
        });

        it('should accept preset slope color scheme', () => {
            const layer = L.gridLayer.relief({ mode: 'slope', slopeColorScheme: 'glacial' });
            expect(layer.options.slopeColorFunction).toBeDefined();
        });

        it('should use default slope color function when no config provided', () => {
            const layer = L.gridLayer.relief({ mode: 'slope' });
            expect(layer.options.slopeColorFunction).toBeDefined();
        });
    });

    describe('Hillshade Constants', () => {
        it('should compute hillshade constants correctly', () => {
            const layer = L.gridLayer.relief({ hillshadeAzimuth: 315, hillshadeElevation: 45 });
            // Constants should be computed based on azimuth and elevation
            expect(layer._state.hillshadeA1).toBeDefined();
            expect(layer._state.hillshadeA2).toBeDefined();
            expect(layer._state.hillshadeA3).toBeDefined();
        });

        it('should recompute constants with different angles', () => {
            const layer = L.gridLayer.relief({ hillshadeAzimuth: 180, hillshadeElevation: 30 });
            expect(layer._state.hillshadeA1).toBeDefined();
            // Should have different values than defaults
            const defaultLayer = L.gridLayer.relief();
            expect(layer._state.hillshadeA1).not.toBe(defaultLayer._state.hillshadeA1);
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

                const layer = L.gridLayer.relief({ mode: 'slope', slopeColorConfig: colorConfig });
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

                const layer = L.gridLayer.relief({ mode: 'slope', slopeColorConfig: colorConfig });
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

                const layer = L.gridLayer.relief({ mode: 'slope', slopeColorConfig: colorConfig });
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
                    const layer = L.gridLayer.relief({ mode: 'slope', slopeColorScheme: scheme });
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
                const flatColor = layer._createHillshadeColor(flatTerrain);

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
                const flatColor = layer._createHillshadeColor(flatTerrain);

                // Sloped terrain (northwest facing slope - should be brighter with NW sun)
                const slopedTerrain = [50, 75, 100, 50, 75, 100, 50, 75, 100];
                const slopedColor = layer._createHillshadeColor(slopedTerrain);

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

                const colorNW = layerNW._createHillshadeColor(terrain);
                const colorSE = layerSE._createHillshadeColor(terrain);

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
                    const color = layer._createHillshadeColor(terrain);

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
                const color = layer._createHillshadeColor(terrain);

                // Should have red tint (R >= G and R >= B for non-zero intensities)
                if (color[0] > 0) {
                    expect(color[0]).toBeGreaterThanOrEqual(color[1]);
                    expect(color[0]).toBeGreaterThanOrEqual(color[2]);
                }
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
