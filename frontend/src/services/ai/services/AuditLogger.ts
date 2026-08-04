export class AuditLogger {
  log(event: { feature: string; provider: string; latencyMs: number; success: boolean; tokensEstimated?: number }) {
    console.log('[AI Audit Log]', new Date().toISOString(), event);
  }
}
