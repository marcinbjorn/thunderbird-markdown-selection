# Render Selected Markdown

A Thunderbird MailExtension that renders selected Markdown text in the compose window as formatted HTML, with syntax-highlighted code blocks. Click the button again on rendered text to turn it back into Markdown.

Targets Thunderbird 128 or newer (tested on 156). Manifest version 2. No build step.

## Usage

1. Open a compose window in HTML mode (Options > Delivery Format, or Shift+click Write).
2. Type or paste Markdown into the message body.
3. Select the Markdown text.
4. Click the **Render Markdown** toolbar button, or right-click the selection and choose **Render Markdown**.
5. Click it again with the rendered text selected to get the Markdown source back.

Rendering is a single editor action, so **Ctrl+Z** reverts it.

### Supported Markdown

- Headings (`#` to `######`)
- Bullet and numbered lists
- Block quotes
- Horizontal rules
- Fenced code blocks, with optional language
- Inline code
- Bold, italic, strikethrough
- Links and images

Tables, nested lists and task lists are not supported.

### Code blocks

Put a language tag after the opening fence:

````
```python
def hello():
    print("hi")
```
````

- The code is syntax highlighted (192 languages via highlight.js).
- A small grey label with the language appears at the top left of the block. Blocks without a tag get neither a label nor coloring.
- The box shrinks to fit the code rather than spanning the full width.
- Toggling back to Markdown restores the language tag.

To look up the tag for a language, right-click in the message body and choose **Markdown code languages**. A popup lists every language and alias, with a search box.

### Email compatibility

Mail clients strip classes and stylesheets, so all colors and layout are written as inline styles. Clients that ignore some of these styles (for example `display:table`) still show a readable block, but it may be full width.

## Install

Download `render-selected-markdown.xpi` from the releases page, then in Thunderbird go to Tools > Add-ons and Themes, click the gear icon, choose **Install Add-on From File**, and pick the file.

For development, use Tools > Developer Tools > Debug Add-ons > **Load Temporary Add-on** and select `manifest.json`.

After loading or reloading the add-on, **open a new compose window**. Compose scripts registered at runtime only apply to windows opened afterwards.

## Project layout

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest |
| `background.js` | Registers the compose script, toolbar button and right-click menu items |
| `compose.js` | Markdown converter, highlighting, and the render/un-render toggle (runs in the compose editor) |
| `highlight.min.js` | Bundled highlight.js with all languages |
| `supported-languages.html`, `supported-languages.js` | Searchable language list popup (generated) |
| `tools/generate-languages.js` | Regenerates the language list from `highlight.min.js` |
| `icon.svg` | Toolbar icon |

### How it works

`background.js` registers `highlight.min.js` and `compose.js` with `browser.composeScripts.register` (Thunderbird has no manifest key for this). When the button is clicked it sends `{command: "render-selected-markdown"}` to the compose tab. `compose.js` converts the selection and replaces it using `document.execCommand("insertHTML")` so the editor records an undo step. highlight.js emits `hljs-*` class names, which `compose.js` rewrites to inline colors using the `TOKEN_COLORS` table (GitHub light palette).

## Building the package

The `.xpi` is a zip of the extension files. From PowerShell:

```powershell
Compress-Archive -Path manifest.json,background.js,compose.js,highlight.min.js,supported-languages.html,supported-languages.js,icon.svg -DestinationPath render-selected-markdown.zip -Force; Move-Item render-selected-markdown.zip render-selected-markdown.xpi -Force
```

### Updating highlight.js

```sh
npm install highlight.js@<version> esbuild
npx esbuild node_modules/highlight.js/lib/index.js --bundle --minify --format=iife --global-name=hljsPkg --outfile=highlight.min.js
echo "var hljs=hljsPkg;" >> highlight.min.js
node tools/generate-languages.js
```

Update the version in `THIRD-PARTY-NOTICES.md` and copy the new `LICENSE` file from the package to `LICENSE-highlightjs.txt`.

## License

MIT, see `LICENSE`. Bundled highlight.js is BSD 3-Clause, see `THIRD-PARTY-NOTICES.md`.
