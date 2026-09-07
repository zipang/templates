import { describe, expect, test } from "bun:test";
import { Renderer } from "./engine";

describe("Renderer", () => {
	test("accepts an HTML string as the template source", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'></h1>");

		renderer.render({ title: "Hello" });

		expect(renderer.rootElt.textContent).toBe("Hello");
	});

	test("accepts a DOM element as the template source", () => {
		const el = document.createElement("p");
		el.setAttribute("data-bind", "text=greeting");
		el.textContent = "placeholder";

		const renderer = new Renderer(el);

		renderer.render({ greeting: "Hello" });

		expect(renderer.rootElt.textContent).toBe("Hello");
	});

	test("accepts an element id (#id) as the template source", () => {
		const el = document.createElement("p");
		el.id = "greeting-tpl";
		el.setAttribute("data-bind", "text=greeting");
		el.textContent = "placeholder";
		document.body.appendChild(el);

		const renderer = new Renderer("#greeting-tpl");

		renderer.render({ greeting: "Hello" });

		expect(renderer.rootElt).toBe(el);
		expect(renderer.rootElt.textContent).toBe("Hello");
	});

	test("an element id source collects bindings from the live element", () => {
		const el = document.createElement("div");
		el.id = "user-tpl";
		el.innerHTML = "<span data-bind='user.name'>placeholder</span>";
		document.body.appendChild(el);

		const renderer = new Renderer("#user-tpl");

		renderer.render({ user: { name: "Jane" } });

		expect(el.querySelector("span")?.textContent).toBe("Jane");
	});

	test("throws a clear error for an unknown element id", () => {
		expect(() => new Renderer("#no-such-element")).toThrow("No element with id");
	});

	test("text= binding sets text content and escapes HTML markup", () => {
		const renderer = new Renderer("<p data-bind='text=markup'></p>");

		renderer.render({ markup: "<b>bold</b>" });

		expect(renderer.rootElt.textContent).toBe("<b>bold</b>");
		expect(renderer.rootElt.querySelector("b")).toBeNull();
	});

	test("html= binding sets inner HTML and parses markup", () => {
		const renderer = new Renderer("<p data-bind='html=markup'></p>");

		renderer.render({ markup: "<b>bold</b>" });

		expect(renderer.rootElt.innerHTML).toBe("<b>bold</b>");
		expect(renderer.rootElt.querySelector("b")?.textContent).toBe("bold");
	});

	test("shorthand binding (no =) defaults to text semantics", () => {
		const renderer = new Renderer("<p data-bind='markup'></p>");

		renderer.render({ markup: "<b>bold</b>" });

		expect(renderer.rootElt.textContent).toBe("<b>bold</b>");
		expect(renderer.rootElt.querySelector("b")).toBeNull();
	});

	test("resolves a dotted path during render", () => {
		const renderer = new Renderer("<h1 data-bind='text=author.name'></h1>");

		renderer.render({ author: { name: "Vince" } });

		expect(renderer.rootElt.textContent).toBe("Vince");
	});

	test("calls a function value during render with its owner as this", () => {
		const renderer = new Renderer("<h1 data-bind='text=author.fullName'></h1>");
		const data = {
			author: {
				firstName: "Vince",
				lastName: "Voe",
				fullName() {
					return `${this.firstName} ${this.lastName}`;
				}
			}
		};

		renderer.render(data);

		expect(renderer.rootElt.textContent).toBe("Vince Voe");
	});

	test("a missing path is left untouched when the data does not carry it", () => {
		const renderer = new Renderer("<h1 data-bind='text=missing'>initial</h1>");

		renderer.render({});

		expect(renderer.rootElt.textContent).toBe("initial");
	});

	test("a path is cleared when the data carries an explicit empty value", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>initial</h1>");

		renderer.render({ title: "Hello" });
		renderer.render({ title: "" });

		expect(renderer.rootElt.textContent).toBe("");
	});

	test("binds the root element itself when it carries data-bind", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>old</h1>");

		renderer.render({ title: "new" });

		expect(renderer.rootElt.textContent).toBe("new");
	});

	test("binds multiple nested elements in one render", () => {
		const renderer = new Renderer(
			"<section><h1 data-bind='text=title'></h1><p data-bind='text=body'></p></section>"
		);

		renderer.render({ title: "T", body: "B" });

		expect(renderer.rootElt.querySelector("h1")?.textContent).toBe("T");
		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("B");
	});

	test("removes the data-bind attribute after construction", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'></h1>");

		expect(renderer.rootElt.hasAttribute("data-bind")).toBe(false);
	});

	test("render returns the root element", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'></h1>");

		expect(renderer.render({ title: "x" })).toBe(renderer.rootElt);
	});

	test("render is re-runnable with different data", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'></h1>");

		renderer.render({ title: "first" });
		expect(renderer.rootElt.textContent).toBe("first");

		renderer.render({ title: "second" });
		expect(renderer.rootElt.textContent).toBe("second");
	});

	test("HTML string and DOM element sources render identically", () => {
		const html =
			"<article><h1 data-bind='text=title'></h1><p data-bind='html=content'></p></article>";
		const data = { title: "Hello", content: "<b>World</b>" };

		const fromString = new Renderer(html);

		const host = document.createElement("div");
		host.innerHTML = html;
		const fromElement = new Renderer(host.firstElementChild ?? host);

		fromString.render(data);
		fromElement.render(data);

		expect(fromString.rootElt.innerHTML).toBe(fromElement.rootElt.innerHTML);
		expect(fromString.rootElt.textContent).toBe(fromElement.rootElt.textContent);
		expect(fromString.rootElt.querySelector("b")?.textContent).toBe("World");
	});
});

describe("Renderer data-bind typed bindings", () => {
	test("binds multiple attributes from a comma-separated data-bind", () => {
		const renderer = new Renderer("<img data-bind='src=user.avatar, title=user.fullname' />");

		renderer.render({ user: { avatar: "http://avatar.com/john", fullname: "John DOE" } });

		expect(renderer.rootElt.getAttribute("src")).toBe("http://avatar.com/john");
		expect(renderer.rootElt.getAttribute("title")).toBe("John DOE");
	});

	test("value= binding sets the input value", () => {
		const renderer = new Renderer("<input data-bind='value=user.name' />");

		renderer.render({ user: { name: "Jane" } });

		expect((renderer.rootElt as HTMLInputElement).value).toBe("Jane");
	});

	test("supports text and attribute bindings on one element", () => {
		const renderer = new Renderer("<a data-bind='text=link.label, href=link.url'>placeholder</a>");

		renderer.render({ link: { label: "Read more", url: "https://example.com" } });

		expect(renderer.rootElt.textContent).toBe("Read more");
		expect(renderer.rootElt.getAttribute("href")).toBe("https://example.com");
	});

	test("class[range]=path toggles one class value and preserves the others", () => {
		const renderer = new Renderer(
			"<div class='row container' data-bind='class[article|quote|tweet]=article.type'></div>"
		);

		renderer.render({ article: { type: "quote" } });

		expect(renderer.rootElt.classList.contains("quote")).toBe(true);
		expect(renderer.rootElt.classList.contains("article")).toBe(false);
		expect(renderer.rootElt.classList.contains("tweet")).toBe(false);
		expect(renderer.rootElt.classList.contains("row")).toBe(true);
		expect(renderer.rootElt.classList.contains("container")).toBe(true);
	});

	test("class toggle reacts to a second data set", () => {
		const renderer = new Renderer(
			"<div class='row' data-bind='class[article|quote|tweet]=article.type'></div>"
		);

		renderer.render({ article: { type: "tweet" } });
		expect(renderer.rootElt.classList.contains("tweet")).toBe(true);

		renderer.render({ article: { type: "article" } });
		expect(renderer.rootElt.classList.contains("article")).toBe(true);
		expect(renderer.rootElt.classList.contains("tweet")).toBe(false);
	});

	test("class toggle removes the range classes when the value is out of range", () => {
		const renderer = new Renderer(
			"<div class='row active' data-bind='class[article|quote|tweet]=article.type'></div>"
		);

		renderer.render({ article: { type: "featured" } });

		expect(renderer.rootElt.classList.contains("article")).toBe(false);
		expect(renderer.rootElt.classList.contains("quote")).toBe(false);
		expect(renderer.rootElt.classList.contains("tweet")).toBe(false);
		expect(renderer.rootElt.classList.contains("row")).toBe(true);
		expect(renderer.rootElt.classList.contains("active")).toBe(true);
	});

	test("shorthand binding on an input defaults to value", () => {
		const renderer = new Renderer("<input data-bind='user.name' />");

		renderer.render({ user: { name: "Jane" } });

		expect((renderer.rootElt as HTMLInputElement).value).toBe("Jane");
	});

	test("shorthand binding on a textarea defaults to value", () => {
		const renderer = new Renderer("<textarea data-bind='user.bio'></textarea>");

		renderer.render({ user: { bio: "A short bio" } });

		expect((renderer.rootElt as HTMLTextAreaElement).value).toBe("A short bio");
	});
});

describe("Renderer data-iterate", () => {
	test("clones the first child once per item with the explicit variable", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["One", "Two", "Three"] } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(3);
		expect(items[0]?.textContent).toBe("One");
		expect(items[1]?.textContent).toBe("Two");
		expect(items[2]?.textContent).toBe("Three");
	});

	test("auto-names the variable from the collection path by dropping the final s", () => {
		const renderer = new Renderer(
			"<ul data-iterate='article.tags'><li><a data-bind='tag.label, href=tag.url'>tag</a></li></ul>"
		);

		renderer.render({
			article: {
				tags: [
					{ label: "temples", url: "/temples" },
					{ label: "Binding", url: "/binding" }
				]
			}
		});

		const links = renderer.rootElt.querySelectorAll("a");

		expect(links.length).toBe(2);
		expect(links[0]?.textContent).toBe("temples");
		expect(links[0]?.getAttribute("href")).toBe("/temples");
		expect(links[1]?.textContent).toBe("Binding");
	});

	test("binds item properties inside the sub-template", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote.author'></li></ul>"
		);

		renderer.render({ article: { quotes: [{ author: "A" }, { author: "B" }] } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items[0]?.textContent).toBe("A");
		expect(items[1]?.textContent).toBe("B");
	});

	test("renders no items for an empty collection", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: [] } });

		expect(renderer.rootElt.querySelectorAll("li").length).toBe(0);
	});

	test("re-renders when the collection changes", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["A", "B", "C"] } });
		expect(renderer.rootElt.querySelectorAll("li").length).toBe(3);

		renderer.render({ article: { quotes: ["X"] } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(1);
		expect(items[0]?.textContent).toBe("X");
	});

	test("keeps the container's own data-bind", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes' data-bind='class=article.kind'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { kind: "recent", quotes: ["A"] } });

		expect(renderer.rootElt.classList.contains("recent")).toBe(true);
		expect(renderer.rootElt.querySelectorAll("li").length).toBe(1);
	});

	test("removes the data-iterate attribute and detaches the sub-template after construction", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		expect(renderer.rootElt.hasAttribute("data-iterate")).toBe(false);
		expect(renderer.rootElt.querySelector("li")).toBeNull();
	});

	test("supports the from keyword instead of the colon", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote from article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["One", "Two"] } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(2);
		expect(items[0]?.textContent).toBe("One");
		expect(items[1]?.textContent).toBe("Two");
	});

	test("data-each is a synonym for data-iterate", () => {
		const renderer = new Renderer(
			"<ul data-each='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["Only"] } });

		expect(renderer.rootElt.querySelectorAll("li").length).toBe(1);
		expect(renderer.rootElt.querySelector("li")?.textContent).toBe("Only");
	});

	test("combines data-each with the from keyword", () => {
		const renderer = new Renderer(
			"<ul data-each='quote from article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["A", "B"] } });

		expect(renderer.rootElt.querySelectorAll("li").length).toBe(2);
	});
});

describe("Renderer data-render-if", () => {
	test("renders the element when the condition is truthy", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'>star</div></section>"
		);

		renderer.render({ article: { featured: true } });

		expect(renderer.rootElt.querySelector("div")?.textContent).toBe("star");
	});

	test("removes the element from the DOM when the condition is falsy", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'>star</div></section>"
		);

		renderer.render({ article: { featured: false } });

		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("re-inserts the element when the condition turns truthy again", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'>star</div></section>"
		);

		renderer.render({ article: { featured: false } });
		renderer.render({ article: { featured: true } });

		expect(renderer.rootElt.querySelector("div")?.textContent).toBe("star");

		renderer.render({ article: { featured: false } });

		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("marks the slot with a comment placeholder in the live tree", () => {
		const renderer = new Renderer("<section><div data-render-if='show'>x</div></section>");

		renderer.render({ show: false });

		expect(renderer.rootElt.innerHTML).toContain("temples says: show=false");
	});

	test("strips the placeholder from serialized output", () => {
		const renderer = new Renderer("<section><div data-render-if='show'>x</div></section>");

		renderer.render({ show: false });

		expect(renderer.toHtml()).toBe("<section></section>");
	});

	test("keeps sibling bindings working across a removal and a partial re-render", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='featured'>x</div><p data-bind='text=message'></p></section>"
		);

		renderer.render({ featured: false, message: "first" });
		renderer.render({ message: "second" });

		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("second");
		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("keeps the element removed when the data does not mention the condition", () => {
		const renderer = new Renderer("<section><div data-render-if='show'>x</div></section>");

		renderer.render({ show: false });
		renderer.render({ other: "x" });

		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("renders child bindings when the element is present", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'><h1 data-bind='text=article.title'></h1></div></section>"
		);

		renderer.render({ article: { featured: true, title: "Hello" } });

		expect(renderer.rootElt.querySelector("h1")?.textContent).toBe("Hello");
	});

	test("skips child bindings while the element is removed and resumes on return", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'><h1 data-bind='text=article.title'></h1></div></section>"
		);

		renderer.render({ article: { featured: false, title: "Hello" } });
		renderer.render({ article: { featured: true, title: "Hello again" } });

		expect(renderer.rootElt.querySelector("h1")?.textContent).toBe("Hello again");
	});

	test("restores nested conditionals independently", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='outer'><p data-render-if='inner'>x</p></div></section>"
		);

		renderer.render({ outer: false, inner: false });

		expect(renderer.rootElt.querySelector("p")).toBeNull();

		renderer.render({ inner: true });

		expect(renderer.rootElt.querySelector("p")).toBeNull();

		renderer.render({ outer: true, inner: true });

		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("x");
	});

	test("calls a function condition with its owner object as this", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.popular'>popular</div></section>"
		);

		renderer.render({
			article: {
				comments: ["a", "b", "c"],
				popular() {
					return (this.comments as string[]).length > 2;
				}
			}
		});

		expect(renderer.rootElt.querySelector("div")).not.toBeNull();

		renderer.render({ article: { comments: [], popular: () => false } });

		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("throws when the conditional sits on the template root", () => {
		expect(() => new Renderer("<div data-render-if='show'>x</div>")).toThrow();
	});

	test("removes the conditional attributes after construction", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='show' data-hide-if='muted' data-bind='text=label'>x</div></section>"
		);

		const div = renderer.rootElt.querySelector("div");

		expect(div?.hasAttribute("data-render-if")).toBe(false);
		expect(div?.hasAttribute("data-hide-if")).toBe(false);
	});
});

describe("Renderer data-show-if", () => {
	test("hides the element with display:none while keeping it in the DOM", () => {
		const renderer = new Renderer("<section><div data-show-if='visible'>star</div></section>");

		renderer.render({ visible: false });

		const div = renderer.rootElt.querySelector("div") as HTMLElement;

		expect(div.style.display).toBe("none");
		expect(renderer.rootElt.querySelector("div")).not.toBeNull();
	});

	test("shows the element when the condition is truthy", () => {
		const renderer = new Renderer("<section><div data-show-if='visible'>star</div></section>");

		renderer.render({ visible: true });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");
	});

	test("flips visibility on re-render", () => {
		const renderer = new Renderer("<section><div data-show-if='visible'>x</div></section>");

		renderer.render({ visible: false });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");

		renderer.render({ visible: true });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");

		renderer.render({ visible: false });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");
	});

	test("keeps the hidden element bound across sibling updates", () => {
		const renderer = new Renderer(
			"<section><div data-show-if='visible'>x</div><p data-bind='text=message'></p></section>"
		);

		renderer.render({ visible: false, message: "first" });
		renderer.render({ message: "second" });

		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("second");
		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");
	});

	test("calls a function condition with its owner object as this", () => {
		const renderer = new Renderer("<section><div data-show-if='article.popular'>x</div></section>");

		renderer.render({
			article: {
				comments: ["a", "b", "c"],
				popular() {
					return (this.comments as string[]).length > 2;
				}
			}
		});

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");

		renderer.render({ article: { comments: [], popular: () => false } });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");
	});

	test("shows an element authored display:none when the condition is truthy", () => {
		const renderer = new Renderer(
			"<section><div data-show-if='visible' style='display:none'>x</div></section>"
		);

		renderer.render({ visible: true });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");
	});
});

describe("Renderer data-hide-if", () => {
	test("hides the element with display:none while keeping it in the DOM", () => {
		const renderer = new Renderer(
			"<section><div data-hide-if='article.hidden'>star</div></section>"
		);

		renderer.render({ article: { hidden: true } });

		const div = renderer.rootElt.querySelector("div") as HTMLElement;

		expect(div.style.display).toBe("none");
		expect(renderer.rootElt.querySelector("div")).not.toBeNull();
	});

	test("shows the element when the condition is falsy", () => {
		const renderer = new Renderer(
			"<section><div data-hide-if='article.hidden'>star</div></section>"
		);

		renderer.render({ article: { hidden: false } });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");
	});

	test("flips visibility on re-render", () => {
		const renderer = new Renderer("<section><div data-hide-if='hidden'>x</div></section>");

		renderer.render({ hidden: true });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");

		renderer.render({ hidden: false });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");

		renderer.render({ hidden: true });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");
	});

	test("keeps the hidden element bound across sibling updates", () => {
		const renderer = new Renderer(
			"<section><div data-hide-if='muted'>x</div><p data-bind='text=message'></p></section>"
		);

		renderer.render({ muted: true, message: "first" });
		renderer.render({ message: "second" });

		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("second");
		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");
	});

	test("calls a function condition with its owner object as this", () => {
		const renderer = new Renderer("<section><div data-hide-if='article.muted'>x</div></section>");

		renderer.render({
			article: {
				comments: [],
				muted() {
					return (this.comments as string[]).length === 0;
				}
			}
		});

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("none");

		renderer.render({ article: { comments: ["a"], muted: () => false } });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");
	});

	test("shows an element authored display:none when the condition is falsy", () => {
		const renderer = new Renderer(
			"<section><div data-hide-if='hidden' style='display:none'>x</div></section>"
		);

		renderer.render({ hidden: false });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");
	});
});

describe("Renderer conditionals in loops", () => {
	test("evaluates a conditional inside the loop template per item", () => {
		const renderer = new Renderer(
			"<ul data-iterate='item: cart.items'><li><span data-render-if='item.ok' data-bind='text=item.label'></span></li></ul>"
		);

		renderer.render({
			cart: {
				items: [
					{ ok: true, label: "A" },
					{ ok: false, label: "B" }
				]
			}
		});

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(2);
		expect(items[0]?.querySelector("span")?.textContent).toBe("A");
		expect(items[1]?.querySelector("span")).toBeNull();
	});

	test("re-evaluates row conditionals when the collection changes", () => {
		const renderer = new Renderer(
			"<ul data-iterate='item: cart.items'><li><span data-render-if='item.ok' data-bind='text=item.label'></span></li></ul>"
		);

		renderer.render({ cart: { items: [{ ok: false, label: "A" }] } });

		expect(renderer.rootElt.querySelector("span")).toBeNull();

		renderer.render({ cart: { items: [{ ok: true, label: "A" }] } });

		expect(renderer.rootElt.querySelector("span")?.textContent).toBe("A");
	});

	test("hides the whole list through a conditional on the loop container", () => {
		const renderer = new Renderer(
			"<section><ul data-iterate='item: cart.items' data-render-if='cart.visible'><li data-bind='item'></li></ul></section>"
		);

		renderer.render({ cart: { visible: false, items: ["A"] } });

		expect(renderer.rootElt.querySelector("ul")).toBeNull();

		renderer.render({ cart: { visible: true, items: ["A", "B"] } });

		expect(renderer.rootElt.querySelectorAll("li").length).toBe(2);
	});
});

describe("Renderer partial render", () => {
	test("renders only the paths present in a partial data dictionary", () => {
		const renderer = new Renderer(
			"<article><h1 data-bind='text=article.title'></h1><p data-bind='text=article.body'></p></article>"
		);

		renderer.render({ article: { title: "Old", body: "Body" } });
		renderer.render({ article: { title: "New" } });

		expect(renderer.rootElt.querySelector("h1")?.textContent).toBe("New");
		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("Body");
	});

	test("keeps every binding when the data carries no matching path", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>initial</h1>");

		renderer.render({ title: "Hello" });
		renderer.render({ other: "x" });

		expect(renderer.rootElt.textContent).toBe("Hello");
	});

	test("re-stamps an iterate when its collection path is in the data", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["A", "B"] } });
		renderer.render({ article: { quotes: ["X", "Y", "Z"] } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(3);
		expect(items[0]?.textContent).toBe("X");
	});

	test("keeps an iterate list when its collection path is absent from the data", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["A", "B"] } });
		renderer.render({ other: "x" });

		expect(renderer.rootElt.querySelectorAll("li").length).toBe(2);
	});

	test("re-evaluates a render-if when its condition path is in the data", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'>x</div></section>"
		);

		renderer.render({ article: { featured: true } });
		renderer.render({ article: { featured: false } });

		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("does not interpret a flat dotted key as a nested path", () => {
		const renderer = new Renderer("<h1 data-bind='text=article.title'></h1>");

		renderer.render({ article: { title: "Hello World!" }, "article.title": "Nope" });

		expect(renderer.rootElt.textContent).toBe("Hello World!");
	});
});

describe("Renderer update", () => {
	test("updates only the binding for the exact path", () => {
		const renderer = new Renderer(
			"<article><h1 data-bind='text=article.title'></h1><p data-bind='text=article.body'></p></article>"
		);

		renderer.render({ article: { title: "Old", body: "Body" } });
		renderer.update("article.title", "New");

		expect(renderer.rootElt.querySelector("h1")?.textContent).toBe("New");
		expect(renderer.rootElt.querySelector("p")?.textContent).toBe("Body");
	});

	test("re-stamps an iterate when its collection path is updated", () => {
		const renderer = new Renderer(
			"<ul data-iterate='quote: article.quotes'><li data-bind='quote'></li></ul>"
		);

		renderer.render({ article: { quotes: ["A", "B"] } });
		renderer.update("article.quotes", ["X", "Y", "Z"]);

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(3);
		expect(items[0]?.textContent).toBe("X");
	});

	test("re-evaluates a render-if when its condition path is updated", () => {
		const renderer = new Renderer(
			"<section><div data-render-if='article.featured'>x</div></section>"
		);

		renderer.render({ article: { featured: true } });
		renderer.update("article.featured", false);

		expect(renderer.rootElt.querySelector("div")).toBeNull();
	});

	test("update returns the root element", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'></h1>");

		expect(renderer.update("title", "x")).toBe(renderer.rootElt);
	});
});

describe("Renderer serialization", () => {
	test("toHtml() returns the serialized HTML of the rendered root", () => {
		const renderer = new Renderer(
			"<article><h1 data-bind='text=article.title'></h1><p data-bind='text=article.body'>body</p></article>"
		);

		renderer.render({ article: { title: "Hello", body: "World" } });

		expect(renderer.toHtml()).toBe("<article><h1>Hello</h1><p>World</p></article>");
	});

	test("renderToString() is a synonym for toHtml()", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>old</h1>");

		renderer.render({ title: "New" });

		expect(renderer.renderToString()).toBe(renderer.toHtml());
	});

	test("toHtml() reflects the control attributes removed at construction", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>old</h1>");

		renderer.render({ title: "New" });

		expect(renderer.toHtml()).toBe("<h1>New</h1>");
	});
});

describe("Renderer engine correctness fixes (T7)", () => {
	test("reuses a row's DOM node when its key is unchanged", () => {
		const renderer = new Renderer(
			"<ul data-iterate='todo: todos' data-key='id'><li data-bind='todo.text'></li></ul>"
		);

		renderer.render({
			todos: [
				{ id: 1, text: "A" },
				{ id: 2, text: "B" }
			]
		});

		const firstRow = renderer.rootElt.querySelector("li");

		renderer.render({
			todos: [
				{ id: 1, text: "A edited" },
				{ id: 2, text: "B" }
			]
		});

		const afterRow = renderer.rootElt.querySelector("li");

		expect(afterRow).toBe(firstRow);
		expect(afterRow?.textContent).toBe("A edited");
	});

	test("removes a row whose key disappears and keeps the others", () => {
		const renderer = new Renderer(
			"<ul data-iterate='todo: todos' data-key='id'><li data-bind='todo.text'></li></ul>"
		);

		renderer.render({
			todos: [
				{ id: 1, text: "A" },
				{ id: 2, text: "B" }
			]
		});
		renderer.render({ todos: [{ id: 2, text: "B" }] });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(1);
		expect(items[0]?.textContent).toBe("B");
	});

	test("inserts a new row for a new key while reusing existing rows", () => {
		const renderer = new Renderer(
			"<ul data-iterate='todo: todos' data-key='id'><li data-bind='todo.text'></li></ul>"
		);

		renderer.render({ todos: [{ id: 1, text: "A" }] });
		const firstRow = renderer.rootElt.querySelector("li");

		renderer.render({
			todos: [
				{ id: 1, text: "A" },
				{ id: 2, text: "B" }
			]
		});

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(2);
		expect(items[0] as HTMLLIElement | null).toBe(firstRow);
		expect(items[1]?.textContent).toBe("B");
	});

	test("falls back to the item id property when no data-key is declared", () => {
		const renderer = new Renderer(
			"<ul data-iterate='todo: todos'><li data-bind='todo.text'></li></ul>"
		);

		renderer.render({
			todos: [
				{ id: "x", text: "A" },
				{ id: "y", text: "B" }
			]
		});

		const firstRow = renderer.rootElt.querySelector("li");

		renderer.render({
			todos: [
				{ id: "x", text: "A edited" },
				{ id: "y", text: "B" }
			]
		});

		expect(renderer.rootElt.querySelector("li")).toBe(firstRow);
	});

	test("toggles a boolean attribute by the value's truthiness", () => {
		const renderer = new Renderer("<input type='checkbox' data-bind='checked=done' />");

		renderer.render({ done: true });
		expect(renderer.rootElt.hasAttribute("checked")).toBe(true);

		renderer.render({ done: false });
		expect(renderer.rootElt.hasAttribute("checked")).toBe(false);
	});

	test("select shorthand sets the selected option", () => {
		const renderer = new Renderer(
			"<select data-bind='choice'><option value='a'>A</option><option value='b'>B</option></select>"
		);

		renderer.render({ choice: "b" });

		const selected = renderer.rootElt.querySelector("option[selected]");

		expect(selected?.getAttribute("value")).toBe("b");
	});

	test("does not treat 'from' inside a path as the from keyword", () => {
		const renderer = new Renderer(
			"<ul data-iterate='messages.from.user'><li data-bind='user'></li></ul>"
		);

		renderer.render({ messages: { from: { user: ["A", "B"] } } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items.length).toBe(2);
		expect(items[0]?.textContent).toBe("A");
	});

	test("keeps the trailing s in a non-plural word like status", () => {
		const renderer = new Renderer(
			"<ul data-iterate='article.status'><li data-bind='status'></li></ul>"
		);

		renderer.render({ article: { status: ["ok", "warn"] } });

		const items = renderer.rootElt.querySelectorAll("li");

		expect(items[0]?.textContent).toBe("ok");
		expect(items[1]?.textContent).toBe("warn");
	});

	test("shows an element authored display:none when the hide condition is falsy", () => {
		const renderer = new Renderer(
			"<section><div data-hide-if='hidden' style='display:none'>x</div></section>"
		);

		renderer.render({ hidden: false });

		expect((renderer.rootElt.querySelector("div") as HTMLElement).style.display).toBe("");
	});

	test("clears a binding when the value is null", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>initial</h1>");

		renderer.render({ title: "Hello" });
		renderer.render({ title: null });

		expect(renderer.rootElt.textContent).toBe("");
	});

	test("clears a binding when the value is undefined", () => {
		const renderer = new Renderer("<h1 data-bind='text=title'>initial</h1>");

		renderer.render({ title: "Hello" });
		renderer.render({ title: undefined });

		expect(renderer.rootElt.textContent).toBe("");
	});

	test("throws when the template string has multiple root elements", () => {
		expect(() => new Renderer("<p>a</p><p>b</p>")).toThrow();
	});
});
