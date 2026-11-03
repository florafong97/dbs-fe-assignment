# Meridian Banking — Frontend Take-Home

Build a small banking app for one customer: a **dashboard** that shows her
accounts and recent transactions, and a **three-step transfer** that sends money
to a payee.

You get a working React + TypeScript starter with a mock API already wired in,
plus design tokens and a wireframe. You don't need a backend, and you don't need
to invent data.

|  |  |
| --- | --- |
| **Time** | Submit within **2 weeks** of receiving this. Most people need about **8–12 hours**; you don't need to use the full two weeks. |
| **AI tools** | Allowed. In the follow-up call you explain your code and change it live, **without AI help**. See [How we assess](#4-how-we-assess). |
| **Stack** | React 19, TypeScript, Vite, TanStack Query, React Hook Form, Zod, MSW, Vitest (all installed). Node 22. |

---

## 1. Get started

1. Open **https://github.com/Harmonice-Mundi/2026-fe-assignment/generate**
   (or press **Use this template** → **Create a new repository**). Choose your
   own account as the owner, keep it **Public**, and click **Create
   repository**.
2. Clone your copy and run:

   ```bash
   npm install
   npm run dev        # http://localhost:5173
   ```

   You should see **"Mock API: connected"**. That screen is a placeholder;
   replace it with your app.

3. Read the docs below in order before writing code.

## 2. What to read

| Read | What it gives you |
| --- | --- |
| 1. [`brief/candidate-brief.md`](brief/candidate-brief.md) | **The spec.** What to build, what's required vs optional, exact copy. |
| 2. [`wireframes/wireframe.md`](wireframes/wireframe.md) | Layout of each screen (low fidelity — no visual design). |
| 3. [`brief/api-contract.md`](brief/api-contract.md) | Endpoints, types, errors, and test hooks. |

Look these up when you need them:

- [`DEPLOYMENT.md`](DEPLOYMENT.md): hosting settings and fixes for common mock-API
  problems.
- [`brief/design-tokens.css`](brief/design-tokens.css): colours, spacing and type
  (already imported).
- [`mock-api/README.md`](mock-api/README.md): the optional Node mock server.

## 3. What's already in the starter

| Path | What it is |
| --- | --- |
| `src/api/client.ts`, `src/api/types.ts` | Typed `apiFetch` helper and the API types. Build your queries on these. |
| `src/lib/format.ts` | `formatMoney` and `formatShortDate`. Use them so amounts and dates match the brief. |
| `src/mocks/`, `mock-api/` | The mock API. It runs in the browser, in tests, and in your deployed site. **Don't edit it.** |
| `src/test/setup.ts` | Test setup. The mock data resets before every test. |
| `src/App.tsx` | Placeholder screen. Replace it. |

How you structure folders, components and features is **up to you** — that's
part of what we look at.

```bash
npm run dev        # start the app
npm test           # run tests once (npm run test:watch to keep watching)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run check      # lint + typecheck + tests
npm run build      # production build into dist/
```

Run `npm run check` and `npm run build` before you submit; both should pass.

## 4. How we assess

1. **We open your deployed app** and run through the flows in the brief.
2. **We read your code and README.** We look at how you structured the
   project, the decisions you made, and whether the tests check real behaviour.
3. **We have a follow-up call with you (about 45 minutes).** You share your
   screen and:
   - walk us through the structure and two or three decisions you made;
   - trace one flow through the code (for example, what happens from
     `Confirm transfer` until the balance updates);
   - make **one or two small changes live**, without AI assistance. They are
     the size of "add a validation rule" or "show one more field". Your
     normal editor, docs and search are fine.

**On AI:** use whatever tools you like while building. We are not checking
whether code was AI-generated. We are checking that **you understand all of
it** and made deliberate choices. If you can't explain a piece of code, it
counts against you, whoever wrote it. Your README must say what you used AI
for (see below).

A smaller app you understand well scores better than a bigger one you can't
explain.

## 5. Submit

1. **Deploy** to Netlify, Vercel or Cloudflare Pages (settings in
   [`DEPLOYMENT.md`](DEPLOYMENT.md)). The deployed site must work with no local
   server.
2. **Replace this README** with your own, using the outline below.
3. **Reply to the invitation email** with your repo URL and your deployed URL.

### Your README

```md
# Meridian Banking — <Your Name>

- Deployed: <url>
- Run locally: `npm install && npm run dev`

## Project structure
Folders and what each is responsible for.

## Decisions and trade-offs
Server state vs UI state, forms and validation, theming, anything you
chose deliberately, and what you'd change.

## Loading, empty and error states
How you handled them, and how to see each one in the deployed app.

## Tests
What they cover and why you picked those cases.

## AI use
Which tools, and what for. Name two or three places where you changed,
rejected or fixed what the AI produced, and why.

## Not done / known issues
What you left out or would do with more time.
```
