# Protegey — Angular example

Minimal Angular (standalone components) app demonstrating every `@protegey/sdk` module in the
browser via an injectable `ProtegeyService`: device intelligence, transaction and cash-deposit reporting, alerts,
behavioral biometrics, identity verification (KYC), business onboarding (KYB), sanctions screening
and the shared fraud signal network.

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
  navigation metrics — `status: "LEARNING"` is expected for a brand-new customer, not an error.
- "Verify my identity": `protegey.client.kyc.startSession()`, then opens the returned hosted URL in
  a new tab — the dev decides how (`window.open` here; an iframe or redirect works just as well).
- "Check KYC status": `protegey.client.kyc.getSession()` — the polling fallback for the
  `kyc.status_changed` webhook. Shows `status` (the final decision), `recommendation` (Protegey's
  own verdict) and the photos from `images` — pre-signed URLs valid **1 hour**, re-issued on every
  call, so they're displayed right away and never stored.
- "Find my KYC sessions": `protegey.client.kyc.listSessions({ externalUserId })` — exact lookup by
  your own customer id.
- "Record a cash deposit": `protegey.client.cashDeposits.record()` with your own
  `externalTransactionId` (a re-send is a 409), then `cashDeposits.get()` by that reference and
  `cashDeposits.list({ externalCustomerId })`.
- "List open alerts": `protegey.client.alerts.list({ status: "OPEN" })`.
- "Invite a business (KYB, by phone)": `protegey.client.kyb.inviteApplicant()` with only a
  `contactPhone` — Protegey sends no email in that case, so the returned `applicationUrl` is what
  you deliver yourself.
- "Screen a name": `protegey.client.sanctions.screen()` (sanctions + PEP).
- "Check shared fraud signals": `protegey.client.sharedSignals.check()` with this device's
  fingerprint (returns 400 until the network has been enabled on your account for 7 days).

Webhook verification (`constructWebhookEvent()`) belongs on your server, never in a browser app —
see the SDK README.

> Requires `@protegey/sdk` ≥ 0.8.0. If your `package-lock.json` still pins an older commit, run
> `npm update @protegey/sdk`.

See `src/app/app.ts` — every call annotated.
