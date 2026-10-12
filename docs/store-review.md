# DomTack: notes for store reviewers

Contact: domtack@srob.fr · Source: https://github.com/srobfr/domtack · Privacy policy: [`docs/privacy.md`](privacy.md)

## Single purpose

DomTack lets a developer pin an element of a web page for a coding agent (Claude Code, Codex, Cursor…). The user clicks the toolbar button, then clicks an element. DomTack copies a screenshot of that element and a text reference to the clipboard, so the user can paste them into the agent.

Nothing happens until the user clicks the toolbar button (or presses the keyboard shortcut). No content script is declared in the manifest: the element picker is injected on demand, into the current tab only, and removes itself after one pick or on `Esc`.

## Permissions

File references are relative to the extension's root.

| Permission | Why DomTack needs it | Where |
|---|---|---|
| `host_permissions: <all_urls>` | The element the user wants may sit inside an iframe from another origin: embedded widgets, previews, session-replay players. Injecting the picker into those frames, and capturing the tab, needs host access to every origin the user may pick in. Without it only the top page's origin could be picked. | `background.js` `pick()` (`scripting.executeScript` with `allFrames: true`), `tack()` (`tabs.captureVisibleTab`) |
| `activeTab` | Fallback for the tab the user clicked the button on when host access has been withheld or revoked (Firefox lets users manage host permissions per site). Picking then still works in that tab's top page. | `background.js` `pick()` |
| `scripting` | Injects the element picker (`picker.js`) into the current tab, only after the user clicks the button or presses the shortcut. | `background.js` `pick()` |
| `webNavigation` | Read-only use of `webNavigation.getAllFrames` for the tab being picked in. When the pick happens inside nested iframes, each frame reports its iframe's position, and DomTack checks those reports against the browser's real frame tree, so a page cannot fake where an element is or which URL it belongs to. No navigation events are listened to and no browsing history is read or stored. | `background.js` `assemble()` |
| `clipboardWrite` | Puts the screenshot (`image/png`) and the text reference (`text/plain`) on the clipboard, after the user's click on the element, or on a history entry. This is the extension's output. | `picker.js` `finish()`, `history.js` `copy()` |
| `storage` | Keeps the history of the user's own pins (screenshot, page title and URL, selector, a short text excerpt) in `storage.local`, so a pin can be copied again later. | `background.js` `tack()`, `history.js` |
| `unlimitedStorage` | History entries contain PNG screenshots, which quickly exceed the default `storage.local` quota. The user can delete entries from the history page. | `background.js` `tack()` |
| `favicon` (Chrome) | Reads the pinned site's icon from Chrome's own cache (`_favicon/`) and stores it inline with the history entry, so the history page displays it without any network request. Firefox has no such permission and ignores it. | `background.js` `faviconData()` |
| `contextMenus` | Adds one *History* item to the toolbar button's own context menu (`contexts: ['action']`), which opens the extension's history page. No menu item is added to web pages. | `background.js` |
| `nativeMessaging` | Optional companion: if the user installs the open-source `domtack` command-line tool (`npx domtack install`), the extension sends each pin to it so that the user's local coding agent can read the full context from disk. The host only runs on the user's machine and only accepts this extension's id. Without it the extension works on its own: the clipboard text then carries the element's context instead of a reference. | `background.js` `tack()` (`runtime.sendNativeMessage('domtack', …)`) |

`commands` (one keyboard shortcut, `Alt+Shift+T`, to start picking) and `action` (the toolbar button) need no permission.

## Data handling

- **Collected:** only what the user explicitly pins: the clicked element's screenshot, HTML and text, the page's HTML, URL and title, and the iframe path to the element.
- **Where it goes:** the clipboard, the extension's own `storage.local`, and, only if the user installed it, the local native host, which writes it to a private folder in the user's home directory (`0700`, files `0600`). Nothing is sent to any server: there is no analytics, no telemetry, no remote code and no remote configuration.
- **Network:** the extension makes no network requests at all. Site icons shown in the history come from the browser's cache and are stored inline as image data.
- **Firefox:** `data_collection_permissions` is declared as `none`, since no data leaves the user's machine.
- **Retention:** until the user deletes history entries, or removes the extension.

## Security notes

- No content script runs unless the user starts a pick. The picker reacts only to trusted mouse clicks (`isTrusted` and `detail > 0`), so a page cannot trigger a pick or choose the element.
- Page content never crosses frame boundaries through `window.postMessage`, which page scripts can read: the clicked frame sends its context straight to the background, and frames only relay a random nonce and a hop count. The background accepts a pick only when every part comes from the same tab and the frames form the real chain from the clicked frame to the top frame.
- The history page renders all page-derived values with `textContent`; no page data is ever parsed as HTML.
- No `eval`, no remote scripts, no minified or generated code: the submitted files are the source, also published under the MIT license at https://github.com/srobfr/domtack.

## How to test

1. Install the extension and open any page, for example `https://en.wikipedia.org/wiki/Drawing_pin`.
2. Click the DomTack toolbar button. Hovering outlines elements; click one. A *Copied the element and its context* message appears at the bottom of the page.
3. Paste into a text editor: you get a description of the element (page, selector, text, HTML). Paste into an image-capable app: you get the element's screenshot.
4. Right-click the toolbar button, then *History*: the pin is listed; click it to copy it again.
5. Iframes: on a page that embeds a YouTube video (the player is a cross-origin iframe), click the button and pick an element inside the player, such as its title.

The native host is optional and not needed for review; with it installed, step 2's message reads *Copied domtack:xxxxxxxx* and the clipboard text is that reference.
