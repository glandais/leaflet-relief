import * as L from 'leaflet';

declare global {
    namespace L {
        namespace GridLayer {
            class Relief extends L.GridLayer {
                constructor(options?: ReliefOptions);
                static elevationExtractors: {
                    terrarium: ElevationExtractorFunction;
                    mapbox: ElevationExtractorFunction;
                    mapterhorn: ElevationExtractorFunction;
                };
                static elevationUrls: {
                    terrarium: ElevationUrlFunction;
                    mapterhorn: string;
                };
                static elevationAttributions: {
                    terrarium: string;
                    mapbox: string;
                    mapterhorn: string;
                };
                options: ReliefOptions;
                // Private methods
                _tileUnloaded(coords: L.Coords): void;

                _getElevation(tileData: Uint8ClampedArray, j: number, i: number): number;
                _getZ(tileData: Uint8ClampedArray, i: number, j: number): number[];

                _fillTile: (
                    data: Uint8ClampedArray,
                    tileData: Uint8ClampedArray,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ) => void;
                _doFillTile(
                    data: Uint8ClampedArray,
                    tileData: Uint8ClampedArray,
                    colorFunction: ColorFunction,
                    abortSignal?: AbortSignal
                ): void;

                _recomputeHillshadeConstants(): void;
                _createHillshadeColor(zData: number[]): [number, number, number, number];
                _fillHillshadeTile(
                    data: Uint8ClampedArray,
                    tileData: Uint8ClampedArray,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ): void;

                _createSlopeColor(
                    zData: number[],
                    pixelScaleMeters: number
                ): [number, number, number, number];
                _fillSlopeTile(
                    data: Uint8ClampedArray,
                    tileData: Uint8ClampedArray,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ): void;

                // Private properties
                _state: ReliefState;
            }
        }
        namespace gridLayer {
            function relief(options?: ReliefOptions): L.GridLayer.Relief;
        }
    }
}

export interface ReliefState {
    hillshadeA1: number;
    hillshadeA2: number;
    hillshadeA3: number;
    abortControllers: globalThis.Map<string, AbortController>;
}

// Type definitions
export interface ReliefOptions extends L.GridLayerOptions {
    mode?: 'hillshade' | 'slope';
    hillshadeAzimuth?: number;
    hillshadeElevation?: number;
    hillshadeColorFunction?: HillshadeColorFunction;
    slopeColorFunction?: SlopeColorFunction;
    slopeColorConfig?: SlopeColorConfig[];
    slopeColorScheme?: 'default' | 'glacial' | 'thermal' | 'earth';
    elevationUrl?: string | ElevationUrlFunction;
    elevationExtractor?: ElevationExtractorFunction;
}

export type HillshadeColorFunction = (intensity: number) => [number, number, number];
export type SlopeColorFunction = (slopeDegrees: number) => [number, number, number];
export type ElevationUrlFunction = (z: number, x: number, y: number) => string;
export type ElevationExtractorFunction = (r: number, g: number, b: number, a: number) => number;

type ColorFunction = (zData: number[]) => [number, number, number, number];

export interface SlopeColorConfig {
    slope: { min: number; max: number };
    h: { min: number; max: number };
}

export interface SlopeColorSchemes {
    [key: string]: SlopeColorConfig[];
}

// Internal interfaces
interface CanvasPool {
    available: HTMLCanvasElement[];
    idleSize: number;
    idleTimeout: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
    acquire(size: number): HTMLCanvasElement;
    release(canvas: HTMLCanvasElement): void;
    _resetIdleTimer(): void;
    _trim(): void;
}

// Modern ES module - no IIFE wrapper needed

const _EARTH_CIRCUMFERENCE = 40075017;
const RGBA_EMPTY: [number, number, number, number] = [0, 0, 0, 0];

// ====================== CANVAS POOL MANAGEMENT ======================

const _canvasPool: CanvasPool = {
    available: [],
    idleSize: 5,
    idleTimeout: 30000, // 30 seconds
    idleTimer: null,

    acquire(size: number): HTMLCanvasElement {
        let canvas = this.available.pop();
        if (!canvas) {
            canvas = document.createElement('canvas');
        }
        canvas.width = size;
        canvas.height = size;
        this._resetIdleTimer();
        return canvas;
    },

    release(canvas: HTMLCanvasElement): void {
        if (canvas) {
            this.available.push(canvas);
            this._resetIdleTimer();
        }
    },

    _resetIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
    },

    _trim(): void {
        while (this.available.length > this.idleSize) {
            this.available.pop();
        }
    },
};

// ====================== ELEVATION SOURCE ======================

const _mapterhornElevationUrl = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';

const _defaultElevationUrl: ElevationUrlFunction = function (
    z: number,
    x: number,
    y: number
): string {
    return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
};

const _defaultElevationExtractor: ElevationExtractorFunction = function (
    r: number,
    g: number,
    b: number,
    _a: number
): number {
    return r * 256 + g + b / 256 - 32768;
};

const _mapboxElevationExtractor: ElevationExtractorFunction = function (
    r: number,
    g: number,
    b: number,
    _a: number
): number {
    return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
};

const _getDzdx = function (z: number[], divider: number): number {
    return (z[2] + 2 * z[5] + z[8] - (z[0] + 2 * z[3] + z[6])) / (8 * divider);
};

const _getDzdy = function (z: number[], divider: number): number {
    return (z[0] + 2 * z[1] + z[2] - (z[6] + 2 * z[7] + z[8])) / (8 * divider);
};

// ====================== INTERNAL HILLSHADE FUNCTIONS ======================

const _getL = function (z: number[], state: ReliefState): number {
    const dzdx = _getDzdx(z, 5);
    const dzdy = _getDzdy(z, 5);
    let L =
        (state.hillshadeA1 - state.hillshadeA2 * dzdx - state.hillshadeA3 * dzdy) /
        Math.sqrt(1 + dzdx ** 2 + dzdy ** 2);
    if (L < 0) {
        L = 0;
    }
    L = Math.sqrt(L * 0.8 + 0.2);
    return L;
};

const _defaultHillshadeColorFunction: HillshadeColorFunction = function (
    intensity: number
): [number, number, number] {
    const value = Math.round(intensity * 255);
    return [value, value, value];
};

// ====================== INTERNAL SLOPE FUNCTIONS ======================

const _pixelSizeMeters = function (y: number, z: number, tileSize: number): number {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    const latitude = Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    const metersPerPixelEquator = _EARTH_CIRCUMFERENCE / (tileSize * Math.pow(2, z));
    const clampedLatitude = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, latitude));
    return Math.max(0.1, metersPerPixelEquator * Math.cos(clampedLatitude));
};

const _getSlope = function (z: number[], pixelSizeMeters: number): number {
    const dzdx = _getDzdx(z, pixelSizeMeters);
    const dzdy = _getDzdy(z, pixelSizeMeters);
    const slopeDegrees = (Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180) / Math.PI;
    return slopeDegrees;
};

const _slopeHsvToRgb = (h: number, s: number, v: number): [number, number, number, number] => {
    while (h < 0) {
        h = h + 360;
    }
    while (h > 360) {
        h = h - 360;
    }

    h = h / 60;
    const c = v * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = v - c;

    let r: number, g: number, b: number;
    if (h >= 0 && h < 1) {
        [r, g, b] = [c, x, 0];
    } else if (h >= 1 && h < 2) {
        [r, g, b] = [x, c, 0];
    } else if (h >= 2 && h < 3) {
        [r, g, b] = [0, c, x];
    } else if (h >= 3 && h < 4) {
        [r, g, b] = [0, x, c];
    } else if (h >= 4 && h < 5) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), 255];
};

const _defaultSlopeColorConfig: SlopeColorConfig[] = [
    { slope: { min: 0, max: 3 }, h: { min: 120, max: 60 } },
    { slope: { min: 3, max: 9 }, h: { min: 60, max: 20 } },
    { slope: { min: 9, max: 30 }, h: { min: 20, max: -20 } },
    { slope: { min: 30, max: 60 }, h: { min: -20, max: -60 } },
];

const _slopeColorSchemes: SlopeColorSchemes = {
    default: _defaultSlopeColorConfig,
    glacial: [
        { slope: { min: 0, max: 5 }, h: { min: 240, max: 200 } },
        { slope: { min: 5, max: 15 }, h: { min: 200, max: 160 } },
        { slope: { min: 15, max: 30 }, h: { min: 160, max: 120 } },
        { slope: { min: 30, max: 60 }, h: { min: 120, max: 60 } },
        { slope: { min: 60, max: 90 }, h: { min: 60, max: 0 } },
    ],
    thermal: [
        { slope: { min: 0, max: 10 }, h: { min: 280, max: 320 } },
        { slope: { min: 10, max: 25 }, h: { min: 320, max: 360 } },
        { slope: { min: 25, max: 45 }, h: { min: 0, max: 40 } },
        { slope: { min: 45, max: 65 }, h: { min: 40, max: 60 } },
    ],
    earth: [
        { slope: { min: 0, max: 5 }, h: { min: 60, max: 40 } },
        { slope: { min: 5, max: 15 }, h: { min: 40, max: 20 } },
        { slope: { min: 15, max: 35 }, h: { min: 20, max: 10 } },
        { slope: { min: 35, max: 55 }, h: { min: 10, max: 0 } },
    ],
};

const _createSlopeColorFunction = function (colorConfig: SlopeColorConfig[]): SlopeColorFunction {
    return function (slopeDegrees: number): [number, number, number] {
        if (slopeDegrees < colorConfig[0].slope.min) {
            return _slopeHsvToRgb(colorConfig[0].h.min, 1, 1).slice(0, 3) as [
                number,
                number,
                number,
            ];
        }

        for (let i = 0; i < colorConfig.length; i++) {
            const range = colorConfig[i];
            if (slopeDegrees >= range.slope.min && slopeDegrees <= range.slope.max) {
                const slopeRatio =
                    (slopeDegrees - range.slope.min) / (range.slope.max - range.slope.min);
                const h = range.h.min + slopeRatio * (range.h.max - range.h.min);
                return _slopeHsvToRgb(h, 1, 1).slice(0, 3) as [number, number, number];
            }
        }

        const lastRange = colorConfig[colorConfig.length - 1];
        return _slopeHsvToRgb(lastRange.h.max, 1, 1).slice(0, 3) as [number, number, number];
    };
};

// ====================== MAIN PLUGIN CLASS ======================

const ReliefLayerClass = L.GridLayer.extend({
    options: {
        mode: 'hillshade',
        elevationUrl: _mapterhornElevationUrl,
        elevationExtractor: _defaultElevationExtractor,
        hillshadeAzimuth: 315,
        hillshadeElevation: 45,
        hillshadeColorFunction: _defaultHillshadeColorFunction,
        slopeColorFunction: _createSlopeColorFunction(_defaultSlopeColorConfig),
        attribution:
            '&copy; <a href="https://mapterhorn.com/attribution/" target="_blank">Mapterhorn</a>',
    },

    initialize: function (options?: ReliefOptions) {
        this._state = {
            hillshadeA1: 0,
            hillshadeA2: 0,
            hillshadeA3: 0,
            abortControllers: new globalThis.Map<string, AbortController>(),
        };
        if (options && options.slopeColorConfig) {
            options.slopeColorFunction = _createSlopeColorFunction(options.slopeColorConfig);
        } else if (options && options.slopeColorScheme) {
            const scheme =
                _slopeColorSchemes[options.slopeColorScheme] || _slopeColorSchemes.default;
            options.slopeColorFunction = _createSlopeColorFunction(scheme);
        }

        L.Util.setOptions(this, options);
        this._recomputeHillshadeConstants();

        this.on('tileunload', function (this: L.GridLayer.Relief, e: L.TileEvent) {
            this._tileUnloaded(e.coords);
        });
    },

    _fillTile: async function (
        data: Uint8ClampedArray,
        tileData: Uint8ClampedArray,
        coords: L.Coords,
        abortSignal?: AbortSignal
    ) {
        if (this.options.mode === 'hillshade') {
            this._fillHillshadeTile(data, tileData, coords, abortSignal);
        } else {
            this._fillSlopeTile(data, tileData, coords, abortSignal);
        }
    },

    _recomputeHillshadeConstants: function () {
        const alpha = (Math.PI / 180) * this.options.hillshadeAzimuth;
        const beta = (Math.PI / 180) * this.options.hillshadeElevation;
        this._state.hillshadeA1 = Math.sin(beta);
        this._state.hillshadeA2 = Math.cos(beta) * Math.sin(alpha);
        this._state.hillshadeA3 = Math.cos(beta) * Math.cos(alpha);
    },

    _getElevation: function (tileData: Uint8ClampedArray, j: number, i: number): number {
        const tileSize = (this.getTileSize() as L.Point).x;
        const pixelIndex = (i * tileSize + j) * 4;
        const r = tileData[pixelIndex];
        const g = tileData[pixelIndex + 1];
        const b = tileData[pixelIndex + 2];
        const a = tileData[pixelIndex + 3];
        return this.options.elevationExtractor(r, g, b, a);
    },

    _getZ: function (tileData: Uint8ClampedArray, i: number, j: number): number[] {
        const tileSize = (this.getTileSize() as L.Point).x;
        if (i <= 0 || j <= 0 || i >= tileSize - 1 || j >= tileSize - 1) {
            const clampedI = Math.max(1, Math.min(i, tileSize - 2));
            const clampedJ = Math.max(1, Math.min(j, tileSize - 2));
            return this._getZ(tileData, clampedI, clampedJ);
        }

        return [
            this._getElevation(tileData, i - 1, j - 1),
            this._getElevation(tileData, i - 1, j),
            this._getElevation(tileData, i - 1, j + 1),
            this._getElevation(tileData, i, j - 1),
            this._getElevation(tileData, i, j),
            this._getElevation(tileData, i, j + 1),
            this._getElevation(tileData, i + 1, j - 1),
            this._getElevation(tileData, i + 1, j),
            this._getElevation(tileData, i + 1, j + 1),
        ];
    },

    _doFillTile: function (
        data: Uint8ClampedArray,
        tileData: Uint8ClampedArray,
        colorFunction: ColorFunction,
        abortSignal?: AbortSignal
    ): void {
        const tileSize = (this.getTileSize() as L.Point).x;
        for (let i = 0; i < tileSize; i++) {
            if (abortSignal && abortSignal.aborted) {
                throw new DOMException('Tile loading aborted', 'AbortError');
            }

            for (let j = 0; j < tileSize; j++) {
                const zData = this._getZ(tileData, i, j);
                const hasNoData = zData.some((v: number) => v <= 0);

                let rgba: [number, number, number, number];
                if (!hasNoData) {
                    rgba = colorFunction(zData);
                } else {
                    rgba = RGBA_EMPTY;
                }

                const pixelIndex = (j * tileSize + i) * 4;
                data[pixelIndex] = rgba[0];
                data[pixelIndex + 1] = rgba[1];
                data[pixelIndex + 2] = rgba[2];
                data[pixelIndex + 3] = rgba[3];
            }
        }
    },

    _createHillshadeColor: function (zData: number[]): [number, number, number, number] {
        const L = _getL(zData, this._state);
        const [colorR, colorG, colorB] = this.options.hillshadeColorFunction(L);
        return [colorR, colorG, colorB, 255];
    },

    _fillHillshadeTile: function (
        data: Uint8ClampedArray,
        tileData: Uint8ClampedArray,
        _coords: L.Coords,
        abortSignal?: AbortSignal
    ): void {
        this._doFillTile(
            data,
            tileData,
            (zData: number[]) => this._createHillshadeColor(zData),
            abortSignal
        );
    },

    _createSlopeColor: function (
        zData: number[],
        pixelSizeMeters: number
    ): [number, number, number, number] {
        const slopeDegrees = _getSlope(zData, pixelSizeMeters);
        if (slopeDegrees < 0.5) {
            return RGBA_EMPTY;
        } else {
            const slopeColor = this.options.slopeColorFunction(slopeDegrees);
            return [slopeColor[0], slopeColor[1], slopeColor[2], 255];
        }
    },

    _fillSlopeTile: function (
        data: Uint8ClampedArray,
        tileData: Uint8ClampedArray,
        coords: L.Coords,
        abortSignal?: AbortSignal
    ): void {
        const y = coords.y;
        const z = coords.z;

        const tileSize = (this.getTileSize() as L.Point).x;
        const pixelSizeMeters = _pixelSizeMeters(y, z, tileSize);

        this._doFillTile(
            data,
            tileData,
            (zData: number[]) => this._createSlopeColor(zData, pixelSizeMeters),
            abortSignal
        );
    },

    _tileUnloaded: function (coords: L.Coords): void {
        const tileKey = `${coords.z}/${coords.x}/${coords.y}`;
        if (this._state.abortControllers.has(tileKey)) {
            const abortController = this._state.abortControllers.get(tileKey);
            if (abortController) {
                abortController.abort();
                this._state.abortControllers.delete(tileKey);
            }
        }
    },

    createTile: function (coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const x = coords.x;
        const y = coords.y;
        const z = coords.z;
        const tileKey = `${z}/${x}/${y}`;

        const tileSize = (this.getTileSize() as L.Point).x;

        const tile = document.createElement('canvas');
        tile.setAttribute('width', tileSize.toString());
        tile.setAttribute('height', tileSize.toString());

        const ctx = tile.getContext('2d');
        if (!ctx) {
            throw new Error('Unable to get 2d context from canvas');
        }

        const imageData = ctx.createImageData(tileSize, tileSize);

        const abortController = new AbortController();
        this._state.abortControllers.set(tileKey, abortController);

        const url =
            typeof this.options.elevationUrl === 'function'
                ? this.options.elevationUrl(z, x, y)
                : this.options.elevationUrl
                      .replace('{z}', z.toString())
                      .replace('{x}', x.toString())
                      .replace('{y}', y.toString());

        (async () => {
            let demBitmap: ImageBitmap | null = null;
            let demCanvas: HTMLCanvasElement | null = null;
            let demCtx: CanvasRenderingContext2D | null = null;

            try {
                demCanvas = _canvasPool.acquire(tileSize);
                demCtx = demCanvas.getContext('2d', { willReadFrequently: true });
                if (!demCtx) {
                    throw new Error('Unable to get 2d context from DEM canvas');
                }

                const demResponse = await fetch(url, { signal: abortController.signal });
                if (!demResponse.ok) {
                    throw new Error(`Failed to fetch tile: ${demResponse.status}`);
                }

                const demBlob = await demResponse.blob();
                demBitmap = await createImageBitmap(demBlob);

                demCtx.imageSmoothingEnabled = false;
                demCtx.drawImage(demBitmap, 0, 0, tileSize, tileSize);

                const demImageData = demCtx.getImageData(0, 0, tileSize, tileSize);
                const demTileData = demImageData.data;

                await this._fillTile(imageData.data, demTileData, coords, abortController.signal);

                if (!abortController.signal.aborted) {
                    ctx.putImageData(imageData, 0, 0);
                    done(undefined, tile);
                }
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error(`Error loading tile ${tileKey}:`, error);
                }
            } finally {
                this._state.abortControllers.delete(tileKey);

                if (demBitmap) {
                    demBitmap.close();
                }

                if (demCanvas) {
                    _canvasPool.release(demCanvas);
                }
            }
        })();

        return tile;
    },

    tileUnloaded: function (coords: L.Coords): void {
        this._tileUnloaded(coords);
    },
});

// Assign the class to the L namespace
L.GridLayer.Relief = ReliefLayerClass as any;

L.gridLayer.relief = function (options?: ReliefOptions): L.GridLayer.Relief {
    return new L.GridLayer.Relief(options);
};

L.GridLayer.Relief.elevationExtractors = {
    terrarium: _defaultElevationExtractor,
    mapbox: _mapboxElevationExtractor,
    mapterhorn: _defaultElevationExtractor,
};

L.GridLayer.Relief.elevationUrls = {
    terrarium: _defaultElevationUrl,
    mapterhorn: _mapterhornElevationUrl,
};

L.GridLayer.Relief.elevationAttributions = {
    terrarium:
        '&copy; <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Mapzen Elevation</a>',
    mapbox: '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>',
    mapterhorn:
        '&copy; <a href="https://mapterhorn.com/attribution/" target="_blank">Mapterhorn</a>',
};
// Types are already exported above - no need to re-export
