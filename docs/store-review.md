# DomTack: notes for reviewers

Contact: domtack@srob.fr · Source: https://github.com/srobfr/domtack (MIT) · Privacy policy: [`privacy.md`](privacy.md)

**Purpose:** the user clicks the toolbar button, then an element of the page; DomTack copies the element's screenshot and context to the clipboard, for pasting into a coding agent. Nothing runs until the button is clicked: there is no declared content script, and the picker removes itself after one pick or on Esc.

## Permissions

| Permission | Use |
|---|---|
| `<all_urls>` | Inject the picker into all frames of the current tab, including frames embedded from other sites, and capture the tab. |
| `activeTab` | Fallback when site access is withheld (Firefox lets users revoke it per site). |
| `scripting` | Inject the picker after the user's click. |
| `webNavigation` | `getAllFrames` only, to check the frame chain reported by the picker. No navigation events, no history. |
| `clipboardWrite` | Write the screenshot and text: the extension's output. |
| `storage`, `unlimitedStorage` | Keep the user's pin history, which holds PNG screenshots. |
| `contextMenus` | One *History* item on the toolbar button's own menu. |
| `favicon` (Chrome) | Read the site icon from the browser cache, stored inline in the history. |
| `nativeMessaging` | Optional local companion (`npx domtack install`) that saves pins for the user's coding agent. The extension works without it. |

## Data

Only the elements the user pins, kept in the clipboard, the extension's local storage and, with the companion, a private folder on the user's disk. No network requests, no analytics, no remote code. No minified or generated code: the package is the source.

## How to test

1. Open any page, click the DomTack button, then click an element. A *Copied* message appears.
2. Paste into a text editor (element description) or an image-capable app (screenshot).
3. Right-click the button, then *History*: the pin is listed and can be copied again.
