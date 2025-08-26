// Setup file for Jest tests

// Mock Canvas API with simplified types
const createMockCanvasContext = () => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(256 * 256 * 4),
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(256 * 256 * 4),
    })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    transform: jest.fn(),
    beginPath: jest.fn(),
    clip: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    rect: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    canvas: {
        width: 256,
        height: 256,
    },
});

global.HTMLCanvasElement.prototype.getContext = jest.fn(() =>
    createMockCanvasContext()
) as jest.Mock;

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
} as any;

// Mock fetch for elevation tiles
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(256 * 256 * 4)),
    })
) as jest.Mock;

// Mock createImageBitmap
global.createImageBitmap = jest.fn(() =>
    Promise.resolve({
        width: 256,
        height: 256,
        close: jest.fn(),
    })
) as jest.Mock;

// Mock AbortController
global.AbortController = class MockAbortController {
    public signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    };

    abort(): void {
        this.signal.aborted = true;
    }
} as unknown as new () => AbortController;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb: () => void) => setTimeout(cb, 0)) as jest.Mock;
global.cancelAnimationFrame = jest.fn((id: number) => clearTimeout(id)) as jest.Mock;
