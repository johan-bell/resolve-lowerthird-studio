import { t as __commonJSMin } from "./rolldown-runtime-DC62tzP2.js";
//#region ../../packages/shared/dist/types/resolve-status.js
var require_resolve_status = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/types/ws-events.js
var require_ws_events = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/types/api.js
var require_api = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/dto/lower-third-style.dto.js
var require_lower_third_style_dto = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/dto/queue-item.dto.js
var require_queue_item_dto = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/dto/push-title.dto.js
var require_push_title_dto = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/constants/defaults.js
var require_defaults = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isHexColor = exports.HEX_COLOR_PATTERN = exports.DEFAULT_STYLE = void 0;
	exports.DEFAULT_STYLE = {
		layout: "solid-bar",
		fontFamily: "Helvetica Neue",
		fontSize: 48,
		subtitleFontSize: 30,
		foregroundHex: "#FFFFFF",
		backgroundHex: "#0F1115",
		accentHex: "#E8483F",
		padding: {
			x: 32,
			y: 16,
			minWidth: 240,
			maxWidth: 1280
		}
	};
	exports.HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
	var isHexColor = (value) => exports.HEX_COLOR_PATTERN.test(value);
	exports.isHexColor = isHexColor;
}));
//#endregion
//#region ../../packages/shared/dist/layout/auto-scale.js
var require_auto_scale = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.approximateMeasure = exports.AVG_GLYPH_RATIO = exports.STACK_GAP = exports.LINE_HEIGHT_RATIO = void 0;
	exports.layoutLowerThird = layoutLowerThird;
	/** Line height as a multiple of font size. */
	exports.LINE_HEIGHT_RATIO = 1.25;
	/** Vertical gap between the name block and the subtitle block. */
	exports.STACK_GAP = 6;
	/** Average glyph width as a fraction of font size, for the fallback measurer. */
	exports.AVG_GLYPH_RATIO = .52;
	/**
	* Crude fallback used only where no text engine is available (tests, SSR).
	* Real surfaces should pass their own measurer — see MeasureFn.
	*/
	var approximateMeasure = (text, fontSize) => text.length * fontSize * exports.AVG_GLYPH_RATIO;
	exports.approximateMeasure = approximateMeasure;
	/** Greedy word wrap. A single word longer than the limit is allowed to overflow. */
	function wrapText(text, maxWidth, measure) {
		const trimmed = text.trim();
		if (trimmed.length === 0) return [];
		if (maxWidth <= 0) return [trimmed];
		const lines = [];
		let current = "";
		for (const word of trimmed.split(/\s+/)) {
			const candidate = current.length === 0 ? word : `${current} ${word}`;
			if (current.length === 0 || measure(candidate) <= maxWidth) current = candidate;
			else {
				lines.push(current);
				current = word;
			}
		}
		if (current.length > 0) lines.push(current);
		return lines;
	}
	/**
	* Lay out a lower-third: how wide the background box is, how tall, and exactly
	* which lines of text go inside it.
	*
	* Height is derived from the wrapped line counts rather than assumed, so the
	* box can never be too short for its own contents — the failure mode that
	* silently swallows a subtitle.
	*/
	function layoutLowerThird(name, subtitle, style, measure = exports.approximateMeasure) {
		const { padding } = style;
		const maxContentWidth = Math.max(0, padding.maxWidth - padding.x * 2);
		const measureName = (text) => measure(text, style.fontSize, 600);
		const measureSubtitle = (text) => measure(text, style.subtitleFontSize, 400);
		const nameLines = wrapText(name, maxContentWidth, measureName);
		const subtitleLines = wrapText(subtitle, maxContentWidth, measureSubtitle);
		const widest = Math.max(0, ...nameLines.map(measureName), ...subtitleLines.map(measureSubtitle));
		const width = Math.round(Math.min(padding.maxWidth, Math.max(padding.minWidth, widest + padding.x * 2)));
		const nameHeight = nameLines.length * style.fontSize * exports.LINE_HEIGHT_RATIO;
		const subtitleHeight = subtitleLines.length > 0 ? subtitleLines.length * style.subtitleFontSize * exports.LINE_HEIGHT_RATIO + exports.STACK_GAP : 0;
		return {
			width,
			height: Math.round(nameHeight + subtitleHeight + padding.y * 2),
			nameLines,
			subtitleLines,
			wrapped: nameLines.length > 1 || subtitleLines.length > 1
		};
	}
}));
//#endregion
//#region ../../packages/shared/dist/layout/plan.js
var require_plan = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.LAYOUT_VARIANTS = void 0;
	exports.buildPlan = buildPlan;
	exports.drawPlan = drawPlan;
	var auto_scale_1 = require_auto_scale();
	exports.LAYOUT_VARIANTS = [
		{
			id: "solid-bar",
			label: "Solid bar",
			note: "One filled box, name over role"
		},
		{
			id: "accent-stripe",
			label: "Accent stripe",
			note: "Colour rule leads a translucent panel"
		},
		{
			id: "two-tone",
			label: "Two-tone",
			note: "Role gets its own accent band"
		},
		{
			id: "minimal",
			label: "Minimal",
			note: "No panel — shadow carries legibility"
		},
		{
			id: "underline",
			label: "Underline",
			note: "Soft slab, accent rule under the name"
		},
		{
			id: "offset-block",
			label: "Offset block",
			note: "Solid plate with an outlined role card"
		}
	];
	/** Greedy word wrap against a real measurer. */
	function wrap(text, maxWidth, measure) {
		const trimmed = text.trim();
		if (trimmed.length === 0) return [];
		if (maxWidth <= 0) return [trimmed];
		const lines = [];
		let current = "";
		for (const word of trimmed.split(/\s+/)) {
			const candidate = current.length === 0 ? word : `${current} ${word}`;
			if (current.length === 0 || measure(candidate) <= maxWidth) current = candidate;
			else {
				lines.push(current);
				current = word;
			}
		}
		if (current.length > 0) lines.push(current);
		return lines;
	}
	/**
	* Build the drawing plan for a lower-third.
	*
	* This is the single definition of every layout. The browser preview and the
	* offline renderer both consume the plan, so a look can never drift between
	* what you see and what you export.
	*/
	function buildPlan(name, subtitle, style, measure = auto_scale_1.approximateMeasure) {
		const { padding, fontSize, subtitleFontSize } = style;
		const accent = style.accentHex || "#E8483F";
		const mName = (t) => measure(t, fontSize, 600);
		const mSub = (t) => measure(t, subtitleFontSize, 400);
		const mSubCaps = (t) => measure(t.toUpperCase(), subtitleFontSize, 500);
		const maxContent = Math.max(0, padding.maxWidth - padding.x * 2);
		const nameLines = wrap(name, maxContent, mName);
		const subLines = wrap(subtitle, maxContent, mSub);
		const wrapped = nameLines.length > 1 || subLines.length > 1;
		const nameBlockH = nameLines.length * fontSize * auto_scale_1.LINE_HEIGHT_RATIO;
		const subBlockH = subLines.length * subtitleFontSize * auto_scale_1.LINE_HEIGHT_RATIO;
		const widestName = Math.max(0, ...nameLines.map(mName));
		const widestSub = Math.max(0, ...subLines.map(mSub));
		const clampWidth = (raw) => Math.round(Math.min(padding.maxWidth, Math.max(padding.minWidth, raw)));
		const ops = [];
		const pushLines = (lines, x, startY, size, weight, alpha, shadow = false) => {
			let y = startY;
			for (const line of lines) {
				ops.push({
					kind: "text",
					layer: "text",
					x,
					y,
					text: line,
					fontSize: size,
					weight,
					fill: style.foregroundHex,
					alpha,
					shadow
				});
				y += size * auto_scale_1.LINE_HEIGHT_RATIO;
			}
			return y;
		};
		switch (style.layout) {
			case "accent-stripe": {
				const stripe = Math.max(4, Math.round(fontSize * .12));
				const width = clampWidth(Math.max(widestName, widestSub) + padding.x * 2 + stripe);
				const height = Math.round(nameBlockH + (subLines.length ? subBlockH + auto_scale_1.STACK_GAP : 0) + padding.y * 2);
				ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: 0,
					w: width,
					h: height,
					fill: style.backgroundHex,
					alpha: .82
				});
				ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: 0,
					w: stripe,
					h: height,
					fill: accent
				});
				const textX = stripe + padding.x;
				const afterName = pushLines(nameLines, textX, padding.y, fontSize, 600, 1);
				if (subLines.length) pushLines(subLines, textX, afterName + auto_scale_1.STACK_GAP, subtitleFontSize, 400, .72);
				return {
					width,
					height,
					ops,
					wrapped
				};
			}
			case "two-tone": {
				const nameH = Math.round(nameBlockH + padding.y * 2);
				const bandH = subLines.length ? Math.round(subLines.length * subtitleFontSize * auto_scale_1.LINE_HEIGHT_RATIO + padding.y * 1.2) : 0;
				const nameW = clampWidth(widestName + padding.x * 2);
				const bandW = subLines.length ? clampWidth(Math.max(0, ...subLines.map(mSubCaps)) + padding.x * 2) : 0;
				const width = Math.max(nameW, bandW);
				const height = nameH + bandH;
				ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: 0,
					w: nameW,
					h: nameH,
					fill: style.backgroundHex
				});
				if (bandH > 0) ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: nameH,
					w: bandW,
					h: bandH,
					fill: accent
				});
				pushLines(nameLines, padding.x, padding.y, fontSize, 600, 1);
				if (subLines.length) {
					let y = nameH + (bandH - subLines.length * subtitleFontSize * auto_scale_1.LINE_HEIGHT_RATIO) / 2;
					for (const line of subLines) {
						ops.push({
							kind: "text",
							layer: "text",
							x: padding.x,
							y,
							text: line.toUpperCase(),
							fontSize: subtitleFontSize,
							weight: 500,
							fill: style.foregroundHex,
							alpha: 1
						});
						y += subtitleFontSize * auto_scale_1.LINE_HEIGHT_RATIO;
					}
				}
				return {
					width,
					height,
					ops,
					wrapped
				};
			}
			case "minimal": {
				const width = clampWidth(Math.max(widestName, widestSub));
				const height = Math.round(nameBlockH + (subLines.length ? subBlockH + auto_scale_1.STACK_GAP : 0));
				const afterName = pushLines(nameLines, 0, 0, fontSize, 700, 1, true);
				if (subLines.length) pushLines(subLines, 0, afterName + auto_scale_1.STACK_GAP, subtitleFontSize, 400, .85, true);
				return {
					width,
					height,
					ops,
					wrapped
				};
			}
			case "underline": {
				const rule = Math.max(2, Math.round(fontSize * .06));
				const gap = Math.round(fontSize * .18);
				const width = clampWidth(Math.max(widestName, widestSub) + padding.x * 2);
				const height = Math.round(nameBlockH + rule + gap * 2 + (subLines.length ? subBlockH : 0) + padding.y * 2);
				ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: 0,
					w: width,
					h: height,
					fill: "#000000",
					alpha: .55,
					radius: 4
				});
				const afterName = pushLines(nameLines, padding.x, padding.y, fontSize, 600, 1);
				ops.push({
					kind: "rect",
					layer: "panel",
					x: padding.x,
					y: Math.round(afterName + gap * .5),
					w: Math.round(widestName * .45),
					h: rule,
					fill: accent
				});
				if (subLines.length) pushLines(subLines, padding.x, afterName + gap * .5 + rule + gap, subtitleFontSize, 400, .8);
				return {
					width,
					height,
					ops,
					wrapped
				};
			}
			case "offset-block": {
				const indent = Math.round(padding.x * .9);
				const nameH = Math.round(nameBlockH + padding.y * 1.6);
				const cardH = subLines.length ? Math.round(subBlockH + padding.y) : 0;
				const nameW = clampWidth(widestName + padding.x * 2);
				const cardW = subLines.length ? clampWidth(widestSub + padding.x * 2) : 0;
				const width = Math.max(nameW, indent + cardW);
				const height = nameH + (cardH > 0 ? cardH + 6 : 0);
				ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: 0,
					w: nameW,
					h: nameH,
					fill: style.backgroundHex
				});
				if (cardH > 0) ops.push({
					kind: "rect",
					layer: "panel",
					x: indent,
					y: nameH + 6,
					w: cardW,
					h: cardH,
					fill: style.backgroundHex,
					alpha: .6,
					stroke: style.foregroundHex,
					strokeAlpha: .35
				});
				pushLines(nameLines, padding.x, padding.y * .8, fontSize, 600, 1);
				if (subLines.length) pushLines(subLines, indent + padding.x, nameH + 6 + padding.y * .5, subtitleFontSize, 400, .85);
				return {
					width,
					height,
					ops,
					wrapped
				};
			}
			default: {
				const width = clampWidth(Math.max(widestName, widestSub) + padding.x * 2);
				const height = Math.round(nameBlockH + (subLines.length ? subBlockH + auto_scale_1.STACK_GAP : 0) + padding.y * 2);
				ops.push({
					kind: "rect",
					layer: "panel",
					x: 0,
					y: 0,
					w: width,
					h: height,
					fill: style.backgroundHex
				});
				const afterName = pushLines(nameLines, padding.x, padding.y, fontSize, 600, 1);
				if (subLines.length) pushLines(subLines, padding.x, afterName + auto_scale_1.STACK_GAP, subtitleFontSize, 400, .72);
				return {
					width,
					height,
					ops,
					wrapped
				};
			}
		}
	}
	var roundRectPath = (ctx, x, y, w, h, r) => {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	};
	/**
	* Draw a plan at a given animation state.
	*
	* Used unchanged by the preview and the renderer — the wipe is a clip on the
	* panel, and the text additionally fades and rises within it.
	*/
	function drawPlan(ctx, plan, state, options) {
		if (state.barProgress <= 0) return;
		const { originX, originY, scale, fontFamily } = options;
		const px = (v) => v * scale;
		ctx.save();
		ctx.beginPath();
		ctx.rect(originX, originY, px(plan.width) * state.barProgress, px(plan.height));
		ctx.clip();
		for (const op of plan.ops) {
			if (op.kind === "rect") {
				ctx.globalAlpha = op.alpha ?? 1;
				ctx.fillStyle = op.fill;
				if (op.radius) {
					roundRectPath(ctx, originX + px(op.x), originY + px(op.y), px(op.w), px(op.h), px(op.radius));
					ctx.fill();
				} else ctx.fillRect(originX + px(op.x), originY + px(op.y), px(op.w), px(op.h));
				if (op.stroke) {
					ctx.globalAlpha = op.strokeAlpha ?? 1;
					ctx.strokeStyle = op.stroke;
					ctx.lineWidth = Math.max(1, scale * 1.5);
					ctx.strokeRect(originX + px(op.x), originY + px(op.y), px(op.w), px(op.h));
				}
				ctx.globalAlpha = 1;
				continue;
			}
			if (state.textOpacity <= 0) continue;
			ctx.save();
			if (op.shadow) {
				ctx.shadowColor = "rgba(0,0,0,0.85)";
				ctx.shadowBlur = px(18);
				ctx.shadowOffsetY = px(2);
			}
			ctx.globalAlpha = (op.alpha ?? 1) * state.textOpacity;
			ctx.fillStyle = op.fill;
			ctx.textBaseline = "top";
			ctx.font = `${String(op.weight)} ${String(px(op.fontSize))}px "${fontFamily}", sans-serif`;
			ctx.fillText(op.text, originX + px(op.x), originY + px(op.y) + px(state.textOffsetY));
			ctx.restore();
		}
		ctx.restore();
	}
}));
//#endregion
//#region ../../packages/shared/dist/layout/animation.js
var require_animation = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.totalFrames = exports.totalSeconds = exports.easeInCubic = exports.easeOutCubic = exports.DEFAULT_TIMING = void 0;
	exports.frameStateAt = frameStateAt;
	exports.DEFAULT_TIMING = {
		fps: 25,
		inSeconds: .6,
		holdSeconds: 3,
		outSeconds: .5
	};
	/** Standard ease-out cubic — fast start, gentle settle. */
	var easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
	exports.easeOutCubic = easeOutCubic;
	/** Ease-in cubic, used on the way out so the exit accelerates. */
	var easeInCubic = (t) => t * t * t;
	exports.easeInCubic = easeInCubic;
	var clamp01 = (value) => Math.min(1, Math.max(0, value));
	var totalSeconds = (timing) => timing.inSeconds + timing.holdSeconds + timing.outSeconds;
	exports.totalSeconds = totalSeconds;
	var totalFrames = (timing) => Math.max(1, Math.round((0, exports.totalSeconds)(timing) * timing.fps));
	exports.totalFrames = totalFrames;
	/**
	* Animation state at a given time.
	*
	* The text trails the bar deliberately: the bar leads, and the text fades and
	* rises into the space it opens. That lag is what makes the classic broadcast
	* wipe read as one movement rather than two things happening at once.
	*/
	function frameStateAt(timeSeconds, timing) {
		const { inSeconds, holdSeconds, outSeconds } = timing;
		if (timeSeconds < inSeconds) {
			const t = clamp01(inSeconds === 0 ? 1 : timeSeconds / inSeconds);
			const bar = (0, exports.easeOutCubic)(t);
			const textT = clamp01((t - .35) / .65);
			return {
				barProgress: bar,
				textOpacity: (0, exports.easeOutCubic)(textT),
				textOffsetY: (1 - (0, exports.easeOutCubic)(textT)) * 12
			};
		}
		if (timeSeconds < inSeconds + holdSeconds) return {
			barProgress: 1,
			textOpacity: 1,
			textOffsetY: 0
		};
		const t = clamp01(outSeconds === 0 ? 1 : (timeSeconds - inSeconds - holdSeconds) / outSeconds);
		const textT = clamp01(t / .5);
		return {
			barProgress: 1 - (0, exports.easeInCubic)(t),
			textOpacity: 1 - textT,
			textOffsetY: 0
		};
	}
}));
//#endregion
//#region ../../packages/shared/dist/dto/render.dto.js
var require_render_dto = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
}));
//#endregion
//#region ../../packages/shared/dist/index.js
var require_dist = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __exportStar = exports && exports.__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	__exportStar(require_resolve_status(), exports);
	__exportStar(require_ws_events(), exports);
	__exportStar(require_api(), exports);
	__exportStar(require_lower_third_style_dto(), exports);
	__exportStar(require_queue_item_dto(), exports);
	__exportStar(require_push_title_dto(), exports);
	__exportStar(require_defaults(), exports);
	__exportStar(require_auto_scale(), exports);
	__exportStar(require_plan(), exports);
	__exportStar(require_animation(), exports);
	__exportStar(require_render_dto(), exports);
}));
//#endregion
export default require_dist();
