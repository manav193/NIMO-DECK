export interface WebhookDeliveryRecord {
  deliveryId: string;
  receivedAt: number;
}

export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
  eventType?: string;
  deliveryId?: string;
}

export type GitHubWebhookEvent =
  | 'push'
  | 'pull_request'
  | 'issues'
  | 'ping';
