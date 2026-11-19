import { Component, signal } from '@angular/core';
import { ProtegeyApiError } from '@protegey/sdk';
import type { KycPresignedImage } from '@protegey/sdk';
import { ProtegeyService } from './protegey.service';

function describe(err: unknown): string {
  // ProtegeyApiError carries the HTTP status and, for account-gating 403s, an errorCode
  // (PARTNER_SUSPENDED / PARTNER_CONTRACT_REQUIRED).
  if (err instanceof ProtegeyApiError) return `${err.status}${err.errorCode ? ` ${err.errorCode}` : ''}: ${err.message}`;
  return (err as Error).message;
}

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
  /** The session's photos as pre-signed links — valid 1 hour, re-issued on every getSession(). */
  protected readonly kycImages = signal<Array<{ name: string; image: KycPresignedImage }>>([]);
  private visitorId: string | undefined;
  private kycSessionId: string | undefined;

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
      this.log.set(
        `transactions.report() -> transactionId=${result.transactionId}, decision=${result.decision}, riskScore=${result.riskScore}, deviceAction=${result.deviceAction}, alerts=${result.alerts.length}`,
      );
    } catch (err) {
      this.log.set(`transactions.report() failed: ${(err as Error).message}`);
    }
  }

  async recordCashDeposit(): Promise<void> {
    try {
      // Send your own externalTransactionId so a retry is safe — re-sending it is a 409.
      const externalTransactionId = `angular-example-dep-${Date.now()}`;
      const result = await this.protegey.client.cashDeposits.record({
        externalTransactionId,
        externalCustomerId: CUSTOMER_ID,
        amount: 2_500_000,
        currency: 'XAF',
        channel: 'BRANCH',
        branchId: 'DLA-AKWA',
        depositorName: 'Demo Depositor',
      });
      // Look it up again by your own reference — amount comes back as a decimal string.
      const deposit = await this.protegey.client.cashDeposits.get(externalTransactionId);
      const page = await this.protegey.client.cashDeposits.list({ externalCustomerId: CUSTOMER_ID, limit: 10 });
      this.log.set(
        [
          `cashDeposits.record() -> cashDepositId=${result.cashDepositId}, decision=${result.decision}, riskScore=${result.riskScore}, alerts=${result.alerts.length}`,
          `cashDeposits.get() -> amount=${deposit.amount} ${deposit.currency}, channel=${deposit.channel}, branchId=${deposit.branchId}`,
          `cashDeposits.list({ externalCustomerId }) -> total=${page.total}`,
        ].join('\n'),
      );
    } catch (err) {
      this.log.set(`cashDeposits failed: ${describe(err)}`);
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
      // "LEARNING" for the first few sessions of any given customer — expected, not an error.
      this.log.set(`behavioral.report() -> status=${result.status}, stepUpRecommended=${result.stepUpRecommended}`);
    } catch (err) {
      this.log.set(`behavioral.report() failed: ${(err as Error).message}`);
    }
  }

  async startKyc(): Promise<void> {
    try {
      const { sessionId, url } = await this.protegey.client.kyc.startSession({ externalUserId: CUSTOMER_ID });
      this.kycSessionId = sessionId;
      // Web stays link-based — open it however fits your UI (a new tab here). There is no in-app
      // webview for the web SDK; that's a mobile-only concept (see @protegey/react-native-sdk /
      // protegey_sdk for Flutter).
      window.open(url, '_blank', 'noopener,noreferrer');
      this.log.set(`kyc.startSession() -> sessionId=${sessionId}, opened ${url} in a new tab`);
    } catch (err) {
      this.log.set(`kyc.startSession() failed: ${(err as Error).message}`);
    }
  }

  async checkKyc(): Promise<void> {
    if (!this.kycSessionId) {
      this.log.set('Start a KYC session first.');
      return;
    }
    try {
      // Polling fallback for the kyc.status_changed webhook.
      const session = await this.protegey.client.kyc.getSession(this.kycSessionId);
      // status = the final decision; recommendation = Protegey's own verdict (unchanged by a manual override).
      this.log.set(`kyc.getSession() -> status=${session.status}, outcome=${session.outcome}, recommendation=${session.recommendation}`);
      // Pre-signed links valid 1 hour — display/download them now, never store them.
      this.kycImages.set(
        Object.entries(session.images)
          .filter((entry): entry is [string, KycPresignedImage] => entry[1] !== null)
          .map(([name, image]) => ({ name, image })),
      );
    } catch (err) {
      this.log.set(`kyc.getSession() failed: ${describe(err)}`);
    }
  }

  async lookupKycByCustomer(): Promise<void> {
    try {
      // Exact match on your own customer id (unlike `search`, never partial).
      const page = await this.protegey.client.kyc.listSessions({ externalUserId: CUSTOMER_ID });
      const lines = page.data.map(
        (row) => `  ${row.sessionId} status=${row.status} recommendation=${row.recommendation} selfie=${row.images.selfie ? 'yes' : 'no'}`,
      );
      this.log.set([`kyc.listSessions({ externalUserId }) -> total=${page.total}`, ...lines].join('\n'));
    } catch (err) {
      this.log.set(`kyc.listSessions() failed: ${describe(err)}`);
    }
  }

  async listOpenAlerts(): Promise<void> {
    try {
      // Pass UPPERCASE filter values (the same casing responses use) — the SDK sends what the API expects.
      const page = await this.protegey.client.alerts.list({ status: 'OPEN', limit: 5 });
      const lines = page.data.map(
        (alert) => `  #${alert.alertNumber} ${alert.ruleCode} (${alert.ruleSeverity}) customer=${alert.externalCustomerId} verdict=${alert.decisionVerdict}`,
      );
      this.log.set([`alerts.list({ status: 'OPEN' }) -> total=${page.total}`, ...lines].join('\n'));
    } catch (err) {
      this.log.set(`alerts.list() failed: ${describe(err)}`);
    }
  }

  async inviteBusiness(): Promise<void> {
    try {
      // KYB invite: contactEmail and/or contactPhone (at least one). With a phone only, Protegey
      // sends no email — deliver applicationUrl yourself (SMS, WhatsApp, ...).
      const invited = await this.protegey.client.kyb.inviteApplicant({
        contactName: 'Demo Business Owner',
        contactPhone: `+2376${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      });
      this.log.set(`kyb.inviteApplicant() -> id=${invited.id}, status=${invited.status}, applicationUrl=${invited.applicationUrl}`);
    } catch (err) {
      this.log.set(`kyb.inviteApplicant() failed: ${describe(err)}`);
    }
  }

  async screenName(): Promise<void> {
    try {
      const result = await this.protegey.client.sanctions.screen({ name: 'John Doe', type: 'person' });
      this.log.set(`sanctions.screen() -> decision=${result.decision}, pepMatch=${result.pepMatch}, matches=${result.matches.length}`);
    } catch (err) {
      this.log.set(`sanctions.screen() failed: ${describe(err)}`);
    }
  }

  async checkSharedSignal(): Promise<void> {
    try {
      const result = await this.protegey.client.sharedSignals.check({ deviceFingerprint: this.visitorId, externalCustomerId: CUSTOMER_ID });
      this.log.set(
        `sharedSignals.check() -> flagged=${result.flagged}, category=${result.category}, flagConfidence=${result.flagConfidence}, matchCount=${result.matchCount}`,
      );
    } catch (err) {
      // 400 until the shared fraud signal network has been enabled on your account for 7 days.
      this.log.set(`sharedSignals.check() failed: ${describe(err)}`);
    }
  }
}
