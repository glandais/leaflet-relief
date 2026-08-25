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
                static elevationMaxNativeZooms: {
                    terrarium: number;
                    mapbox: number;
                    mapterhorn: number;
                };
                options: ReliefOptions;
                _tileUnloaded(coords: L.Coords): void;
                _getElevation(tileData: ElevationTileData, j: number, i: number): number;
                _getZ(tileData: ElevationTileData, i: number, j: number): number[];
                _buildElevationUrl(z: number, x: number, y: number): string;
                _rememberMissingTile(url: string): void;
                _fetchDemData(coords: L.Coords, tileSize: number, demCtx: CanvasRenderingContext2D, abortSignal: AbortSignal): Promise<ElevationTileData | null>;
                _fillTile: (data: Uint8ClampedArray, tileData: ElevationTileData, coords: L.Coords, abortSignal?: AbortSignal) => void;
                _doFillTile(data: Uint8ClampedArray, tileData: ElevationTileData, colorFunction: ColorFunction, abortSignal?: AbortSignal): void;
                _recomputeHillshadeConstants(): void;
                _createHillshadeColor(zData: number[], pixelSizeMeters: number): [number, number, number, number];
                _fillHillshadeTile(data: Uint8ClampedArray, tileData: ElevationTileData, coords: L.Coords, abortSignal?: AbortSignal): void;
                _createSlopeColor(zData: number[], pixelScaleMeters: number): [number, number, number, number];
                _fillSlopeTile(data: Uint8ClampedArray, tileData: ElevationTileData, coords: L.Coords, abortSignal?: AbortSignal): void;
                _recomputeArcheoConstants(): void;
                _createArcheoColor(zData: number[], pixelSizeMeters: number): [number, number, number, number];
                _fillArcheoTile(data: Uint8ClampedArray, tileData: ElevationTileData, coords: L.Coords, abortSignal?: AbortSignal): void;
                _recomputeTricolorConstants(): void;
                _createTricolorColor(zData: number[], pixelSizeMeters: number): [number, number, number, number];
                _fillTricolorTile(data: Uint8ClampedArray, tileData: ElevationTileData, coords: L.Coords, abortSignal?: AbortSignal): void;
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
    elevationFallbackDepth?: number;
}
export type HillshadeColorFunction = (intensity: number) => [number, number, number];
export type SlopeColorFunction = (slopeDegrees: number) => [number, number, number];
export type ElevationUrlFunction = (z: number, x: number, y: number) => string;
export type ElevationExtractorFunction = (r: number, g: number, b: number, a: number) => number;
type ColorFunction = (zData: number[]) => [number, number, number, number];
export type ElevationTileData = Uint8ClampedArray | Float32Array;
export interface SlopeColorConfig {
    slope: {
        min: number;
        max: number;
    };
    h: {
        min: number;
        max: number;
    };
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
export {};
//# sourceMappingURL=L.GridLayer.Relief.d.ts.map