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
                    ignLidarHdMnt: ElevationUrlFunction;
                    ignLidarHdMns: ElevationUrlFunction;
                };
                static elevationTileDecoders: {
                    bil32: ElevationTileDecoder;
                };
                static elevationAttributions: {
                    terrarium: string;
                    mapbox: string;
                    mapterhorn: string;
                    ignLidarHd: string;
                };
                static elevationMaxNativeZooms: {
                    terrarium: number;
                    mapbox: number;
                    mapterhorn: number;
                    ignLidarHd: number;
                };
                options: ReliefOptions;
                // Private methods
                _tileUnloaded(coords: L.Coords): void;

                _getElevation(tileData: ElevationTileData, j: number, i: number): number;
                _getZ(tileData: ElevationTileData, i: number, j: number): number[];

                _buildElevationUrl(z: number, x: number, y: number, tileSize: number): string;
                _rememberMissingTile(url: string): void;
                _fetchDemData(
                    coords: L.Coords,
                    tileSize: number,
                    demCtx: CanvasRenderingContext2D,
                    abortSignal: AbortSignal
                ): Promise<ElevationTileData | null>;

                _fillTile: (
                    data: Uint8ClampedArray,
                    tileData: ElevationTileData,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ) => void;
                _doFillTile(
                    data: Uint8ClampedArray,
                    tileData: ElevationTileData,
                    colorFunction: ColorFunction,
                    abortSignal?: AbortSignal
                ): void;

                _recomputeHillshadeConstants(): void;
                _createHillshadeColor(
                    zData: number[],
                    pixelSizeMeters: number
                ): [number, number, number, number];
                _fillHillshadeTile(
                    data: Uint8ClampedArray,
                    tileData: ElevationTileData,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ): void;

                _createSlopeColor(
                    zData: number[],
                    pixelScaleMeters: number
                ): [number, number, number, number];
                _fillSlopeTile(
                    data: Uint8ClampedArray,
                    tileData: ElevationTileData,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ): void;

                _recomputeArcheoConstants(): void;
                _createArcheoColor(
                    zData: number[],
                    pixelSizeMeters: number
                ): [number, number, number, number];
                _fillArcheoTile(
                    data: Uint8ClampedArray,
                    tileData: ElevationTileData,
                    coords: L.Coords,
                    abortSignal?: AbortSignal
                ): void;

                _recomputeTricolorConstants(): void;
                _createTricolorColor(
                    zData: number[],
                    pixelSizeMeters: number
                ): [number, number, number, number];
                _fillTricolorTile(
                    data: Uint8ClampedArray,
                    tileData: ElevationTileData,
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
    archeoA1: number;
    archeoA2: number[];
    archeoA3: number[];
    tricolorA1: number;
    tricolorA2: number[];
    tricolorA3: number[];
    abortControllers: globalThis.Map<string, AbortController>;
    missingTiles: Set<string>;
}

// Type definitions
export interface ReliefOptions extends L.GridLayerOptions {
    mode?: 'hillshade' | 'slope' | 'archeo' | 'tricolor';
    hillshadeAzimuth?: number;
    hillshadeElevation?: number;
    hillshadeExaggeration?: number;
    hillshadeColorFunction?: HillshadeColorFunction;
    slopeColorFunction?: SlopeColorFunction;
    slopeColorConfig?: SlopeColorConfig[];
    slopeColorScheme?: 'default' | 'glacial' | 'thermal' | 'earth';
    archeoAzimuths?: number[];
    archeoElevation?: number;
    archeoExaggeration?: number;
    archeoGlowStrength?: number;
    archeoWarmColor?: [number, number, number];
    archeoCoolColor?: [number, number, number];
    archeoBaseColor?: [number, number, number];
    archeoColorScheme?: 'default' | 'vivid' | 'subtle';
    tricolorAzimuths?: [number, number, number];
    tricolorElevation?: number;
    tricolorExaggeration?: number;
    elevationUrl?: string | ElevationUrlFunction;
    elevationExtractor?: ElevationExtractorFunction;
    elevationTileDecoder?: ElevationTileDecoder;
    elevationFallbackDepth?: number;
}

export type HillshadeColorFunction = (intensity: number) => [number, number, number];
export type SlopeColorFunction = (slopeDegrees: number) => [number, number, number];
export type ElevationUrlFunction = (z: number, x: number, y: number, tileSize: number) => string;
export type ElevationExtractorFunction = (r: number, g: number, b: number, a: number) => number;

// Decodes a whole DEM tile served in a binary format no image decoder understands
// (IGN's BIL float32, for instance) into metres. Set `elevationTileDecoder` and the
// fetch path skips the canvas entirely, handing the grid straight to the renderer.
export type ElevationTileDecoder = (buffer: ArrayBuffer, tileSize: number) => Float32Array;

type ColorFunction = (zData: number[]) => [number, number, number, number];

// A tile of elevation samples, either still encoded as RGBA (native zoom, decoded
// lazily per pixel) or already decoded to metres (upsampled from a parent tile).
export type ElevationTileData = Uint8ClampedArray | Float32Array;

export interface SlopeColorConfig {
    slope: { min: number; max: number };
    h: { min: number; max: number };
}

export interface SlopeColorSchemes {
    [key: string]: SlopeColorConfig[];
}

export interface ArcheoColors {
    warm: [number, number, number];
    cool: [number, number, number];
    base: [number, number, number];
}

export interface ArcheoColorSchemes {
    [key: string]: ArcheoColors;
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

// Deepest zoom each elevation source publishes; beyond it tiles return 404.
// Used as the default maxNativeZoom so Leaflet upscales the last available tile
// instead of requesting a level that does not exist (which leaves tiles blank).
const _elevationMaxNativeZooms = {
    terrarium: 15,
    mapbox: 15,
    mapterhorn: 17,
    // LiDAR HD is gridded at 1 m. At 45N a z17 pixel is 0.84 m, the closest level
    // that does not oversample the source; deeper zooms are upscaled by Leaflet.
    ignLidarHd: 17,
};

const _defaultElevationUrl: ElevationUrlFunction = function (
    z: number,
    x: number,
    y: number
): string {
    return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
};

const _defaultMaxNativeZoom = function (
    elevationUrl: string | ElevationUrlFunction | undefined
): number | undefined {
    if (elevationUrl === _mapterhornElevationUrl) {
        return _elevationMaxNativeZooms.mapterhorn;
    }
    if (elevationUrl === _defaultElevationUrl) {
        return _elevationMaxNativeZooms.terrarium;
    }
    if (
        elevationUrl === _ignLidarHdMntElevationUrl ||
        elevationUrl === _ignLidarHdMnsElevationUrl
    ) {
        return _elevationMaxNativeZooms.ignLidarHd;
    }
    return undefined;
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

// ====================== IGN LIDAR HD (BIL FLOAT32) ======================

// IGN publishes its LiDAR HD terrain and surface models as raw float32 elevations.
// The WMTS service only serves a pre-computed hillshade, so the DEM has to come from
// the raster WMS: `image/x-bil;bits=32`, one little-endian float per pixel, no header,
// rows running north to south like the canvas we render into.
const _IGN_WMS_URL = 'https://data.geopf.fr/wms-r/wms';
const _IGN_LIDAR_HD_MNT_LAYER = 'IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.WGS84G';
const _IGN_LIDAR_HD_MNS_LAYER = 'IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.WGS84G';

// Samples outside the surveyed area come back as -9999. The threshold is loose so a
// float that lost precision on the way still reads as no-data.
const _BIL_NO_DATA_THRESHOLD = -9000;

// The renderer treats every sample <= 0 as no-data, so real ground sitting exactly at
// sea level (the Camargue, Corsican and Mediterranean shorelines) has to be nudged
// above zero. A centimetre is far below the accuracy of the source and invisible once
// shaded, whereas dropping those pixels would punch holes in the coast.
const _BIL_MIN_ELEVATION = 0.01;

const _bil32ElevationDecoder: ElevationTileDecoder = function (
    buffer: ArrayBuffer,
    tileSize: number
): Float32Array {
    const elevations = new Float32Array(tileSize * tileSize);
    const view = new DataView(buffer);
    // A short read leaves the tail at 0, which the renderer reads as no-data.
    const sampleCount = Math.min(elevations.length, Math.floor(buffer.byteLength / 4));

    for (let i = 0; i < sampleCount; i++) {
        // Explicit little-endian: the payload's byte order is fixed by the service,
        // not by the platform a Float32Array view would follow.
        const value = view.getFloat32(i * 4, true);
        elevations[i] = value <= _BIL_NO_DATA_THRESHOLD ? 0 : Math.max(value, _BIL_MIN_ELEVATION);
    }

    return elevations;
};

// Northern edge of tile row `y`, in degrees: the inverse of the Web Mercator
// latitude projection Leaflet lays its grid on.
const _tileNorthLatitude = function (y: number, z: number): number {
    return (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / Math.pow(2, z)));
};

// Build a WMS GetMap request covering exactly one XYZ tile.
//
// The request is made in EPSG:4326, not EPSG:3857: the service does accept the latter,
// but resamples it one row out of two, which shows up as horizontal banding across the
// hillshade. Sampling the same footprint linearly in latitude instead of in Mercator y
// shifts rows by a small fraction of a pixel (~0.003 px at z16), far below the accuracy
// of the source, whereas the duplicated rows double the vertical gradient.
//
// WMS 1.3.0 orders EPSG:4326 axes latitude first, so BBOX reads south,west,north,east.
const _ignLidarHdElevationUrl = function (layer: string): ElevationUrlFunction {
    return function (z: number, x: number, y: number, tileSize: number): string {
        const tiles = Math.pow(2, z);
        const west = (x / tiles) * 360 - 180;
        const east = ((x + 1) / tiles) * 360 - 180;
        const bbox = [_tileNorthLatitude(y + 1, z), west, _tileNorthLatitude(y, z), east].join(',');

        return (
            `${_IGN_WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
            `&LAYERS=${layer}&STYLES=normal&CRS=EPSG:4326` +
            `&BBOX=${bbox}&WIDTH=${tileSize}&HEIGHT=${tileSize}` +
            `&FORMAT=${encodeURIComponent('image/x-bil;bits=32')}`
        );
    };
};

const _ignLidarHdMntElevationUrl = _ignLidarHdElevationUrl(_IGN_LIDAR_HD_MNT_LAYER);
const _ignLidarHdMnsElevationUrl = _ignLidarHdElevationUrl(_IGN_LIDAR_HD_MNS_LAYER);

const _getDzdx = function (z: number[], divider: number): number {
    return (z[2] + 2 * z[5] + z[8] - (z[0] + 2 * z[3] + z[6])) / (8 * divider);
};

const _getDzdy = function (z: number[], divider: number): number {
    return (z[0] + 2 * z[1] + z[2] - (z[6] + 2 * z[7] + z[8])) / (8 * divider);
};

// Real-world size of a DEM pixel, accounting for zoom level and Web Mercator
// latitude distortion. Gradients must be divided by this to be zoom independent.
const _pixelSizeMeters = function (y: number, z: number, tileSize: number): number {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    const latitude = Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    const metersPerPixelEquator = _EARTH_CIRCUMFERENCE / (tileSize * Math.pow(2, z));
    const clampedLatitude = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, latitude));
    return Math.max(0.1, metersPerPixelEquator * Math.cos(clampedLatitude));
};

// ====================== ELEVATION TILE FALLBACK ======================

// How many parent levels to walk up by default when a tile is missing. Five
// levels cover Mapterhorn's worst case (z17 requested, z12 published).
const _DEFAULT_ELEVATION_FALLBACK_DEPTH = 5;

// Bound on the per-layer memo of missing tiles. Absent tiles are typically served
// without any cache header, so without this memo every pan re-requests them.
const _MISSING_TILE_MEMO_SIZE = 2048;

// Statuses that mean "this source has no data here", as opposed to a transient
// failure worth surfacing as a tile error.
const _isMissingTileStatus = function (status: number): boolean {
    return status === 404 || status === 403 || status === 204;
};

// Decode the `[startX..endX] x [startY..endY]` sample window of an encoded DEM
// tile to metres, packed row-major with a stride of `endX - startX + 1`. Only the
// window is decoded: an upsampled child tile reads a small quadrant of its parent
// (a single parent sample per 2^depth child pixels), so decoding the whole parent
// would run tileSize^2 extractor calls per child tile for nothing.
const _decodeElevations = function (
    tileData: Uint8ClampedArray,
    tileSize: number,
    extractor: ElevationExtractorFunction,
    startX: number,
    startY: number,
    endX: number,
    endY: number
): Float32Array {
    const width = endX - startX + 1;
    const elevations = new Float32Array(width * (endY - startY + 1));

    for (let y = startY; y <= endY; y++) {
        const rowOffset = (y - startY) * width;
        for (let x = startX; x <= endX; x++) {
            const pixelIndex = (y * tileSize + x) * 4;
            elevations[rowOffset + (x - startX)] = extractor(
                tileData[pixelIndex],
                tileData[pixelIndex + 1],
                tileData[pixelIndex + 2],
                tileData[pixelIndex + 3]
            );
        }
    }

    return elevations;
};

// Resample the part of a parent DEM tile covered by one of its descendants.
// Interpolation happens on decoded metres, never on the encoded bytes: Terrarium
// and Terrain-RGB pack elevation across channels (green wraps every 256 m), so
// blending the RGBA would invent cliffs. Bilinear output is piecewise linear, so
// gradients stay correct when measured at the child's own pixel size.
const _resampleParentElevations = function (
    parentTileData: Uint8ClampedArray,
    tileSize: number,
    offsetX: number,
    offsetY: number,
    scale: number,
    extractor: ElevationExtractorFunction
): Float32Array {
    const elevations = new Float32Array(tileSize * tileSize);
    const maxIndex = tileSize - 1;
    const clampIndex = (value: number): number => Math.max(0, Math.min(maxIndex, value));

    // Widest span of parent samples the loop below can read: the child pixel
    // centres run from `offset + 0.5 / scale - 0.5` to `offset + subTileSize -
    // 0.5 / scale - 0.5`, and bilinear also reads the sample after each floor.
    const subTileSize = tileSize / scale;
    const startX = clampIndex(Math.floor(offsetX - 0.5));
    const endX = clampIndex(Math.floor(offsetX + subTileSize - 0.5) + 1);
    const startY = clampIndex(Math.floor(offsetY - 0.5));
    const endY = clampIndex(Math.floor(offsetY + subTileSize - 0.5) + 1);
    const windowWidth = endX - startX + 1;
    const parentElevations = _decodeElevations(
        parentTileData,
        tileSize,
        extractor,
        startX,
        startY,
        endX,
        endY
    );

    for (let y = 0; y < tileSize; y++) {
        const sourceY = offsetY + (y + 0.5) / scale - 0.5;
        const y0 = clampIndex(Math.floor(sourceY));
        const y1 = Math.min(maxIndex, y0 + 1);
        const fy = Math.max(0, Math.min(1, sourceY - y0));
        const row0 = (y0 - startY) * windowWidth;
        const row1 = (y1 - startY) * windowWidth;

        for (let x = 0; x < tileSize; x++) {
            const sourceX = offsetX + (x + 0.5) / scale - 0.5;
            const x0 = clampIndex(Math.floor(sourceX)) - startX;
            const x1 = Math.min(maxIndex, clampIndex(Math.floor(sourceX)) + 1) - startX;
            const fx = Math.max(0, Math.min(1, sourceX - (x0 + startX)));

            const z00 = parentElevations[row0 + x0];
            const z10 = parentElevations[row0 + x1];
            const z01 = parentElevations[row1 + x0];
            const z11 = parentElevations[row1 + x1];

            let value: number;
            if (z00 <= 0 || z10 <= 0 || z01 <= 0 || z11 <= 0) {
                // A no-data neighbour would bleed across the boundary and turn
                // coastlines into ramps: keep the nearest sample instead, so the
                // no-data mask stays at the parent's resolution.
                value = parentElevations[(fy < 0.5 ? row0 : row1) + (fx < 0.5 ? x0 : x1)];
            } else {
                const top = z00 + (z10 - z00) * fx;
                const bottom = z01 + (z11 - z01) * fx;
                value = top + (bottom - top) * fy;
            }

            elevations[y * tileSize + x] = value;
        }
    }

    return elevations;
};

// ====================== INTERNAL HILLSHADE FUNCTIONS ======================

const _getLambert = function (
    dzdx: number,
    dzdy: number,
    a1: number,
    a2: number,
    a3: number
): number {
    const L = (a1 - a2 * dzdx - a3 * dzdy) / Math.sqrt(1 + dzdx ** 2 + dzdy ** 2);
    return L < 0 ? 0 : L;
};

const _getL = function (
    z: number[],
    state: ReliefState,
    pixelSizeMeters: number,
    exaggeration: number
): number {
    const dzdx = _getDzdx(z, pixelSizeMeters) * exaggeration;
    const dzdy = _getDzdy(z, pixelSizeMeters) * exaggeration;
    const L = _getLambert(dzdx, dzdy, state.hillshadeA1, state.hillshadeA2, state.hillshadeA3);
    return Math.sqrt(L * 0.8 + 0.2);
};

// Average of negative-clamped Lambertians over several azimuths, normalized so that
// flat terrain renders at 1 (the base color) and only slopes darken it. The max(0, .)
// clamp is what makes this differ from a single mean-direction hillshade: without it
// the average would collapse algebraically to one light source.
const _getMultiL = function (
    z: number[],
    pixelSizeMeters: number,
    exaggeration: number,
    a1: number,
    a2: number[],
    a3: number[]
): number {
    const dzdx = _getDzdx(z, pixelSizeMeters) * exaggeration;
    const dzdy = _getDzdy(z, pixelSizeMeters) * exaggeration;
    let sum = 0;
    for (let i = 0; i < a2.length; i++) {
        sum += _getLambert(dzdx, dzdy, a1, a2[i], a3[i]);
    }
    const flat = a1 * a2.length;
    return flat > 0 ? sum / flat : 0;
};

const _defaultHillshadeColorFunction: HillshadeColorFunction = function (
    intensity: number
): [number, number, number] {
    const value = Math.round(intensity * 255);
    return [value, value, value];
};

// ====================== INTERNAL ARCHEO FUNCTIONS ======================

// Cap on tint saturation so extreme curvature never reaches a pure color
const _ARCHEO_MAX_TINT = 0.9;

// 8-neighbor Laplacian, divided by the real-world pixel size so the result is a
// dimensionless slope change rather than a raw height difference: without it the
// tint would fade out as soon as the DEM resolution changes.
// Positive = convex (bump), negative = concave (dip).
const _getCurvature = function (z: number[], pixelSizeMeters: number): number {
    return (z[4] - (z[0] + z[1] + z[2] + z[3] + z[5] + z[6] + z[7] + z[8]) / 8) / pixelSizeMeters;
};

// Colors are reached at full tint; the base is what flat terrain renders as, so it
// doubles as the overall brightness of the layer.
const _archeoColorSchemes: ArcheoColorSchemes = {
    default: {
        warm: [236, 150, 82],
        cool: [126, 172, 246],
        base: [192, 191, 196],
    },
    vivid: {
        warm: [246, 126, 40],
        cool: [86, 144, 250],
        base: [198, 197, 202],
    },
    subtle: {
        warm: [226, 180, 142],
        cool: [166, 190, 236],
        base: [190, 190, 193],
    },
};

// ====================== INTERNAL SLOPE FUNCTIONS ======================

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
        elevationFallbackDepth: _DEFAULT_ELEVATION_FALLBACK_DEPTH,
        hillshadeAzimuth: 315,
        hillshadeElevation: 45,
        hillshadeExaggeration: 1,
        hillshadeColorFunction: _defaultHillshadeColorFunction,
        slopeColorFunction: _createSlopeColorFunction(_defaultSlopeColorConfig),
        archeoAzimuths: [225, 270, 315, 360],
        archeoElevation: 45,
        archeoExaggeration: 3,
        archeoGlowStrength: 15,
        archeoWarmColor: _archeoColorSchemes.default.warm,
        archeoCoolColor: _archeoColorSchemes.default.cool,
        archeoBaseColor: _archeoColorSchemes.default.base,
        tricolorAzimuths: [315, 15, 75],
        tricolorElevation: 35,
        tricolorExaggeration: 1,
        attribution:
            '&copy; <a href="https://mapterhorn.com/attribution/" target="_blank">Mapterhorn</a>',
    },

    initialize: function (options?: ReliefOptions) {
        this._state = {
            hillshadeA1: 0,
            hillshadeA2: 0,
            hillshadeA3: 0,
            archeoA1: 0,
            archeoA2: [],
            archeoA3: [],
            tricolorA1: 0,
            tricolorA2: [],
            tricolorA3: [],
            abortControllers: new globalThis.Map<string, AbortController>(),
            missingTiles: new Set<string>(),
        };
        if (options && options.slopeColorConfig) {
            options.slopeColorFunction = _createSlopeColorFunction(options.slopeColorConfig);
        } else if (options && options.slopeColorScheme) {
            const scheme =
                _slopeColorSchemes[options.slopeColorScheme] || _slopeColorSchemes.default;
            options.slopeColorFunction = _createSlopeColorFunction(scheme);
        }
        if (options && options.archeoColorScheme) {
            const scheme =
                _archeoColorSchemes[options.archeoColorScheme] || _archeoColorSchemes.default;
            if (!options.archeoWarmColor) {
                options.archeoWarmColor = scheme.warm;
            }
            if (!options.archeoCoolColor) {
                options.archeoCoolColor = scheme.cool;
            }
            if (!options.archeoBaseColor) {
                options.archeoBaseColor = scheme.base;
            }
        }

        L.Util.setOptions(this, options);

        // Default maxNativeZoom to the deepest zoom of the configured built-in source.
        // Custom sources are left unclamped: their depth is unknown, and guessing would
        // silently throw away detail the provider does have.
        if (!options || options.maxNativeZoom === undefined) {
            this.options.maxNativeZoom = _defaultMaxNativeZoom(this.options.elevationUrl);
        }

        this._recomputeHillshadeConstants();
        this._recomputeArcheoConstants();
        this._recomputeTricolorConstants();

        this.on('tileunload', function (this: L.GridLayer.Relief, e: L.TileEvent) {
            this._tileUnloaded(e.coords);
        });
    },

    _fillTile: async function (
        data: Uint8ClampedArray,
        tileData: ElevationTileData,
        coords: L.Coords,
        abortSignal?: AbortSignal
    ) {
        if (this.options.mode === 'hillshade') {
            this._fillHillshadeTile(data, tileData, coords, abortSignal);
        } else if (this.options.mode === 'archeo') {
            this._fillArcheoTile(data, tileData, coords, abortSignal);
        } else if (this.options.mode === 'tricolor') {
            this._fillTricolorTile(data, tileData, coords, abortSignal);
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

    _recomputeArcheoConstants: function () {
        const beta = (Math.PI / 180) * this.options.archeoElevation;
        const azimuths: number[] = this.options.archeoAzimuths;
        this._state.archeoA1 = Math.sin(beta);
        this._state.archeoA2 = azimuths.map(
            (azimuth: number) => Math.cos(beta) * Math.sin((Math.PI / 180) * azimuth)
        );
        this._state.archeoA3 = azimuths.map(
            (azimuth: number) => Math.cos(beta) * Math.cos((Math.PI / 180) * azimuth)
        );
    },

    _recomputeTricolorConstants: function () {
        const beta = (Math.PI / 180) * this.options.tricolorElevation;
        const azimuths: number[] = this.options.tricolorAzimuths;
        this._state.tricolorA1 = Math.sin(beta);
        this._state.tricolorA2 = azimuths.map(
            (azimuth: number) => Math.cos(beta) * Math.sin((Math.PI / 180) * azimuth)
        );
        this._state.tricolorA3 = azimuths.map(
            (azimuth: number) => Math.cos(beta) * Math.cos((Math.PI / 180) * azimuth)
        );
    },

    _getElevation: function (tileData: ElevationTileData, j: number, i: number): number {
        const tileSize = (this.getTileSize() as L.Point).x;
        if (tileData instanceof Float32Array) {
            // Already decoded to metres by the parent-tile fallback.
            return tileData[i * tileSize + j];
        }
        const pixelIndex = (i * tileSize + j) * 4;
        const r = tileData[pixelIndex];
        const g = tileData[pixelIndex + 1];
        const b = tileData[pixelIndex + 2];
        const a = tileData[pixelIndex + 3];
        return this.options.elevationExtractor(r, g, b, a);
    },

    _getZ: function (tileData: ElevationTileData, i: number, j: number): number[] {
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
        tileData: ElevationTileData,
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

    _createHillshadeColor: function (
        zData: number[],
        pixelSizeMeters: number
    ): [number, number, number, number] {
        const L = _getL(zData, this._state, pixelSizeMeters, this.options.hillshadeExaggeration);
        const [colorR, colorG, colorB] = this.options.hillshadeColorFunction(L);
        return [colorR, colorG, colorB, 255];
    },

    _fillHillshadeTile: function (
        data: Uint8ClampedArray,
        tileData: ElevationTileData,
        coords: L.Coords,
        abortSignal?: AbortSignal
    ): void {
        const tileSize = (this.getTileSize() as L.Point).x;
        const pixelSizeMeters = _pixelSizeMeters(coords.y, coords.z, tileSize);

        this._doFillTile(
            data,
            tileData,
            (zData: number[]) => this._createHillshadeColor(zData, pixelSizeMeters),
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
        tileData: ElevationTileData,
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

    _buildElevationUrl: function (z: number, x: number, y: number, tileSize: number): string {
        return typeof this.options.elevationUrl === 'function'
            ? this.options.elevationUrl(z, x, y, tileSize)
            : this.options.elevationUrl
                  .replace('{z}', z.toString())
                  .replace('{x}', x.toString())
                  .replace('{y}', y.toString());
    },

    _rememberMissingTile: function (url: string): void {
        const missingTiles = this._state.missingTiles;
        if (missingTiles.size >= _MISSING_TILE_MEMO_SIZE) {
            // Sets iterate in insertion order: drop the oldest entry.
            const oldest = missingTiles.values().next().value;
            if (oldest !== undefined) {
                missingTiles.delete(oldest);
            }
        }
        missingTiles.add(url);
    },

    // Fetch the DEM covering `coords`, falling back to parent tiles when the source
    // has no data at that zoom for that area. Coverage is not uniform: Mapterhorn
    // publishes z17 over LiDAR countries but stops at z12 over others, and there is
    // no published index to know it in advance. Returns raw RGBA at native zoom, a
    // decoded elevation grid when upsampled from a parent, or null when the source
    // has nothing at all here.
    _fetchDemData: async function (
        coords: L.Coords,
        tileSize: number,
        demCtx: CanvasRenderingContext2D,
        abortSignal: AbortSignal
    ): Promise<ElevationTileData | null> {
        const decoder: ElevationTileDecoder | undefined = this.options.elevationTileDecoder;
        // A decoded source is served by a WMS, which answers 200 with a no-data grid
        // rather than 404 outside its coverage: no ancestor would ever be probed, and
        // the parent resampler only speaks RGBA anyway.
        const maxDepth = decoder
            ? 0
            : Math.max(0, Math.floor(this.options.elevationFallbackDepth || 0));
        const ancestorUrl = (depth: number): string =>
            this._buildElevationUrl(
                coords.z - depth,
                Math.floor(coords.x / Math.pow(2, depth)),
                Math.floor(coords.y / Math.pow(2, depth)),
                tileSize
            );

        // A tile pyramid never has data at a zoom whose parent has none, so a known
        // missing ancestor rules out everything below it: start just above the
        // deepest one already memoized instead of probing every level again.
        let startDepth = 0;
        for (let depth = maxDepth; depth >= 0; depth--) {
            if (coords.z - depth >= 0 && this._state.missingTiles.has(ancestorUrl(depth))) {
                startDepth = depth + 1;
                break;
            }
        }

        for (let depth = startDepth; depth <= maxDepth; depth++) {
            const sourceZ = coords.z - depth;
            if (sourceZ < 0) {
                break;
            }

            const scale = Math.pow(2, depth);
            const sourceX = Math.floor(coords.x / scale);
            const sourceY = Math.floor(coords.y / scale);
            const url = this._buildElevationUrl(sourceZ, sourceX, sourceY, tileSize);

            const response = await fetch(url, { signal: abortSignal });
            if (_isMissingTileStatus(response.status)) {
                this._rememberMissingTile(url);
                continue;
            }
            if (!response.ok) {
                throw new Error(`Failed to fetch tile: ${response.status}`);
            }

            if (decoder) {
                return decoder(await response.arrayBuffer(), tileSize);
            }

            const demBlob = await response.blob();
            const demBitmap = await createImageBitmap(demBlob);
            try {
                demCtx.imageSmoothingEnabled = false;
                demCtx.drawImage(demBitmap, 0, 0, tileSize, tileSize);
            } finally {
                demBitmap.close();
            }

            const demTileData = demCtx.getImageData(0, 0, tileSize, tileSize).data;
            if (depth === 0) {
                return demTileData;
            }

            const subTileSize = tileSize / scale;
            return _resampleParentElevations(
                demTileData,
                tileSize,
                (coords.x - sourceX * scale) * subTileSize,
                (coords.y - sourceY * scale) * subTileSize,
                scale,
                this.options.elevationExtractor
            );
        }

        return null;
    },

    _createArcheoColor: function (
        zData: number[],
        pixelSizeMeters: number
    ): [number, number, number, number] {
        const shade = _getMultiL(
            zData,
            pixelSizeMeters,
            this.options.archeoExaggeration,
            this._state.archeoA1,
            this._state.archeoA2,
            this._state.archeoA3
        );
        const curvature = Math.tanh(
            this.options.archeoGlowStrength * _getCurvature(zData, pixelSizeMeters)
        );
        const tint = Math.abs(curvature) * _ARCHEO_MAX_TINT;
        const glowColor: [number, number, number] =
            curvature > 0 ? this.options.archeoWarmColor : this.options.archeoCoolColor;
        const baseColor: [number, number, number] = this.options.archeoBaseColor;
        return [
            Math.round(shade * ((1 - tint) * baseColor[0] + tint * glowColor[0])),
            Math.round(shade * ((1 - tint) * baseColor[1] + tint * glowColor[1])),
            Math.round(shade * ((1 - tint) * baseColor[2] + tint * glowColor[2])),
            255,
        ];
    },

    _fillArcheoTile: function (
        data: Uint8ClampedArray,
        tileData: ElevationTileData,
        coords: L.Coords,
        abortSignal?: AbortSignal
    ): void {
        const tileSize = (this.getTileSize() as L.Point).x;
        const pixelSizeMeters = _pixelSizeMeters(coords.y, coords.z, tileSize);

        this._doFillTile(
            data,
            tileData,
            (zData: number[]) => this._createArcheoColor(zData, pixelSizeMeters),
            abortSignal
        );
    },

    _createTricolorColor: function (
        zData: number[],
        pixelSizeMeters: number
    ): [number, number, number, number] {
        const exaggeration = this.options.tricolorExaggeration;
        const dzdx = _getDzdx(zData, pixelSizeMeters) * exaggeration;
        const dzdy = _getDzdy(zData, pixelSizeMeters) * exaggeration;
        const rgba: [number, number, number, number] = [0, 0, 0, 255];
        for (let i = 0; i < 3; i++) {
            // Raw Lambertian, without the ambient lift hillshade mode applies: the RVT
            // method relies on the three channels keeping their full dynamic range,
            // which is what makes differently oriented slopes take on a color.
            const L = _getLambert(
                dzdx,
                dzdy,
                this._state.tricolorA1,
                this._state.tricolorA2[i],
                this._state.tricolorA3[i]
            );
            rgba[i] = Math.round(255 * L);
        }
        return rgba;
    },

    _fillTricolorTile: function (
        data: Uint8ClampedArray,
        tileData: ElevationTileData,
        coords: L.Coords,
        abortSignal?: AbortSignal
    ): void {
        const tileSize = (this.getTileSize() as L.Point).x;
        const pixelSizeMeters = _pixelSizeMeters(coords.y, coords.z, tileSize);

        this._doFillTile(
            data,
            tileData,
            (zData: number[]) => this._createTricolorColor(zData, pixelSizeMeters),
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

        (async () => {
            let demCanvas: HTMLCanvasElement | null = null;

            try {
                demCanvas = _canvasPool.acquire(tileSize);
                const demCtx = demCanvas.getContext('2d', { willReadFrequently: true });
                if (!demCtx) {
                    throw new Error('Unable to get 2d context from DEM canvas');
                }

                const demTileData = await this._fetchDemData(
                    coords,
                    tileSize,
                    demCtx,
                    abortController.signal
                );

                if (demTileData === null) {
                    // The source has no data here at any zoom. Hand back the blank
                    // canvas: reporting an error would make Leaflet hide the tile
                    // and log one message per missing tile.
                    if (!abortController.signal.aborted) {
                        done(undefined, tile);
                    }
                    return;
                }

                await this._fillTile(imageData.data, demTileData, coords, abortController.signal);

                if (!abortController.signal.aborted) {
                    ctx.putImageData(imageData, 0, 0);
                    done(undefined, tile);
                }
            } catch (error) {
                const aborted =
                    abortController.signal.aborted ||
                    (error instanceof Error && error.name === 'AbortError');
                if (!aborted) {
                    console.error(`Error loading tile ${tileKey}:`, error);
                    done(error instanceof Error ? error : new Error(String(error)), tile);
                }
            } finally {
                this._state.abortControllers.delete(tileKey);

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
    ignLidarHdMnt: _ignLidarHdMntElevationUrl,
    ignLidarHdMns: _ignLidarHdMnsElevationUrl,
};

L.GridLayer.Relief.elevationTileDecoders = {
    bil32: _bil32ElevationDecoder,
};

L.GridLayer.Relief.elevationMaxNativeZooms = _elevationMaxNativeZooms;

L.GridLayer.Relief.elevationAttributions = {
    terrarium:
        '&copy; <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Mapzen Elevation</a>',
    mapbox: '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>',
    mapterhorn:
        '&copy; <a href="https://mapterhorn.com/attribution/" target="_blank">Mapterhorn</a>',
    ignLidarHd:
        '&copy; <a href="https://geoservices.ign.fr/lidarhd" target="_blank">IGN LiDAR HD</a>',
};
// Types are already exported above - no need to re-export
