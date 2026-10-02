# Protegey — Angular example

Minimal Angular (standalone components) app demonstrating every `@protegey/sdk` module in the
browser via an injectable `ProtegeyService`: device intelligence, transaction reporting, behavioral
biometrics, and identity verification.

On the web, there's no in-app webview — the KYC flow is just a URL, opened in a new tab (or an
iframe, or however fits your UI). That's a deliberate SDK design choice: see
`@protegey/react-native-sdk` or `protegey_sdk` (Flutter) for the in-app webview equivalent on
mobile.

## Run it

```bash
npm install
```

Edit `src/index.html`'s two `window.__PROTEGEY_*__` values with your real API key and base URL
(demo-only wiring — in a real app, inject these at build time instead), then:

```bash
npm start
```

## What it does

- `src/app/protegey.service.ts` — wraps `@protegey/sdk` as an injectable service.
- On load (and again via "Identify device again"): `protegey.client.device.identify()` computes a
  real browser fingerprint and reports it.
- "Report a test transaction": `protegey.client.transactions.report()`, folding in the same device signal.
- "Report a behavioral event": `protegey.client.behavioral.report()` with sample keystroke/touch/
  navigation metrics — `status: "learning"` is expected for a brand-new customer, not an error.
- "Verify my identity": `protegey.client.kyc.startSession()`, then opens the returned hosted URL in
  a new tab — the dev decides how (`window.open` here; an iframe or redirect works just as well).

See `src/app/app.ts` — every call annotated.
