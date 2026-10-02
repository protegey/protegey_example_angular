import { Component, signal } from '@angular/core';
import { ProtegeyService } from './protegey.service';

// A fresh id per demo run — real integrations pass the end user's own stable id instead.
const CUSTOMER_ID = `customer-${Math.random().toString(36).slice(2, 8)}`;
const SESSION_ID = `angular-example-session-${Date.now()}`;

@Component({
  imports: [],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly log = signal('Waiting for device.identify()…');
  private visitorId: string | undefined;

  constructor(private readonly protegey: ProtegeyService) {
    // Typically called once on login/session start — done automatically here so the rest of the
    // demo already has a visitorId to fold in; "Identify device again" triggers it on demand.
    this.identifyDevice();
  }

  async identifyDevice(): Promise<void> {
    try {
      const result = await this.protegey.client.device.identify({ externalCustomerId: CUSTOMER_ID });
      this.visitorId = result.visitorId;
      this.log.set(`device.identify() -> visitorId=${result.visitorId}, action=${result.action}`);
    } catch (err) {
      this.log.set(`device.identify() failed: ${(err as Error).message}`);
    }
  }

  async reportTransaction(): Promise<void> {
    try {
      const result = await this.protegey.client.transactions.report({
        externalTransactionId: `angular-example-${Date.now()}`,
        externalCustomerId: CUSTOMER_ID,
        direction: 'DEBIT',
        amount: 5000,
        currency: 'XAF',
        transactionType: 'test',
        visitorId: this.visitorId,
      });
      this.log.set(`transactions.report() -> decision=${result.decision}, riskScore=${result.riskScore}`);
    } catch (err) {
      this.log.set(`transactions.report() failed: ${(err as Error).message}`);
    }
  }

  async reportBehavioral(): Promise<void> {
    try {
      const result = await this.protegey.client.behavioral.report({
        externalCustomerId: CUSTOMER_ID,
        sessionId: SESSION_ID,
        keystroke: { avgInterKeyLatencyMs: 145, typingSpeedCharsPerSec: 4.2, errorRate: 0.02 },
        touch: { avgSwipeVelocity: 22, scrollBehaviorScore: 0.8 },
        navigation: { screenSequence: ['login', 'dashboard', 'transfer', 'confirm'] },
      });
      // "learning" for the first few sessions of any given customer — expected, not an error.
      this.log.set(`behavioral.report() -> status=${result.status}, stepUpRecommended=${result.stepUpRecommended}`);
    } catch (err) {
      this.log.set(`behavioral.report() failed: ${(err as Error).message}`);
    }
  }

  async startKyc(): Promise<void> {
    try {
      const { url } = await this.protegey.client.kyc.startSession({ externalUserId: CUSTOMER_ID });
      // Web stays link-based — open it however fits your UI (a new tab here). There is no in-app
      // webview for the web SDK; that's a mobile-only concept (see @protegey/react-native-sdk /
      // protegey_sdk for Flutter).
      window.open(url, '_blank', 'noopener,noreferrer');
      this.log.set(`kyc.startSession() -> opened ${url} in a new tab`);
    } catch (err) {
      this.log.set(`kyc.startSession() failed: ${(err as Error).message}`);
    }
  }
}
