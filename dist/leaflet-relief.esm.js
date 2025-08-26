import * as d from "leaflet";
const A = 40075017, h = 256, M = [0, 0, 0, 0], b = {
  available: [],
  idleSize: 5,
  idleTimeout: 3e4,
  // 30 seconds
  idleTimer: null,
  acquire() {
    let t = this.available.pop();
    return t || (t = document.createElement("canvas"), t.width = h, t.height = h), this._resetIdleTimer(), t;
  },
  release(t) {
    t && (this.available.push(t), this._resetIdleTimer());
  },
  _resetIdleTimer() {
    this.idleTimer && clearTimeout(this.idleTimer), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
  },
  _trim() {
    for (; this.available.length > this.idleSize; )
      this.available.pop();
  }
}, S = function(t, e, o) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${t}/${e}/${o}.png`;
}, v = function(t, e, o, n) {
  return t * 256 + e + o / 256 - 32768;
}, F = function(t, e, o, n) {
  return -1e4 + (t * 256 * 256 + e * 256 + o) * 0.1;
}, C = function(t, e) {
  return (t[2] + 2 * t[5] + t[8] - (t[0] + 2 * t[3] + t[6])) / (8 * e);
}, T = function(t, e) {
  return (t[0] + 2 * t[1] + t[2] - (t[6] + 2 * t[7] + t[8])) / (8 * e);
}, R = function(t, e) {
  const o = C(t, 5), n = T(t, 5);
  let i = (e.hillshadeA1 - e.hillshadeA2 * o - e.hillshadeA3 * n) / Math.sqrt(1 + o ** 2 + n ** 2);
  return i < 0 && (i = 0), i = Math.sqrt(i * 0.8 + 0.2), i;
}, U = function(t) {
  const e = Math.round(t * 255);
  return [e, e, e];
}, L = function(t, e) {
  const o = Math.PI - 2 * Math.PI * t / Math.pow(2, e), n = Math.atan(0.5 * (Math.exp(o) - Math.exp(-o))), i = A / (h * Math.pow(2, e)), a = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, n));
  return Math.max(0.1, i * Math.cos(a));
}, P = function(t, e) {
  const o = C(t, e), n = T(t, e);
  return Math.atan(Math.sqrt(o * o + n * n)) * 180 / Math.PI;
}, _ = (t, e, o) => {
  for (; t < 0; )
    t = t + 360;
  for (; t > 360; )
    t = t - 360;
  t = t / 60;
  const n = o * e, i = n * (1 - Math.abs(t % 2 - 1)), a = o - n;
  let l, s, r;
  return t >= 0 && t < 1 ? [l, s, r] = [n, i, 0] : t >= 1 && t < 2 ? [l, s, r] = [i, n, 0] : t >= 2 && t < 3 ? [l, s, r] = [0, n, i] : t >= 3 && t < 4 ? [l, s, r] = [0, i, n] : t >= 4 && t < 5 ? [l, s, r] = [i, 0, n] : [l, s, r] = [n, 0, i], [Math.round((l + a) * 255), Math.round((s + a) * 255), Math.round((r + a) * 255), 255];
}, w = [
  { slope: { min: 0, max: 3 }, h: { min: 120, max: 60 } },
  { slope: { min: 3, max: 9 }, h: { min: 60, max: 20 } },
  { slope: { min: 9, max: 30 }, h: { min: 20, max: -20 } },
  { slope: { min: 30, max: 60 }, h: { min: -20, max: -60 } }
], E = {
  default: w,
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
}, g = function(t) {
  return function(e) {
    if (e < t[0].slope.min)
      return _(t[0].h.min, 1, 1).slice(0, 3);
    for (let n = 0; n < t.length; n++) {
      const i = t[n];
      if (e >= i.slope.min && e <= i.slope.max) {
        const a = (e - i.slope.min) / (i.slope.max - i.slope.min), l = i.h.min + a * (i.h.max - i.h.min);
        return _(l, 1, 1).slice(0, 3);
      }
    }
    const o = t[t.length - 1];
    return _(o.h.max, 1, 1).slice(0, 3);
  };
}, $ = d.GridLayer.extend({
  options: {
    mode: "hillshade",
    elevationUrl: S,
    elevationExtractor: v,
    hillshadeAzimuth: 315,
    hillshadeElevation: 45,
    hillshadeColorFunction: U,
    slopeColorFunction: g(w),
    attribution: '&copy; <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Mapzen Elevation</a>'
  },
  initialize: function(t) {
    if (this._state = {
      hillshadeA1: 0,
      hillshadeA2: 0,
      hillshadeA3: 0,
      abortControllers: new globalThis.Map()
    }, t && t.slopeColorConfig)
      t.slopeColorFunction = g(t.slopeColorConfig);
    else if (t && t.slopeColorScheme) {
      const e = E[t.slopeColorScheme] || E.default;
      t.slopeColorFunction = g(e);
    }
    d.Util.setOptions(this, t), this._recomputeHillshadeConstants(), this.on("tileunload", function(e) {
      this._tileUnloaded(e.coords);
    });
  },
  _fillTile: async function(t, e, o, n) {
    this.options.mode === "hillshade" ? this._fillHillshadeTile(t, e, o, n) : this._fillSlopeTile(t, e, o, n);
  },
  _recomputeHillshadeConstants: function() {
    const t = Math.PI / 180 * this.options.hillshadeAzimuth, e = Math.PI / 180 * this.options.hillshadeElevation;
    this._state.hillshadeA1 = Math.sin(e), this._state.hillshadeA2 = Math.cos(e) * Math.sin(t), this._state.hillshadeA3 = Math.cos(e) * Math.cos(t);
  },
  _getElevation: function(t, e, o) {
    const n = (o * h + e) * 4, i = t[n], a = t[n + 1], l = t[n + 2], s = t[n + 3];
    return this.options.elevationExtractor(i, a, l, s);
  },
  _getZ: function(t, e, o) {
    if (e <= 0 || o <= 0 || e >= h - 1 || o >= h - 1) {
      const n = Math.max(1, Math.min(e, h - 2)), i = Math.max(1, Math.min(o, h - 2));
      return this._getZ(t, n, i);
    }
    return [
      this._getElevation(t, e - 1, o - 1),
      this._getElevation(t, e - 1, o),
      this._getElevation(t, e - 1, o + 1),
      this._getElevation(t, e, o - 1),
      this._getElevation(t, e, o),
      this._getElevation(t, e, o + 1),
      this._getElevation(t, e + 1, o - 1),
      this._getElevation(t, e + 1, o),
      this._getElevation(t, e + 1, o + 1)
    ];
  },
  _doFillTile: function(t, e, o, n) {
    for (let i = 0; i < h; i++) {
      if (n && n.aborted)
        throw new DOMException("Tile loading aborted", "AbortError");
      for (let a = 0; a < h; a++) {
        const l = this._getZ(e, i, a), s = l.some((x) => x <= 0);
        let r;
        s ? r = M : r = o(l);
        const c = (a * h + i) * 4;
        t[c] = r[0], t[c + 1] = r[1], t[c + 2] = r[2], t[c + 3] = r[3];
      }
    }
  },
  _createHillshadeColor: function(t) {
    const e = R(t, this._state), [o, n, i] = this.options.hillshadeColorFunction(e);
    return [o, n, i, 255];
  },
  _fillHillshadeTile: function(t, e, o, n) {
    this._doFillTile(
      t,
      e,
      (i) => this._createHillshadeColor(i),
      n
    );
  },
  _createSlopeColor: function(t, e) {
    const o = P(t, e);
    if (o < 0.5)
      return M;
    {
      const n = this.options.slopeColorFunction(o);
      return [n[0], n[1], n[2], 255];
    }
  },
  _fillSlopeTile: function(t, e, o, n) {
    const i = o.y, a = o.z, l = L(i, a);
    this._doFillTile(
      t,
      e,
      (s) => this._createSlopeColor(s, l),
      n
    );
  },
  _tileUnloaded: function(t) {
    const e = `${t.z}/${t.x}/${t.y}`;
    if (this._state.abortControllers.has(e)) {
      const o = this._state.abortControllers.get(e);
      o && (o.abort(), this._state.abortControllers.delete(e));
    }
  },
  createTile: function(t, e) {
    const o = t.x, n = t.y, i = t.z, a = `${i}/${o}/${n}`, l = document.createElement("canvas");
    l.setAttribute("width", h.toString()), l.setAttribute("height", h.toString());
    const s = l.getContext("2d");
    if (!s)
      throw new Error("Unable to get 2d context from canvas");
    const r = s.createImageData(256, 256), c = new AbortController();
    this._state.abortControllers.set(a, c);
    const x = typeof this.options.elevationUrl == "function" ? this.options.elevationUrl(i, o, n) : this.options.elevationUrl.replace("{z}", i.toString()).replace("{x}", o.toString()).replace("{y}", n.toString());
    return (async () => {
      let u = null, p = null, f = null;
      try {
        if (p = b.acquire(), f = p.getContext("2d", { willReadFrequently: !0 }), !f)
          throw new Error("Unable to get 2d context from DEM canvas");
        const m = await fetch(x, { signal: c.signal });
        if (!m.ok)
          throw new Error(`Failed to fetch tile: ${m.status}`);
        const y = await m.blob();
        u = await createImageBitmap(y), f.drawImage(u, 0, 0);
        const I = f.getImageData(0, 0, h, h).data;
        await this._fillTile(r.data, I, t, c.signal), c.signal.aborted || (s.putImageData(r, 0, 0), e(void 0, l));
      } catch (m) {
        m instanceof Error && m.name !== "AbortError" && console.error(`Error loading tile ${a}:`, m);
      } finally {
        this._state.abortControllers.delete(a), u && u.close(), p && b.release(p);
      }
    })(), l;
  },
  tileUnloaded: function(t) {
    this._tileUnloaded(t);
  }
});
d.GridLayer.Relief = $;
d.gridLayer.relief = function(t) {
  return new d.GridLayer.Relief(t);
};
d.GridLayer.Relief.elevationExtractors = {
  terrarium: v,
  mapbox: F
};
//# sourceMappingURL=leaflet-relief.esm.js.map
