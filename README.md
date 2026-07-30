# LocalhostSwitcher

A minimal Chrome extension (Manifest V3). One toolbar button: reopen the current page on
`http://localhost:4200`, copying selected cookies across so the local dev build is already
authenticated.

## What it does

On toolbar click:

1. Takes the active tab's URL.
2. Swaps the origin for `http://localhost:4200`, preserving path + query + hash.
3. Copies the configured cookies from the source domain to `localhost`.
4. Opens the result — in the same tab by default, or a new tab / new window (configurable in options).

No popup, no notifications, no error surfaces — including when cookies are missing. It either
works quietly or does nothing quietly.

## Install (unpacked)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Pin the toolbar icon if you like.

After editing any file, hit the reload arrow on the extension card.

## Configure cookies

Right-click the toolbar icon → **Options** (or find it on the extensions page). The options
page lists the cookie names copied to `localhost:4200`:

- **Double-click** a name to edit inline. Enter or blur commits; Escape cancels.
- **+ Add** appends a blank row; leaving it empty discards it.
- **×** removes a row.
- Changes save automatically. Empty and duplicate names are rejected.

Seeded defaults: `__machineid__`, `secid`.

The **Open the page in** dropdown controls where the switched page opens — **Same tab**
(default), **New tab**, or **New window**. It also saves automatically.

## Regenerating icons

Icons are committed PNGs. To regenerate them (e.g. after changing the colour), run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
```

Zero dependencies — the script uses .NET `System.Drawing`. Each icon is drawn natively at
its target size rather than downscaled from a master, which keeps the small sizes crisp.

## Known limitations

1. **Cookie rotation breaks the local session.** When the backend rotates a cookie, its
   `Set-Cookie` returns through the dev-server proxy still scoped to the remote domain (e.g.
   `Domain=.cwcloudtest.com`); the browser rejects that on a `localhost` response, so the
   refresh never lands. Symptom: "works for a while, then logs out." The extension cannot fix
   this — set `cookieDomainRewrite` in the Angular dev-server proxy config, or just re-click
   the button to re-copy.
2. **The cookie `domain` is dropped, not copied.** A cookie scoped `.example.com` is rejected
   outright on `localhost`, so it is written host-only.
3. **Cookie values are never re-encoded.** `chrome.cookies` reads and writes raw values. A
   value already stored percent-encoded (e.g. `...%40caseware.com`) would be double-encoded if
   run through `encodeURIComponent`, so values pass through verbatim.
4. **Cookies ignore port.** `localhost:4200` shares one cookie jar with every other localhost
   dev server, so copied session cookies bleed across local projects on other ports.
5. **`Secure` cookies work on `http://localhost`.** Chrome treats localhost as a trustworthy
   origin, so `Secure` flags are copied as-is rather than stripped.
6. **Why this works at all:** with a dev-server proxy every request is first-party to
   `localhost:4200`, so `SameSite` never applies and there is no CORS. Calling the remote API
   directly from the browser would be a different problem entirely.

## Permissions

`<all_urls>` + `cookies` means the extension can read every cookie in the browser, including
httpOnly ones. That is a deliberate tradeoff for an unpacked local dev tool. To bound it later,
add a source-domain allowlist and switch to `optional_host_permissions`.

## Non-goals

Reverse direction (localhost → remote), configurable target port, per-domain cookie lists,
name wildcards, live cookie re-sync, incognito support, any click feedback, Chrome Web Store
publication.
