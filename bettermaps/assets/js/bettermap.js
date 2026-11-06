/*
 * Better Maps — éditeur de cartes réseau pour Zabbix.
 * Ce fichier est chargé sur toutes les pages du frontend : il ne fait rien tant que
 * BetterMaps.initMap() / BetterMaps.initList() n'est pas appelé.
 */
(function () {
	'use strict';

	if (window.BetterMaps) {
		return;
	}

	const SVGNS = 'http://www.w3.org/2000/svg';

	const SEVERITIES = [
		{name: 'Non classé', color: '#97AAB3'},
		{name: 'Information', color: '#7499FF'},
		{name: 'Avertissement', color: '#FFC859'},
		{name: 'Moyen', color: '#FFA059'},
		{name: 'Haut', color: '#E97659'},
		{name: 'Désastre', color: '#E45959'}
	];
	const OK_COLOR = '#3dbf75';
	const MAINT_COLOR = '#9b6dd6';

	// Icônes dessinées dans un carré 48x48, trait = currentColor.
	const ICONS = {
		server: {name: 'Serveur', svg: '<rect x="11" y="5" width="26" height="38" rx="3"/><path d="M16 14h16M16 21h16M16 28h16"/><circle cx="18" cy="36" r="1.6"/><circle cx="24" cy="36" r="1.6"/>'},
		switch: {name: 'Switch', svg: '<rect x="4" y="17" width="40" height="14" rx="3"/><path d="M10 24h3M17 24h3M24 24h3M31 24h3"/><path d="M12 11h22l-4-4M36 37H14l4 4"/>'},
		router: {name: 'Routeur', svg: '<circle cx="24" cy="24" r="18"/><path d="M24 8v11M24 40V29M8 24h11M40 24H29"/><path d="M20.5 12 24 8l3.5 4M20.5 36l3.5 4 3.5-4M12 20.5 8 24l4 3.5M36 20.5l4 3.5-4 3.5"/>'},
		firewall: {name: 'Pare-feu', svg: '<rect x="5" y="9" width="38" height="30" rx="2"/><path d="M5 19h38M5 29h38M17 9v10M31 9v10M11 19v10M24 19v10M37 19v10M17 29v10M31 29v10"/>'},
		cloud: {name: 'Cloud / Internet', svg: '<path d="M14 37h21a8.5 8.5 0 0 0 .5-17A11.5 11.5 0 0 0 13.4 18 9.5 9.5 0 0 0 14 37z"/>'},
		database: {name: 'Base de données', svg: '<ellipse cx="24" cy="11" rx="14" ry="5"/><path d="M10 11v26c0 2.8 6.3 5 14 5s14-2.2 14-5V11"/><path d="M10 20c0 2.8 6.3 5 14 5s14-2.2 14-5M10 29c0 2.8 6.3 5 14 5s14-2.2 14-5"/>'},
		vm: {name: 'VM / Conteneur', svg: '<path d="M24 5l17 8.5v21L24 43 7 34.5v-21z"/><path d="M7 13.5 24 22l17-8.5M24 22v21"/>'},
		storage: {name: 'Stockage / NAS', svg: '<rect x="7" y="8" width="34" height="10" rx="2"/><rect x="7" y="19" width="34" height="10" rx="2"/><rect x="7" y="30" width="34" height="10" rx="2"/><path d="M12 13h8M12 24h8M12 35h8"/><circle cx="35" cy="13" r="1.5"/><circle cx="35" cy="24" r="1.5"/><circle cx="35" cy="35" r="1.5"/>'},
		pc: {name: 'Poste de travail', svg: '<rect x="5" y="8" width="38" height="25" rx="2"/><path d="M17 41h14M24 33v8"/>'},
		ap: {name: 'Borne Wi-Fi', svg: '<path d="M9 19a21 21 0 0 1 30 0M14.5 25a13 13 0 0 1 19 0M20 31a5.5 5.5 0 0 1 8 0"/><circle cx="24" cy="37" r="2.2"/>'},
		printer: {name: 'Imprimante', svg: '<path d="M14 18V7h20v11"/><rect x="7" y="18" width="34" height="14" rx="2"/><rect x="14" y="27" width="20" height="14"/>'},
		phone: {name: 'Téléphone IP', svg: '<rect x="8" y="10" width="32" height="30" rx="3"/><path d="M14 10V6h8v4"/><rect x="14" y="16" width="20" height="7"/><path d="M15 29h2M23 29h2M31 29h2M15 34h2M23 34h2M31 34h2"/>'},
		camera: {name: 'Caméra', svg: '<rect x="5" y="15" width="28" height="18" rx="3"/><path d="M33 21l10-5v16l-10-5"/><circle cx="14" cy="24" r="4"/>'},
		ups: {name: 'Onduleur / Énergie', svg: '<rect x="11" y="5" width="26" height="38" rx="3"/><path d="M26 12l-6 12h8l-6 12"/>'},
		group: {name: 'Groupe', svg: '<rect x="17" y="5" width="14" height="11" rx="2"/><rect x="4" y="32" width="14" height="11" rx="2"/><rect x="30" y="32" width="14" height="11" rx="2"/><path d="M24 16v8M11 32v-8h26v8"/>'},
		generic: {name: 'Générique', svg: '<rect x="8" y="8" width="32" height="32" rx="6"/><circle cx="24" cy="24" r="6"/>'}
	};

	const MAP_DEFAULTS = {
		grid: true,
		snap: true,
		gridSize: 10,
		background: '',
		refresh: 30,
		linkStyle: 'curve',
		labelPos: 'bottom'
	};

	// Emplacements du libellé d'un hôte ou d'un groupe ('' : celui de la carte).
	const LABEL_POSITIONS = {bottom: 'En bas', top: 'En haut', left: 'À gauche', right: 'À droite'};

	const NODE_DEFAULTS = {
		host: {w: 56, h: 56, label: '', hostid: '', hostname: '', icon: 'server', shape: 'round', fill: '', stroke: '',
			color: '', iconColor: '', fontSize: 12, url: '', labelPos: ''},
		group: {w: 56, h: 56, label: '', groupid: '', groupname: '', icon: 'group', shape: 'round', fill: '', stroke: '',
			color: '', iconColor: '', fontSize: 12, url: '', labelPos: ''},
		item: {w: 150, h: 54, label: '', hostid: '', hostname: '', itemid: '', itemname: '', shape: 'round', fill: '',
			stroke: '', color: '', fontSize: 13, url: ''},
		trigger: {w: 180, h: 54, label: '', hostid: '', hostname: '', triggerid: '', triggername: '', shape: 'round',
			fill: '', stroke: '', color: '', fontSize: 13, url: ''},
		shape: {w: 200, h: 120, label: 'Zone', shape: 'round', fill: '', stroke: '', color: '', fontSize: 13, url: '',
			font: '', bold: true, italic: false, underline: false, align: 'left', valign: 'top'},
		text: {w: 120, h: 30, label: 'Texte', fill: '', stroke: '', color: '', fontSize: 14, url: '',
			font: '', bold: false, italic: false, underline: false, align: 'center', valign: 'middle'}
	};

	// Polices proposées pour les textes et les zones ('' : police de l'interface Zabbix).
	const FONTS = {
		'': {name: 'Par défaut', css: ''},
		arial: {name: 'Arial', css: 'Arial, Helvetica, sans-serif'},
		verdana: {name: 'Verdana', css: 'Verdana, Geneva, sans-serif'},
		tahoma: {name: 'Tahoma', css: 'Tahoma, Geneva, sans-serif'},
		trebuchet: {name: 'Trebuchet MS', css: '"Trebuchet MS", Helvetica, sans-serif'},
		system: {name: 'Système', css: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'},
		georgia: {name: 'Georgia', css: 'Georgia, serif'},
		times: {name: 'Times New Roman', css: '"Times New Roman", Times, serif'},
		courier: {name: 'Courier New', css: '"Courier New", Courier, monospace'},
		impact: {name: 'Impact', css: 'Impact, "Arial Black", sans-serif'}
	};

	// Icônes 16×16 des boutons d'alignement du panneau.
	const ALIGN_ICONS = Object.fromEntries(Object.entries({
		left: '<path d="M2 3h12M2 6.5h8M2 10h12M2 13.5h8"/>',
		center: '<path d="M2 3h12M4 6.5h8M2 10h12M4 13.5h8"/>',
		right: '<path d="M2 3h12M6 6.5h8M2 10h12M6 13.5h8"/>',
		top: '<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" opacity=".45"/><path d="M4.5 4.5h7M4.5 7h7"/>',
		middle: '<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" opacity=".45"/><path d="M4.5 6.75h7M4.5 9.25h7"/>',
		bottom: '<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" opacity=".45"/><path d="M4.5 9h7M4.5 11.5h7"/>'
	}).map(([k, d]) => [k, '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" '
		+ 'stroke-width="1.5" stroke-linecap="round">' + d + '</svg>']));

	const H_ALIGNS = ['left', 'center', 'right'];
	const V_ALIGNS = ['top', 'middle', 'bottom'];

	// Nœuds dont le libellé se met en forme (police, style, alignement dans la boîte).
	function hasTextStyle(n) {
		return n.type === 'text' || n.type === 'shape';
	}

	// Nœuds liés à un objet Zabbix : champ identifiant, champ du nom mémorisé, clés du statut renvoyé par le serveur.
	const OBJECT_TYPES = {
		host: {field: 'hostid', name: 'hostname', status: 'hosts', ids: 'hostids'},
		group: {field: 'groupid', name: 'groupname', status: 'groups', ids: 'groupids'},
		item: {field: 'itemid', name: 'itemname', status: 'items', ids: 'itemids'},
		trigger: {field: 'triggerid', name: 'triggername', status: 'triggers', ids: 'triggerids'}
	};

	// Hôtes et groupes : icône avec le libellé dessous.
	function isDevice(n) {
		return n.type === 'host' || n.type === 'group';
	}

	// Items et déclencheurs : objets d'un hôte, choisis en deux temps (l'hôte, puis l'objet), affichés en boîte.
	function isHostChild(n) {
		return n.type === 'item' || n.type === 'trigger';
	}

	function emptyStatus() {
		return {hosts: {}, groups: {}, items: {}, triggers: {}};
	}

	// fromPort / toPort : point de connexion fixe {x, y} relatif au nœud (0..1), ou null pour une extrémité
	// flottante qui suit le côté le plus proche. labelPos : position du libellé le long du lien (0..1).
	// triggers : déclencheurs qui colorent le lien en mode status 'triggers', [{triggerid, triggername, hostname}] ;
	// triggerLogic : or (au moins un en problème) ou and (tous en problème).
	const LINK_DEFAULTS = {
		points: [], style: 'curve', color: '', width: 2, dash: 'solid', arrow: 'none', label: '', fontSize: 11,
		status: 'both', triggers: [], triggerLogic: 'or', fromPort: null, toPort: null, rounded: true, labelPos: 0.5
	};

	// Longueur du départ perpendiculaire d'un lien orthogonal, rayon des coins arrondis.
	const ORTHO_STUB = 16;
	const CORNER_RADIUS = 10;

	const CLIPBOARD_KEY = 'bettermaps.clipboard';

	/* ------------------------------------------------------------------ utilitaires */

	function svgEl(tag, attrs, parent) {
		const e = document.createElementNS(SVGNS, tag);

		for (const k in attrs) {
			if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== '') {
				e.setAttribute(k, attrs[k]);
			}
		}

		if (parent) {
			parent.appendChild(e);
		}

		return e;
	}

	function htmlEl(tag, attrs, children) {
		const e = document.createElement(tag);

		for (const k in attrs || {}) {
			const v = attrs[k];

			if (v === undefined || v === null || v === false) {
				continue;
			}

			if (k === 'text') {
				e.textContent = v;
			}
			else if (k === 'class') {
				e.className = v;
			}
			else if (k.startsWith('on')) {
				e.addEventListener(k.slice(2), v);
			}
			else if (k in e && typeof v !== 'string') {
				e[k] = v;
			}
			else {
				e.setAttribute(k, v === true ? '' : v);
			}
		}

		for (const c of [].concat(children || [])) {
			if (c !== null && c !== undefined && c !== false) {
				e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
			}
		}

		return e;
	}

	function uid() {
		return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
	}

	function isObj(v) {
		return v !== null && typeof v === 'object' && !Array.isArray(v);
	}

	function num(v, d) {
		const n = parseFloat(v);

		return Number.isFinite(n) ? n : d;
	}

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	function unit(dx, dy) {
		const len = Math.hypot(dx, dy) || 1;

		return {x: dx / len, y: dy / len};
	}

	function bezierAt(s, t) {
		const u = 1 - t;

		return {
			x: u * u * u * s.p1.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.p2.x,
			y: u * u * u * s.p1.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.p2.y
		};
	}

	function distToSegment(p, a, b) {
		const dx = b.x - a.x, dy = b.y - a.y;
		const len2 = dx * dx + dy * dy;
		const t = len2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0;

		return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
	}

	function formatAge(clock) {
		let s = Math.max(0, Math.floor(Date.now() / 1000) - clock);
		const d = Math.floor(s / 86400); s %= 86400;
		const h = Math.floor(s / 3600); s %= 3600;
		const m = Math.floor(s / 60);

		if (d) {
			return d + 'j ' + h + 'h';
		}

		return h ? h + 'h ' + m + 'm' : m + 'm';
	}

	function post(action, params) {
		const body = new URLSearchParams();

		for (const k in params) {
			const v = params[k];

			if (Array.isArray(v)) {
				v.forEach(x => body.append(k + '[]', x));
			}
			else {
				body.append(k, v);
			}
		}

		return fetch('zabbix.php?action=' + encodeURIComponent(action), {
			method: 'POST',
			credentials: 'same-origin',
			body
		})
			.then(r => r.text())
			.then(text => {
				try {
					return JSON.parse(text);
				}
				catch (e) {
					throw new Error('Réponse inattendue du serveur (session expirée ou droits insuffisants ?)');
				}
			});
	}

	function normalizeDoc(data) {
		data = isObj(data) ? data : {};

		const doc = {
			nodes: [],
			links: [],
			settings: Object.assign({}, MAP_DEFAULTS, isObj(data.settings) ? data.settings : {})
		};
		const ids = new Set();

		if (!LABEL_POSITIONS[doc.settings.labelPos]) {
			doc.settings.labelPos = MAP_DEFAULTS.labelPos;
		}

		for (const n of Array.isArray(data.nodes) ? data.nodes : []) {
			if (!isObj(n)) {
				continue;
			}

			const type = NODE_DEFAULTS[n.type] ? n.type : 'shape';
			const defs = NODE_DEFAULTS[type];
			const node = Object.assign({id: '', x: 0, y: 0}, defs, n, {type});

			node.id = String(node.id || uid());

			if (ids.has(node.id)) {
				node.id = uid();
			}

			ids.add(node.id);
			node.x = num(node.x, 0);
			node.y = num(node.y, 0);
			node.w = Math.max(8, num(node.w, defs.w));
			node.h = Math.max(8, num(node.h, defs.h));
			node.fontSize = clamp(num(node.fontSize, defs.fontSize), 6, 96);
			node.label = String(node.label ?? '');

			if (isDevice(node)) {
				node.labelPos = LABEL_POSITIONS[node.labelPos] ? node.labelPos : '';
			}

			if (hasTextStyle(node)) {
				// Anciennes zones : valign valait topleft / top / middle / bottom, sans alignement horizontal.
				if (type === 'shape' && !('align' in n)) {
					node.align = n.valign === undefined || n.valign === 'topleft' ? 'left' : 'center';
				}

				if (node.valign === 'topleft') {
					node.valign = 'top';
				}

				node.align = H_ALIGNS.includes(node.align) ? node.align : defs.align;
				node.valign = V_ALIGNS.includes(node.valign) ? node.valign : defs.valign;
				node.font = FONTS[node.font] ? node.font : '';
				node.bold = !!node.bold;
				node.italic = !!node.italic;
				node.underline = !!node.underline;
			}

			doc.nodes.push(node);
		}

		const linkids = new Set();

		for (const l of Array.isArray(data.links) ? data.links : []) {
			if (!isObj(l) || !ids.has(String(l.from)) || !ids.has(String(l.to)) || l.from === l.to) {
				continue;
			}

			const link = Object.assign({id: ''}, LINK_DEFAULTS, l);

			link.id = String(link.id || uid());

			if (linkids.has(link.id)) {
				link.id = uid();
			}

			linkids.add(link.id);
			link.from = String(link.from);
			link.to = String(link.to);
			link.points = (Array.isArray(link.points) ? link.points : [])
				.filter(isObj)
				.map(p => ({x: num(p.x, 0), y: num(p.y, 0)}));
			link.width = clamp(num(link.width, 2), 0.5, 20);
			link.fontSize = clamp(num(link.fontSize, 11), 6, 72);
			link.label = String(link.label ?? '');
			link.fromPort = normalizePort(link.fromPort);
			link.toPort = normalizePort(link.toPort);
			link.rounded = link.rounded !== false;
			link.labelPos = clamp(num(link.labelPos, 0.5), 0, 1);
			link.triggers = (Array.isArray(link.triggers) ? link.triggers : [])
				.filter(t => isObj(t) && /^\d+$/.test(String(t.triggerid)))
				.map(t => ({triggerid: String(t.triggerid), triggername: String(t.triggername ?? ''),
					hostname: String(t.hostname ?? '')}))
				.filter((t, i, list) => list.findIndex(x => x.triggerid === t.triggerid) === i);
			link.triggerLogic = link.triggerLogic === 'and' ? 'and' : 'or';
			doc.links.push(link);
		}

		return doc;
	}

	function center(n) {
		return {x: n.x + n.w / 2, y: n.y + n.h / 2};
	}

	function isEllipse(n) {
		return n.type !== 'text' && n.shape === 'ellipse';
	}

	// Marges {t, r, b, l} autour d'un nœud : place occupée par le libellé d'un hôte ou d'un groupe,
	// que les liens contournent (ils s'arrêtent au-delà du nom).
	const NO_MARGIN = {t: 0, r: 0, b: 0, l: 0};

	// Point du bord du nœud situé sur la droite centre -> cible.
	function borderPoint(n, toward, m = NO_MARGIN) {
		const c = center(n);
		const dx = toward.x - c.x, dy = toward.y - c.y;
		const gap = 2;

		if (!dx && !dy) {
			return c;
		}

		let s;

		if (isEllipse(n)) {
			const hw = n.w / 2 + gap, hh = n.h / 2 + gap;

			s = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
		}
		else {
			const left = n.w / 2 + gap + m.l, right = n.w / 2 + gap + m.r;
			const top = n.h / 2 + gap + m.t, bottom = n.h / 2 + gap + m.b;

			s = Math.min(
				dx > 0 ? right / dx : dx < 0 ? -left / dx : Infinity,
				dy > 0 ? bottom / dy : dy < 0 ? -top / dy : Infinity
			);
		}

		return {x: c.x + dx * s, y: c.y + dy * s};
	}

	function normalizePort(p) {
		return isObj(p) && Number.isFinite(parseFloat(p.x)) && Number.isFinite(parseFloat(p.y))
			? {x: clamp(num(p.x, 0.5), 0, 1), y: clamp(num(p.y, 0.5), 0, 1)}
			: null;
	}

	function samePort(a, b) {
		return !!a && !!b && Math.abs(a.x - b.x) < 1e-3 && Math.abs(a.y - b.y) < 1e-3;
	}

	// Points de connexion proposés : 3 par côté pour un rectangle, tous les 30° pour une ellipse.
	function nodePorts(n) {
		const r = v => Math.round(v * 10000) / 10000;

		if (isEllipse(n)) {
			return Array.from({length: 12}, (_, i) => ({
				x: r(0.5 + Math.cos(i * Math.PI / 6) / 2),
				y: r(0.5 + Math.sin(i * Math.PI / 6) / 2)
			}));
		}

		const ports = [];

		for (const s of [0.25, 0.5, 0.75]) {
			ports.push({x: s, y: 0}, {x: 1, y: s}, {x: s, y: 1}, {x: 0, y: s});
		}

		return ports;
	}

	// Normale sortante au point de connexion.
	function portNormal(n, port) {
		if (isEllipse(n)) {
			return unit((2 * port.x - 1) / n.w, (2 * port.y - 1) / n.h);
		}

		const d = [port.x, 1 - port.x, port.y, 1 - port.y];
		const side = d.indexOf(Math.min(...d));

		return [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}][side];
	}

	// Position du point de connexion. Du côté du libellé d'un hôte, les points passent au-delà du libellé.
	function portPoint(n, port, m = NO_MARGIN, gap = 2) {
		let px = port.x, py = port.y;

		if (isEllipse(n)) {
			const v = unit(2 * px - 1, 2 * py - 1);

			px = 0.5 + v.x / 2;
			py = 0.5 + v.y / 2;
		}

		const nm = portNormal(n, port);

		return {
			x: n.x + px * n.w + nm.x * gap + (px < 0.001 ? -m.l : px > 0.999 ? m.r : 0),
			y: n.y + py * n.h + nm.y * gap + (py < 0.001 ? -m.t : py > 0.999 ? m.b : 0)
		};
	}

	function axisDir(v) {
		return Math.abs(v.x) >= Math.abs(v.y) ? {x: Math.sign(v.x) || 1, y: 0} : {x: 0, y: Math.sign(v.y) || 1};
	}

	// Supprime les doublons, les points intermédiaires alignés et les allers-retours sur une même ligne.
	function simplifyOrtho(pts) {
		const out = [];

		for (const p of pts) {
			const last = out[out.length - 1];

			if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) {
				continue;
			}

			if (out.length >= 2) {
				const o = out[out.length - 2];
				const vert = Math.abs(o.x - last.x) < 0.5 && Math.abs(last.x - p.x) < 0.5;
				const horiz = Math.abs(o.y - last.y) < 0.5 && Math.abs(last.y - p.y) < 0.5;

				// Le point de départ (sur le nœud) est conservé même si le tracé repart en arrière.
				if (vert || horiz) {
					if (out.length > 2 || (vert ? (last.y - o.y) * (p.y - last.y) : (last.x - o.x) * (p.x - last.x)) > 0) {
						out[out.length - 1] = p;
						continue;
					}
				}
			}

			out.push(p);
		}

		return out.length >= 2 ? out : [pts[0], pts[pts.length - 1]];
	}

	// Itinéraire automatique entre les deux départs perpendiculaires S1 et E1 (façon draw.io).
	function orthoAuto(S1, dS, E1, dE) {
		const sh = dS.x !== 0, eh = dE.x !== 0;

		if (sh && eh) {
			if (dS.x === dE.x) {
				const x = dS.x > 0 ? Math.max(S1.x, E1.x) : Math.min(S1.x, E1.x);

				return [{x, y: S1.y}, {x, y: E1.y}];
			}

			if ((E1.x - S1.x) * dS.x > 0) {
				const x = (S1.x + E1.x) / 2;

				return [{x, y: S1.y}, {x, y: E1.y}];
			}

			const y = (S1.y + E1.y) / 2;

			return [{x: S1.x, y}, {x: E1.x, y}];
		}

		if (!sh && !eh) {
			if (dS.y === dE.y) {
				const y = dS.y > 0 ? Math.max(S1.y, E1.y) : Math.min(S1.y, E1.y);

				return [{x: S1.x, y}, {x: E1.x, y}];
			}

			if ((E1.y - S1.y) * dS.y > 0) {
				const y = (S1.y + E1.y) / 2;

				return [{x: S1.x, y}, {x: E1.x, y}];
			}

			const x = (S1.x + E1.x) / 2;

			return [{x, y: S1.y}, {x, y: E1.y}];
		}

		return sh ? [{x: E1.x, y: S1.y}] : [{x: S1.x, y: E1.y}];
	}

	// Polyligne, avec coins arrondis si r > 0.
	function polyPath(p, r) {
		let d = `M${p[0].x},${p[0].y}`;

		for (let i = 1; i < p.length - 1; i++) {
			const a = p[i - 1], b = p[i], c = p[i + 1];
			const rr = Math.min(r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);

			if (rr < 1) {
				d += ` L${b.x},${b.y}`;
				continue;
			}

			const u1 = unit(b.x - a.x, b.y - a.y), u2 = unit(c.x - b.x, c.y - b.y);

			d += ` L${b.x - u1.x * rr},${b.y - u1.y * rr} Q${b.x},${b.y} ${b.x + u2.x * rr},${b.y + u2.y * rr}`;
		}

		const last = p[p.length - 1];

		return d + ` L${last.x},${last.y}`;
	}

	function shapeEl(shape, w, h, attrs, parent) {
		if (shape === 'ellipse') {
			return svgEl('ellipse', Object.assign({cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2}, attrs), parent);
		}

		const rx = shape === 'round' ? Math.min(12, h / 4, w / 4) : 0;

		return svgEl('rect', Object.assign({x: 0, y: 0, width: w, height: h, rx}, attrs), parent);
	}

	function drawText(parent, text, x, y, opts) {
		const lines = String(text).split('\n');
		const fs = opts.size || 12;
		const lh = fs * 1.2;
		const baseline = opts.valign === 'middle' ? 'central' : 'hanging';
		const t = svgEl('text', {x, y, 'font-size': fs, 'text-anchor': opts.anchor || 'middle', class: opts.cls || 'bm-label'},
			parent);
		const y0 = opts.valign === 'middle' ? y - (lines.length - 1) * lh / 2
			: opts.valign === 'bottom' ? y - lines.length * lh : y;

		if (opts.color) {
			t.style.fill = opts.color;
		}

		if (opts.style) {
			const st = opts.style;

			t.style.fontFamily = FONTS[st.font] ? FONTS[st.font].css : '';
			t.style.fontWeight = st.bold ? 'bold' : 'normal';
			t.style.fontStyle = st.italic ? 'italic' : '';
			t.style.textDecoration = st.underline ? 'underline' : '';
		}

		lines.forEach((line, i) => {
			const ts = svgEl('tspan', {x, y: y0 + i * lh, 'dominant-baseline': baseline}, t);

			ts.textContent = line || ' ';
		});

		return t;
	}

	// Libellé d'un texte ou d'une zone, placé dans la boîte selon n.align / n.valign, à padX / padY du bord.
	function drawBoxText(parent, n, padX, padY, cls) {
		const x = {left: padX, right: n.w - padX}[n.align] ?? n.w / 2;
		const y = {top: padY, bottom: n.h - padY}[n.valign] ?? n.h / 2;

		return drawText(parent, n.label, x, y, {size: n.fontSize, color: n.color, anchor: {left: 'start', right: 'end'}[n.align],
			valign: n.valign, style: n, cls});
	}

	// Largeur approchée d'une ligne de libellé (police de l'interface), pour réserver sa place.
	let measureCtx = null;

	function textWidth(text, size, bold) {
		measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
		measureCtx.font = (bold ? 'bold ' : '') + size + 'px Arial, Tahoma, Verdana, sans-serif';

		return measureCtx.measureText(text).width;
	}

	function iconSvg(icon, size) {
		const s = svgEl('svg', {viewBox: '0 0 48 48', width: size, height: size, class: 'bm-icon'});

		s.innerHTML = (ICONS[icon] || ICONS.generic).svg;

		return s;
	}

	/* ------------------------------------------------------------------ éditeur */

	class MapEditor {

		constructor(root, cfg) {
			this.root = root;
			this.cfg = cfg;
			this.name = cfg.name;
			this.doc = normalizeDoc(cfg.data);
			this.edit = !!cfg.edit;
			this.sel = {nodes: new Set(), links: new Set()};
			this.view = {x: 0, y: 0, k: 1};
			this.status = emptyStatus();
			this.statusLoaded = false;
			this.undoStack = [];
			this.redoStack = [];
			this.dirty = false;
			this.version = 0;
			this.drag = null;
			this.spaceDown = false;
			this.pasteCount = 0;
			this.uid = 'bm' + uid();
			// Mode intégré (widget de tableau de bord) : lecture seule, pas de raccourcis globaux,
			// le rafraîchissement est piloté par le widget.
			this.embedded = !!cfg.embedded;
			this.listeners = [];

			if (this.embedded) {
				this.cfg.canEdit = false;
				this.edit = false;
			}

			this.buildDom();
			this.resize();
			this.render();
			this.renderPanel();
			this.fit();

			if (cfg.status) {
				this.setStatus(cfg.status);
			}
			else {
				this.refreshStatus();
			}

			if (this.embedded) {
				return;
			}

			this.startTimer();
			this.listen(window, 'resize', () => this.resize());
			this.listen(document, 'fullscreenchange', () => setTimeout(() => this.resize(), 50));
			this.listen(document, 'keydown', e => this.onKeyDown(e));
			this.listen(document, 'keyup', e => {
				if (e.key === ' ') {
					this.spaceDown = false;
					this.canvas.classList.remove('bm-panning');
				}
			});
			this.listen(window, 'beforeunload', e => {
				if (this.dirty) {
					e.preventDefault();
					e.returnValue = '';
				}
			});
		}

		listen(target, type, fn) {
			target.addEventListener(type, fn);
			this.listeners.push([target, type, fn]);
		}

		destroy() {
			clearInterval(this.timer);
			clearTimeout(this.toastTimer);

			for (const [target, type, fn] of this.listeners) {
				target.removeEventListener(type, fn);
			}

			this.listeners = [];
			this.destroyed = true;
			this.root.textContent = '';
		}

		/* ---------------- construction du DOM */

		buildDom() {
			this.root.classList.add('bm-root');
			this.root.classList.toggle('bm-embedded', this.embedded);
			this.root.textContent = '';

			this.toolbar = htmlEl('div', {class: this.embedded ? 'bm-mini' : 'bm-toolbar'});
			this.canvas = htmlEl('div', {class: 'bm-canvas', tabindex: '-1'});
			this.panel = htmlEl('div', {class: 'bm-panel', hidden: true});
			this.popup = htmlEl('div', {class: 'bm-popup', hidden: true});
			this.toast = htmlEl('div', {class: 'bm-toast'});

			if (this.embedded) {
				this.root.append(htmlEl('div', {class: 'bm-body'}, [this.canvas]));
				this.canvas.append(this.toolbar);
			}
			else {
				this.root.append(this.toolbar, htmlEl('div', {class: 'bm-body'}, [this.canvas, this.panel]));
			}

			this.canvas.append(this.popup, this.toast);

			this.svg = svgEl('svg', {class: 'bm-svg'});
			this.canvas.prepend(this.svg);

			const defs = svgEl('defs', {}, this.svg);

			this.gridPattern = svgEl('pattern', {id: this.uid + '-grid', patternUnits: 'userSpaceOnUse'}, defs);
			this.gridDot = svgEl('circle', {class: 'bm-grid-dot'}, this.gridPattern);
			this.bg = svgEl('rect', {class: 'bm-bg', width: '100%', height: '100%'}, this.svg);
			this.gridRect = svgEl('rect', {width: '100%', height: '100%', fill: 'url(#' + this.uid + '-grid)',
				'pointer-events': 'none'}, this.svg);
			this.world = svgEl('g', {class: 'bm-world'}, this.svg);
			this.gZones = svgEl('g', {}, this.world);
			this.gLinks = svgEl('g', {}, this.world);
			this.gNodes = svgEl('g', {}, this.world);
			this.gOverlay = svgEl('g', {class: 'bm-overlay'}, this.world);

			this.svg.addEventListener('pointerdown', e => this.onPointerDown(e));
			this.svg.addEventListener('pointermove', e => this.onPointerMove(e));
			this.svg.addEventListener('pointerup', e => this.onPointerUp(e));
			this.svg.addEventListener('pointercancel', () => {
				this.drag = null;
				this.render();
			});
			this.svg.addEventListener('contextmenu', e => e.preventDefault());
			this.svg.addEventListener('wheel', e => this.onWheel(e), {passive: false});
		}

		resize() {
			if (this.embedded) {
				return;
			}

			const top = this.root.getBoundingClientRect().top + window.scrollY;
			const fs = document.fullscreenElement === this.root;
			const h = fs ? window.innerHeight : Math.max(420, window.innerHeight - top - 16);

			this.root.style.height = h + 'px';
		}

		buildToolbar() {
			const tb = this.toolbar;
			const btn = (label, title, fn, opts = {}) => htmlEl('button', {
				type: 'button', class: 'btn-alt bm-btn ' + (opts.cls || ''), title, text: label,
				disabled: opts.disabled, onclick: fn
			});
			const sep = () => htmlEl('span', {class: 'bm-sep'});

			if (this.embedded) {
				// Petits contrôles flottants, construits une seule fois.
				if (!tb.childElementCount && this.cfg.controls) {
					tb.append(
						btn('−', 'Dézoomer', () => this.zoomBy(1 / 1.25)),
						btn('+', 'Zoomer (ou Ctrl + molette)', () => this.zoomBy(1.25)),
						btn('⤢', 'Afficher toute la carte', () => this.fit()),
						htmlEl('a', {class: 'btn-alt bm-btn', title: 'Ouvrir la carte en grand', text: '↗',
							href: 'zabbix.php?action=bettermap.view&mapid=' + encodeURIComponent(this.cfg.mapid)})
					);
				}

				return;
			}

			tb.textContent = '';

			if (this.cfg.canEdit) {
				tb.append(htmlEl('div', {class: 'bm-seg'}, [
					btn('Voir', 'Mode visualisation', () => this.setEdit(false), {cls: this.edit ? '' : 'bm-active'}),
					btn('Éditer', 'Mode édition', () => this.setEdit(true), {cls: this.edit ? 'bm-active' : ''})
				]), sep());
			}

			if (this.edit) {
				tb.append(
					btn('+ Hôte', 'Ajouter un hôte Zabbix', () => this.addNode('host')),
					btn('+ Groupe', 'Ajouter un groupe d\'hôtes (statut cumulé de ses hôtes)', () => this.addNode('group')),
					btn('+ Item', 'Ajouter un item (dernière valeur et statut de ses déclencheurs)', () => this.addNode('item')),
					btn('+ Déclencheur', 'Ajouter un déclencheur (OK ou en problème)', () => this.addNode('trigger')),
					btn('+ Zone', 'Ajouter un rectangle / une zone', () => this.addNode('shape', {shape: 'round'})),
					btn('+ Ellipse', 'Ajouter une ellipse', () => this.addNode('shape', {shape: 'ellipse', w: 140, h: 90,
						label: ''})),
					btn('+ Texte', 'Ajouter un texte libre', () => this.addNode('text')),
					sep(),
					btn('↶', 'Annuler (Ctrl+Z)', () => this.undo(), {disabled: !this.undoStack.length}),
					btn('↷', 'Rétablir (Ctrl+Y)', () => this.redo(), {disabled: !this.redoStack.length}),
					sep()
				);
			}

			tb.append(
				btn('−', 'Dézoomer', () => this.zoomBy(1 / 1.25)),
				htmlEl('span', {class: 'bm-zoom', text: Math.round(this.view.k * 100) + ' %', title: 'Revenir à 100 %',
					onclick: () => this.zoomTo(1)}),
				btn('+', 'Zoomer', () => this.zoomBy(1.25)),
				btn('Ajuster', 'Afficher toute la carte', () => this.fit()),
				btn('⛶', 'Plein écran', () => this.toggleFullscreen())
			);

			tb.append(htmlEl('span', {class: 'bm-spacer'}));

			if (this.lastUpdate) {
				tb.append(htmlEl('span', {class: 'bm-updated', text: 'Statut : ' + this.lastUpdate.toLocaleTimeString()}));
			}

			if (this.cfg.canEdit && (this.edit || this.dirty)) {
				tb.append(btn(this.saving ? 'Enregistrement…' : (this.dirty ? 'Enregistrer *' : 'Enregistré'),
					'Enregistrer (Ctrl+S)', () => this.save(),
					{cls: 'bm-save' + (this.dirty ? ' bm-dirty' : ''), disabled: this.saving}
				));
			}
		}

		toggleFullscreen() {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			}
			else if (this.root.requestFullscreen) {
				this.root.requestFullscreen();
			}
		}

		setEdit(edit) {
			if (edit === this.edit) {
				return;
			}

			this.edit = edit;
			this.clearSelection();
			this.hidePopup();

			const url = new URL(window.location.href);

			if (edit) {
				url.searchParams.set('edit', '1');
			}
			else {
				url.searchParams.delete('edit');
			}

			history.replaceState(null, '', url);
			this.render();
			this.renderPanel();
		}

		/* ---------------- accès aux données */

		node(id) {
			return this.doc.nodes.find(n => n.id === id);
		}

		link(id) {
			return this.doc.links.find(l => l.id === id);
		}

		selectedNodes() {
			return this.doc.nodes.filter(n => this.sel.nodes.has(n.id));
		}

		selectedLinks() {
			return this.doc.links.filter(l => this.sel.links.has(l.id));
		}

		clearSelection() {
			this.sel.nodes.clear();
			this.sel.links.clear();
		}

		pruneSelection() {
			for (const id of [...this.sel.nodes]) {
				if (!this.node(id)) {
					this.sel.nodes.delete(id);
				}
			}

			for (const id of [...this.sel.links]) {
				if (!this.link(id)) {
					this.sel.links.delete(id);
				}
			}
		}

		snap(v) {
			const s = this.doc.settings;

			return s.snap ? Math.round(v / s.gridSize) * s.gridSize : Math.round(v);
		}

		snapPt(p) {
			return {x: this.snap(p.x), y: this.snap(p.y)};
		}

		nodeLabel(n) {
			const kind = OBJECT_TYPES[n.type];

			if (n.label !== '' || !kind) {
				return n.label;
			}

			const st = this.objStatus(n);
			const empty = {host: '(choisir un hôte)', group: '(choisir un groupe)', item: '(choisir un item)',
				trigger: '(choisir un déclencheur)'}[n.type];

			return st ? st.name : (n[kind.name] || (this.edit ? empty : ''));
		}

		// Statut renvoyé par le serveur pour l'objet Zabbix du nœud, ou undefined.
		objStatus(n) {
			const kind = OBJECT_TYPES[n.type];

			return kind && n[kind.field] ? this.status[kind.status][n[kind.field]] : undefined;
		}

		/* ---------------- historique */

		checkpoint() {
			this.undoStack.push(JSON.stringify(this.doc));

			if (this.undoStack.length > 200) {
				this.undoStack.shift();
			}

			this.redoStack = [];
			this.markDirty();
		}

		markDirty() {
			this.dirty = true;
			this.version++;
		}

		undo() {
			if (!this.undoStack.length) {
				return;
			}

			this.redoStack.push(JSON.stringify(this.doc));
			this.doc = JSON.parse(this.undoStack.pop());
			this.afterHistory();
		}

		redo() {
			if (!this.redoStack.length) {
				return;
			}

			this.undoStack.push(JSON.stringify(this.doc));
			this.doc = JSON.parse(this.redoStack.pop());
			this.afterHistory();
		}

		afterHistory() {
			this.markDirty();
			this.pruneSelection();
			this.render();
			this.renderPanel();
			this.restartTimerIfNeeded();
		}

		/* ---------------- statut Zabbix */

		// {hostids: [...], groupids: [...], itemids: [...], triggerids: [...]} des objets Zabbix de la carte.
		objectIds() {
			const ids = {};

			for (const [type, kind] of Object.entries(OBJECT_TYPES)) {
				ids[kind.ids] = [...new Set(this.doc.nodes.filter(n => n.type === type && n[kind.field])
					.map(n => n[kind.field]))];
			}

			// Déclencheurs des liens colorés selon « autre(s) déclencheur(s) ».
			ids.triggerids = [...new Set(ids.triggerids.concat(...this.doc.links.filter(l => l.status === 'triggers')
				.map(l => l.triggers.map(t => t.triggerid))))];

			return ids;
		}

		refreshStatus() {
			if (document.hidden && this.statusLoaded) {
				return;
			}

			const ids = this.objectIds();

			if (!Object.values(ids).some(list => list.length)) {
				this.status = emptyStatus();
				this.statusLoaded = true;
				this.render();

				return;
			}

			post('bettermap.status', ids)
				.then(res => {
					if (res.error) {
						throw new Error(res.error);
					}

					this.setStatus(res);
				})
				.catch(err => this.notify(err.message, true));
		}

		setStatus(status) {
			if (this.destroyed) {
				return;
			}

			this.status = emptyStatus();

			for (const key in this.status) {
				if (isObj(status) && isObj(status[key])) {
					this.status[key] = status[key];
				}
			}

			this.statusLoaded = true;
			this.lastUpdate = new Date();
			this.render();

			if (this.panel) {
				this.panel.querySelectorAll('[data-triggerid]').forEach(el => this.fillTriggerState(el));
			}

			if (!this.popup.hidden && this.popupNode) {
				this.showPopup(this.popupNode);
			}
			else if (!this.popup.hidden && this.popupLink && this.link(this.popupLink)) {
				this.showLinkPopup(this.link(this.popupLink));
			}
		}

		startTimer() {
			clearInterval(this.timer);
			this.timerDelay = Math.max(10, num(this.doc.settings.refresh, 30));
			this.timer = setInterval(() => this.refreshStatus(), this.timerDelay * 1000);
		}

		restartTimerIfNeeded() {
			if (Math.max(10, num(this.doc.settings.refresh, 30)) !== this.timerDelay) {
				this.startTimer();
			}
		}

		nodeStatus(n) {
			const kind = OBJECT_TYPES[n.type];

			if (!kind || !n[kind.field] || !this.statusLoaded) {
				return {state: 'none'};
			}

			const st = this.objStatus(n);

			if (!st) {
				return {state: 'unknown'};
			}

			if (st.disabled) {
				return {state: 'disabled'};
			}

			// Un groupe est « en maintenance » quand tous ses hôtes surveillés le sont.
			const maintenance = n.type === 'group' ? st.hosts > 0 && st.maintenance === st.hosts : !!st.maintenance;

			if (st.problems.length) {
				return {
					state: 'problem',
					severity: Math.max(...st.problems.map(p => p.severity)),
					count: st.problems.length,
					maintenance
				};
			}

			if (st.unsupported) {
				return {state: 'unsupported'};
			}

			return {state: maintenance ? 'maint' : 'ok'};
		}

		linkSeverity(l) {
			let sev = -1;
			const ends = {from: [l.from], to: [l.to], both: [l.from, l.to]}[l.status] || [];

			for (const id of ends) {
				const st = this.nodeStatus(this.node(id) || {});

				if (st.state === 'problem') {
					sev = Math.max(sev, st.severity);
				}
			}

			if (l.status === 'triggers' && l.triggers.length) {
				const problems = l.triggers.map(t => this.triggerState(t.triggerid)).filter(st => st.state === 'problem');

				// ET : le lien n'est en problème que si tous ses déclencheurs le sont.
				if (l.triggerLogic !== 'and' || problems.length === l.triggers.length) {
					for (const st of problems) {
						sev = Math.max(sev, st.severity);
					}
				}
			}

			return sev;
		}

		// État d'un déclencheur rattaché à un lien : none (statut pas encore chargé), unknown, disabled, ok ou problem.
		triggerState(triggerid) {
			if (!this.statusLoaded) {
				return {state: 'none'};
			}

			const st = this.status.triggers[triggerid];

			if (!st) {
				return {state: 'unknown'};
			}

			if (st.disabled) {
				return {state: 'disabled'};
			}

			if (st.problems.length) {
				return {state: 'problem', severity: Math.max(...st.problems.map(p => p.severity)), count: st.problems.length};
			}

			return {state: 'ok'};
		}

		// « Hôte : déclencheur », d'après le statut à jour si possible, sinon d'après les noms mémorisés.
		triggerText(t) {
			const st = this.status.triggers[t.triggerid];

			return (st ? st.host : t.hostname) + ' : ' + (st ? st.name : t.triggername);
		}

		triggerStateText(triggerid) {
			const st = this.triggerState(triggerid);

			return {
				problem: () => 'PROBLÈME (' + SEVERITIES[st.severity].name + ')',
				ok: () => 'OK',
				disabled: () => 'désactivé',
				unknown: () => 'introuvable ou non autorisé',
				none: () => '…'
			}[st.state]();
		}

		/* ---------------- rendu */

		applyView() {
			const v = this.view;
			const s = this.doc.settings;
			const gs = s.gridSize * v.k;

			this.world.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`);
			this.gridPattern.setAttribute('width', gs);
			this.gridPattern.setAttribute('height', gs);
			this.gridPattern.setAttribute('patternTransform', `translate(${v.x},${v.y})`);
			this.gridDot.setAttribute('cx', gs / 2);
			this.gridDot.setAttribute('cy', gs / 2);
			this.gridDot.setAttribute('r', clamp(v.k, 0.6, 1.4));
			this.gridRect.style.display = s.grid && this.edit && gs >= 4 ? '' : 'none';
			this.bg.style.fill = s.background || '';

			const zoom = this.toolbar.querySelector('.bm-zoom');

			if (zoom) {
				zoom.textContent = Math.round(v.k * 100) + ' %';
			}
		}

		render() {
			const d = this.drag;

			this.root.classList.toggle('bm-editing', this.edit);
			this.canvas.classList.toggle('bm-dragging', !!d && d.moved && (d.type === 'connect' || d.type === 'end'));
			this.applyView();
			this.renderLinks();
			this.renderNodes();
			this.renderOverlay();
			this.buildToolbar();
		}

		renderNodes() {
			this.gZones.textContent = '';
			this.gNodes.textContent = '';

			for (const n of this.doc.nodes) {
				const g = svgEl('g', {
					class: 'bm-node bm-node-' + n.type + (this.sel.nodes.has(n.id) ? ' bm-selected' : '')
						+ (n.url && !this.edit ? ' bm-clickable' : ''),
					'data-role': 'node',
					'data-id': n.id,
					transform: `translate(${n.x},${n.y})`
				}, n.type === 'shape' ? this.gZones : this.gNodes);

				if (isDevice(n)) {
					this.renderDevice(g, n);
				}
				else if (isHostChild(n)) {
					this.renderBox(g, n);
				}
				else if (n.type === 'shape') {
					const body = shapeEl(n.shape, n.w, n.h, {class: 'bm-body'}, g);

					if (n.fill) {
						body.style.fill = n.fill;
					}

					if (n.stroke) {
						body.style.stroke = n.stroke;
					}

					if (n.label) {
						drawBoxText(g, n, 12, 10, 'bm-label bm-shape-label');
					}
				}
				else {
					const hit = svgEl('rect', {class: 'bm-text-hit', width: n.w, height: n.h}, g);

					if (n.fill) {
						hit.style.fill = n.fill;
					}

					if (n.stroke) {
						hit.style.stroke = n.stroke;
					}

					drawBoxText(g, n, 4, 3, 'bm-label');
				}

				if (this.edit) {
					const extra = this.labelExtent(n);

					nodePorts(n).forEach((port, i) => {
						const p = portPoint(n, port, extra, 0);

						svgEl('circle', {class: 'bm-conn', cx: p.x - n.x, cy: p.y - n.y, r: 4 / this.view.k,
							'stroke-width': 1 / this.view.k, 'data-role': 'conn', 'data-id': n.id, 'data-port': i}, g);
					});
				}
			}
		}

		// Corps d'un nœud Zabbix (hôte, groupe, item, déclencheur) : halo et bordure colorés selon la sévérité.
		renderStatusBody(g, n, st) {
			const sevColor = st.state === 'problem' ? SEVERITIES[st.severity].color : null;

			g.classList.add('bm-st-' + st.state);

			if (sevColor && st.severity >= 4) {
				const halo = shapeEl(n.shape, n.w, n.h, {class: 'bm-halo'}, g);

				halo.style.stroke = sevColor;
			}

			const body = shapeEl(n.shape, n.w, n.h, {class: 'bm-body'}, g);

			if (n.fill) {
				body.style.fill = n.fill;
			}

			if (sevColor) {
				body.style.stroke = sevColor;
				body.style.strokeWidth = '2.5';
			}
			else if (n.stroke) {
				body.style.stroke = n.stroke;
			}

			return sevColor;
		}

		// Pastilles en haut du nœud : nombre de problèmes (ou OK) à droite, maintenance.
		renderBadges(g, n, st, sevColor) {
			const bx = n.w - 2, by = 2;

			if (st.state === 'problem') {
				svgEl('circle', {class: 'bm-badge', cx: bx, cy: by, r: 9, fill: sevColor}, g);
				const t = svgEl('text', {class: 'bm-badge-text', x: bx, y: by, 'text-anchor': 'middle',
					'dominant-baseline': 'central'}, g);

				t.textContent = st.count > 99 ? '99+' : st.count;
			}
			else if (st.state === 'ok') {
				svgEl('circle', {class: 'bm-badge', cx: bx, cy: by, r: 5, fill: OK_COLOR}, g);
			}

			if (st.state === 'maint' || st.maintenance) {
				const mx = st.state === 'problem' ? 2 : bx;

				svgEl('circle', {class: 'bm-badge', cx: mx, cy: by, r: 8, fill: MAINT_COLOR}, g);
				const t = svgEl('text', {class: 'bm-badge-text', x: mx, y: by, 'text-anchor': 'middle',
					'dominant-baseline': 'central'}, g);

				t.textContent = 'M';
			}
		}

		// Infobulle : nom de l'objet, résumé, problèmes.
		renderTitle(g, n) {
			const info = this.objStatus(n);
			const title = svgEl('title', {}, g);
			const kind = OBJECT_TYPES[n.type];
			let text = n[kind.name] || '';

			if (info) {
				text = info.name;

				if (n.type === 'group') {
					text += '\n' + info.hosts + ' hôte(s), ' + info.problem_hosts + ' en problème';
				}
				else if (n.type === 'item') {
					text = info.host + ' : ' + info.name + '\n' + (info.value ?? 'aucune donnée');
				}
				else if (n.type === 'trigger') {
					text = info.host + ' : ' + info.name + '\nSévérité : ' + SEVERITIES[info.severity].name;
				}

				text += info.problems.length
					? '\n' + info.problems.map(p => '• ' + (n.type === 'group' ? p.host + ' : ' : '') + p.name).join('\n')
					: '\nAucun problème';
			}

			title.textContent = text;
		}

		// Ligne principale d'une boîte item / déclencheur : [texte, couleur imposée ou null].
		boxValue(n, st, sevColor) {
			const info = this.objStatus(n);

			if (!info) {
				return [n[OBJECT_TYPES[n.type].field] && this.statusLoaded ? '?' : '', null];
			}

			if (n.type === 'item') {
				return [info.value ?? '—', null];
			}

			// Déclencheur : son état, aux couleurs de Zabbix.
			return {
				problem: ['PROBLÈME', sevColor],
				ok: ['OK', OK_COLOR],
				disabled: ['Désactivé', null],
				unsupported: ['Inconnu', null]
			}[st.state] || ['', null];
		}

		renderBox(g, n) {
			const st = this.nodeStatus(n);
			const sevColor = this.renderStatusBody(g, n, st);
			const [value, valueColor] = this.boxValue(n, st, sevColor);
			// Noms longs (fréquents pour les déclencheurs) coupés à la largeur de la boîte ; le nom complet
			// reste dans l'infobulle.
			const size = value !== '' ? n.fontSize * 0.8 : n.fontSize;
			const max = Math.max(4, Math.floor((n.w - 16) / (size * 0.55)));
			const label = this.nodeLabel(n).split('\n')
				.map(line => line.length > max ? line.slice(0, max - 1) + '…' : line).join('\n');

			if (label && value !== '') {
				drawText(g, label, n.w / 2, n.h * 0.3, {size: n.fontSize * 0.8, color: n.color, valign: 'middle',
					cls: 'bm-label bm-item-name'});
				drawText(g, value, n.w / 2, n.h * 0.67, {size: n.fontSize * 1.4, color: valueColor || n.color,
					valign: 'middle', cls: 'bm-label bm-item-value'});
			}
			else if (label || value !== '') {
				drawText(g, label || value, n.w / 2, n.h / 2, {size: n.fontSize, color: (label ? null : valueColor) || n.color,
					valign: 'middle', cls: 'bm-label' + (label ? '' : ' bm-item-value')});
			}

			this.renderBadges(g, n, st, sevColor);
			this.renderTitle(g, n);
		}

		renderDevice(g, n) {
			const st = this.nodeStatus(n);
			const sevColor = this.renderStatusBody(g, n, st);
			const s = Math.min(n.w, n.h) * 0.68;
			const icon = svgEl('g', {class: 'bm-icon',
				transform: `translate(${(n.w - s) / 2},${(n.h - s) / 2}) scale(${s / 48})`}, g);

			icon.innerHTML = (ICONS[n.icon] || ICONS.generic).svg;

			if (n.iconColor) {
				icon.style.stroke = n.iconColor;
			}

			const label = this.nodeLabel(n);

			if (label) {
				const [x, y, anchor, valign] = {
					top: [n.w / 2, -5, 'middle', 'bottom'],
					left: [-6, n.h / 2, 'end', 'middle'],
					right: [n.w + 6, n.h / 2, 'start', 'middle']
				}[this.labelPosition(n)] || [n.w / 2, n.h + 5, 'middle', 'top'];

				drawText(g, label, x, y, {size: n.fontSize, color: n.color, anchor, valign, cls: 'bm-label bm-host-label'});
			}

			this.renderBadges(g, n, st, sevColor);
			this.renderTitle(g, n);
		}

		// a / b : nœuds d'extrémité (par défaut ceux du lien ; l'aperçu de connexion passe un nœud « curseur »).
		linkGeometry(l, par, a = this.node(l.from), b = this.node(l.to)) {
			if (!a || !b) {
				return null;
			}

			const ca = center(a), cb = center(b);
			const ea = this.labelExtent(a), eb = this.labelExtent(b);
			let mids = l.points.map(p => ({x: p.x, y: p.y}));

			// Liens parallèles sans point de passage ni point fixe : on les écarte automatiquement.
			if (!mids.length && par.count > 1 && !l.fromPort && !l.toPort) {
				const off = (par.index - (par.count - 1) / 2) * 34;

				if (off) {
					const sign = par.flip ? -1 : 1;
					const u = unit((cb.x - ca.x) * sign, (cb.y - ca.y) * sign);

					mids = [{x: (ca.x + cb.x) / 2 - u.y * off, y: (ca.y + cb.y) / 2 + u.x * off}];
				}
			}

			const fixedA = l.fromPort ? portPoint(a, l.fromPort, ea) : null;
			const fixedB = l.toPort ? portPoint(b, l.toPort, eb) : null;
			let line, ctrl, ortho = null;

			if (l.style === 'orthogonal') {
				ortho = this.orthoRoute(a, l.fromPort, ea, b, l.toPort, eb, mids);
				line = ortho;
				ctrl = [line[0], ...mids, line[line.length - 1]];
			}
			else {
				ctrl = [
					fixedA || borderPoint(a, mids[0] || fixedB || cb, ea),
					...mids,
					fixedB || borderPoint(b, mids[mids.length - 1] || fixedA || ca, eb)
				];
				line = ctrl;
			}

			const n = line.length;
			const curved = l.style === 'curve' && (n > 2 || fixedA || fixedB);
			// Une courbe part perpendiculairement à un point fixe, comme dans draw.io.
			const normA = curved && fixedA ? portNormal(a, l.fromPort) : null;
			const normB = curved && fixedB ? portNormal(b, l.toPort) : null;
			const startDir = normA || unit(line[1].x - line[0].x, line[1].y - line[0].y);
			const endDir = normB ? {x: -normB.x, y: -normB.y}
				: unit(line[n - 1].x - line[n - 2].x, line[n - 1].y - line[n - 2].y);
			const startTip = line[0], endTip = line[n - 1];
			const arrowSize = 5 + l.width * 2.2;
			const drawn = line.slice();

			if (l.arrow === 'end' || l.arrow === 'both') {
				drawn[n - 1] = {x: endTip.x - endDir.x * arrowSize * 0.8, y: endTip.y - endDir.y * arrowSize * 0.8};
			}

			if (l.arrow === 'start' || l.arrow === 'both') {
				drawn[0] = {x: startTip.x + startDir.x * arrowSize * 0.8, y: startTip.y + startDir.y * arrowSize * 0.8};
			}

			// Segments entre points de contrôle (servent au tracé, au clic et aux poignées).
			const segs = [];
			let d;

			if (curved) {
				const p = drawn;

				d = `M${p[0].x},${p[0].y}`;

				for (let i = 0; i < p.length - 1; i++) {
					const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
					const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
					const s = {
						p1, p2,
						c1: {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6},
						c2: {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6}
					};

					if (i === 0 && normA) {
						s.c1 = {x: p1.x + normA.x * len / 2.5, y: p1.y + normA.y * len / 2.5};
					}

					if (i === p.length - 2 && normB) {
						s.c2 = {x: p2.x + normB.x * len / 2.5, y: p2.y + normB.y * len / 2.5};
					}

					d += ` C${s.c1.x},${s.c1.y} ${s.c2.x},${s.c2.y} ${p2.x},${p2.y}`;
					s.samples = Array.from({length: 13}, (_, k) => bezierAt(s, k / 12));
					s.mid = bezierAt(s, 0.5);
					segs.push(s);
				}
			}
			else {
				d = l.rounded && drawn.length > 2 ? polyPath(drawn, CORNER_RADIUS) : 'M' + drawn.map(p => p.x + ',' + p.y).join(' L');

				// Orthogonal : un segment par tronçon de la polyligne. Droit : un segment entre deux points de passage.
				const pts = ortho || ctrl;

				for (let i = 0; i < pts.length - 1; i++) {
					const p1 = pts[i], p2 = pts[i + 1];

					segs.push({p1, p2, samples: [p1, p2], mid: {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2}});
				}
			}

			return {d, ctrl, ortho, segs, startTip, endTip, startDir, endDir, arrowSize};
		}

		// Extrémité d'un lien orthogonal : point fixe, ou milieu du côté tourné vers la cible
		// (glissé le long du côté pour rester aligné quand c'est possible).
		orthoEnd(n, port, m, t) {
			if (port) {
				return {p: portPoint(n, port, m), d: axisDir(portNormal(n, port))};
			}

			const c = center(n), dx = t.x - c.x, dy = t.y - c.y, gap = 2;
			const slide = !isEllipse(n) && n.w > 0;

			if (Math.abs(dx) * n.h >= Math.abs(dy) * n.w) {
				const s = dx >= 0 ? 1 : -1;
				const y = slide && t.y > n.y + 4 && t.y < n.y + n.h - 4 ? t.y : c.y;

				return {p: {x: s > 0 ? n.x + n.w + m.r + gap : n.x - m.l - gap, y}, d: {x: s, y: 0}};
			}

			const s = dy >= 0 ? 1 : -1;
			const x = slide && t.x > n.x + 4 && t.x < n.x + n.w - 4 ? t.x : c.x;

			return {p: {x, y: s > 0 ? n.y + n.h + m.b + gap : n.y - m.t - gap}, d: {x: 0, y: s}};
		}

		// Tracé orthogonal : départs perpendiculaires, passage par les points (coins) du lien,
		// sinon itinéraire automatique en L, en Z ou en U.
		orthoRoute(a, portA, ea, b, portB, eb, mids) {
			const ca = center(a), cb = center(b);
			let ta = mids[0] || (portB ? portPoint(b, portB, eb) : cb);
			let tb = mids[mids.length - 1] || (portA ? portPoint(a, portA, ea) : ca);

			if (!mids.length && !portA && !portB) {
				// Nœuds face à face : une ligne droite au milieu de la partie commune.
				const y1 = Math.max(a.y, b.y), y2 = Math.min(a.y + a.h, b.y + b.h);
				const x1 = Math.max(a.x, b.x), x2 = Math.min(a.x + a.w, b.x + b.w);

				if (y2 - y1 > 8 && x2 <= x1) {
					ta = {x: cb.x, y: (y1 + y2) / 2};
					tb = {x: ca.x, y: (y1 + y2) / 2};
				}
				else if (x2 - x1 > 8 && y2 <= y1) {
					ta = {x: (x1 + x2) / 2, y: cb.y};
					tb = {x: (x1 + x2) / 2, y: ca.y};
				}
			}

			const A = this.orthoEnd(a, portA, ea, ta), B = this.orthoEnd(b, portB, eb, tb);
			const S = A.p, E = B.p, dS = A.d, dE = B.d;
			const S1 = {x: S.x + dS.x * ORTHO_STUB, y: S.y + dS.y * ORTHO_STUB};
			const E1 = {x: E.x + dE.x * ORTHO_STUB, y: E.y + dE.y * ORTHO_STUB};
			const P = [S, S1];
			const step = (q, last) => {
				const p = P[P.length - 1], o = P[P.length - 2];

				if (Math.abs(p.x - q.x) > 0.5 && Math.abs(p.y - q.y) > 0.5) {
					// On tourne au point courant ; le dernier tronçon arrive perpendiculairement au nœud.
					const horiz = Math.abs(p.y - o.y) < 0.5;

					P.push(last
						? (dE.x ? {x: q.x, y: p.y} : {x: p.x, y: q.y})
						: (horiz ? {x: p.x, y: q.y} : {x: q.x, y: p.y}));
				}

				P.push(q);
			};

			for (const q of mids.length ? mids : orthoAuto(S1, dS, E1, dE)) {
				step(q, false);
			}

			step(E1, true);
			P.push(E);

			return simplifyOrtho(P);
		}

		// Emplacement du libellé d'un hôte ou d'un groupe : celui du nœud, sinon celui de la carte.
		labelPosition(n) {
			return n.labelPos || this.doc.settings.labelPos || 'bottom';
		}

		// Marges {t, r, b, l} occupées par le libellé d'un hôte ou d'un groupe (voir NO_MARGIN).
		labelExtent(n) {
			const label = isDevice(n) ? this.nodeLabel(n) : '';

			if (!label) {
				return NO_MARGIN;
			}

			const lines = label.split('\n');
			const pos = this.labelPosition(n);

			if (pos === 'left' || pos === 'right') {
				const w = Math.max(...lines.map(line => textWidth(line, n.fontSize, true))) + 8;

				return Object.assign({}, NO_MARGIN, {[pos === 'left' ? 'l' : 'r']: w});
			}

			return Object.assign({}, NO_MARGIN, {[pos === 'top' ? 't' : 'b']: lines.length * n.fontSize * 1.2 + 6});
		}

		segmentIndex(geom, p) {
			let best = 0, bestD = Infinity;

			geom.segs.forEach((s, i) => {
				for (let k = 0; k < s.samples.length - 1; k++) {
					const dist = distToSegment(p, s.samples[k], s.samples[k + 1]);

					if (dist < bestD) {
						bestD = dist;
						best = i;
					}
				}
			});

			return best;
		}

		renderLinks() {
			this.gLinks.textContent = '';
			this.geom = {};

			const pairs = {};

			for (const l of this.doc.links) {
				const key = [l.from, l.to].sort().join('|');

				(pairs[key] = pairs[key] || []).push(l.id);
			}

			for (const l of this.doc.links) {
				const list = pairs[[l.from, l.to].sort().join('|')];
				const geom = this.linkGeometry(l, {index: list.indexOf(l.id), count: list.length, flip: l.from > l.to});

				if (!geom) {
					continue;
				}

				this.geom[l.id] = geom;

				const sev = this.linkSeverity(l);
				const color = sev >= 0 ? SEVERITIES[sev].color : l.color;
				const ghost = this.drag && this.drag.moved && this.drag.type === 'end' && this.drag.link === l.id;
				const g = svgEl('g', {
					class: 'bm-link' + (this.sel.links.has(l.id) ? ' bm-selected' : '') + (sev >= 0 ? ' bm-link-problem' : '')
						+ (ghost ? ' bm-ghost' : '') + (!this.edit && !this.linkSources(l).length ? ' bm-link-static' : ''),
					'data-role': 'link',
					'data-id': l.id
				}, this.gLinks);
				const w = l.width;
				const dash = {dashed: `${w * 4} ${w * 3}`, dotted: `0.1 ${w * 2.5}`}[l.dash];

				svgEl('path', {class: 'bm-link-hit', d: geom.d, 'stroke-width': Math.max(14, w + 10) / Math.sqrt(this.view.k)}, g);

				const path = svgEl('path', {class: 'bm-link-line', d: geom.d, 'stroke-width': w, 'stroke-dasharray': dash,
					'stroke-linecap': l.dash === 'dotted' ? 'round' : null}, g);

				if (color) {
					path.style.stroke = color;
				}

				if (l.arrow === 'end' || l.arrow === 'both') {
					this.arrowHead(g, geom.endTip, geom.endDir, geom.arrowSize, color);
				}

				if (l.arrow === 'start' || l.arrow === 'both') {
					this.arrowHead(g, geom.startTip, {x: -geom.startDir.x, y: -geom.startDir.y}, geom.arrowSize, color);
				}

				if (l.label) {
					const len = path.getTotalLength();
					const mid = len ? path.getPointAtLength(len * l.labelPos) : geom.startTip;
					const lg = svgEl('g', {class: 'bm-link-label-g', 'data-role': 'label', 'data-id': l.id}, g);
					const bg = svgEl('rect', {class: 'bm-link-label-bg', rx: 3}, lg);
					const t = drawText(lg, l.label, mid.x, mid.y, {size: l.fontSize, valign: 'middle', cls: 'bm-label bm-link-label'});
					const bb = t.getBBox();

					bg.setAttribute('x', bb.x - 4);
					bg.setAttribute('y', bb.y - 2);
					bg.setAttribute('width', bb.width + 8);
					bg.setAttribute('height', bb.height + 4);
				}

				const title = svgEl('title', {}, g);
				const a = this.node(l.from), b = this.node(l.to);

				title.textContent = this.nodeLabel(a) + ' ↔ ' + this.nodeLabel(b) + (l.label ? '\n' + l.label : '')
					+ (l.status === 'triggers' && l.triggers.length > 1
						? '\n' + (l.triggerLogic === 'and' ? 'Tous les déclencheurs (ET) :' : 'Au moins un déclencheur (OU) :') : '')
					+ (l.status === 'triggers' ? l.triggers : []).map(t => '\n• ' + this.triggerText(t) + ' : ' + this.triggerStateText(t.triggerid)).join('');
			}
		}

		arrowHead(parent, tip, dir, size, color) {
			const px = -dir.y, py = dir.x;
			const bx = tip.x - dir.x * size, by = tip.y - dir.y * size;
			const poly = svgEl('polygon', {
				class: 'bm-arrow',
				points: `${tip.x},${tip.y} ${bx + px * size * 0.5},${by + py * size * 0.5} ${bx - px * size * 0.5},${by - py * size * 0.5}`
			}, parent);

			if (color) {
				poly.style.fill = color;
			}
		}

		renderOverlay() {
			const o = this.gOverlay;
			const k = this.view.k;

			o.textContent = '';

			if (!this.edit) {
				return;
			}

			const nodes = this.selectedNodes();
			const links = this.selectedLinks();

			for (const n of nodes) {
				const pad = 4 / k;

				svgEl('rect', {class: 'bm-sel-box', x: n.x - pad, y: n.y - pad, width: n.w + pad * 2, height: n.h + pad * 2,
					'stroke-width': 1.2 / k}, o);
			}

			if (nodes.length === 1 && !links.length) {
				const n = nodes[0], s = 9 / k;

				svgEl('rect', {class: 'bm-handle bm-resize', 'data-role': 'resize', x: n.x + n.w - s / 2, y: n.y + n.h - s / 2,
					width: s, height: s, 'stroke-width': 1.5 / k}, o);
			}

			if (links.length === 1 && !nodes.length) {
				const l = links[0], geom = this.geom[l.id];

				if (geom && geom.ortho) {
					// Orthogonal : une poignée par segment intérieur, à glisser perpendiculairement (comme draw.io).
					for (let i = 1; i < geom.segs.length - 1; i++) {
						const s = geom.segs[i], horiz = Math.abs(s.p1.y - s.p2.y) < 0.5;
						const w = (horiz ? 16 : 7) / k, h = (horiz ? 7 : 16) / k;

						svgEl('rect', {class: 'bm-handle bm-oseg ' + (horiz ? 'bm-oseg-h' : 'bm-oseg-v'), 'data-role': 'oseg',
							'data-index': i, x: s.mid.x - w / 2, y: s.mid.y - h / 2, width: w, height: h, rx: 3 / k,
							'stroke-width': 1.5 / k}, o);
					}
				}
				else if (geom) {
					geom.segs.forEach((s, i) => {
						svgEl('circle', {class: 'bm-handle bm-vwp', 'data-role': 'vwp', 'data-index': i, cx: s.mid.x, cy: s.mid.y,
							r: 4.5 / k, 'stroke-width': 1.5 / k}, o);
					});
					l.points.forEach((p, i) => {
						svgEl('circle', {class: 'bm-handle bm-wp', 'data-role': 'wp', 'data-index': i, cx: p.x, cy: p.y,
							r: 5.5 / k, 'stroke-width': 1.5 / k}, o);
					});
				}

				if (geom) {
					for (const [end, p] of [['from', geom.startTip], ['to', geom.endTip]]) {
						svgEl('circle', {class: 'bm-handle bm-end' + (l[end + 'Port'] ? ' bm-end-fixed' : ''), 'data-role': 'end',
							'data-end': end, cx: p.x, cy: p.y, r: 5.5 / k, 'stroke-width': 1.5 / k}, o);
					}
				}
			}

			const d = this.drag;

			if (d && d.moved && d.type === 'band') {
				const r = this.bandRect();

				svgEl('rect', {class: 'bm-band', x: r.x, y: r.y, width: r.w, height: r.h, 'stroke-width': 1 / k}, o);
			}

			if (d && d.moved && (d.type === 'connect' || d.type === 'end')) {
				this.renderConnectPreview(d);
			}
		}

		// Aperçu du lien en cours de création ou de reconnexion, avec les points de connexion de la cible.
		renderConnectPreview(d) {
			const o = this.gOverlay, k = this.view.k;
			const target = d.hover ? this.node(d.hover) : null;
			let free = {id: '', type: 'text', x: d.cur.x, y: d.cur.y, w: 0, h: 0, label: ''};

			if (target) {
				const extra = this.labelExtent(target);

				nodePorts(target).forEach(port => {
					const p = portPoint(target, port, extra, 0);
					const hot = samePort(port, d.hoverPort);

					svgEl('circle', {class: 'bm-port' + (hot ? ' bm-port-hot' : ''), cx: p.x, cy: p.y, r: (hot ? 6 : 3.5) / k,
						'stroke-width': 1.5 / k}, o);
				});

				if (!d.hoverPort) {
					const pad = 4 / k;

					svgEl('rect', {class: 'bm-drop', x: target.x - pad, y: target.y - pad, width: target.w + pad * 2,
						height: target.h + pad * 2, 'stroke-width': 2 / k}, o);
				}
			}
			else if (d.type === 'connect' && !d.overSource) {
				// Relâcher dans le vide crée un nœud identique à la source, déjà relié.
				const src = this.node(d.from);

				free = Object.assign({}, src, {x: d.cur.x - src.w / 2, y: d.cur.y - src.h / 2, label: '', hostid: ''});
				svgEl('rect', {class: 'bm-drop bm-drop-new', x: free.x, y: free.y, width: free.w, height: free.h,
					'stroke-width': 1.5 / k}, o);
			}

			let fake, a, b;

			if (d.type === 'connect') {
				fake = Object.assign({}, LINK_DEFAULTS, {from: d.from, fromPort: d.fromPort, toPort: target ? d.hoverPort : null,
					style: this.doc.settings.linkStyle, points: []});
				a = this.node(d.from);
				b = target || free;
			}
			else {
				const l = this.link(d.link);

				fake = Object.assign({}, l, {[d.end + 'Port']: target ? d.hoverPort : null});
				a = d.end === 'from' ? target || free : this.node(l.from);
				b = d.end === 'to' ? target || free : this.node(l.to);
			}

			const geom = this.linkGeometry(fake, {index: 0, count: 1}, a, b);

			if (geom) {
				svgEl('path', {class: 'bm-temp-link', d: geom.d, 'stroke-width': Math.max(fake.width, 2 / k)}, o);
			}
		}

		/* ---------------- vue (zoom / déplacement) */

		toWorld(e) {
			const r = this.svg.getBoundingClientRect();

			return {x: (e.clientX - r.left - this.view.x) / this.view.k, y: (e.clientY - r.top - this.view.y) / this.view.k};
		}

		zoomAt(f, sx, sy) {
			const v = this.view;
			const k = clamp(v.k * f, 0.1, 5);

			f = k / v.k;
			v.x = sx - (sx - v.x) * f;
			v.y = sy - (sy - v.y) * f;
			v.k = k;
			this.render();
		}

		zoomBy(f) {
			const r = this.svg.getBoundingClientRect();

			this.zoomAt(f, r.width / 2, r.height / 2);
		}

		zoomTo(k) {
			this.zoomBy(k / this.view.k);
		}

		onWheel(e) {
			// Dans un tableau de bord, la molette seule doit continuer à faire défiler la page.
			if (this.embedded && !e.ctrlKey) {
				return;
			}

			e.preventDefault();

			const r = this.svg.getBoundingClientRect();

			if (e.ctrlKey || !e.shiftKey) {
				this.zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
			}
			else {
				this.view.x -= e.deltaY;
				this.applyView();
			}
		}

		bounds() {
			let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;

			for (const n of this.doc.nodes) {
				const m = this.labelExtent(n);

				x1 = Math.min(x1, n.x - m.l);
				y1 = Math.min(y1, n.y - m.t);
				x2 = Math.max(x2, n.x + n.w + m.r);
				y2 = Math.max(y2, n.y + n.h + m.b);
			}

			for (const l of this.doc.links) {
				for (const p of l.points) {
					x1 = Math.min(x1, p.x);
					y1 = Math.min(y1, p.y);
					x2 = Math.max(x2, p.x);
					y2 = Math.max(y2, p.y);
				}
			}

			return x1 === Infinity ? null : {x: x1, y: y1, w: x2 - x1, h: y2 - y1};
		}

		fit() {
			const b = this.bounds();
			const r = this.svg.getBoundingClientRect();

			if (!b || !r.width) {
				this.view = {x: 40, y: 40, k: 1};
			}
			else {
				const pad = 40;
				const k = clamp(Math.min((r.width - pad * 2) / Math.max(b.w, 1), (r.height - pad * 2) / Math.max(b.h, 1)), 0.1, 1.5);

				this.view = {k, x: (r.width - b.w * k) / 2 - b.x * k, y: (r.height - b.h * k) / 2 - b.y * k};
			}

			this.render();
		}

		/* ---------------- souris */

		nodeAt(p) {
			const order = [...this.doc.nodes.filter(n => n.type !== 'shape'), ...this.doc.nodes.filter(n => n.type === 'shape')];

			for (let i = order.length - 1; i >= 0; i--) {
				const n = order[i];
				const m = this.labelExtent(n);

				if (p.x >= n.x - m.l - 4 && p.x <= n.x + n.w + m.r + 4 && p.y >= n.y - m.t - 4 && p.y <= n.y + n.h + m.b + 4) {
					return n;
				}
			}

			return null;
		}

		// Cible d'un lien sous le curseur : point de connexion le plus proche (aimanté), sinon le nœud
		// entier (extrémité flottante).
		targetAt(p, exclude) {
			const tol = 12 / this.view.k;
			let best = null, bestD = tol;

			for (const n of this.doc.nodes) {
				if (n.id === exclude) {
					continue;
				}

				const extra = this.labelExtent(n);

				for (const port of nodePorts(n)) {
					const q = portPoint(n, port, extra, 0);
					const dist = Math.hypot(q.x - p.x, q.y - p.y);

					if (dist < bestD) {
						bestD = dist;
						best = {node: n, port};
					}
				}
			}

			if (best) {
				return best;
			}

			const n = this.nodeAt(p);

			return n && n.id !== exclude ? {node: n, port: null} : null;
		}

		bandRect() {
			const d = this.drag;

			return {
				x: Math.min(d.start.x, d.cur.x), y: Math.min(d.start.y, d.cur.y),
				w: Math.abs(d.cur.x - d.start.x), h: Math.abs(d.cur.y - d.start.y)
			};
		}

		onPointerDown(e) {
			if (e.button === 2 && this.edit) {
				// clic droit : déplacement de la vue
			}
			else if (e.button !== 0 && e.button !== 1) {
				return;
			}

			this.canvas.focus({preventScroll: true});

			const w = this.toWorld(e);
			const t = e.target.closest('[data-role]');
			const role = t ? t.dataset.role : null;
			const d = {sx: e.clientX, sy: e.clientY, start: w, cur: w, moved: false, vx: this.view.x, vy: this.view.y};

			// Double-clic détecté ici : le rendu remplace l'élément cliqué, le navigateur n'émettrait pas de dblclick.
			const now = Date.now(), last = this.lastDown;

			this.lastDown = {time: now, x: e.clientX, y: e.clientY};

			if (this.edit && t && e.button === 0 && last && now - last.time < 400
					&& Math.hypot(e.clientX - last.x, e.clientY - last.y) < 6) {
				this.lastDown = null;
				e.preventDefault();
				this.onDblClick(t);

				return;
			}

			this.svg.setPointerCapture(e.pointerId);
			this.drag = d;

			if (e.button !== 0 || this.spaceDown) {
				d.type = 'pan';

				return;
			}

			if (!this.edit) {
				d.type = 'click';
				d.target = role === 'node' ? t.dataset.id : null;
				d.link = role === 'link' || role === 'label' ? t.dataset.id : null;

				return;
			}

			e.preventDefault();
			this.hidePopup();

			const selBefore = this.selKey();

			if (!role || e.altKey) {
				if (!e.shiftKey) {
					this.clearSelection();
				}

				d.type = 'band';
				d.base = {nodes: new Set(this.sel.nodes), links: new Set(this.sel.links)};
			}
			else if (role === 'conn') {
				d.type = 'connect';
				d.from = t.dataset.id;
				d.fromPort = nodePorts(this.node(d.from))[+t.dataset.port] || null;
			}
			else if (role === 'oseg') {
				d.type = 'bend';
				d.link = this.selectedLinks()[0].id;
				d.seg = +t.dataset.index;
			}
			else if (role === 'label') {
				const id = t.dataset.id;

				if (!this.sel.links.has(id) || this.sel.nodes.size || this.sel.links.size > 1) {
					this.clearSelection();
					this.sel.links.add(id);
				}

				d.type = 'label';
				d.link = id;
			}
			else if (role === 'resize') {
				const n = this.selectedNodes()[0];

				d.type = 'resize';
				d.node = n.id;
				d.orig = {w: n.w, h: n.h};
			}
			else if (role === 'wp' || role === 'vwp' || role === 'end') {
				d.type = role;
				d.link = this.selectedLinks()[0].id;
				d.index = +t.dataset.index;
				d.end = t.dataset.end;
			}
			else if (role === 'link') {
				const id = t.dataset.id;

				if (e.shiftKey) {
					this.sel.links.has(id) ? this.sel.links.delete(id) : this.sel.links.add(id);
				}
				else if (!this.sel.links.has(id) || this.sel.nodes.size || this.sel.links.size > 1) {
					this.clearSelection();
					this.sel.links.add(id);
				}

				d.type = 'bend';
				d.link = id;
			}
			else if (role === 'node') {
				const id = t.dataset.id;

				if (e.shiftKey) {
					this.sel.nodes.has(id) ? this.sel.nodes.delete(id) : this.sel.nodes.add(id);
				}
				else if (!this.sel.nodes.has(id)) {
					this.clearSelection();
					this.sel.nodes.add(id);
				}

				d.type = 'move';
				d.primary = id;
				d.orig = new Map(this.selectedNodes().map(n => [n.id, {x: n.x, y: n.y}]));
				// Les points des liens dont les deux extrémités bougent suivent le mouvement.
				d.origPts = new Map(this.doc.links
					.filter(l => this.sel.nodes.has(l.from) && this.sel.nodes.has(l.to))
					.map(l => [l.id, l.points.map(p => ({x: p.x, y: p.y}))]));
			}

			this.render();

			if (this.selKey() !== selBefore) {
				this.renderPanel();
			}
		}

		selKey() {
			return [...this.sel.nodes].join(',') + '|' + [...this.sel.links].join(',');
		}

		onPointerMove(e) {
			const d = this.drag;

			if (!d) {
				return;
			}

			const w = this.toWorld(e);

			if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) {
				return;
			}

			const first = !d.moved;

			d.moved = true;
			// Un glisser ne compte pas comme premier clic d'un double-clic.
			this.lastDown = null;
			d.cur = w;

			if (d.type === 'click') {
				d.type = 'pan';
			}

			switch (d.type) {
				case 'pan':
					this.view.x = d.vx + e.clientX - d.sx;
					this.view.y = d.vy + e.clientY - d.sy;
					this.applyView();
					this.hidePopup();

					return;

				case 'band':
					this.applyBand(e.shiftKey);
					this.render();

					return;

				case 'connect':
				case 'end': {
					const exclude = d.type === 'connect' ? d.from
						: (d.end === 'from' ? this.link(d.link).to : this.link(d.link).from);
					const target = this.targetAt(w, exclude);
					const under = this.nodeAt(w);

					d.hover = target ? target.node.id : null;
					d.hoverPort = target ? target.port : null;
					d.overSource = !!under && under.id === exclude;

					// Au premier mouvement, rendu complet pour estomper le lien en cours de reconnexion.
					first ? this.render() : this.renderOverlay();

					return;
				}

				case 'label': {
					const path = this.gLinks.querySelector(`g[data-id="${d.link}"] .bm-link-line`);

					if (!path) {
						return;
					}

					if (first) {
						this.checkpoint();
					}

					const len = path.getTotalLength();
					let best = 0.5, bestD = Infinity;

					for (let i = 0; i <= 100; i++) {
						const q = path.getPointAtLength(len * i / 100);
						const dist = Math.hypot(q.x - w.x, q.y - w.y);

						if (dist < bestD) {
							bestD = dist;
							best = i / 100;
						}
					}

					this.link(d.link).labelPos = best;
					break;
				}

				case 'move': {
					if (first) {
						this.checkpoint();
					}

					const o = d.orig.get(d.primary);
					const dx = this.snap(o.x + w.x - d.start.x) - o.x;
					const dy = this.snap(o.y + w.y - d.start.y) - o.y;

					for (const [id, p] of d.orig) {
						const n = this.node(id);

						n.x = p.x + dx;
						n.y = p.y + dy;
					}

					for (const [id, pts] of d.origPts) {
						this.link(id).points = pts.map(p => ({x: p.x + dx, y: p.y + dy}));
					}

					break;
				}

				case 'resize': {
					if (first) {
						this.checkpoint();
					}

					const n = this.node(d.node);

					n.w = Math.max(12, this.snap(d.orig.w + w.x - d.start.x));
					n.h = Math.max(12, this.snap(d.orig.h + w.y - d.start.y));
					break;
				}

				case 'bend':
				case 'vwp': {
					const l = this.link(d.link);
					const geom = this.geom[l.id];

					if (!geom) {
						return;
					}

					this.checkpoint();

					if (!this.sel.links.has(l.id) || this.sel.links.size > 1 || this.sel.nodes.size) {
						this.clearSelection();
						this.sel.links.add(l.id);
						this.renderPanel();
					}

					if (geom.ortho) {
						const P = geom.ortho;
						const i = d.seg ?? this.segmentIndex(geom, d.start);

						if (i >= 1 && i <= P.length - 3) {
							// Segment intérieur : il glisse parallèlement à lui-même, les coins deviennent les points du lien.
							l.points = P.slice(1, -1).map(p => ({x: p.x, y: p.y}));
							d.type = 'oseg';
							d.index = i;
							d.horiz = Math.abs(P[i].y - P[i + 1].y) < 0.5;
							this.moveOrthoSegment(l, d, w);
						}
						else {
							// Segment relié à un nœud : on ajoute un coin du côté de ce nœud.
							l.points.splice(i === 0 ? 0 : l.points.length, 0, this.snapPt(w));
							d.type = 'wp';
							d.index = i === 0 ? 0 : l.points.length - 1;
						}

						break;
					}

					const index = d.type === 'vwp' ? d.index : this.segmentIndex(geom, d.start);

					l.points.splice(Math.min(index, l.points.length), 0, this.snapPt(w));
					d.type = 'wp';
					d.index = Math.min(index, l.points.length - 1);
					break;
				}

				case 'oseg':
					this.moveOrthoSegment(this.link(d.link), d, w);
					break;

				case 'wp': {
					if (first) {
						this.checkpoint();
					}

					const l = this.link(d.link);

					l.points[d.index] = this.alignPoint(l, d.index, this.snapPt(w));
					break;
				}
			}

			this.render();
		}

		moveOrthoSegment(l, d, w) {
			const key = d.horiz ? 'y' : 'x';
			const v = this.snap(w[key]);

			l.points[d.index - 1][key] = v;
			l.points[d.index][key] = v;
		}

		// Aimante un point de passage sur l'alignement de ses voisins (ligne bien droite).
		alignPoint(l, i, p) {
			const tol = 8 / this.view.k;
			const anchor = (id, port) => {
				const n = this.node(id);

				return port ? portPoint(n, port, this.labelExtent(n)) : center(n);
			};
			const prev = i > 0 ? l.points[i - 1] : anchor(l.from, l.fromPort);
			const next = i < l.points.length - 1 ? l.points[i + 1] : anchor(l.to, l.toPort);

			for (const nb of [prev, next]) {
				if (Math.abs(p.x - nb.x) < tol) {
					p.x = nb.x;
				}

				if (Math.abs(p.y - nb.y) < tol) {
					p.y = nb.y;
				}
			}

			return p;
		}

		// Nœud créé en relâchant un nouveau lien dans le vide : copie de l'apparence de la source.
		addLinkedNode(src, p) {
			const n = Object.assign({}, src, {id: uid()});

			// Le nouveau nœud reste à configurer ; un item ou un déclencheur garde l'hôte de la source.
			const kind = OBJECT_TYPES[n.type];

			if (kind) {
				Object.assign(n, {[kind.field]: '', [kind.name]: '', label: ''});
			}

			n.x = this.snap(p.x - n.w / 2);
			n.y = this.snap(p.y - n.h / 2);
			n.type === 'shape' ? this.doc.nodes.unshift(n) : this.doc.nodes.push(n);

			return n;
		}

		applyBand(additive) {
			const r = this.bandRect();
			const inside = n => n.x >= r.x && n.y >= r.y && n.x + n.w <= r.x + r.w && n.y + n.h <= r.y + r.h;

			this.sel.nodes = new Set(additive ? this.drag.base.nodes : []);
			this.sel.links = new Set(additive ? this.drag.base.links : []);

			for (const n of this.doc.nodes) {
				if (inside(n)) {
					this.sel.nodes.add(n.id);
				}
			}

			for (const l of this.doc.links) {
				if (this.sel.nodes.has(l.from) && this.sel.nodes.has(l.to)) {
					this.sel.links.add(l.id);
				}
			}
		}

		onPointerUp(e) {
			const d = this.drag;

			this.drag = null;

			if (!d) {
				return;
			}

			if (this.svg.hasPointerCapture(e.pointerId)) {
				this.svg.releasePointerCapture(e.pointerId);
			}

			switch (d.type) {
				case 'click': {
					const n = d.target ? this.node(d.target) : null;

					if (n && n.url && !OBJECT_TYPES[n.type]) {
						window.open(n.url, '_self');
					}
					else if (n && OBJECT_TYPES[n.type]) {
						this.showPopup(n, e);
					}
					else if (d.link && this.linkSources(this.link(d.link)).length) {
						this.showLinkPopup(this.link(d.link), e);
					}
					else {
						this.hidePopup();
					}

					return;
				}

				case 'connect': {
					if (!d.moved || (!d.hover && d.overSource)) {
						break;
					}

					this.checkpoint();

					const target = d.hover ? null : this.addLinkedNode(this.node(d.from), d.cur);
					const l = Object.assign({id: uid()}, LINK_DEFAULTS, {
						from: d.from, to: d.hover || target.id, fromPort: d.fromPort, toPort: d.hover ? d.hoverPort : null,
						points: [], triggers: [], style: this.doc.settings.linkStyle
					});

					this.doc.links.push(l);
					this.clearSelection();

					if (target) {
						// Comme dans draw.io : le nouveau nœud est sélectionné, prêt à être configuré.
						this.sel.nodes.add(target.id);
						this.render();
						this.renderPanel();
						this.focusPicker(target);

						return;
					}

					this.sel.links.add(l.id);
					break;
				}

				case 'end':
					if (d.moved && d.hover) {
						const l = this.link(d.link);

						this.checkpoint();
						l[d.end] = d.hover;
						l[d.end + 'Port'] = d.hoverPort;

						// Les coins d'un lien orthogonal ne correspondent plus : retour au tracé automatique.
						if (l.style === 'orthogonal') {
							l.points = [];
						}
					}
					break;

				case 'oseg': {
					// Nettoyage : on ne garde que les vrais coins du tracé.
					const l = this.link(d.link);

					this.renderLinks();

					const geom = this.geom[l.id];

					if (geom && geom.ortho) {
						l.points = geom.ortho.slice(1, -1).map(p => ({x: p.x, y: p.y}));
					}
					break;
				}
			}

			this.render();

			if (d.type !== 'pan') {
				this.renderPanel();
			}
		}

		// t : élément [data-role] double-cliqué.
		onDblClick(t) {
			if (t.dataset.role === 'wp') {
				const l = this.selectedLinks()[0];

				if (l) {
					this.checkpoint();
					l.points.splice(+t.dataset.index, 1);
					this.render();
				}
			}
			else if (['node', 'link', 'label', 'oseg'].includes(t.dataset.role)) {
				// Double-clic sur un nœud ou un lien : édition du libellé.
				const field = this.panel.querySelector('[data-focus]');

				// Après le mousedown, qui sinon redonne le focus au canevas.
				if (field) {
					setTimeout(() => {
						field.focus();
						field.select && field.select();
					});
				}
			}
		}

		/* ---------------- clavier */

		onKeyDown(e) {
			if (!this.root.isConnected) {
				return;
			}

			const tag = (e.target.tagName || '').toLowerCase();

			if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
				return;
			}

			const ctrl = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();

			if (e.key === 'Escape') {
				if (this.drag) {
					this.drag = null;
				}
				else {
					this.clearSelection();
					this.renderPanel();
				}

				this.hidePopup();
				this.render();

				return;
			}

			if (ctrl && key === 's' && this.cfg.canEdit) {
				e.preventDefault();
				this.save();

				return;
			}

			if (!this.edit) {
				return;
			}

			if (e.key === ' ') {
				this.spaceDown = true;
				this.canvas.classList.add('bm-panning');
				e.preventDefault();

				return;
			}

			let handled = true;

			if (ctrl && key === 'z' && !e.shiftKey) {
				this.undo();
			}
			else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
				this.redo();
			}
			else if (ctrl && key === 'a') {
				this.sel.nodes = new Set(this.doc.nodes.map(n => n.id));
				this.sel.links = new Set(this.doc.links.map(l => l.id));
				this.render();
				this.renderPanel();
			}
			else if (ctrl && key === 'c') {
				this.copy();
			}
			else if (ctrl && key === 'v') {
				this.paste();
			}
			else if (ctrl && key === 'd') {
				this.duplicate();
			}
			else if (e.key === 'Delete' || e.key === 'Backspace') {
				this.deleteSelection();
			}
			else if (e.key.startsWith('Arrow') && this.sel.nodes.size) {
				const step = e.shiftKey ? 10 : 1;
				const dx = {ArrowLeft: -step, ArrowRight: step}[e.key] || 0;
				const dy = {ArrowUp: -step, ArrowDown: step}[e.key] || 0;

				this.checkpoint();
				this.moveSelection(dx, dy);
			}
			else {
				handled = false;
			}

			if (handled) {
				e.preventDefault();
			}
		}

		/* ---------------- opérations d'édition */

		visibleCenter() {
			const r = this.svg.getBoundingClientRect();

			return {x: (r.width / 2 - this.view.x) / this.view.k, y: (r.height / 2 - this.view.y) / this.view.k};
		}

		addNode(type, extra = {}) {
			this.checkpoint();

			const c = this.visibleCenter();
			const n = Object.assign({id: uid(), type}, NODE_DEFAULTS[type], extra);

			n.x = this.snap(c.x - n.w / 2) + (this.pasteCount++ % 5) * 10;
			n.y = this.snap(c.y - n.h / 2) + ((this.pasteCount - 1) % 5) * 10;

			if (type === 'shape') {
				this.doc.nodes.unshift(n);
			}
			else {
				this.doc.nodes.push(n);
			}

			this.clearSelection();
			this.sel.nodes.add(n.id);
			this.render();
			this.renderPanel();
			this.focusPicker(n);
		}

		// Place le curseur dans le premier sélecteur d'objet Zabbix encore vide du panneau.
		focusPicker(n) {
			const kind = OBJECT_TYPES[n.type];

			if (!kind || n[kind.field]) {
				return;
			}

			const cls = isHostChild(n) && n.hostid ? '.bm-picker-' + n.type : '.bm-picker';
			const input = this.panel.querySelector(cls + ' input');

			input && input.focus();
		}

		moveSelection(dx, dy) {
			for (const n of this.selectedNodes()) {
				n.x += dx;
				n.y += dy;
			}

			for (const l of this.doc.links) {
				if (this.sel.nodes.has(l.from) && this.sel.nodes.has(l.to)) {
					l.points.forEach(p => {
						p.x += dx;
						p.y += dy;
					});
				}
			}

			this.render();
		}

		deleteSelection() {
			if (!this.sel.nodes.size && !this.sel.links.size) {
				return;
			}

			this.checkpoint();
			this.doc.nodes = this.doc.nodes.filter(n => !this.sel.nodes.has(n.id));
			this.doc.links = this.doc.links.filter(l => !this.sel.links.has(l.id)
				&& !this.sel.nodes.has(l.from) && !this.sel.nodes.has(l.to));
			this.clearSelection();
			this.render();
			this.renderPanel();
		}

		copy() {
			const nodes = this.selectedNodes();

			if (!nodes.length) {
				return;
			}

			const ids = new Set(nodes.map(n => n.id));
			const data = JSON.stringify({
				nodes,
				links: this.doc.links.filter(l => ids.has(l.from) && ids.has(l.to))
			});

			this.clipboard = data;

			try {
				localStorage.setItem(CLIPBOARD_KEY, data);
			}
			catch (err) {
				// stockage local indisponible : presse-papiers en mémoire uniquement
			}

			this.pasteCount = 0;
		}

		paste() {
			let data;

			try {
				data = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || this.clipboard || 'null');
			}
			catch (err) {
				data = JSON.parse(this.clipboard || 'null');
			}

			if (!data || !Array.isArray(data.nodes) || !data.nodes.length) {
				return;
			}

			const clean = normalizeDoc(data);
			const off = 20 * (++this.pasteCount);
			const idmap = {};

			this.checkpoint();
			this.clearSelection();

			for (const n of clean.nodes) {
				idmap[n.id] = uid();
				n.id = idmap[n.id];
				n.x += off;
				n.y += off;
				this.doc.nodes.push(n);
				this.sel.nodes.add(n.id);
			}

			for (const l of clean.links) {
				l.id = uid();
				l.from = idmap[l.from];
				l.to = idmap[l.to];
				l.points = l.points.map(p => ({x: p.x + off, y: p.y + off}));
				this.doc.links.push(l);
				this.sel.links.add(l.id);
			}

			this.render();
			this.renderPanel();
		}

		duplicate() {
			this.copy();
			this.pasteCount = 0;
			this.paste();
		}

		align(mode) {
			const nodes = this.selectedNodes();

			if (nodes.length < 2) {
				return;
			}

			this.checkpoint();

			const minX = Math.min(...nodes.map(n => n.x)), maxX = Math.max(...nodes.map(n => n.x + n.w));
			const minY = Math.min(...nodes.map(n => n.y)), maxY = Math.max(...nodes.map(n => n.y + n.h));

			if (mode === 'hdist' || mode === 'vdist') {
				const h = mode === 'hdist';
				const sorted = nodes.slice().sort((a, b) => h ? center(a).x - center(b).x : center(a).y - center(b).y);
				const c0 = center(sorted[0]), c1 = center(sorted[sorted.length - 1]);

				sorted.forEach((n, i) => {
					const t = i / (sorted.length - 1);

					if (h) {
						n.x = Math.round(c0.x + (c1.x - c0.x) * t - n.w / 2);
					}
					else {
						n.y = Math.round(c0.y + (c1.y - c0.y) * t - n.h / 2);
					}
				});
			}
			else {
				for (const n of nodes) {
					switch (mode) {
						case 'left': n.x = minX; break;
						case 'right': n.x = maxX - n.w; break;
						case 'hcenter': n.x = Math.round((minX + maxX) / 2 - n.w / 2); break;
						case 'top': n.y = minY; break;
						case 'bottom': n.y = maxY - n.h; break;
						case 'vcenter': n.y = Math.round((minY + maxY) / 2 - n.h / 2); break;
					}
				}
			}

			this.render();
		}

		reorder(front) {
			const ids = this.sel.nodes;
			const sel = this.doc.nodes.filter(n => ids.has(n.id));
			const rest = this.doc.nodes.filter(n => !ids.has(n.id));

			this.checkpoint();
			this.doc.nodes = front ? [...rest, ...sel] : [...sel, ...rest];
			this.render();
		}

		save() {
			if (this.saving || !this.cfg.canEdit) {
				return;
			}

			const version = this.version;
			const params = {mapid: this.cfg.mapid, name: this.name, data: JSON.stringify(this.doc)};

			params[this.cfg.csrfName] = this.cfg.csrf;
			this.saving = true;
			this.buildToolbar();

			post('bettermap.save', params)
				.then(res => {
					if (res.error) {
						throw new Error(res.error);
					}

					if (this.version === version) {
						this.dirty = false;
					}

					this.notify('Carte enregistrée');
				})
				.catch(err => this.notify(err.message, true))
				.finally(() => {
					this.saving = false;
					this.buildToolbar();
				});
		}

		notify(text, error) {
			this.toast.textContent = text;
			this.toast.className = 'bm-toast bm-show' + (error ? ' bm-error' : '');
			clearTimeout(this.toastTimer);
			this.toastTimer = setTimeout(() => this.toast.classList.remove('bm-show'), error ? 6000 : 2200);
		}

		/* ---------------- popup (mode visualisation) */

		showPopup(n, e) {
			this.popupNode = n;
			this.popupLink = null;

			const kind = OBJECT_TYPES[n.type];
			const st = this.objStatus(n);
			const p = this.popup;

			p.textContent = '';

			if (!kind || !n[kind.field]) {
				return;
			}

			const what = {host: 'Hôte', group: 'Groupe', item: 'Item', trigger: 'Déclencheur'}[n.type];

			p.append(htmlEl('div', {class: 'bm-popup-title', text: st ? st.name : (n[kind.name] || what)}));

			if (!st) {
				p.append(htmlEl('div', {class: 'bm-popup-empty', text: what + ' introuvable ou non autorisé.'}));
			}
			else {
				if (n.type === 'item') {
					p.append(
						htmlEl('div', {class: 'bm-popup-sub', text: st.host}),
						htmlEl('div', {class: 'bm-popup-value'}, [
							htmlEl('span', {text: st.value ?? 'Aucune donnée'}),
							st.clock ? htmlEl('span', {class: 'bm-page', text: 'il y a ' + formatAge(st.clock)}) : null
						])
					);

					if (st.unsupported) {
						p.append(htmlEl('div', {class: 'bm-popup-empty', text: 'Item non supporté'}));
					}
				}

				if (n.type === 'trigger') {
					p.append(
						htmlEl('div', {class: 'bm-popup-sub', text: st.host}),
						htmlEl('div', {class: 'bm-popup-value'}, [
							htmlEl('span', {class: 'bm-sev', style: 'background:' + SEVERITIES[st.severity].color}),
							htmlEl('span', {text: SEVERITIES[st.severity].name})
						])
					);

					if (st.unsupported) {
						p.append(htmlEl('div', {class: 'bm-popup-empty', text: 'État inconnu (expression non évaluable)'}));
					}
				}

				if (n.type === 'group') {
					p.append(htmlEl('div', {class: 'bm-popup-sub', text: st.hosts + ' hôte(s) surveillé(s) · '
						+ st.problem_hosts + ' en problème' + (st.maintenance ? ' · ' + st.maintenance + ' en maintenance' : '')}));
				}
				else if (st.maintenance) {
					p.append(htmlEl('div', {class: 'bm-popup-maint', text: 'En maintenance'}));
				}

				if (st.disabled) {
					p.append(htmlEl('div', {class: 'bm-popup-empty', text: what + ' désactivé'}));
				}

				if (!st.problems.length) {
					p.append(htmlEl('div', {class: 'bm-popup-ok', text: 'Aucun problème'}));
				}
				else {
					const list = htmlEl('ul', {class: 'bm-popup-problems'});

					st.problems.slice().sort((a, b) => b.severity - a.severity || b.clock - a.clock).slice(0, 15)
						.forEach(pr => {
							const li = htmlEl('li', {}, [
								htmlEl('span', {class: 'bm-sev', style: 'background:' + SEVERITIES[pr.severity].color,
									title: SEVERITIES[pr.severity].name}),
								htmlEl('span', {class: 'bm-pname', text: (n.type === 'group' ? pr.host + ' : ' : '') + pr.name}),
								htmlEl('span', {class: 'bm-page', text: formatAge(pr.clock) + (pr.acknowledged ? ' ✓' : '')})
							]);

							list.append(li);
						});
					p.append(list);

					if (st.problems.length > 15) {
						p.append(htmlEl('div', {class: 'bm-popup-empty', text: '… et ' + (st.problems.length - 15) + ' autres'}));
					}
				}
			}

			p.append(htmlEl('div', {class: 'bm-popup-links'}, [
				...this.popupLinks(n, st).map(([text, href]) => htmlEl('a', {href, text})),
				n.url ? htmlEl('a', {href: n.url, text: 'Lien'}) : null
			]));

			this.placePopup(e);
		}

		// Affiche le popup près du clic e (ou à sa dernière position quand il est rafraîchi).
		placePopup(e) {
			const p = this.popup;

			p.hidden = false;

			if (e) {
				const r = this.canvas.getBoundingClientRect();

				this.popupPos = {x: e.clientX - r.left, y: e.clientY - r.top};
			}

			const r = this.canvas.getBoundingClientRect();
			const x = clamp(this.popupPos.x + 12, 8, r.width - p.offsetWidth - 8);
			const y = clamp(this.popupPos.y + 12, 8, r.height - p.offsetHeight - 8);

			p.style.left = x + 'px';
			p.style.top = y + 'px';
		}

		// Objets Zabbix dont dépend le statut d'un lien : [{trigger}] en mode déclencheurs, [{node}] sinon.
		linkSources(l) {
			if (!l || l.status === 'none') {
				return [];
			}

			if (l.status === 'triggers') {
				return l.triggers.map(t => ({trigger: t}));
			}

			const ends = {from: [l.from], to: [l.to], both: [l.from, l.to]}[l.status] || [];

			return ends.map(id => this.node(id))
				.filter(n => n && OBJECT_TYPES[n.type] && n[OBJECT_TYPES[n.type].field])
				.map(n => ({node: n}));
		}

		showLinkPopup(l, e) {
			this.popupNode = null;
			this.popupLink = l.id;

			const p = this.popup;
			const a = this.node(l.from), b = this.node(l.to);
			const ends = this.nodeLabel(a) + ' ↔ ' + this.nodeLabel(b);
			const sources = this.linkSources(l);
			const byTriggers = l.status === 'triggers';

			p.textContent = '';
			p.append(htmlEl('div', {class: 'bm-popup-title', text: l.label ? l.label.replace(/\n/g, ' ') : ends}));

			if (l.label) {
				p.append(htmlEl('div', {class: 'bm-popup-sub', text: ends}));
			}

			if (this.statusLoaded) {
				const sev = this.linkSeverity(l);

				p.append(htmlEl('div', {class: 'bm-popup-value'}, sev >= 0
					? [htmlEl('span', {class: 'bm-sev', style: 'background:' + SEVERITIES[sev].color}),
						htmlEl('span', {text: 'En problème · ' + SEVERITIES[sev].name})]
					: [htmlEl('span', {class: 'bm-sev', style: 'background:' + OK_COLOR}), htmlEl('span', {text: 'OK'})]));
			}

			// Sources du statut, avec leur état.
			p.append(htmlEl('div', {class: 'bm-popup-head', text: byTriggers
				? (l.triggers.length > 1
					? (l.triggerLogic === 'and' ? 'Tous ces déclencheurs (ET)' : 'Au moins un de ces déclencheurs (OU)')
					: 'Déclencheur')
				: 'Selon ' + (sources.length > 1 ? 'les extrémités' : 'l\'extrémité')}));

			const list = htmlEl('ul', {class: 'bm-popup-problems bm-popup-sources'});
			const problems = new Map();

			for (const src of sources) {
				let name, st, text, color;

				if (src.trigger) {
					st = this.triggerState(src.trigger.triggerid);
					name = this.triggerText(src.trigger);
					text = this.triggerStateText(src.trigger.triggerid);
					(this.status.triggers[src.trigger.triggerid] || {problems: []}).problems
						.forEach(pr => problems.set(pr.eventid, pr));
				}
				else {
					st = this.nodeStatus(src.node);
					name = this.nodeLabel(src.node);
					text = {problem: () => SEVERITIES[st.severity].name + ' · ' + st.count + ' problème(s)', ok: () => 'OK',
						maint: () => 'En maintenance', disabled: () => 'désactivé', unsupported: () => 'non supporté',
						unknown: () => 'introuvable ou non autorisé', none: () => '…'}[st.state]();
					(this.objStatus(src.node) || {problems: []}).problems.forEach(pr => problems.set(pr.eventid, pr));
				}

				color = st.state === 'problem' ? SEVERITIES[st.severity].color
					: st.state === 'ok' ? OK_COLOR : st.state === 'maint' ? MAINT_COLOR : null;
				list.append(htmlEl('li', {}, [
					htmlEl('span', {class: 'bm-sev' + (color ? '' : ' bm-sev-none'), style: color ? 'background:' + color : null}),
					htmlEl('span', {class: 'bm-pname', text: name}),
					htmlEl('span', {class: 'bm-page', text})
				]));
			}

			p.append(list);

			// Problèmes actifs de toutes les sources, sans doublon.
			const all = [...problems.values()].sort((x, y) => y.severity - x.severity || y.clock - x.clock);

			if (all.length) {
				p.append(htmlEl('div', {class: 'bm-popup-head', text: 'Problèmes'}));

				const pl = htmlEl('ul', {class: 'bm-popup-problems'});

				all.slice(0, 15).forEach(pr => pl.append(htmlEl('li', {}, [
					htmlEl('span', {class: 'bm-sev', style: 'background:' + SEVERITIES[pr.severity].color,
						title: SEVERITIES[pr.severity].name}),
					htmlEl('span', {class: 'bm-pname', text: pr.host + ' : ' + pr.name}),
					htmlEl('span', {class: 'bm-page', text: formatAge(pr.clock) + (pr.acknowledged ? ' ✓' : '')})
				])));
				p.append(pl);

				if (all.length > 15) {
					p.append(htmlEl('div', {class: 'bm-popup-empty', text: '… et ' + (all.length - 15) + ' autres'}));
				}
			}
			else if (this.statusLoaded) {
				p.append(htmlEl('div', {class: 'bm-popup-ok', text: 'Aucun problème'}));
			}

			// Liens vers Zabbix : regroupés pour les déclencheurs, par extrémité sinon.
			if (byTriggers) {
				p.append(htmlEl('div', {class: 'bm-popup-links'},
					this.triggerLinks(l.triggers).map(([text, href]) => htmlEl('a', {href, text}))));
			}
			else {
				for (const src of sources) {
					p.append(htmlEl('div', {class: 'bm-popup-links'}, [
						sources.length > 1 ? htmlEl('span', {class: 'bm-popup-links-label', text: this.nodeLabel(src.node)}) : null,
						...this.popupLinks(src.node, this.objStatus(src.node)).map(([text, href]) => htmlEl('a', {href, text}))
					]));
				}
			}

			this.placePopup(e);
		}

		// Pages Zabbix d'un ensemble de déclencheurs : problèmes, graphique de leurs items, dernières données des hôtes.
		triggerLinks(triggers) {
			const q = (key, ids) => ids.map(id => '&' + key + '%5B%5D=' + encodeURIComponent(id)).join('');
			const live = triggers.map(t => this.status.triggers[t.triggerid]).filter(Boolean);
			const itemids = [...new Set(live.flatMap(st => st.graph_itemids || []))];
			const hostids = [...new Set(live.map(st => st.hostid).filter(Boolean))];

			return [
				['Problèmes', 'zabbix.php?action=problem.view&filter_set=1' + q('triggerids', triggers.map(t => t.triggerid))],
				itemids.length ? ['Graphique', 'history.php?action=showgraph' + q('itemids', itemids)] : null,
				hostids.length ? ['Dernières données', 'zabbix.php?action=latest.view&filter_set=1' + q('hostids', hostids)] : null,
				hostids.length === 1 ? ['Graphiques de l\'hôte', 'zabbix.php?action=charts.view&filter_set=1'
					+ q('filter_hostids', hostids)] : null
			].filter(Boolean);
		}

		// Liens vers les pages Zabbix de l'objet : [texte, url].
		popupLinks(n, st) {
			if (n.type === 'group') {
				const id = encodeURIComponent(n.groupid);

				return [
					['Problèmes', 'zabbix.php?action=problem.view&filter_set=1&groupids%5B%5D=' + id],
					['Hôtes', 'zabbix.php?action=host.view&filter_set=1&groupids%5B%5D=' + id],
					['Dernières données', 'zabbix.php?action=latest.view&filter_set=1&groupids%5B%5D=' + id]
				];
			}

			if (n.type === 'trigger') {
				const hostid = encodeURIComponent(st ? st.hostid : n.hostid);

				return [
					['Problèmes', 'zabbix.php?action=problem.view&filter_set=1&triggerids%5B%5D='
						+ encodeURIComponent(n.triggerid)],
					['Dernières données', 'zabbix.php?action=latest.view&filter_set=1&hostids%5B%5D=' + hostid]
				];
			}

			if (n.type === 'item') {
				const id = encodeURIComponent(n.itemid);
				const hostid = encodeURIComponent(st ? st.hostid : n.hostid);
				// Graphique pour les valeurs numériques, liste des valeurs sinon.
				const history = st && !st.numeric ? 'showvalues' : 'showgraph';

				return [
					[history === 'showgraph' ? 'Graphique' : 'Historique',
						'history.php?action=' + history + '&itemids%5B%5D=' + id],
					['Problèmes', 'zabbix.php?action=problem.view&filter_set=1&hostids%5B%5D=' + hostid],
					['Dernières données', 'zabbix.php?action=latest.view&filter_set=1&hostids%5B%5D=' + hostid]
				];
			}

			const id = encodeURIComponent(n.hostid);

			return [
				['Problèmes', 'zabbix.php?action=problem.view&filter_set=1&hostids%5B%5D=' + id],
				['Dernières données', 'zabbix.php?action=latest.view&filter_set=1&hostids%5B%5D=' + id],
				['Graphiques', 'zabbix.php?action=charts.view&filter_set=1&filter_hostids%5B%5D=' + id],
				['Tableaux de bord', 'zabbix.php?action=host.dashboard.view&hostid=' + id]
			];
		}

		hidePopup() {
			this.popup.hidden = true;
			this.popupNode = null;
			this.popupLink = null;
		}

		/* ---------------- panneau de propriétés */

		renderPanel() {
			const p = this.panel;

			p.textContent = '';
			p.hidden = !this.edit;

			if (!this.edit) {
				return;
			}

			const nodes = this.selectedNodes();
			const links = this.selectedLinks();

			if (nodes.length === 1 && !links.length) {
				this.panelNode(nodes[0]);
			}
			else if (links.length === 1 && !nodes.length) {
				this.panelLink(links[0]);
			}
			else if (nodes.length + links.length > 1) {
				this.panelMulti(nodes, links);
			}
			else {
				this.panelMap();
			}
		}

		section(title) {
			const s = htmlEl('div', {class: 'bm-section'}, [htmlEl('div', {class: 'bm-section-title', text: title})]);

			this.panel.append(s);

			return s;
		}

		row(parent, label, control) {
			// Pas de <label> autour d'un groupe de boutons : un clic sur l'intitulé activerait le premier bouton.
			const tag = control.classList.contains('bm-seg') ? 'div' : 'label';

			parent.append(htmlEl(tag, {class: 'bm-row'}, [htmlEl('span', {class: 'bm-row-label', text: label}), control]));

			return control;
		}

		// Lie un champ à une modification du modèle, avec un seul point d'annulation par saisie.
		bind(el, event, apply, opts = {}) {
			let cp = false;

			el.addEventListener('focus', () => cp = false);
			el.addEventListener(event, () => {
				if (!cp) {
					this.checkpoint();
					cp = true;
				}

				apply(el);
				this.render();

				if (opts.panel) {
					this.renderPanel();
				}
			});
			el.addEventListener('change', () => cp = false);

			return el;
		}

		textField(obj, key, opts = {}) {
			const el = htmlEl(opts.multiline ? 'textarea' : 'input', {
				type: opts.multiline ? null : 'text', value: obj[key], placeholder: opts.placeholder || '', rows: opts.multiline ? 2 : null,
				'data-focus': opts.focus ? '1' : null
			});

			if (opts.multiline) {
				el.value = obj[key];
			}

			return this.bind(el, 'input', () => obj[key] = el.value);
		}

		numberField(obj, key, min, max, step = 1) {
			const el = htmlEl('input', {type: 'number', value: obj[key], min, max, step, class: 'bm-num'});

			return this.bind(el, 'input', () => {
				const v = parseFloat(el.value);

				if (Number.isFinite(v)) {
					obj[key] = clamp(v, min, max);
				}
			});
		}

		selectField(obj, key, options, opts = {}) {
			const el = htmlEl('select', {}, Object.entries(options).map(([v, t]) =>
				htmlEl('option', {value: v, text: t, selected: String(obj[key]) === v})
			));

			return this.bind(el, 'change', () => {
				obj[key] = el.value;
				opts.after && opts.after(el.value);
			}, {panel: opts.panel});
		}

		checkField(obj, key, opts = {}) {
			const el = htmlEl('input', {type: 'checkbox', checked: !!obj[key]});

			return this.bind(el, 'change', () => {
				obj[key] = el.checked;
				opts.after && opts.after();
			});
		}

		colorField(obj, key, fallback) {
			const input = htmlEl('input', {type: 'color', value: obj[key] || fallback});
			const reset = htmlEl('button', {type: 'button', class: 'bm-color-reset', title: 'Couleur par défaut', text: '×'});
			const wrap = htmlEl('span', {class: 'bm-color' + (obj[key] ? '' : ' bm-color-default')}, [input, reset]);

			this.bind(input, 'input', () => {
				obj[key] = input.value;
				wrap.classList.remove('bm-color-default');
			});
			reset.addEventListener('click', e => {
				e.preventDefault();
				this.checkpoint();
				obj[key] = '';
				wrap.classList.add('bm-color-default');
				this.render();
			});

			return wrap;
		}

		// Bouton bascule d'un booléen (gras, italique…) ; css : style appliqué à la lettre du bouton.
		toggleField(obj, key, label, title, css) {
			const b = htmlEl('button', {type: 'button', class: 'bm-seg-btn' + (obj[key] ? ' bm-active' : ''), title,
				'aria-pressed': obj[key] ? 'true' : 'false'}, [htmlEl('span', {style: css, text: label})]);

			b.addEventListener('click', e => {
				e.preventDefault();
				this.checkpoint();
				obj[key] = !obj[key];
				b.classList.toggle('bm-active', obj[key]);
				b.setAttribute('aria-pressed', obj[key] ? 'true' : 'false');
				this.render();
			});

			return b;
		}

		// Groupe de boutons à choix unique : choices = [[valeur, icône SVG, titre], …].
		choiceField(obj, key, choices) {
			const wrap = htmlEl('span', {class: 'bm-seg'});

			for (const [value, svg, title] of choices) {
				const b = htmlEl('button', {type: 'button', class: 'bm-seg-btn' + (obj[key] === value ? ' bm-active' : ''), title});

				b.innerHTML = svg;
				b.addEventListener('click', e => {
					e.preventDefault();
					this.checkpoint();
					obj[key] = value;
					wrap.querySelectorAll('.bm-active').forEach(x => x.classList.remove('bm-active'));
					b.classList.add('bm-active');
					this.render();
				});
				wrap.append(b);
			}

			return wrap;
		}

		buttons(parent, defs) {
			const wrap = htmlEl('div', {class: 'bm-buttons'}, defs.filter(Boolean).map(([label, fn, cls, title]) =>
				htmlEl('button', {type: 'button', class: 'btn-alt ' + (cls || ''), text: label, title: title || null, onclick: fn})
			));

			parent.append(wrap);

			return wrap;
		}

		// Sélecteur d'objet Zabbix avec recherche. type : host, group, item ou trigger ; n[field] / n[name] reçoivent
		// l'identifiant et le nom choisis. opts.params : paramètres de recherche en plus, opts.after : après le choix.
		picker(n, type, field, name, opts = {}) {
			const texts = {
				host: ['Rechercher un hôte…', 'Aucun hôte trouvé'],
				group: ['Rechercher un groupe…', 'Aucun groupe trouvé'],
				item: ['Rechercher un item (nom ou clé)…', 'Aucun item trouvé'],
				trigger: ['Rechercher un déclencheur…', 'Aucun déclencheur trouvé']
			}[type];
			const input = htmlEl('input', {type: 'text', value: n[name], placeholder: texts[0], disabled: opts.disabled});
			const list = htmlEl('div', {class: 'bm-hp-list', hidden: true});
			const wrap = htmlEl('div', {class: 'bm-picker bm-picker-' + type}, [input, list]);
			let timer, seq = 0;

			const search = () => {
				const my = ++seq;

				post('bettermap.search', Object.assign({type, search: input.value}, opts.params || {}))
					.then(res => {
						// Réponse périmée, ou arrivée après le choix (le champ a perdu le focus).
						if (my !== seq || document.activeElement !== input) {
							return;
						}

						if (res.error) {
							throw new Error(res.error);
						}

						list.textContent = '';

						const results = res.results || [];

						if (!results.length) {
							list.append(htmlEl('div', {class: 'bm-hp-empty', text: texts[1]}));
						}

						for (const r of results) {
							// Déclencheurs : la sévérité sert de détail.
							if (!r.detail && r.severity !== undefined && SEVERITIES[r.severity]) {
								r.detail = SEVERITIES[r.severity].name;
							}

							list.append(htmlEl('div', {
								class: 'bm-hp-item' + (r.id === n[field] ? ' bm-current' : ''),
								title: r.detail || null,
								onmousedown: e => {
									e.preventDefault();
									clearTimeout(timer);

									// opts.draft : n est un brouillon hors de la carte, opts.after fait le reste.
									if (!opts.draft) {
										this.checkpoint();
									}

									n[field] = r.id;
									n[name] = r.name;
									input.value = r.name;
									list.hidden = true;
									input.blur();
									opts.after && opts.after();

									if (!opts.draft) {
										this.render();
										this.refreshStatus();
									}
								}
							}, [r.name, r.detail ? htmlEl('span', {class: 'bm-hp-detail', text: r.detail}) : null]));
						}

						list.hidden = false;
					})
					.catch(err => this.notify(err.message, true));
			};

			input.addEventListener('focus', () => {
				input.select();
				search();
			});
			input.addEventListener('input', () => {
				clearTimeout(timer);
				timer = setTimeout(search, 250);
			});
			input.addEventListener('blur', () => setTimeout(() => {
				list.hidden = true;
				input.value = n[name];
			}, 150));

			return wrap;
		}

		iconPicker(n) {
			const wrap = htmlEl('div', {class: 'bm-icons'});

			for (const [key, icon] of Object.entries(ICONS)) {
				const b = htmlEl('button', {type: 'button', class: 'bm-icon-btn' + (n.icon === key ? ' bm-active' : ''),
					title: icon.name});

				b.append(iconSvg(key, 26));
				b.addEventListener('click', () => {
					this.checkpoint();
					n.icon = key;
					wrap.querySelectorAll('.bm-active').forEach(x => x.classList.remove('bm-active'));
					b.classList.add('bm-active');
					this.render();
				});
				wrap.append(b);
			}

			return wrap;
		}

		panelNode(n) {
			const typeNames = {host: 'Hôte Zabbix', group: 'Groupe d\'hôtes', item: 'Item', trigger: 'Déclencheur',
				shape: 'Forme / zone', text: 'Texte'};
			const s1 = this.section(typeNames[n.type]);

			this.row(s1, 'Type', this.selectField(n, 'type', typeNames, {
				panel: true,
				after: type => {
					for (const [k, v] of Object.entries(NODE_DEFAULTS[type])) {
						if (!(k in n)) {
							n[k] = v;
						}
					}
				}
			}));

			if (n.type === 'host' || isHostChild(n)) {
				this.row(s1, 'Hôte', this.picker(n, 'host', 'hostid', 'hostname', {
					after: () => {
						if (!isHostChild(n)) {
							return;
						}

						// Nouvel hôte : l'item ou le déclencheur précédent n'en fait plus partie.
						const kind = OBJECT_TYPES[n.type];

						n[kind.field] = '';
						n[kind.name] = '';
						this.renderPanel();
						this.focusPicker(n);
					}
				}));
			}

			if (isHostChild(n)) {
				const kind = OBJECT_TYPES[n.type];

				this.row(s1, typeNames[n.type], this.picker(n, n.type, kind.field, kind.name, {
					params: {hostid: n.hostid},
					disabled: !n.hostid
				}));
			}

			if (n.type === 'group') {
				this.row(s1, 'Groupe', this.picker(n, 'group', 'groupid', 'groupname'));
			}

			this.row(s1, 'Libellé', this.textField(n, 'label', {
				multiline: true, focus: true,
				placeholder: {host: 'Nom de l\'hôte par défaut', group: 'Nom du groupe par défaut',
					item: 'Nom de l\'item par défaut', trigger: 'Nom du déclencheur par défaut'}[n.type] || ''
			}));

			if (isDevice(n)) {
				const def = LABEL_POSITIONS[this.doc.settings.labelPos].toLowerCase();

				this.row(s1, 'Emplacement', this.selectField(n, 'labelPos', {'': 'Par défaut (' + def + ')',
					bottom: 'En bas', left: 'À gauche', right: 'À droite', top: 'En haut'}));
			}

			if (isDevice(n)) {
				const s = this.section('Icône');

				s.append(this.iconPicker(n));
			}

			if (hasTextStyle(n)) {
				const st = this.section('Mise en forme du texte');

				this.row(st, 'Police', this.selectField(n, 'font',
					Object.fromEntries(Object.entries(FONTS).map(([k, f]) => [k, f.name]))));
				this.row(st, 'Taille', this.numberField(n, 'fontSize', 6, 96));
				this.row(st, 'Couleur', this.colorField(n, 'color', '#1f2c33'));
				this.row(st, 'Style', htmlEl('span', {class: 'bm-seg'}, [
					this.toggleField(n, 'bold', 'G', 'Gras', 'font-weight: bold'),
					this.toggleField(n, 'italic', 'I', 'Italique', 'font-style: italic'),
					this.toggleField(n, 'underline', 'S', 'Souligné', 'text-decoration: underline')
				]));
				this.row(st, 'Horizontal', this.choiceField(n, 'align', [
					['left', ALIGN_ICONS.left, 'Aligné à gauche'],
					['center', ALIGN_ICONS.center, 'Centré'],
					['right', ALIGN_ICONS.right, 'Aligné à droite']
				]));
				this.row(st, 'Vertical', this.choiceField(n, 'valign', [
					['top', ALIGN_ICONS.top, 'En haut'],
					['middle', ALIGN_ICONS.middle, 'Au milieu'],
					['bottom', ALIGN_ICONS.bottom, 'En bas']
				]));
			}

			const s2 = this.section('Apparence');

			if (n.type !== 'text') {
				this.row(s2, 'Forme', this.selectField(n, 'shape', {round: 'Rectangle arrondi', rect: 'Rectangle',
					ellipse: 'Ellipse'}));
			}

			const size = htmlEl('span', {class: 'bm-inline'}, [
				this.numberField(n, 'w', 12, 4000), htmlEl('span', {text: '×'}), this.numberField(n, 'h', 12, 4000)
			]);

			this.row(s2, 'Taille', size);
			this.row(s2, 'Fond', this.colorField(n, 'fill', n.type === 'shape' ? '#f3f6f9' : '#ffffff'));
			this.row(s2, 'Bordure', this.colorField(n, 'stroke', '#9aa7b4'));

			if (isDevice(n)) {
				this.row(s2, 'Icône', this.colorField(n, 'iconColor', '#40525e'));
			}

			if (!hasTextStyle(n)) {
				this.row(s2, 'Texte', this.colorField(n, 'color', '#1f2c33'));
				this.row(s2, 'Taille texte', this.numberField(n, 'fontSize', 6, 96));
			}

			this.row(s2, 'Lien (URL)', this.textField(n, 'url', {placeholder: 'https://… ou autre carte'}));

			const s3 = this.section('Actions');

			this.buttons(s3, [
				['Premier plan', () => this.reorder(true)],
				['Arrière-plan', () => this.reorder(false)],
				['Dupliquer', () => this.duplicate(), '', 'Ctrl+D'],
				['Supprimer', () => this.deleteSelection(), 'bm-danger', 'Suppr']
			]);
		}

		// Pastille d'état d'un déclencheur de lien (élément portant data-triggerid).
		fillTriggerState(el) {
			const st = this.triggerState(el.dataset.triggerid);

			el.className = 'bm-trig-state bm-trig-' + st.state;
			el.textContent = st.state === 'problem' ? SEVERITIES[st.severity].name : this.triggerStateText(el.dataset.triggerid);
			el.title = this.triggerStateText(el.dataset.triggerid);
			el.style.background = st.state === 'problem' ? SEVERITIES[st.severity].color : '';
		}

		// Déclencheurs qui colorent le lien : liste avec suppression, puis ajout en deux temps (hôte, déclencheur).
		panelLinkTriggers(parent, l) {
			parent.append(htmlEl('div', {class: 'bm-row-label', text: 'Déclencheurs'}));

			const list = htmlEl('div', {class: 'bm-trig-list'});

			if (!l.triggers.length) {
				list.append(htmlEl('div', {class: 'bm-trig-empty', text: 'Aucun déclencheur'}));
			}

			l.triggers.forEach((t, i) => {
				const state = htmlEl('span', {'data-triggerid': t.triggerid});

				const live = this.status.triggers[t.triggerid];

				this.fillTriggerState(state);
				list.append(htmlEl('div', {class: 'bm-trig', title: this.triggerText(t)}, [
					htmlEl('span', {class: 'bm-trig-name'}, [
						htmlEl('span', {class: 'bm-trig-title', text: live ? live.name : t.triggername}),
						htmlEl('span', {class: 'bm-trig-host', text: live ? live.host : t.hostname})
					]),
					state,
					htmlEl('button', {type: 'button', class: 'bm-trig-del', title: 'Retirer ce déclencheur', text: '×',
						onclick: e => {
							e.preventDefault();
							this.checkpoint();
							l.triggers.splice(i, 1);
							this.render();
							this.renderPanel();
						}})
				]));
			});

			parent.append(list);

			// Brouillon de l'ajout en cours, conservé tant que le même lien reste affiché.
			if (!this.trigDraft || this.trigDraft.link !== l.id) {
				this.trigDraft = {link: l.id, hostid: '', hostname: '', triggerid: '', triggername: ''};
			}

			const draft = this.trigDraft;
			const focusTrigger = () => {
				const input = this.panel.querySelector('.bm-picker-trigger input');

				input && input.focus();
			};

			this.row(parent, 'Hôte', this.picker(draft, 'host', 'hostid', 'hostname', {
				draft: true,
				after: () => {
					draft.triggerid = '';
					draft.triggername = '';
					this.renderPanel();
					focusTrigger();
				}
			}));
			this.row(parent, 'Ajouter', this.picker(draft, 'trigger', 'triggerid', 'triggername', {
				draft: true,
				params: {hostid: draft.hostid},
				disabled: !draft.hostid,
				after: () => {
					if (!l.triggers.some(t => t.triggerid === draft.triggerid)) {
						this.checkpoint();
						l.triggers.push({triggerid: draft.triggerid, triggername: draft.triggername, hostname: draft.hostname});
					}

					draft.triggerid = '';
					draft.triggername = '';
					this.render();
					this.renderPanel();
					this.refreshStatus();
				}
			}));
		}

		panelLink(l) {
			const a = this.node(l.from), b = this.node(l.to);
			const s1 = this.section('Lien');

			s1.append(htmlEl('div', {class: 'bm-link-ends', text: this.nodeLabel(a) + '  →  ' + this.nodeLabel(b)}));

			this.row(s1, 'Tracé', this.selectField(l, 'style', {curve: 'Courbe', straight: 'Droit', orthogonal: 'Orthogonal'},
				{panel: true}));

			if (l.style !== 'curve') {
				this.row(s1, 'Coins arrondis', this.checkField(l, 'rounded'));
			}

			this.row(s1, 'Libellé', this.textField(l, 'label', {multiline: true, focus: true, placeholder: 'ex : 10 Gb/s'}));

			const ends = this.section('Extrémités');
			const endRow = (label, key) => {
				const fixed = !!l[key];

				// div plutôt que label : un clic sur l'intitulé ne doit pas déclencher le bouton.
				ends.append(htmlEl('div', {class: 'bm-row'}, [htmlEl('span', {class: 'bm-row-label', text: label}),
					htmlEl('span', {class: 'bm-inline'}, [
					htmlEl('span', {class: 'bm-end-state', text: fixed ? 'point fixe' : 'flottante'}),
					fixed ? htmlEl('button', {type: 'button', class: 'btn-alt bm-mini-btn', text: 'Libérer',
						title: 'L\'extrémité suivra le côté le plus proche du nœud',
						onclick: () => {
							this.checkpoint();
							l[key] = null;
							this.render();
							this.renderPanel();
						}}) : null
				])]));
			};

			endRow('Départ', 'fromPort');
			endRow('Arrivée', 'toPort');
			ends.append(htmlEl('div', {class: 'bm-hint', text: 'Déposez une extrémité sur un point bleu pour la fixer, '
				+ 'ou au milieu du nœud pour qu\'elle reste flottante.'}));

			const s2 = this.section('Apparence');

			this.row(s2, 'Couleur', this.colorField(l, 'color', '#6b7b88'));
			this.row(s2, 'Épaisseur', this.numberField(l, 'width', 0.5, 20, 0.5));
			this.row(s2, 'Trait', this.selectField(l, 'dash', {solid: 'Plein', dashed: 'Tirets', dotted: 'Pointillés'}));
			this.row(s2, 'Flèches', this.selectField(l, 'arrow', {none: 'Aucune', end: 'À l\'arrivée', start: 'Au départ',
				both: 'Aux deux bouts'}));
			this.row(s2, 'Taille texte', this.numberField(l, 'fontSize', 6, 72));

			const s3 = this.section('Statut');

			this.row(s3, 'Déclenchement', this.selectField(l, 'status', {
				both: 'Les deux extrémités', from: 'Le nœud de départ', to: 'Le nœud d\'arrivée',
				triggers: 'Autre(s) déclencheur(s)', none: 'Jamais'
			}, {panel: true, after: () => this.refreshStatus()}));

			if (l.status === 'triggers') {
				this.row(s3, 'Condition', this.selectField(l, 'triggerLogic', {
					or: 'OU : au moins un en problème', and: 'ET : tous en problème'
				}, {panel: true}));
				this.panelLinkTriggers(s3, l);
			}

			s3.append(htmlEl('div', {class: 'bm-hint', text: l.status !== 'triggers'
				? 'Le lien prend la couleur de la sévérité la plus haute des problèmes des nœuds choisis '
					+ '(hôtes, groupes, items ou déclencheurs).'
				: l.triggerLogic === 'and'
					? 'Le lien ne passe en problème que si tous les déclencheurs ci-dessus sont en problème, '
						+ 'avec la couleur de la sévérité la plus haute.'
					: 'Le lien passe en problème dès qu\'un des déclencheurs ci-dessus l\'est, '
						+ 'avec la couleur de la sévérité la plus haute.'}));

			const s4 = this.section('Actions');

			this.buttons(s4, [
				l.points.length ? ['Redresser', () => {
					this.checkpoint();
					l.points = [];
					this.render();
					this.renderPanel();
				}, '', 'Supprimer tous les points de passage'] : null,
				['Inverser', () => {
					this.checkpoint();
					[l.from, l.to] = [l.to, l.from];
					[l.fromPort, l.toPort] = [l.toPort, l.fromPort];
					l.points.reverse();
					l.labelPos = 1 - l.labelPos;
					this.render();
					this.renderPanel();
				}, '', 'Inverser le sens du lien'],
				['Supprimer', () => this.deleteSelection(), 'bm-danger']
			]);
			s4.append(htmlEl('div', {class: 'bm-hint', text: l.style === 'orthogonal'
				? 'Glissez une poignée de segment pour le décaler. « Redresser » relance le tracé automatique. '
					+ 'Le libellé se déplace le long du lien.'
				: 'Glissez le lien pour le courber. Double-clic sur un point pour le retirer. Le libellé se déplace '
					+ 'le long du lien.'}));
		}

		panelMulti(nodes, links) {
			const s = this.section(nodes.length + ' nœud(s), ' + links.length + ' lien(s)');

			if (nodes.length > 1) {
				s.append(htmlEl('div', {class: 'bm-row-label', text: 'Aligner'}));
				this.buttons(s, [
					['⇤', () => this.align('left'), '', 'Aligner à gauche'],
					['↔', () => this.align('hcenter'), '', 'Centrer horizontalement'],
					['⇥', () => this.align('right'), '', 'Aligner à droite'],
					['⤒', () => this.align('top'), '', 'Aligner en haut'],
					['↕', () => this.align('vcenter'), '', 'Centrer verticalement'],
					['⤓', () => this.align('bottom'), '', 'Aligner en bas']
				]);
			}

			if (nodes.length > 2) {
				s.append(htmlEl('div', {class: 'bm-row-label', text: 'Répartir'}));
				this.buttons(s, [
					['Horizontalement', () => this.align('hdist')],
					['Verticalement', () => this.align('vdist')]
				]);
			}

			if (links.length) {
				const s2 = this.section('Liens sélectionnés');
				const proxy = {style: links[0].style, color: links[0].color, width: links[0].width};
				const applyAll = key => {
					links.forEach(l => l[key] = proxy[key]);
				};

				this.row(s2, 'Tracé', this.selectField(proxy, 'style', {curve: 'Courbe', straight: 'Droit',
					orthogonal: 'Orthogonal'}, {after: () => applyAll('style')}));

				const width = this.numberField(proxy, 'width', 0.5, 20, 0.5);

				width.addEventListener('input', () => {
					applyAll('width');
					this.render();
				});
				this.row(s2, 'Épaisseur', width);
			}

			const s3 = this.section('Actions');

			this.buttons(s3, [
				nodes.length ? ['Premier plan', () => this.reorder(true)] : null,
				nodes.length ? ['Arrière-plan', () => this.reorder(false)] : null,
				nodes.length ? ['Dupliquer', () => this.duplicate()] : null,
				['Supprimer', () => this.deleteSelection(), 'bm-danger']
			]);
		}

		panelMap() {
			const st = this.doc.settings;
			const s1 = this.section('Carte');
			const name = htmlEl('input', {type: 'text', value: this.name, maxlength: 255});

			name.addEventListener('input', () => {
				if (name.value.trim()) {
					this.name = name.value.trim();
					this.markDirty();
					this.buildToolbar();
				}
			});
			this.row(s1, 'Nom', name);
			this.row(s1, 'Fond', this.colorField(st, 'background', '#ffffff'));
			this.row(s1, 'Liens par défaut', this.selectField(st, 'linkStyle', {curve: 'Courbe', straight: 'Droit',
				orthogonal: 'Orthogonal'}));
			this.row(s1, 'Libellés des hôtes', this.selectField(st, 'labelPos', LABEL_POSITIONS));
			this.row(s1, 'Rafraîchir (s)', this.bind(htmlEl('input', {type: 'number', value: st.refresh, min: 10, max: 3600,
				class: 'bm-num'}), 'change', el => {
				st.refresh = clamp(parseInt(el.value, 10) || 30, 10, 3600);
				this.startTimer();
			}));

			const s2 = this.section('Grille');

			this.row(s2, 'Afficher', this.checkField(st, 'grid'));
			this.row(s2, 'Magnétisme', this.checkField(st, 'snap'));
			this.row(s2, 'Pas', this.numberField(st, 'gridSize', 2, 200));

			const s3 = this.section('Sauvegarde');
			const file = htmlEl('input', {type: 'file', accept: '.json,application/json', hidden: true});

			file.addEventListener('change', () => {
				const f = file.files[0];

				if (!f) {
					return;
				}

				f.text().then(text => {
					const doc = normalizeDoc(JSON.parse(text));

					this.checkpoint();
					this.doc = doc;
					this.clearSelection();
					this.fit();
					this.renderPanel();
					this.refreshStatus();
					this.notify('Carte importée (pensez à enregistrer)');
				}).catch(() => this.notify('Fichier JSON invalide', true));
			});
			s3.append(file);
			this.buttons(s3, [
				['Exporter JSON', () => {
					const blob = new Blob([JSON.stringify(this.doc, null, 2)], {type: 'application/json'});
					const a = htmlEl('a', {href: URL.createObjectURL(blob),
						download: this.name.replace(/[^\w\-]+/g, '_') + '.json'});

					document.body.append(a);
					a.click();
					a.remove();
					setTimeout(() => URL.revokeObjectURL(a.href), 1000);
				}],
				['Importer JSON', () => file.click()]
			]);

			const s4 = this.section('Aide');

			s4.append(htmlEl('ul', {class: 'bm-help'}, [
				'Survolez un nœud et tirez depuis un de ses points bleus : sur un point bleu d\'un autre nœud, le lien y est '
					+ 'fixé ; au milieu du nœud, il reste flottant ; dans le vide, un nouveau nœud est créé.',
				'Glissez un lien pour le courber ; chaque point ajouté peut être déplacé, double-clic pour le retirer.',
				'Liens orthogonaux : tracé automatique, glissez les poignées de segment pour le modifier.',
				'Glissez dans le vide pour sélectionner plusieurs éléments (Maj pour ajouter).',
				'Molette : zoom · Espace + glisser ou clic droit : déplacer la vue.',
				'Ctrl+Z / Ctrl+Y · Ctrl+C / Ctrl+V · Ctrl+D · Suppr · flèches · Ctrl+S'
			].map(t => htmlEl('li', {text: t}))));
		}
	}

	/* ------------------------------------------------------------------ page liste */

	function initList(cfg) {
		const params = extra => Object.assign({[cfg.csrfName]: cfg.csrf}, extra);
		const error = msg => alert(msg);
		const create = () => {
			const input = document.getElementById('bm-new-name');
			const name = input.value.trim();

			if (!name) {
				input.focus();

				return;
			}

			post('bettermap.create', params({name}))
				.then(res => {
					if (res.error) {
						throw new Error(res.error);
					}

					location.href = 'zabbix.php?action=bettermap.view&edit=1&mapid=' + encodeURIComponent(res.mapid);
				})
				.catch(err => error(err.message));
		};

		const btn = document.getElementById('bm-create');

		if (btn) {
			btn.addEventListener('click', create);
			document.getElementById('bm-new-name').addEventListener('keydown', e => {
				if (e.key === 'Enter') {
					e.preventDefault();
					create();
				}
			});
		}

		document.addEventListener('click', e => {
			const del = e.target.closest('.js-bm-delete');

			if (!del) {
				return;
			}

			if (!confirm('Supprimer la carte « ' + del.dataset.name + ' » ?')) {
				return;
			}

			post('bettermap.delete', params({mapid: del.dataset.mapid}))
				.then(res => {
					if (res.error) {
						throw new Error(res.error);
					}

					location.reload();
				})
				.catch(err => error(err.message));
		});
	}

	window.BetterMaps = {
		initMap: (root, cfg) => root.bmEditor = new MapEditor(root, cfg),
		initList,
		normalizeDoc
	};
})();
