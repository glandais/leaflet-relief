// Setup file for Jest tests
// Mock Canvas API
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
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
}));

// Mock Image constructor
global.Image = class {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.src = '';
        this.width = 256;
        this.height = 256;
    }

    set src(value) {
        this._src = value;
        // Simulate async image load
        setTimeout(() => {
            if (this.onload) {
                this.onload();
            }
        }, 0);
    }

    get src() {
        return this._src;
    }
};

// Mock fetch for elevation tiles
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(256 * 256 * 4)),
    })
);

// Mock createImageBitmap
global.createImageBitmap = jest.fn(() =>
    Promise.resolve({
        width: 256,
        height: 256,
        close: jest.fn(),
    })
);

// Mock AbortController
global.AbortController = class {
    constructor() {
        this.signal = {
            aborted: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };
    }
    abort() {
        this.signal.aborted = true;
    }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
