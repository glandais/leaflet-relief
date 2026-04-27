import { vi } from 'vitest';

// Mock Canvas API with simplified types
const createMockCanvasContext = () => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(256 * 256 * 4),
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(256 * 256 * 4),
    })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    canvas: {
        width: 256,
        height: 256,
    },
});

global.HTMLCanvasElement.prototype.getContext = vi.fn(() =>
    createMockCanvasContext()
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock Image constructor
global.Image = class MockImage {
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    private _src = '';
    public width = 256;
    public height = 256;

    constructor() {
        // Constructor implementation
    }

    set src(value: string) {
        this._src = value;
        // Simulate async image load
        setTimeout(() => {
            if (this.onload) {
                this.onload();
            }
        }, 0);
    }

    get src(): string {
        return this._src;
    }
} as unknown as typeof Image;

// Mock fetch for elevation tiles
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(256 * 256 * 4)),
    })
) as unknown as typeof fetch;

// Mock createImageBitmap
global.createImageBitmap = vi.fn(() =>
    Promise.resolve({
        width: 256,
        height: 256,
        close: vi.fn(),
    })
) as unknown as typeof createImageBitmap;

// Mock AbortController
global.AbortController = class MockAbortController {
    public signal = {
        aborted: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    };

    abort(): void {
        this.signal.aborted = true;
    }
} as unknown as new () => AbortController;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb: () => void) =>
    setTimeout(cb, 0)
) as unknown as typeof requestAnimationFrame;
global.cancelAnimationFrame = vi.fn((id: number) =>
    clearTimeout(id)
) as unknown as typeof cancelAnimationFrame;
