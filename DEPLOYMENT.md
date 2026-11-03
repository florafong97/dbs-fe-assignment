# Deploying the assignment

The deployed app must work **without a local server**. The starter runs the mock
API (MSW) in the browser, so your site is just static files. You only need this
page when you deploy, or if the mock API stops responding.

## 1. Build

```bash
npm ci
npm run build
```

Deploy the `dist/` folder. Check that the worker made it into the build:

```bash
ls dist/mockServiceWorker.js
```

## 2. Platform settings

| Platform | Build command | Output | Notes |
| --- | --- | --- | --- |
| **Netlify** | `npm run build` | `dist` | Add new site → import the repo. Vite is detected. Set `NODE_VERSION=22` if the build image is old. |
| **Vercel** | `npm run build` | `dist` | Add New Project → framework preset **Vite**. Usually no config. |
| **Cloudflare Pages** | `npm run build` | `dist` | Create project → framework preset **Vite**. Set `NODE_VERSION=22` if prompted. |

No redirects are needed: this is one page and the transfer is a dialog. If you
add client-side routes, add a SPA fallback (`public/_redirects` on Netlify,
`vercel.json` on Vercel, `_redirects` on Cloudflare).

GitHub Pages also works, but needs a `base` path and a service-worker fallback.
The three platforms above are simpler.

## 3. How MSW works in production

- `public/mockServiceWorker.js` is copied into `dist/` and served over HTTPS.
- `src/main.tsx` starts the worker **before** rendering, so the first
  `/api/...` call is intercepted.
- The handlers are the same ones the Node server and tests use.
- Data is in memory: a refresh resets balances to the seed. That is expected.

## 4. Deployment checklist

- [ ] `dist/mockServiceWorker.js` exists after `npm run build`.
- [ ] The worker starts in the production build (it is not gated behind
      `import.meta.env.DEV`).
- [ ] `worker.start()` is awaited before the first API request.
- [ ] The site is served over HTTPS (Netlify/Vercel/Cloudflare provide it).
- [ ] API paths respect `import.meta.env.BASE_URL` if deployed to a sub-path.
- [ ] DevTools → **Application → Service Workers** shows the worker as
      activated and running.
- [ ] In DevTools → **Network**, `/api/health` shows
      `(from service worker)`.
- [ ] The deployed transfer completes and balances update.
- [ ] Tested in a normal window, not only an in-app browser.
- [ ] After a redeploy, hard-reload once to drop the old worker.

## 5. Common failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `mockServiceWorker.js` 404 | Worker not in `public/`, or wrong base path | Run `npx msw init public --save`; check `dist/`; use `${import.meta.env.BASE_URL}mockServiceWorker.js` |
| Every request fails / `Mock API failed to start` in the console | Worker failed to start or was skipped in production | Start it unconditionally, await it, check the console |
| API 404s on the deployed site but works locally | You are using the Vite proxy, which only exists in dev | Use MSW in the browser instead of the Node server |
| Works on the first load, breaks after refresh | Stale service worker / base mismatch | Hard reload; unregister the worker in DevTools; check the scope |
| Service worker never registers on a phone | You opened `http://192.168.x.x` (not a secure context) | Test the HTTPS deployment, or use an HTTPS tunnel |
| Nothing intercepted in Safari private mode / in-app browser | Service workers are restricted | Use a normal browser window |
| `/api/...` works at `/`, fails under `/repo/` | Base path not applied | Set Vite `base`, use `BASE_URL` for both the worker URL and API calls |
| Old data after deploy | The page is controlled by the previous worker | Hard reload or “Update on reload” in DevTools |
| Console warnings about unhandled requests | Vite assets pass through MSW | Use `onUnhandledRequest: 'bypass'` (the starter does) |

## 6. Quick verification

1. Open the deployed URL in a private window.
2. Check the console for errors.
3. Confirm the health request is served by the service worker.
4. Complete a transfer; the balance and transaction list should update.
5. Refresh once and confirm the app still loads.

If the mock API can't start, the app still renders (an error is logged to the
console) and every request fails. Fix that before submitting.
