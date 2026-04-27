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
                _tileUnloaded(coords: L.Coords): void;
                _getElevation(tileData: Uint8ClampedArray, j: number, i: number): number;
                _getZ(tileData: Uint8ClampedArray, i: number, j: number): number[];
                _fillTile: (data: Uint8ClampedArray, tileData: Uint8ClampedArray, coords: L.Coords, abortSignal?: AbortSignal) => void;
                _doFillTile(data: Uint8ClampedArray, tileData: Uint8ClampedArray, colorFunction: ColorFunction, abortSignal?: AbortSignal): void;
                _recomputeHillshadeConstants(): void;
                _createHillshadeColor(zData: number[]): [number, number, number, number];
                _fillHillshadeTile(data: Uint8ClampedArray, tileData: Uint8ClampedArray, coords: L.Coords, abortSignal?: AbortSignal): void;
                _createSlopeColor(zData: number[], pixelScaleMeters: number): [number, number, number, number];
                _fillSlopeTile(data: Uint8ClampedArray, tileData: Uint8ClampedArray, coords: L.Coords, abortSignal?: AbortSignal): void;
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
export {};
//# sourceMappingURL=L.GridLayer.Relief.d.ts.map