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
	mapterhorn: 17,
	ignLidarHd: 17
}, o = function(e, t, n) {
	return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${e}/${t}/${n}.png`;
}, s = function(e) {
	if (e === i) return a.mapterhorn;
	if (e === o) return a.terrarium;
	if (e === v || e === y) return a.ignLidarHd;
}, c = function(e, t, n, r) {
	return e * 256 + t + n / 256 - 32768;
}, l = function(e, t, n, r) {
	return -1e4 + (e * 256 * 256 + t * 256 + n) * .1;
}, u = "https://data.geopf.fr/wms-r/wms", d = "IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.WGS84G", f = "IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.WGS84G", p = -9e3, m = .01, h = function(e, t) {
	let n = new Float32Array(t * t), r = new DataView(e), i = Math.min(n.length, Math.floor(e.byteLength / 4));
	for (let e = 0; e < i; e++) {
		let t = r.getFloat32(e * 4, !0);
		n[e] = t <= p ? 0 : Math.max(t, m);
	}
	return n;
}, g = function(e, t) {
	return 180 / Math.PI * Math.atan(Math.sinh(Math.PI - 2 * Math.PI * e / 2 ** t));
}, _ = function(e) {
	return function(t, n, r, i) {
		let a = 2 ** t, o = n / a * 360 - 180, s = (n + 1) / a * 360 - 180;
		return `${u}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${e}&STYLES=normal&CRS=EPSG:4326&BBOX=${[
			g(r + 1, t),
			o,
			g(r, t),
			s
		].join(",")}&WIDTH=${i}&HEIGHT=${i}&FORMAT=image%2Fx-bil%3Bbits%3D32`;
	};
}, v = _(d), y = _(f), b = function(e, t) {
	return (e[2] + 2 * e[5] + e[8] - (e[0] + 2 * e[3] + e[6])) / (8 * t);
}, x = function(e, t) {
	return (e[0] + 2 * e[1] + e[2] - (e[6] + 2 * e[7] + e[8])) / (8 * t);
}, S = function(e, n, r) {
	let i = Math.PI - 2 * Math.PI * e / 2 ** n, a = Math.atan(.5 * (Math.exp(i) - Math.exp(-i))), o = t / (r * 2 ** n), s = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, a));
	return Math.max(.1, o * Math.cos(s));
}, C = 5, w = 2048, T = function(e) {
	return e === 404 || e === 403 || e === 204;
}, E = function(e, t, n, r, i, a, o) {
	let s = a - r + 1, c = new Float32Array(s * (o - i + 1));
	for (let l = i; l <= o; l++) {
		let o = (l - i) * s;
		for (let i = r; i <= a; i++) {
			let a = (l * t + i) * 4;
			c[o + (i - r)] = n(e[a], e[a + 1], e[a + 2], e[a + 3]);
		}
	}
	return c;
}, D = function(e, t, n, r, i, a) {
	let o = new Float32Array(t * t), s = t - 1, c = (e) => Math.max(0, Math.min(s, e)), l = t / i, u = c(Math.floor(n - .5)), d = c(Math.floor(n + l - .5) + 1), f = c(Math.floor(r - .5)), p = c(Math.floor(r + l - .5) + 1), m = d - u + 1, h = E(e, t, a, u, f, d, p);
	for (let e = 0; e < t; e++) {
		let a = r + (e + .5) / i - .5, l = c(Math.floor(a)), d = Math.min(s, l + 1), p = Math.max(0, Math.min(1, a - l)), g = (l - f) * m, _ = (d - f) * m;
		for (let r = 0; r < t; r++) {
			let a = n + (r + .5) / i - .5, l = c(Math.floor(a)) - u, d = Math.min(s, c(Math.floor(a)) + 1) - u, f = Math.max(0, Math.min(1, a - (l + u))), m = h[g + l], v = h[g + d], y = h[_ + l], b = h[_ + d], x;
			if (m <= 0 || v <= 0 || y <= 0 || b <= 0) x = h[(p < .5 ? g : _) + (f < .5 ? l : d)];
			else {
				let e = m + (v - m) * f;
				x = e + (y + (b - y) * f - e) * p;
			}
			o[e * t + r] = x;
		}
	}
	return o;
}, O = function(e, t, n, r, i) {
	let a = (n - r * e - i * t) / Math.sqrt(1 + e ** 2 + t ** 2);
	return a < 0 ? 0 : a;
}, k = function(e, t, n, r) {
	let i = O(b(e, n) * r, x(e, n) * r, t.hillshadeA1, t.hillshadeA2, t.hillshadeA3);
	return Math.sqrt(i * .8 + .2);
}, A = function(e, t, n, r, i, a) {
	let o = b(e, t) * n, s = x(e, t) * n, c = 0;
	for (let e = 0; e < i.length; e++) c += O(o, s, r, i[e], a[e]);
	let l = r * i.length;
	return l > 0 ? c / l : 0;
}, j = function(e) {
	let t = Math.round(e * 255);
	return [
		t,
		t,
		t
	];
}, M = .9, N = function(e, t) {
	return (e[4] - (e[0] + e[1] + e[2] + e[3] + e[5] + e[6] + e[7] + e[8]) / 8) / t;
}, P = {
	default: {
		warm: [
			236,
			150,
			82
		],
		cool: [
			126,
			172,
			246
		],
		base: [
			192,
			191,
			196
		]
	},
	vivid: {
		warm: [
			246,
			126,
			40
		],
		cool: [
			86,
			144,
			250
		],
		base: [
			198,
			197,
			202
		]
	},
	subtle: {
		warm: [
			226,
			180,
			142
		],
		cool: [
			166,
			190,
			236
		],
		base: [
			190,
			190,
			193
		]
	}
}, F = function(e, t) {
	let n = b(e, t), r = x(e, t);
	return Math.atan(Math.sqrt(n * n + r * r)) * 180 / Math.PI;
}, I = (e, t, n) => {
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
}, L = [
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
], R = {
	default: L,
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
}, z = function(e) {
	return function(t) {
		if (t < e[0].slope.min) return I(e[0].h.min, 1, 1).slice(0, 3);
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			if (t >= r.slope.min && t <= r.slope.max) {
				let e = (t - r.slope.min) / (r.slope.max - r.slope.min);
				return I(r.h.min + e * (r.h.max - r.h.min), 1, 1).slice(0, 3);
			}
		}
		let n = e[e.length - 1];
		return I(n.h.max, 1, 1).slice(0, 3);
	};
}, B = e.GridLayer.extend({
	options: {
		mode: "hillshade",
		elevationUrl: i,
		elevationExtractor: c,
		elevationFallbackDepth: C,
		hillshadeAzimuth: 315,
		hillshadeElevation: 45,
		hillshadeExaggeration: 1,
		hillshadeColorFunction: j,
		slopeColorFunction: z(L),
		archeoAzimuths: [
			225,
			270,
			315,
			360
		],
		archeoElevation: 45,
		archeoExaggeration: 3,
		archeoGlowStrength: 15,
		archeoWarmColor: P.default.warm,
		archeoCoolColor: P.default.cool,
		archeoBaseColor: P.default.base,
		tricolorAzimuths: [
			315,
			15,
			75
		],
		tricolorElevation: 35,
		tricolorExaggeration: 1,
		attribution: "&copy; <a href=\"https://mapterhorn.com/attribution/\" target=\"_blank\">Mapterhorn</a>"
	},
	initialize: function(t) {
		if (this._state = {
			hillshadeA1: 0,
			hillshadeA2: 0,
			hillshadeA3: 0,
			archeoA1: 0,
			archeoA2: [],
			archeoA3: [],
			tricolorA1: 0,
			tricolorA2: [],
			tricolorA3: [],
			abortControllers: new globalThis.Map(),
			missingTiles: /* @__PURE__ */ new Set()
		}, t && t.slopeColorConfig ? t.slopeColorFunction = z(t.slopeColorConfig) : t && t.slopeColorScheme && (t.slopeColorFunction = z(R[t.slopeColorScheme] || R.default)), t && t.archeoColorScheme) {
			let e = P[t.archeoColorScheme] || P.default;
			t.archeoWarmColor ||= e.warm, t.archeoCoolColor ||= e.cool, t.archeoBaseColor ||= e.base;
		}
		e.Util.setOptions(this, t), (!t || t.maxNativeZoom === void 0) && (this.options.maxNativeZoom = s(this.options.elevationUrl)), this._recomputeHillshadeConstants(), this._recomputeArcheoConstants(), this._recomputeTricolorConstants(), this.on("tileunload", function(e) {
			this._tileUnloaded(e.coords);
		});
	},
	_fillTile: async function(e, t, n, r) {
		this.options.mode === "hillshade" ? this._fillHillshadeTile(e, t, n, r) : this.options.mode === "archeo" ? this._fillArcheoTile(e, t, n, r) : this.options.mode === "tricolor" ? this._fillTricolorTile(e, t, n, r) : this._fillSlopeTile(e, t, n, r);
	},
	_recomputeHillshadeConstants: function() {
		let e = Math.PI / 180 * this.options.hillshadeAzimuth, t = Math.PI / 180 * this.options.hillshadeElevation;
		this._state.hillshadeA1 = Math.sin(t), this._state.hillshadeA2 = Math.cos(t) * Math.sin(e), this._state.hillshadeA3 = Math.cos(t) * Math.cos(e);
	},
	_recomputeArcheoConstants: function() {
		let e = Math.PI / 180 * this.options.archeoElevation, t = this.options.archeoAzimuths;
		this._state.archeoA1 = Math.sin(e), this._state.archeoA2 = t.map((t) => Math.cos(e) * Math.sin(Math.PI / 180 * t)), this._state.archeoA3 = t.map((t) => Math.cos(e) * Math.cos(Math.PI / 180 * t));
	},
	_recomputeTricolorConstants: function() {
		let e = Math.PI / 180 * this.options.tricolorElevation, t = this.options.tricolorAzimuths;
		this._state.tricolorA1 = Math.sin(e), this._state.tricolorA2 = t.map((t) => Math.cos(e) * Math.sin(Math.PI / 180 * t)), this._state.tricolorA3 = t.map((t) => Math.cos(e) * Math.cos(Math.PI / 180 * t));
	},
	_getElevation: function(e, t, n) {
		let r = this.getTileSize().x;
		if (e instanceof Float32Array) return e[n * r + t];
		let i = (n * r + t) * 4, a = e[i], o = e[i + 1], s = e[i + 2], c = e[i + 3];
		return this.options.elevationExtractor(a, o, s, c);
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
		let n = k(e, this._state, t, this.options.hillshadeExaggeration), [r, i, a] = this.options.hillshadeColorFunction(n);
		return [
			r,
			i,
			a,
			255
		];
	},
	_fillHillshadeTile: function(e, t, n, r) {
		let i = this.getTileSize().x, a = S(n.y, n.z, i);
		this._doFillTile(e, t, (e) => this._createHillshadeColor(e, a), r);
	},
	_createSlopeColor: function(e, t) {
		let r = F(e, t);
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
		let i = n.y, a = n.z, o = this.getTileSize().x, s = S(i, a, o);
		this._doFillTile(e, t, (e) => this._createSlopeColor(e, s), r);
	},
	_buildElevationUrl: function(e, t, n, r) {
		return typeof this.options.elevationUrl == "function" ? this.options.elevationUrl(e, t, n, r) : this.options.elevationUrl.replace("{z}", e.toString()).replace("{x}", t.toString()).replace("{y}", n.toString());
	},
	_rememberMissingTile: function(e) {
		let t = this._state.missingTiles;
		if (t.size >= w) {
			let e = t.values().next().value;
			e !== void 0 && t.delete(e);
		}
		t.add(e);
	},
	_fetchDemData: async function(e, t, n, r) {
		let i = this.options.elevationTileDecoder, a = i ? 0 : Math.max(0, Math.floor(this.options.elevationFallbackDepth || 0)), o = (n) => this._buildElevationUrl(e.z - n, Math.floor(e.x / 2 ** n), Math.floor(e.y / 2 ** n), t), s = 0;
		for (let t = a; t >= 0; t--) if (e.z - t >= 0 && this._state.missingTiles.has(o(t))) {
			s = t + 1;
			break;
		}
		for (let o = s; o <= a; o++) {
			let a = e.z - o;
			if (a < 0) break;
			let s = 2 ** o, c = Math.floor(e.x / s), l = Math.floor(e.y / s), u = this._buildElevationUrl(a, c, l, t), d = await fetch(u, { signal: r });
			if (T(d.status)) {
				this._rememberMissingTile(u);
				continue;
			}
			if (!d.ok) throw Error(`Failed to fetch tile: ${d.status}`);
			if (i) return i(await d.arrayBuffer(), t);
			let f = await d.blob(), p = await createImageBitmap(f);
			try {
				n.imageSmoothingEnabled = !1, n.drawImage(p, 0, 0, t, t);
			} finally {
				p.close();
			}
			let m = n.getImageData(0, 0, t, t).data;
			if (o === 0) return m;
			let h = t / s;
			return D(m, t, (e.x - c * s) * h, (e.y - l * s) * h, s, this.options.elevationExtractor);
		}
		return null;
	},
	_createArcheoColor: function(e, t) {
		let n = A(e, t, this.options.archeoExaggeration, this._state.archeoA1, this._state.archeoA2, this._state.archeoA3), r = Math.tanh(this.options.archeoGlowStrength * N(e, t)), i = Math.abs(r) * M, a = r > 0 ? this.options.archeoWarmColor : this.options.archeoCoolColor, o = this.options.archeoBaseColor;
		return [
			Math.round(n * ((1 - i) * o[0] + i * a[0])),
			Math.round(n * ((1 - i) * o[1] + i * a[1])),
			Math.round(n * ((1 - i) * o[2] + i * a[2])),
			255
		];
	},
	_fillArcheoTile: function(e, t, n, r) {
		let i = this.getTileSize().x, a = S(n.y, n.z, i);
		this._doFillTile(e, t, (e) => this._createArcheoColor(e, a), r);
	},
	_createTricolorColor: function(e, t) {
		let n = this.options.tricolorExaggeration, r = b(e, t) * n, i = x(e, t) * n, a = [
			0,
			0,
			0,
			255
		];
		for (let e = 0; e < 3; e++) {
			let t = O(r, i, this._state.tricolorA1, this._state.tricolorA2[e], this._state.tricolorA3[e]);
			a[e] = Math.round(255 * t);
		}
		return a;
	},
	_fillTricolorTile: function(e, t, n, r) {
		let i = this.getTileSize().x, a = S(n.y, n.z, i);
		this._doFillTile(e, t, (e) => this._createTricolorColor(e, a), r);
	},
	_tileUnloaded: function(e) {
		let t = `${e.z}/${e.x}/${e.y}`;
		if (this._state.abortControllers.has(t)) {
			let e = this._state.abortControllers.get(t);
			e && (e.abort(), this._state.abortControllers.delete(t));
		}
	},
	createTile: function(e, t) {
		let n = e.x, i = e.y, a = `${e.z}/${n}/${i}`, o = this.getTileSize().x, s = document.createElement("canvas");
		s.setAttribute("width", o.toString()), s.setAttribute("height", o.toString());
		let c = s.getContext("2d");
		if (!c) throw Error("Unable to get 2d context from canvas");
		let l = c.createImageData(o, o), u = new AbortController();
		return this._state.abortControllers.set(a, u), (async () => {
			let n = null;
			try {
				n = r.acquire(o);
				let i = n.getContext("2d", { willReadFrequently: !0 });
				if (!i) throw Error("Unable to get 2d context from DEM canvas");
				let a = await this._fetchDemData(e, o, i, u.signal);
				if (a === null) {
					u.signal.aborted || t(void 0, s);
					return;
				}
				await this._fillTile(l.data, a, e, u.signal), u.signal.aborted || (c.putImageData(l, 0, 0), t(void 0, s));
			} catch (e) {
				u.signal.aborted || e instanceof Error && e.name === "AbortError" || (console.error(`Error loading tile ${a}:`, e), t(e instanceof Error ? e : Error(String(e)), s));
			} finally {
				this._state.abortControllers.delete(a), n && r.release(n);
			}
		})(), s;
	},
	tileUnloaded: function(e) {
		this._tileUnloaded(e);
	}
});
e.GridLayer.Relief = B, e.gridLayer.relief = function(t) {
	return new e.GridLayer.Relief(t);
}, e.GridLayer.Relief.elevationExtractors = {
	terrarium: c,
	mapbox: l,
	mapterhorn: c
}, e.GridLayer.Relief.elevationUrls = {
	terrarium: o,
	mapterhorn: i,
	ignLidarHdMnt: v,
	ignLidarHdMns: y
}, e.GridLayer.Relief.elevationTileDecoders = { bil32: h }, e.GridLayer.Relief.elevationMaxNativeZooms = a, e.GridLayer.Relief.elevationAttributions = {
	terrarium: "&copy; <a href=\"https://github.com/tilezen/joerd/blob/master/docs/attribution.md\" target=\"_blank\">Mapzen Elevation</a>",
	mapbox: "&copy; <a href=\"https://www.mapbox.com/about/maps/\" target=\"_blank\">Mapbox</a>",
	mapterhorn: "&copy; <a href=\"https://mapterhorn.com/attribution/\" target=\"_blank\">Mapterhorn</a>",
	ignLidarHd: "&copy; <a href=\"https://geoservices.ign.fr/lidarhd\" target=\"_blank\">IGN LiDAR HD</a>"
};
//#endregion

//# sourceMappingURL=leaflet-relief.esm.js.map