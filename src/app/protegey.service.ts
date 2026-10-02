import { Injectable } from '@angular/core';
import { Protegey } from '@protegey/sdk';

// In a real app, read these from your own build-time config — never hardcode a production API
// key. This demo expects them injected as window globals by index.html for simplicity (no
// Angular environment-file machinery needed for a one-page example).
declare const window: Window & { __PROTEGEY_API_KEY__?: string; __PROTEGEY_BASE_URL__?: string };

@Injectable({ providedIn: 'root' })
export class ProtegeyService {
  readonly client = new Protegey({
    apiKey: window.__PROTEGEY_API_KEY__ ?? '',
    baseUrl: window.__PROTEGEY_BASE_URL__ ?? '',
  });
}
