import * as d from "leaflet";
const F = 40075017, h = 256, b = [0, 0, 0, 0], E = {
  available: [],
  idleSize: 5,
  idleTimeout: 3e4,
  // 30 seconds
  idleTimer: null,
  acquire() {
    let e = this.available.pop();
    return e || (e = document.createElement("canvas"), e.width = h, e.height = h), this._resetIdleTimer(), e;
  },
  release(e) {
    e && (this.available.push(e), this._resetIdleTimer());
  },
  _resetIdleTimer() {
    this.idleTimer && clearTimeout(this.idleTimer), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
  },
  _trim() {
    for (; this.available.length > this.idleSize; )
      this.available.pop();
  }
}, A = function(e, t, l) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${e}/${t}/${l}.png`;
}, M = function(e, t, l, i) {
  return e * 256 + t + l / 256 - 32768;
}, S = function(e, t, l, i) {
  return -1e4 + (e * 256 * 256 + t * 256 + l) * 0.1;
}, C = function(e, t) {
  return (e[2] + 2 * e[5] + e[8] - (e[0] + 2 * e[3] + e[6])) / (8 * t);
}, y = function(e, t) {
  return (e[0] + 2 * e[1] + e[2] - (e[6] + 2 * e[7] + e[8])) / (8 * t);
}, R = function(e, t, l, i) {
  const n = C(e, 5), a = y(e, 5);
  let o = (t - l * n - i * a) / Math.sqrt(1 + n ** 2 + a ** 2);
  return o < 0 && (o = 0), o = Math.sqrt(o * 0.8 + 0.2), o;
}, L = function(e) {
  const t = Math.round(e * 255);
  return [t, t, t];
}, U = function(e, t) {
  const l = Math.PI - 2 * Math.PI * e / Math.pow(2, t), i = Math.atan(0.5 * (Math.exp(l) - Math.exp(-l))), n = F / (h * Math.pow(2, t)), a = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, i));
  return Math.max(0.1, n * Math.cos(a));
}, z = function(e, t) {
  const l = C(e, t), i = y(e, t);
  return Math.atan(Math.sqrt(l * l + i * i)) * 180 / Math.PI;
}, p = (e, t, l) => {
  for (; e < 0; )
    e = e + 360;
  for (; e > 360; )
    e = e - 360;
  e = e / 60;
  const i = l * t, n = i * (1 - Math.abs(e % 2 - 1)), a = l - i;
  let o, s, r;
  return e >= 0 && e < 1 ? [o, s, r] = [i, n, 0] : e >= 1 && e < 2 ? [o, s, r] = [n, i, 0] : e >= 2 && e < 3 ? [o, s, r] = [0, i, n] : e >= 3 && e < 4 ? [o, s, r] = [0, n, i] : e >= 4 && e < 5 ? [o, s, r] = [n, 0, i] : [o, s, r] = [i, 0, n], [Math.round((o + a) * 255), Math.round((s + a) * 255), Math.round((r + a) * 255), 255];
}, T = [
  { slope: { min: 0, max: 3 }, h: { min: 120, max: 60 } },
  { slope: { min: 3, max: 9 }, h: { min: 60, max: 20 } },
  { slope: { min: 9, max: 30 }, h: { min: 20, max: -20 } },
  { slope: { min: 30, max: 60 }, h: { min: -20, max: -60 } }
], v = {
  default: T,
  glacial: [
    { slope: { min: 0, max: 5 }, h: { min: 240, max: 200 } },
    { slope: { min: 5, max: 15 }, h: { min: 200, max: 160 } },
    { slope: { min: 15, max: 30 }, h: { min: 160, max: 120 } },
    { slope: { min: 30, max: 60 }, h: { min: 120, max: 60 } },
    { slope: { min: 60, max: 90 }, h: { min: 60, max: 0 } }
  ],
  thermal: [
    { slope: { min: 0, max: 10 }, h: { min: 280, max: 320 } },
    { slope: { min: 10, max: 25 }, h: { min: 320, max: 360 } },
    { slope: { min: 25, max: 45 }, h: { min: 0, max: 40 } },
    { slope: { min: 45, max: 65 }, h: { min: 40, max: 60 } }
  ],
  earth: [
    { slope: { min: 0, max: 5 }, h: { min: 60, max: 40 } },
    { slope: { min: 5, max: 15 }, h: { min: 40, max: 20 } },
    { slope: { min: 15, max: 35 }, h: { min: 20, max: 10 } },
    { slope: { min: 35, max: 55 }, h: { min: 10, max: 0 } }
  ]
}, g = function(e) {
  return function(t) {
    if (t < e[0].slope.min)
      return p(e[0].h.min, 1, 1).slice(0, 3);
    for (let i = 0; i < e.length; i++) {
      const n = e[i];
      if (t >= n.slope.min && t <= n.slope.max) {
        const a = (t - n.slope.min) / (n.slope.max - n.slope.min), o = n.h.min + a * (n.h.max - n.h.min);
        return p(o, 1, 1).slice(0, 3);
      }
    }
    const l = e[e.length - 1];
    return p(l.h.max, 1, 1).slice(0, 3);
  };
}, P = d.GridLayer.extend({
  options: {
    attribution: '&copy; <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Mapzen Elevation</a>'
  },
  initialize: function(e) {
    if (e && e.noWrap && !e.bounds && (e.bounds = [
      [-90, -180],
      [90, 180]
    ]), d.GridLayer.prototype.initialize.call(this, e), this._mode = e && e.mode || "hillshade", this._hillshadeAzimuth = e && typeof e.hillshadeAzimuth == "number" ? e.hillshadeAzimuth : 315, this._hillshadeElevation = e && typeof e.hillshadeElevation == "number" ? e.hillshadeElevation : 45, this._recomputeHillshadeConstants(), this._hillshadeColorFunction = e && e.hillshadeColorFunction || L, e && e.slopeColorFunction)
      this._slopeColorFunction = e.slopeColorFunction;
    else if (e && e.slopeColorConfig)
      this._slopeColorFunction = g(e.slopeColorConfig);
    else if (e && e.slopeColorScheme) {
      const t = v[e.slopeColorScheme] || v.default;
      this._slopeColorFunction = g(t);
    } else
      this._slopeColorFunction = g(T);
    this._elevationUrl = e && e.elevationUrl || A, this._elevationExtractor = e && e.elevationExtractor || M, this._abortControllers = /* @__PURE__ */ new Map(), this.on("tileunload", function(t) {
      this._tileUnloaded(t.coords);
    });
  },
  _fillTile: async function(e, t, l, i) {
    this._mode === "hillshade" ? this._fillHillshadeTile(e, t, l, i) : this._fillSlopeTile(e, t, l, i);
  },
  _recomputeHillshadeConstants: function() {
    const e = Math.PI / 180 * this._hillshadeAzimuth, t = Math.PI / 180 * this._hillshadeElevation;
    this._hillshadeA1 = Math.sin(t), this._hillshadeA2 = Math.cos(t) * Math.sin(e), this._hillshadeA3 = Math.cos(t) * Math.cos(e);
  },
  _getElevation: function(e, t, l) {
    const i = (l * h + t) * 4, n = e[i], a = e[i + 1], o = e[i + 2], s = e[i + 3];
    return this._elevationExtractor(n, a, o, s);
  },
  _getZ: function(e, t, l) {
    if (t <= 0 || l <= 0 || t >= h - 1 || l >= h - 1) {
      const i = Math.max(1, Math.min(t, h - 2)), n = Math.max(1, Math.min(l, h - 2));
      return this._getZ(e, i, n);
    }
    return [
      this._getElevation(e, t - 1, l - 1),
      this._getElevation(e, t - 1, l),
      this._getElevation(e, t - 1, l + 1),
      this._getElevation(e, t, l - 1),
      this._getElevation(e, t, l),
      this._getElevation(e, t, l + 1),
      this._getElevation(e, t + 1, l - 1),
      this._getElevation(e, t + 1, l),
      this._getElevation(e, t + 1, l + 1)
    ];
  },
  _doFillTile: function(e, t, l, i) {
    for (let n = 0; n < h; n++) {
      if (i && i.aborted)
        throw new DOMException("Tile loading aborted", "AbortError");
      for (let a = 0; a < h; a++) {
        const o = this._getZ(t, n, a), s = o.some((x) => x <= 0);
        let r;
        s ? r = b : r = l(o);
        const c = (a * h + n) * 4;
        e[c] = r[0], e[c + 1] = r[1], e[c + 2] = r[2], e[c + 3] = r[3];
      }
    }
  },
  _createHillshadeColor: function(e) {
    const t = R(e, this._hillshadeA1, this._hillshadeA2, this._hillshadeA3), [l, i, n] = this._hillshadeColorFunction(t);
    return [l, i, n, 255];
  },
  _fillHillshadeTile: function(e, t, l, i) {
    this._doFillTile(
      e,
      t,
      (n) => this._createHillshadeColor(n),
      i
    );
  },
  _createSlopeColor: function(e, t) {
    const l = z(e, t);
    if (l < 0.5)
      return b;
    {
      const i = this._slopeColorFunction(l);
      return [i[0], i[1], i[2], 255];
    }
  },
  _fillSlopeTile: function(e, t, l, i) {
    const n = l.y, a = l.z, o = U(n, a);
    this._doFillTile(
      e,
      t,
      (s) => this._createSlopeColor(s, o),
      i
    );
  },
  _tileUnloaded: function(e) {
    const t = `${e.z}/${e.x}/${e.y}`;
    if (this._abortControllers.has(t)) {
      const l = this._abortControllers.get(t);
      l && (l.abort(), this._abortControllers.delete(t));
    }
  },
  createTile: function(e, t) {
    const l = e.x, i = e.y, n = e.z, a = `${n}/${l}/${i}`, o = document.createElement("canvas");
    o.setAttribute("width", h.toString()), o.setAttribute("height", h.toString());
    const s = o.getContext("2d");
    if (!s)
      throw new Error("Unable to get 2d context from canvas");
    const r = s.createImageData(256, 256), c = new AbortController();
    this._abortControllers.set(a, c);
    const x = typeof this._elevationUrl == "function" ? this._elevationUrl(n, l, i) : this._elevationUrl.replace("{z}", n.toString()).replace("{x}", l.toString()).replace("{y}", i.toString());
    return (async () => {
      let u = null, _ = null, f = null;
      try {
        if (_ = E.acquire(), f = _.getContext("2d", { willReadFrequently: !0 }), !f)
          throw new Error("Unable to get 2d context from DEM canvas");
        const m = await fetch(x, { signal: c.signal });
        if (!m.ok)
          throw new Error(`Failed to fetch tile: ${m.status}`);
        const w = await m.blob();
        u = await createImageBitmap(w), f.drawImage(u, 0, 0);
        const I = f.getImageData(0, 0, h, h).data;
        await this._fillTile(r.data, I, e, c.signal), c.signal.aborted || (s.putImageData(r, 0, 0), t(void 0, o));
      } catch (m) {
        m instanceof Error && m.name !== "AbortError" && console.error(`Error loading tile ${a}:`, m);
      } finally {
        this._abortControllers.delete(a), u && u.close(), _ && E.release(_);
      }
    })(), o;
  },
  tileUnloaded: function(e) {
    this._tileUnloaded(e);
  }
});
d.GridLayer.Relief = P;
d.gridLayer.relief = function(e) {
  return new d.GridLayer.Relief(e);
};
d.GridLayer.Relief.elevationExtractors = {
  terrarium: M,
  mapbox: S
};
//# sourceMappingURL=leaflet-relief.esm.js.map
