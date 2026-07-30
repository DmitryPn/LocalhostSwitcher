const TARGET_ORIGIN = 'http://localhost:4200';
const DEFAULT_COOKIE_NAMES = ['__machineid__', 'secid'];
const DEFAULT_OPEN_MODE = 'sameTab';   // 'sameTab' | 'newTab' | 'newWindow'

chrome.runtime.onInstalled.addListener(async () => {
  // Seed the default cookie list only if nothing is stored yet.
  const stored = await chrome.storage.sync.get('cookieNames');
  if (!stored.cookieNames) {
    await chrome.storage.sync.set({ cookieNames: DEFAULT_COOKIE_NAMES });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  // 1. Validate + build target. Bail silently on chrome://, extension pages,
  //    and on tabs already pointing at localhost/127.0.0.1.
  if (!tab || !tab.url) return;
  let src;
  try {
    src = new URL(tab.url);
  } catch {
    return;
  }
  if (src.protocol !== 'http:' && src.protocol !== 'https:') return;
  if (src.hostname === 'localhost' || src.hostname === '127.0.0.1') return;

  const target = new URL(TARGET_ORIGIN);
  target.pathname = src.pathname;
  target.search   = src.search;
  target.hash     = src.hash;

  // 2. Read config fresh every click — the MV3 service worker is ephemeral,
  //    so nothing may be cached in module scope.
  const { cookieNames, openMode } = await chrome.storage.sync.get({
    cookieNames: DEFAULT_COOKIE_NAMES,
    openMode: DEFAULT_OPEN_MODE
  });

  // 3. Copy each cookie. Independent: one failure must not stop the rest.
  for (const name of cookieNames) {
    try {
      const c = await chrome.cookies.get({ url: tab.url, name });
      if (!c) continue;                       // silent skip, target left untouched

      await chrome.cookies.remove({ url: TARGET_ORIGIN + (c.path || '/'), name });

      const details = {
        url: TARGET_ORIGIN + (c.path || '/'),
        name,
        value: c.value,          // raw passthrough — never re-encode
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite
        // NOTE: `domain` deliberately omitted — a `.example.com`-scoped cookie
        //       is rejected on localhost; it must be written host-only.
      };
      if (c.expirationDate) details.expirationDate = c.expirationDate;  // else session cookie

      await chrome.cookies.set(details);
    } catch {
      // silent by design
    }
  }

  // 4. Only after every write has settled. Where it opens is configurable;
  //    default is the same tab (navigate the current tab in place).
  const url = target.toString();
  switch (openMode) {
    case 'newTab':
      await chrome.tabs.create({ url });
      break;
    case 'newWindow':
      await chrome.windows.create({ url });
      break;
    case 'sameTab':
    default:
      await chrome.tabs.update(tab.id, { url });
      break;
  }
});
