# DomTack privacy policy

Effective date: 12 October 2026 · Contact: domtack@srob.fr

DomTack is a browser extension, with an optional command-line companion, that lets you pin an element of a web page for a coding agent. This policy covers both.

## What DomTack handles

Only the elements you explicitly pin. When you click the DomTack button and then click an element, DomTack reads:

- a screenshot of that element;
- the element's HTML and text, a CSS selector pointing to it, and its position on screen;
- the HTML, URL and title of the page holding it, and of the iframes between it and the page you are viewing;
- the site's icon, from your browser's cache (Chrome only).

DomTack reads nothing on pages where you don't start a pick.

## Where it goes

All of it stays on your computer:

- **Clipboard:** the screenshot and a text reference (or, without the command-line companion, a text description of the element), so you can paste them.
- **Extension storage:** your pin history, kept by the browser in the extension's local storage.
- **Your disk, only if you installed the companion** (`npx domtack install`): each pin is written to a folder in your home directory that only your user account can read. Your coding agent reads it from there when you give it a pin's id.

DomTack makes no network requests. It has no servers, no accounts, no analytics, no telemetry, no advertising, and it does not sell, share or transfer any data to anyone. When you paste a pin into an AI tool, what that tool does with it is governed by that tool's own privacy policy.

## Keeping and deleting

Pins stay until you delete them. Delete entries from the History page (right-click the DomTack button → History). Removing the extension deletes its storage. With the companion, pins are folders in `~/.local/share/domtack` (Linux), `~/Library/Application Support/domtack` (macOS) or `%LOCALAPPDATA%\domtack` (Windows); delete them like any file. `npx domtack uninstall` removes the companion but keeps those folders.

## Changes

Changes to this policy are published in this file, at https://github.com/srobfr/domtack/blob/main/docs/privacy.md, with a new effective date.
