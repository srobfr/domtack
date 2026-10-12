# DomTack: store listing texts

Paste-ready texts for the Chrome Web Store and Firefox Add-ons (AMO).

## Name

DomTack

## Summary

Chrome Web Store (132 characters max, use the manifest description) and AMO (250 characters max):

> Pin any element of a web page for your coding agent: DomTack copies its screenshot and a reference to its full context. No network requests, nothing collected.

French: Épinglez n'importe quel élément d'une page web pour votre agent de code : DomTack copie sa capture et une référence vers tout son contexte. Aucune requête réseau, aucune collecte.

## Category

- Chrome Web Store: Developer Tools
- AMO: Web Development

## Description

DomTack hands your coding agent exactly the element you mean.

Click the DomTack button, then click any element of the page: a button, a table row, an error message. DomTack copies its screenshot and a short reference like `domtack:k3x9p2ab`. Paste it into Claude Code, Codex, Cursor or any other agent. Rich editors get the image; terminals get the reference, which the agent resolves to the element's full context: page URL, CSS selector, HTML, text, position and a snapshot of the page.

In browsers driven by Playwright, each pin also records which `playwright-cli` session it came from, so the agent can keep working in the same browser.

**Two modes**
- On its own, the extension copies the screenshot and a text description of the element, ready to paste.
- With the free companion command-line tool (`npx domtack install`, requires Node.js), each pin is saved on your computer and your agent fetches everything with `domtack <id>`, a Claude Code skill or an MCP server.

**Private by design**
- Nothing happens until you click the button; no page is read otherwise.
- No network requests, no account, no analytics. Everything stays on your computer.
- Open source (MIT): https://github.com/srobfr/domtack

**Also**
- History of your pins: right-click the button, then History. Search, copy again, delete.
- Keyboard shortcut: Alt+Shift+T. Esc cancels.

On AMO, add: Requires Firefox 140 or later.

### French

DomTack donne à votre agent de code exactement l'élément dont vous parlez.

Cliquez sur le bouton DomTack, puis sur n'importe quel élément de la page : un bouton, une ligne de tableau, un message d'erreur. DomTack copie sa capture et une courte référence comme `domtack:k3x9p2ab`. Collez-la dans Claude Code, Codex, Cursor ou tout autre agent. Les éditeurs riches reçoivent l'image ; les terminaux reçoivent la référence, que l'agent traduit en contexte complet : URL de la page, sélecteur CSS, HTML, texte, position et instantané de la page.

Dans les navigateurs pilotés par Playwright, chaque épingle note aussi la session `playwright-cli` d'origine, pour que l'agent continue dans le même navigateur.

**Deux modes**
- Seule, l'extension copie la capture et une description textuelle de l'élément, prêtes à coller.
- Avec l'outil en ligne de commande gratuit (`npx domtack install`, nécessite Node.js), chaque épingle est enregistrée sur votre ordinateur et votre agent récupère tout avec `domtack <id>`, un skill Claude Code ou un serveur MCP.

**Respect de la vie privée**
- Rien ne se passe avant que vous cliquiez sur le bouton ; aucune page n'est lue autrement.
- Aucune requête réseau, aucun compte, aucune statistique. Tout reste sur votre ordinateur.
- Open source (MIT) : https://github.com/srobfr/domtack

**Aussi**
- Historique de vos épingles : clic droit sur le bouton, puis History. Recherche, nouvelle copie, suppression.
- Raccourci clavier : Alt+Maj+T. Échap pour annuler.

Sur AMO, ajouter : Nécessite Firefox 140 ou plus récent.

## Images

In [`store/`](store/), captured from the real extension on a demo page:

| File | Caption |
|---|---|
| `1-pick.png` | Click the DomTack button, then hover: the element under the cursor is outlined. |
| `2-copied.png` | Click it: its screenshot and a domtack id are on your clipboard. |
| `3-history.png` | Every pin is kept in the history: search it, copy a pin again. |
| `4-agent.png` | Your coding agent resolves the id to the element's full context. |
| `promo-440x280.png` | Chrome Web Store small promo tile. |

Icon: `extension/icons/icon-128.png`.

## Support and links

- Homepage: https://github.com/srobfr/domtack
- Support: https://github.com/srobfr/domtack/issues · domtack@srob.fr
- Privacy policy: https://github.com/srobfr/domtack/blob/main/docs/privacy.md

## Chrome Web Store privacy practices

- Single purpose: pin a web page element and copy its screenshot and context for a coding agent.
- Permission justifications: see [`store-review.md`](store-review.md).
- Remote code: no.
- Data usage: "Website content" is handled (the pinned element and page), only locally, only at the user's request. Not sold, not transferred, not used for unrelated purposes, not used for creditworthiness.

## AMO notes to reviewer

See [`store-review.md`](store-review.md). The add-on contains no minified or generated code; the package is the source as published on GitHub.
