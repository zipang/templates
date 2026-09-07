# @temples/jquery

The jQuery plugin for the [temples](https://github.com/zipang/temples) template engine. It renders
data into each matched element with the same `data-*` binding attributes as the standalone engine.

## Install

```sh
bun add @temples/jquery jquery
```

jQuery is a peer dependency: load it before importing the plugin.

## Usage

```javascript
import $ from "jquery";
import "@temples/jquery";

$(".list").temples({ items: ["Milk", "Bread"] }); // render data into each matched element
const renderer = $(".list").temples(); // get the prepared Renderer
```

The main `@temples/engine` entry never touches `$`; the plugin is tree-shakeable and only this
import registers `$.fn.temples`.

## Documentation

Full guides and API reference: https://zipang.github.io/temples/

## License

MIT
