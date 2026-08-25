import * as e from "leaflet";
//#region src/L.GridLayer.Relief.ts
var t = 40075017, n = [
	0,
	0,
	0,
	0
], r = {
	available: [],
	idleSize: 5,
	idleTimeout: 3e4,
	idleTimer: null,
	acquire(e) {
		let t = this.available.pop();
		return t ||= document.createElement("canvas"), t.width = e, t.height = e, this._resetIdleTimer(), t;
	},
	release(e) {
		e && (this.available.push(e), this._resetIdleTimer());
	},
	_resetIdleTimer() {
		this.idleTimer && clearTimeout(this.idleTimer), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
	},
	_trim() {
		for (; this.available.length > this.idleSize;) this.available.pop();
	}
}, i = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp", a = {
	terrarium: 15,
	mapbox: 15,
	mapterhorn: 17
}, o = function(e, t, n) {
	return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${e}/${t}/${n}.png`;
}, s = function(e, t, n, r) {
	return e * 256 + t + n / 256 - 32768;
}, c = function(e, t, n, r) {
	return -1e4 + (e * 256 * 256 + t * 256 + n) * .1;
}, l = function(e, t) {
	return (e[2] + 2 * e[5] + e[8] - (e[0] + 2 * e[3] + e[6])) / (8 * t);
}, u = function(e, t) {
	return (e[0] + 2 * e[1] + e[2] - (e[6] + 2 * e[7] + e[8])) / (8 * t);
}, d = function(e, n, r) {
	let i = Math.PI - 2 * Math.PI * e / 2 ** n, a = Math.atan(.5 * (Math.exp(i) - Math.exp(-i))), o = t / (r * 2 ** n), s = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, a));
	return Math.max(.1, o * Math.cos(s));
}, f = function(e, t, n, r) {
	let i = l(e, n) * r, a = u(e, n) * r, o = (t.hillshadeA1 - t.hillshadeA2 * i - t.hillshadeA3 * a) / Math.sqrt(1 + i ** 2 + a ** 2);
	return o < 0 && (o = 0), o = Math.sqrt(o * .8 + .2), o;
}, p = function(e) {
	let t = Math.round(e * 255);
	return [
		t,
		t,
		t
	];
}, m = function(e, t) {
	let n = l(e, t), r = u(e, t);
	return Math.atan(Math.sqrt(n * n + r * r)) * 180 / Math.PI;
}, h = (e, t, n) => {
	for (; e < 0;) e += 360;
	for (; e > 360;) e -= 360;
	e /= 60;
	let r = n * t, i = r * (1 - Math.abs(e % 2 - 1)), a = n - r, o, s, c;
	return e >= 0 && e < 1 ? [o, s, c] = [
		r,
		i,
		0
	] : e >= 1 && e < 2 ? [o, s, c] = [
		i,
		r,
		0
	] : e >= 2 && e < 3 ? [o, s, c] = [
		0,
		r,
		i
	] : e >= 3 && e < 4 ? [o, s, c] = [
		0,
		i,
		r
	] : e >= 4 && e < 5 ? [o, s, c] = [
		i,
		0,
		r
	] : [o, s, c] = [
		r,
		0,
		i
	], [
		Math.round((o + a) * 255),
		Math.round((s + a) * 255),
		Math.round((c + a) * 255),
		255
	];
}, g = [
	{
		slope: {
			min: 0,
			max: 3
		},
		h: {
			min: 120,
			max: 60
		}
	},
	{
		slope: {
			min: 3,
			max: 9
		},
		h: {
			min: 60,
			max: 20
		}
	},
	{
		slope: {
			min: 9,
			max: 30
		},
		h: {
			min: 20,
			max: -20
		}
	},
	{
		slope: {
			min: 30,
			max: 60
		},
		h: {
			min: -20,
			max: -60
		}
	}
], _ = {
	default: g,
	glacial: [
		{
			slope: {
				min: 0,
				max: 5
			},
			h: {
				min: 240,
				max: 200
			}
		},
		{
			slope: {
				min: 5,
				max: 15
			},
			h: {
				min: 200,
				max: 160
			}
		},
		{
			slope: {
				min: 15,
				max: 30
			},
			h: {
				min: 160,
				max: 120
			}
		},
		{
			slope: {
				min: 30,
				max: 60
			},
			h: {
				min: 120,
				max: 60
			}
		},
		{
			slope: {
				min: 60,
				max: 90
			},
			h: {
				min: 60,
				max: 0
			}
		}
	],
	thermal: [
		{
			slope: {
				min: 0,
				max: 10
			},
			h: {
				min: 280,
				max: 320
			}
		},
		{
			slope: {
				min: 10,
				max: 25
			},
			h: {
				min: 320,
				max: 360
			}
		},
		{
			slope: {
				min: 25,
				max: 45
			},
			h: {
				min: 0,
				max: 40
			}
		},
		{
			slope: {
				min: 45,
				max: 65
			},
			h: {
				min: 40,
				max: 60
			}
		}
	],
	earth: [
		{
			slope: {
				min: 0,
				max: 5
			},
			h: {
				min: 60,
				max: 40
			}
		},
		{
			slope: {
				min: 5,
				max: 15
			},
			h: {
				min: 40,
				max: 20
			}
		},
		{
			slope: {
				min: 15,
				max: 35
			},
			h: {
				min: 20,
				max: 10
			}
		},
		{
			slope: {
				min: 35,
				max: 55
			},
			h: {
				min: 10,
				max: 0
			}
		}
	]
}, v = function(e) {
	return function(t) {
		if (t < e[0].slope.min) return h(e[0].h.min, 1, 1).slice(0, 3);
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			if (t >= r.slope.min && t <= r.slope.max) {
				let e = (t - r.slope.min) / (r.slope.max - r.slope.min);
				return h(r.h.min + e * (r.h.max - r.h.min), 1, 1).slice(0, 3);
			}
		}
		let n = e[e.length - 1];
		return h(n.h.max, 1, 1).slice(0, 3);
	};
}, y = e.GridLayer.extend({
	options: {
		mode: "hillshade",
		elevationUrl: i,
		elevationExtractor: s,
		maxNativeZoom: a.mapterhorn,
		hillshadeAzimuth: 315,
		hillshadeElevation: 45,
		hillshadeExaggeration: 1,
		hillshadeColorFunction: p,
		slopeColorFunction: v(g),
		attribution: "&copy; <a href=\"https://mapterhorn.com/attribution/\" target=\"_blank\">Mapterhorn</a>"
	},
	initialize: function(t) {
		this._state = {
			hillshadeA1: 0,
			hillshadeA2: 0,
			hillshadeA3: 0,
			abortControllers: new globalThis.Map()
		}, t && t.slopeColorConfig ? t.slopeColorFunction = v(t.slopeColorConfig) : t && t.slopeColorScheme && (t.slopeColorFunction = v(_[t.slopeColorScheme] || _.default)), e.Util.setOptions(this, t), (!t || t.maxNativeZoom === void 0) && this.options.elevationUrl === o && (this.options.maxNativeZoom = a.terrarium), this._recomputeHillshadeConstants(), this.on("tileunload", function(e) {
			this._tileUnloaded(e.coords);
		});
	},
	_fillTile: async function(e, t, n, r) {
		this.options.mode === "hillshade" ? this._fillHillshadeTile(e, t, n, r) : this._fillSlopeTile(e, t, n, r);
	},
	_recomputeHillshadeConstants: function() {
		let e = Math.PI / 180 * this.options.hillshadeAzimuth, t = Math.PI / 180 * this.options.hillshadeElevation;
		this._state.hillshadeA1 = Math.sin(t), this._state.hillshadeA2 = Math.cos(t) * Math.sin(e), this._state.hillshadeA3 = Math.cos(t) * Math.cos(e);
	},
	_getElevation: function(e, t, n) {
		let r = (n * this.getTileSize().x + t) * 4, i = e[r], a = e[r + 1], o = e[r + 2], s = e[r + 3];
		return this.options.elevationExtractor(i, a, o, s);
	},
	_getZ: function(e, t, n) {
		let r = this.getTileSize().x;
		if (t <= 0 || n <= 0 || t >= r - 1 || n >= r - 1) {
			let i = Math.max(1, Math.min(t, r - 2)), a = Math.max(1, Math.min(n, r - 2));
			return this._getZ(e, i, a);
		}
		return [
			this._getElevation(e, t - 1, n - 1),
			this._getElevation(e, t - 1, n),
			this._getElevation(e, t - 1, n + 1),
			this._getElevation(e, t, n - 1),
			this._getElevation(e, t, n),
			this._getElevation(e, t, n + 1),
			this._getElevation(e, t + 1, n - 1),
			this._getElevation(e, t + 1, n),
			this._getElevation(e, t + 1, n + 1)
		];
	},
	_doFillTile: function(e, t, r, i) {
		let a = this.getTileSize().x;
		for (let o = 0; o < a; o++) {
			if (i && i.aborted) throw new DOMException("Tile loading aborted", "AbortError");
			for (let i = 0; i < a; i++) {
				let s = this._getZ(t, o, i), c = s.some((e) => e <= 0), l;
				l = c ? n : r(s);
				let u = (i * a + o) * 4;
				e[u] = l[0], e[u + 1] = l[1], e[u + 2] = l[2], e[u + 3] = l[3];
			}
		}
	},
	_createHillshadeColor: function(e, t) {
		let n = f(e, this._state, t, this.options.hillshadeExaggeration), [r, i, a] = this.options.hillshadeColorFunction(n);
		return [
			r,
			i,
			a,
			255
		];
	},
	_fillHillshadeTile: function(e, t, n, r) {
		let i = this.getTileSize().x, a = d(n.y, n.z, i);
		this._doFillTile(e, t, (e) => this._createHillshadeColor(e, a), r);
	},
	_createSlopeColor: function(e, t) {
		let r = m(e, t);
		if (r < .5) return n;
		{
			let e = this.options.slopeColorFunction(r);
			return [
				e[0],
				e[1],
				e[2],
				255
			];
		}
	},
	_fillSlopeTile: function(e, t, n, r) {
		let i = n.y, a = n.z, o = this.getTileSize().x, s = d(i, a, o);
		this._doFillTile(e, t, (e) => this._createSlopeColor(e, s), r);
	},
	_tileUnloaded: function(e) {
		let t = `${e.z}/${e.x}/${e.y}`;
		if (this._state.abortControllers.has(t)) {
			let e = this._state.abortControllers.get(t);
			e && (e.abort(), this._state.abortControllers.delete(t));
		}
	},
	createTile: function(e, t) {
		let n = e.x, i = e.y, a = e.z, o = `${a}/${n}/${i}`, s = this.getTileSize().x, c = document.createElement("canvas");
		c.setAttribute("width", s.toString()), c.setAttribute("height", s.toString());
		let l = c.getContext("2d");
		if (!l) throw Error("Unable to get 2d context from canvas");
		let u = l.createImageData(s, s), d = new AbortController();
		this._state.abortControllers.set(o, d);
		let f = typeof this.options.elevationUrl == "function" ? this.options.elevationUrl(a, n, i) : this.options.elevationUrl.replace("{z}", a.toString()).replace("{x}", n.toString()).replace("{y}", i.toString());
		return (async () => {
			let n = null, i = null;
			try {
				i = r.acquire(s);
				let a = i.getContext("2d", { willReadFrequently: !0 });
				if (!a) throw Error("Unable to get 2d context from DEM canvas");
				let o = await fetch(f, { signal: d.signal });
				if (!o.ok) throw Error(`Failed to fetch tile: ${o.status}`);
				let p = await o.blob();
				n = await createImageBitmap(p), a.imageSmoothingEnabled = !1, a.drawImage(n, 0, 0, s, s);
				let m = a.getImageData(0, 0, s, s).data;
				await this._fillTile(u.data, m, e, d.signal), d.signal.aborted || (l.putImageData(u, 0, 0), t(void 0, c));
			} catch (e) {
				e instanceof Error && e.name !== "AbortError" && (console.error(`Error loading tile ${o}:`, e), t(e, c));
			} finally {
				this._state.abortControllers.delete(o), n && n.close(), i && r.release(i);
			}
		})(), c;
	},
	tileUnloaded: function(e) {
		this._tileUnloaded(e);
	}
});
e.GridLayer.Relief = y, e.gridLayer.relief = function(t) {
	return new e.GridLayer.Relief(t);
}, e.GridLayer.Relief.elevationExtractors = {
	terrarium: s,
	mapbox: c,
	mapterhorn: s
}, e.GridLayer.Relief.elevationUrls = {
	terrarium: o,
	mapterhorn: i
}, e.GridLayer.Relief.elevationMaxNativeZooms = a, e.GridLayer.Relief.elevationAttributions = {
	terrarium: "&copy; <a href=\"https://github.com/tilezen/joerd/blob/master/docs/attribution.md\" target=\"_blank\">Mapzen Elevation</a>",
	mapbox: "&copy; <a href=\"https://www.mapbox.com/about/maps/\" target=\"_blank\">Mapbox</a>",
	mapterhorn: "&copy; <a href=\"https://mapterhorn.com/attribution/\" target=\"_blank\">Mapterhorn</a>"
};
//#endregion

//# sourceMappingURL=leaflet-relief.esm.js.map