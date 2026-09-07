import { getProperty, hasProperty, setProperty } from "./utilities/properties";

/**
 * Value that flows from data into a rendered DOM node.
 *
 * Text content, attributes, and input values are all scalar: strings,
 * numbers, and booleans. `null` and `undefined` clear a binding. Objects and
 * functions are not meaningful rendered values, so the resolver contract
 * excludes them.
 */
export type RenderValue = string | number | boolean | null | undefined;

/**
 * The recursive dictionary shape that temples renders against.
 *
 * Every key is a string. Every value is a scalar, a parameterless function
 * that returns a scalar, or another dictionary of the same shape. Declared as
 * an interface so the recursive reference resolves without a circular-alias
 * error.
 */
export interface TemplesData {
	[key: string]: TemplesDataValue;
}

/**
 * A value held in a temples data dictionary.
 *
 * A value is a scalar (`RenderValue`), a parameterless function returning a
 * scalar, a nested dictionary, or an array of values. The function is called
 * with its owner dictionary as `this`, so methods can reference sibling
 * properties. Arrays feed `data-iterate`.
 */
export type TemplesDataValue =
	| RenderValue
	| ((this: TemplesData) => RenderValue)
	| TemplesData
	| TemplesDataValue[];

/**
 * Give the renderer one stable root element to bind against and re-render.
 *
 * A string starting with `#` names an element already in the page: the element
 * with that id is bound in place, so a re-render writes into the live DOM. An
 * unknown id throws, because a renderer bound to nothing is always a mistake.
 *
 * An HTML string is a fragment, not an element: it can contain several
 * sibling elements or only text, so it has no single element identity. The
 * challenge is to collapse any fragment to one element. Parsing inside a
 * throwaway container does that: the first element child becomes the root,
 * and the container is discarded. A bare container is returned only when the
 * fragment yields no element at all. A DOM element source is already a root
 * and is returned unchanged.
 *
 * @param source - DOM element, element id (`"#id"`), or HTML string.
 * @returns A single element usable as the template root.
 */
const getSourceElement = (source: Element | string): Element => {
	if (typeof source === "string") {
		if (source.startsWith("#")) {
			const element = document.getElementById(source.slice(1));

			if (element === null) {
				throw new Error(`No element with id ${source}`);
			}

			return element;
		}

		const container = document.createElement("div");
		container.innerHTML = source.trim();

		if (container.children.length > 1) {
			throw new Error("Template string must have a single root element");
		}

		return container.firstElementChild ?? container;
	}

	return source;
};

type ParsedBinding =
	| { kind: "text"; path: string }
	| { kind: "html"; path: string }
	| { kind: "value"; path: string }
	| { kind: "attr"; attr: string; path: string }
	| { kind: "class"; range: string[]; path: string };

/**
 * A form control whose value is set through the `value` property.
 */
interface ValueControl extends HTMLElement {
	value: string;
}

/**
 * Detect the form controls that expose a writable `value` property.
 *
 * INPUT and TEXTAREA support property assignment in the browser and in
 * linkedom. SELECT is excluded because linkedom exposes a readonly `value`.
 *
 * @param el - The candidate element.
 * @returns True when the element is an INPUT or TEXTAREA.
 */
const isValueControl = (el: Element): el is ValueControl => {
	const tag = el.tagName;

	return tag === "INPUT" || tag === "TEXTAREA";
};

/**
 * Detect the form controls whose shorthand binding targets the value.
 *
 * @param el - The candidate element.
 * @returns True when the element is an INPUT, TEXTAREA, or SELECT.
 */
const isFormControl = (el: Element): boolean => {
	const tag = el.tagName;

	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/**
 * Set the `value` on a form control, or the `value` attribute otherwise.
 *
 * SELECT is handled separately: linkedom exposes a readonly `value`, so the
 * selected option is set through each option's `selected` property instead.
 *
 * @param el - The target element.
 * @param value - The string value to set.
 */
const setValue = (el: Element, value: string): void => {
	if (el.tagName === "SELECT") {
		for (const option of Array.from(el.querySelectorAll("option"))) {
			const optionValue = option.getAttribute("value") ?? option.textContent ?? "";
			(option as HTMLOptionElement).selected = optionValue === value;
		}

		return;
	}

	if (isValueControl(el)) {
		el.value = value;
	} else {
		el.setAttribute("value", value);
	}
};

/**
 * Attribute names that are presence-based boolean attributes.
 *
 * For these, `setAttribute(name, "false")` would still enable the attribute,
 * so the binding toggles the attribute by the value's truthiness instead.
 */
const BOOLEAN_ATTRIBUTES = new Set([
	"checked",
	"disabled",
	"hidden",
	"readonly",
	"required",
	"multiple",
	"selected",
	"autofocus",
	"autoplay",
	"controls",
	"loop",
	"muted",
	"open",
	"novalidate",
	"inert",
	"async",
	"defer",
	"reversed"
]);

/**
 * Apply a `class[range]=path` toggle to an element.
 *
 * Every class name in the range is removed, then the evaluated value is
 * re-added when it belongs to the range. All other class names stay intact.
 *
 * @param el - The target element.
 * @param range - The class names the binding toggles.
 * @param active - The evaluated value.
 */
const applyClass = (el: Element, range: string[], active: string): void => {
	const classes = new Set(Array.from(el.classList));

	for (const name of range) classes.delete(name);
	if (range.includes(active)) classes.add(active);

	el.setAttribute("class", Array.from(classes).join(" "));
};

/**
 * Extract the toggled class range from a `class[a|b|c]` expression.
 *
 * @param attrPart - The attribute part of the binding expression.
 * @returns The range of class names, or null when the form is not `class[...]`.
 */
const parseClassRange = (attrPart: string): string[] | null => {
	const open = attrPart.indexOf("[");
	const close = attrPart.indexOf("]", open);

	if (open === -1 || close === -1) return null;

	if (attrPart.slice(0, open).trim().toLowerCase() !== "class") return null;

	return attrPart
		.slice(open + 1, close)
		.split("|")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
};

/**
 * Parse one `data-bind` expression into a typed binding.
 *
 * Supported forms: `text=path`, `html=path`, `value=path`, `<attr>=path`,
 * `class[a|b|c]=path`, and the shorthand `path`. The shorthand targets the
 * value on form controls and the text otherwise.
 *
 * @param expr - A single expression, without commas.
 * @param el - The bound element, used to resolve the shorthand target.
 * @returns Parsed binding, or null when the kind is not supported.
 */
const parseExpression = (expr: string, el: Element): ParsedBinding | null => {
	const eq = expr.indexOf("=");

	if (eq === -1) {
		const path = expr.trim();

		return { kind: isFormControl(el) ? "value" : "text", path };
	}

	const attrPart = expr.slice(0, eq).trim();
	const path = expr.slice(eq + 1).trim();
	const name = attrPart.toLowerCase();

	if (name === "text") return { kind: "text", path };
	if (name === "html") return { kind: "html", path };
	if (name === "value") return { kind: "value", path };

	const range = parseClassRange(attrPart);
	if (range !== null) return { kind: "class", range, path };

	if (/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(name)) {
		return { kind: "attr", attr: name, path };
	}

	return null;
};

/**
 * Parse a comma-separated `data-bind` attribute into a list of bindings.
 *
 * @param expr - The full `data-bind` attribute value.
 * @param el - The bound element.
 * @returns The list of parsed bindings. Unsupported expressions are skipped.
 */
const parseBindings = (expr: string, el: Element): ParsedBinding[] => {
	const bindings: ParsedBinding[] = [];

	for (const part of expr.split(",")) {
		const parsed = parseExpression(part, el);

		if (parsed !== null) bindings.push(parsed);
	}

	return bindings;
};

type Binding = { path: string; apply: (data: TemplesData) => void; restore?: () => void };

/**
 * Build the closure that applies one binding to its element during render.
 *
 * The binding captures its element at collection time: every render call
 * writes straight into that element, so no lookup runs at render time.
 *
 * @param el - The bound element, captured for every future render.
 * @param parsed - The parsed binding.
 * @returns A binding that applies one `data-bind` expression during render.
 */
const buildBinding = (el: Element, parsed: ParsedBinding): Binding => ({
	path: parsed.path,
	apply: (data: TemplesData) => {
		const raw = getProperty(data, parsed.path, "");

		const value =
			typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
				? String(raw)
				: "";

		switch (parsed.kind) {
			case "text":
				el.textContent = value;
				break;
			case "html":
				el.innerHTML = value;
				break;
			case "value":
				setValue(el, value);
				break;
			case "attr":
				if (BOOLEAN_ATTRIBUTES.has(parsed.attr)) {
					el.toggleAttribute(parsed.attr, Boolean(raw));
				} else {
					el.setAttribute(parsed.attr, value);
				}
				break;
			case "class":
				applyClass(el, parsed.range, value);
				break;
		}
	}
});

/**
 * Evaluate a conditional path against the data.
 *
 * The path may hold a boolean, another scalar, or a function returning one
 * (called with its owner object as `this`). A path that resolves to nothing
 * counts as false.
 *
 * @param data - The data dictionary of the current render.
 * @param path - The path to resolve the condition from.
 * @returns The truthiness of the resolved value.
 */
const evalCondition = (data: TemplesData, path: string): boolean =>
	Boolean(getProperty(data, path, null));

/**
 * Strip a trailing plural `s` from a collection name for auto-naming.
 *
 * The `s` is kept when the word ends in `ss`, `us`, or `is`, which are not
 * plural markers (`address`, `status`, `analysis`). All other trailing `s`
 * characters are removed (`tags` → `tag`, `quotes` → `quote`).
 *
 * @param word - The collection name.
 * @returns The singularized name.
 */
const singularize = (word: string): string => {
	if (word.length > 1 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) {
		return word.slice(0, -1);
	}

	return word;
};

/**
 * Parse a `data-iterate` expression into a variable name and a collection path.
 *
 * Supported forms: `path` (the variable name is derived from the collection
 * path), `name: path`, and `name from path`. The `from` keyword is recognized
 * only as a standalone word, so a path segment named `from`
 * (`messages.from.user`) is left intact. Auto-naming keeps the last path
 * segment and strips only a plural `s`.
 *
 * @param loopExpr - The `data-iterate` or `data-each` attribute value.
 * @returns The variable name and the collection path.
 */
const parseLoop = (loopExpr: string): { varName: string; collectionPath: string } => {
	const trimmed = loopExpr.trim();

	const colon = trimmed.indexOf(":");

	if (colon !== -1) {
		const varName = trimmed.slice(0, colon).trim();
		const collectionPath = trimmed.slice(colon + 1).trim();

		if (varName.length > 0 && collectionPath.length > 0) {
			return { varName, collectionPath };
		}
	}

	const fromMatch = /^(\S+)\s+from\s+(\S+)$/.exec(trimmed);

	if (fromMatch !== null) {
		return { varName: fromMatch[1] ?? "", collectionPath: fromMatch[2] ?? "" };
	}

	const collectionPath = trimmed;
	const last = collectionPath.split(".").pop() ?? "";

	return { varName: singularize(last), collectionPath };
};

/**
 * Extract the reconciliation key for a collection item.
 *
 * The key comes from the `data-key` path when provided, otherwise from the
 * item's `id` property. A missing key returns `null`, which disables keyed
 * reconciliation and falls back to re-stamping.
 *
 * @param item - The collection item.
 * @param keyPath - The `data-key` path relative to the item, or null.
 * @returns The string key, or null when the item has no usable key.
 */
const getItemKey = (item: unknown, keyPath: string | null): string | null => {
	if (keyPath !== null) {
		const value = getProperty<unknown>(item as object, keyPath, null);

		if (value === null || value === undefined) return null;

		return String(value);
	}

	if (item !== null && typeof item === "object" && "id" in (item as object)) {
		const id = (item as Record<string, unknown>).id;

		if (id !== null && id !== undefined) return String(id);
	}

	return null;
};

/**
 * One stamped row of a loop: its element and the bindings that drive it.
 *
 * The bindings are collected on the row element at stamping time and capture
 * that row's actual nodes. The row owns them for its whole lifetime, so a
 * re-render re-applies them without any lookup.
 */
interface LoopRow {
	node: Element;
	bindings: Binding[];
	conditionals: Binding[];
}

/**
 * Collect the bindings of one loop row.
 *
 * The row element carries the control attributes at this point (the loop
 * template stays pristine as the clone source), so the collection strips
 * them and captures the row's real elements. Nested loops inside the row are
 * collected at this level too, each with its own detached sub-template.
 *
 * @param node - The freshly cloned row element.
 * @returns The row, ready to be reconciled.
 */
const collectRow = (node: Element): LoopRow => {
	const bindings = collectBindings(node);

	return { node, bindings, conditionals: bindings.filter((binding) => binding.restore) };
};

/**
 * Apply one row's bindings against an item context.
 *
 * The conditional bindings restore their elements first, so a removed
 * conditional comes back before the values are re-applied.
 *
 * @param row - The row to update.
 * @param context - The data dictionary, with the loop variable injected.
 */
const applyRow = (row: LoopRow, context: TemplesData): void => {
	for (const conditional of row.conditionals) conditional.restore?.();

	for (const binding of row.bindings) binding.apply(context);
};

/**
 * Build the binding that stamps one sub-template clone per collection item.
 *
 * The first child of the iterate element is the sub-template. It is detached
 * at construction and kept as the pristine clone source. New items clone it
 * and collect a fresh set of bindings that capture the clone's own nodes;
 * items reconciled by key (`data-key` or item `id`) keep their row and have
 * the row's bindings re-applied, so input focus and scroll survive. Rows
 * whose key disappears are dropped together with their bindings. Without
 * keys, the list re-stamps on every render.
 *
 * @param el - The iterate container element.
 * @param template - The detached sub-template element.
 * @param loopExpr - The `data-iterate` or `data-each` attribute value.
 * @param keyPath - The `data-key` path, or null when not declared.
 * @returns A binding that reconciles the items on every render.
 */
const buildIterate = (
	el: Element,
	template: Element,
	loopExpr: string,
	keyPath: string | null
): Binding => {
	const { varName, collectionPath } = parseLoop(loopExpr);
	let rendered = new Map<string, LoopRow>();

	return {
		path: collectionPath,
		apply: (data: TemplesData) => {
			const value = getProperty<unknown>(data, collectionPath, null);
			const collection = Array.isArray(value) ? (value as TemplesDataValue[]) : [];

			const keyed = collection.map((item) => ({ key: getItemKey(item, keyPath), item }));
			const keyable = keyed.every(({ key }) => key !== null);

			const fragment = document.createDocumentFragment();

			if (keyable) {
				const next = new Map<string, LoopRow>();

				for (const { key, item } of keyed) {
					const k = key as string;
					const context = { ...data, [varName]: item };
					let row = rendered.get(k);

					if (row === undefined) {
						row = collectRow(template.cloneNode(true) as Element);
					}

					applyRow(row, context);

					next.set(k, row);
					fragment.appendChild(row.node);
				}

				rendered = next;
			} else {
				for (const item of collection) {
					const row = collectRow(template.cloneNode(true) as Element);

					applyRow(row, { ...data, [varName]: item });

					fragment.appendChild(row.node);
				}

				rendered = new Map();
			}

			el.replaceChildren(fragment);
		}
	};
};

/**
 * Prefix of the comment placeholders swapped in for removed conditionals.
 *
 * The prefix identifies engine-owned comments, so `stripPlaceholders` removes
 * them without touching the template's own comments.
 */
const PLACEHOLDER_PREFIX = "temples says:";

/**
 * Remove the engine's conditional placeholders from a subtree.
 *
 * A removed conditional leaves a comment placeholder in the live tree to hold
 * its slot. These comments carry the engine prefix, so the walk deletes only
 * them and leaves every authored comment in place.
 *
 * @param root - The subtree to clean.
 */
export const stripPlaceholders = (root: Element): void => {
	const walk = (node: Node): void => {
		for (const child of Array.from(node.childNodes)) {
			if (child.nodeType === 8 && (child as Comment).data.startsWith(PLACEHOLDER_PREFIX)) {
				child.remove();
			} else {
				walk(child);
			}
		}
	};

	walk(root);
};

/**
 * Serialize an element without the engine's runtime artifacts.
 *
 * The subtree is cloned first: the live tree keeps its placeholders so later
 * renders can restore their elements, while the returned markup carries none.
 *
 * @param root - The element to serialize.
 * @returns The serialized HTML of the cleaned clone.
 */
const serializeClean = (root: Element): string => {
	const clone = root.cloneNode(true) as Element;

	stripPlaceholders(clone);

	return clone.outerHTML;
};

/**
 * Build the binding that renders or removes an element by condition.
 *
 * A truthy condition keeps the element in the DOM; a falsy condition swaps
 * it for a comment placeholder that holds its slot. The element reference
 * stays in the closure, so a later truthy render re-inserts it at its exact
 * former position. The placeholder names the condition, which keeps the live
 * tree readable; serialization strips these comments again.
 *
 * @param el - The conditioned element.
 * @param condition - The path to resolve the condition from.
 * @returns A binding that toggles the element's presence.
 */
const buildRenderIf = (el: Element, condition: string): Binding => {
	let placeholder: Comment | null = null;

	return {
		path: condition,
		apply: (data: TemplesData) => {
			if (evalCondition(data, condition)) {
				if (placeholder !== null) {
					placeholder.replaceWith(el);
					placeholder = null;
				}
			} else if (placeholder === null) {
				placeholder = document.createComment(`${PLACEHOLDER_PREFIX} ${condition}=false`);
				el.replaceWith(placeholder);
			}
		},
		restore: () => {
			if (placeholder !== null) {
				placeholder.replaceWith(el);
				placeholder = null;
			}
		}
	};
};

/**
 * Toggle the inline `display` of an element.
 *
 * Showing clears the display declaration (restoring the element's natural
 * visibility, even when authored `display:none`); hiding sets
 * `display:none`. An emptied style attribute is removed, so the markup does
 * not keep an empty `style` attribute around.
 *
 * @param el - The target element.
 * @param show - True to show the element, false to hide it.
 */
const toggleDisplay = (el: Element, show: boolean): void => {
	const style = (el as HTMLElement).style;

	if (show) {
		style.removeProperty("display");

		if (style.length === 0) el.removeAttribute("style");
	} else {
		style.display = "none";
	}
};

/**
 * Build the binding that shows or hides an element by condition.
 *
 * A truthy condition restores the element's natural visibility; a falsy
 * condition hides it with `display:none`. The element always stays in the
 * DOM: this is a visibility toggle, not a structural change. The polarity
 * matches `data-render-if` — a truthy condition shows.
 *
 * @param el - The conditioned element.
 * @param condition - The path to resolve the condition from.
 * @returns A binding that toggles the element's display.
 */
const buildShowIf = (el: Element, condition: string): Binding => ({
	path: condition,
	apply: (data: TemplesData) => {
		toggleDisplay(el, evalCondition(data, condition));
	}
});

/**
 * Build the binding that hides or shows an element by condition.
 *
 * The inverse of `data-show-if`: a truthy condition hides the element with
 * `display:none`, a falsy condition shows it. Useful when the data names the
 * hiding state itself (`data-hide-if="article.hidden"`).
 *
 * @param el - The conditioned element.
 * @param condition - The path to resolve the condition from.
 * @returns A binding that toggles the element's display.
 */
const buildHideIf = (el: Element, condition: string): Binding => ({
	path: condition,
	apply: (data: TemplesData) => {
		toggleDisplay(el, !evalCondition(data, condition));
	}
});

/**
 * Collect every binding within a root element.
 *
 * Each binding captures its element at collection time: a `data-bind` applies
 * values, `data-render-if`, `data-show-if`, and `data-hide-if` evaluate a
 * condition, and a `data-iterate` stamps sub-template clones. Control
 * attributes are removed so the rendered output stays clean. The root itself
 * is included when it carries a control attribute, except for
 * `data-render-if`: the root is the mount point, so a conditional there
 * cannot be expressed and throws.
 *
 * The walk does not descend into a loop container: the loop sub-template is
 * detached and kept pristine, and each stamped row is collected on its own
 * when it enters the DOM.
 *
 * @param root - The template root element.
 * @returns Array of bindings, applied in document order.
 */
const collectBindings = (root: Element): Binding[] => {
	const bindings: Binding[] = [];

	const collect = (el: Element): void => {
		const loopExpr = el.getAttribute("data-iterate") || el.getAttribute("data-each");

		if (loopExpr) {
			const bindExpr = el.getAttribute("data-bind");

			if (bindExpr) {
				const parsed = parseBindings(bindExpr, el);

				if (parsed.length > 0) {
					el.removeAttribute("data-bind");

					for (const binding of parsed) bindings.push(buildBinding(el, binding));
				}
			}

			const template = el.firstElementChild;

			if (template === null) {
				throw new Error(
					`${el.tagName} data-iterate must have a child element to use as sub-template`
				);
			}

			el.removeChild(template);

			const keyPath = el.getAttribute("data-key");

			if (keyPath !== null) el.removeAttribute("data-key");

			el.removeAttribute("data-iterate");
			el.removeAttribute("data-each");

			bindings.push(buildIterate(el, template, loopExpr, keyPath));
		}

		const renderIf = el.getAttribute("data-render-if");

		if (renderIf !== null) {
			el.removeAttribute("data-render-if");

			if (el === root) {
				throw new Error(
					"data-render-if cannot sit on the template root: the root is the mount point"
				);
			}

			bindings.push(buildRenderIf(el, renderIf));
		}

		const showIf = el.getAttribute("data-show-if");

		if (showIf !== null) {
			el.removeAttribute("data-show-if");

			bindings.push(buildShowIf(el, showIf));
		}

		const hideIf = el.getAttribute("data-hide-if");

		if (hideIf !== null) {
			el.removeAttribute("data-hide-if");

			bindings.push(buildHideIf(el, hideIf));
		}

		const bindExpr = el.getAttribute("data-bind");

		if (bindExpr) {
			const parsed = parseBindings(bindExpr, el);

			if (parsed.length > 0) {
				el.removeAttribute("data-bind");

				for (const binding of parsed) bindings.push(buildBinding(el, binding));
			}
		}

		for (let i = 0; i < el.children.length; i++) {
			const child = el.children[i];

			if (child !== undefined) collect(child);
		}
	};

	collect(root);

	return bindings;
};

/**
 * Standalone, DOM-based renderer for a single template.
 *
 * The source is a DOM element, an element id (`"#id"`) to bind in place, or
 * an HTML string. The source resolves once into a DOM element and every
 * binding is collected; each binding captures its own element, so a render
 * never looks elements up. Each render call first restores the elements a
 * conditional removed, then applies only the bindings whose paths resolve in
 * the provided data.
 */
export class Renderer {
	readonly rootElt: Element;
	private readonly bindings: Binding[];
	private readonly conditionals: Binding[];

	constructor(source: Element | string) {
		this.rootElt = getSourceElement(source);
		this.bindings = collectBindings(this.rootElt);
		this.conditionals = this.bindings.filter((binding) => binding.restore);
	}

	/**
	 * Render the bindings whose paths are present in the provided data.
	 *
	 * Conditional elements removed by an earlier render come back first, so
	 * the values of the current render apply to a complete tree. A path
	 * absent from the data keeps its current state: a partial dictionary
	 * re-renders only the paths it carries.
	 *
	 * @param data - Data dictionary; the paths it carries are rendered.
	 * @returns The rendered root element.
	 */
	render(data: TemplesData): Element {
		for (const conditional of this.conditionals) {
			if (hasProperty(data, conditional.path)) conditional.restore?.();
		}

		for (const binding of this.bindings) {
			if (hasProperty(data, binding.path)) binding.apply(data);
		}

		return this.rootElt;
	}

	/**
	 * Update a single path and re-render only the bindings bound to it.
	 *
	 * The path is written into a fresh nested dictionary, e.g. `"article.title"`
	 * yields `{ article: { title: value } }`, and only the operations bound to
	 * that exact path are applied. All other bindings keep their current state.
	 *
	 * @param path - Dotted path to the property, e.g. `"article.title"`.
	 * @param value - The value to assign to the property.
	 * @returns The rendered root element.
	 */
	update(path: string, value: TemplesDataValue): Element {
		const data: TemplesData = {};

		setProperty(data, path, value);

		for (const conditional of this.conditionals) {
			if (conditional.path === path) conditional.restore?.();
		}

		for (const binding of this.bindings) {
			if (binding.path === path) binding.apply(data);
		}

		return this.rootElt;
	}

	/**
	 * Serialize the rendered root to an HTML string.
	 *
	 * The root element is the template root, so its outer HTML carries every
	 * rendered binding. Control attributes were removed at construction and
	 * conditional placeholders are stripped from a clone, so the markup stays
	 * clean while the live tree keeps its state.
	 *
	 * @returns The serialized HTML of the root element.
	 */
	toHtml(): string {
		return serializeClean(this.rootElt);
	}

	/**
	 * Serialize the rendered root to an HTML string.
	 *
	 * Synonym for `toHtml()`.
	 *
	 * @returns The serialized HTML of the root element.
	 */
	renderToString(): string {
		return this.toHtml();
	}
}
