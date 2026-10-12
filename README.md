# DomTack

Pin any element of a web page for your coding agent. Click the DomTack icon, click an element: its screenshot (`image/png`) and a `domtack:xxxxxxxx` id (`text/plain`) go to the clipboard. Terminals paste the id; rich editors paste the image. The agent resolves the id to the element's full context with the `domtack` CLI.

Works in nested iframes (cross-origin included) and in rrweb replays.

## Install

1. Browser extension, from `extension/`:
   - Chrome, Chromium, Edge, Brave: `chrome://extensions` → developer mode → *Load unpacked*. For `file://` pages, enable *Allow access to file URLs* in the extension's details.
   - Firefox (140+): `npx web-ext run -s extension` (temporary profile, reloads on change), or `about:debugging` → *Load Temporary Add-on* → `extension/manifest.json`.
2. Optional: `npx domtack install` registers the native host with your installed browsers (manifest files on Linux/macOS, `HKCU` registry keys on Windows) and, when `~/.claude` exists, a Claude Code skill. Re-run it after updating domtack or switching Node versions; `npx domtack uninstall` undoes it.

## Use

Click the toolbar icon (or `Alt+Shift+T`, rebindable at `chrome://extensions/shortcuts`) → hover → click. `Esc` cancels. Right-click the icon → *History* lists past tacks; click one to copy it again.

```
domtack <id>        print a tack as JSON
domtack list [n]    the n most recent tacks
domtack mcp         MCP server exposing a get_domtack tool
```

Without step 2 the extension runs standalone: the clipboard text is a self-contained description of the element (page, iframe path, selector, text, HTML up to 3,000 characters) instead of an id, and tacks live only in the extension's history.

With the native host, each tack is stored in `<store>/<8 chars>/`, where `<store>` is `~/.local/share/domtack` (Linux), `~/Library/Application Support/domtack` (macOS) or `%LOCALAPPDATA%\domtack` (Windows), overridable with `DOMTACK_DIR`. The folder is private to the user (`0700`, files `0600`):

- `shot.png`: the element's screenshot.
- `context.json`: URL, title, selector, rect, viewport, element HTML and text, `frames` (the iframe path when the element is inside iframes), and the originating browser process (pid, name, and the `playwright-cli` session name when one drives the browser).
- `page.html`: the document holding the element.

Page content is untrusted: the CLI, MCP tool and skill tell agents to treat it as data.

Store reviewers: [`docs/store-review.md`](docs/store-review.md) explains each permission and how to test.

## Test

`npm test` runs the CLI tests; `npm run check` also builds the store packages into `dist/` and lints the extension.

## License

MIT, see [LICENSE](LICENSE).
