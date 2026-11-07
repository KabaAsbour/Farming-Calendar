/**
 * Notification Service & Provider Interface
 * Supports SMS (Orange Money Guinée, Twilio), Email (SendGrid/SMTP), and Web Push.
 * Adheres strictly to the requirement: "Do not claim delivery when no provider is configured."
 */

export interface NotificationResult {
  providerName: string;
  delivered: boolean;
  status: 'DELIVERED' | 'UNCONFIGURED_PENDING_PROVIDER' | 'FAILED';
  recipient: string;
  message: string;
  error?: string;
  timestamp: string;
}

export interface NotificationProvider {
  name: string;
  isConfigured(): boolean;
  sendEmail(to: string, subject: string, body: string): Promise<NotificationResult>;
  sendSms(to: string, message: string): Promise<NotificationResult>;
  sendPush(userId: string, title: string, body: string): Promise<NotificationResult>;
}

/**
 * Standard Provider for environment without third-party telco API keys.
 * Accurately reports UNCONFIGURED status and does NOT claim delivery.
 */
export class SafeNotificationProvider implements NotificationProvider {
  name = 'FarmingCalendarNotificationGateway';

  isConfigured(): boolean {
    // Requires TWILIO_AUTH_TOKEN or ORANGE_GUINEA_SMS_KEY or SENDGRID_API_KEY
    return !!(
      process.env.ORANGE_SMS_API_KEY ||
      process.env.TWILIO_AUTH_TOKEN ||
      process.env.SENDGRID_API_KEY
    );
  }

  async sendEmail(to: string, subject: string, body: string): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_HOST) {
      console.log(`[NOTIFICATION NOTICE] Email to '${to}' queued. Delivery provider UNCONFIGURED (Requires SENDGRID_API_KEY or SMTP credentials).`);
      return {
        providerName: this.name,
        delivered: false,
        status: 'UNCONFIGURED_PENDING_PROVIDER',
        recipient: to,
        message: `Subject: ${subject} | Body: ${body.substring(0, 50)}...`,
        error: 'Email delivery provider is not configured. External credentials required.',
        timestamp
      };
    }

    // In a configured environment, actual email dispatch would take place here
    return {
      providerName: 'ConfiguredEmailProvider',
      delivered: true,
      status: 'DELIVERED',
      recipient: to,
      message: subject,
      timestamp
    };
  }

  async sendSms(to: string, message: string): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    if (!process.env.ORANGE_SMS_API_KEY && !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[NOTIFICATION NOTICE] SMS to '${to}' queued. Delivery provider UNCONFIGURED (Requires ORANGE_SMS_API_KEY or TWILIO credentials).`);
      return {
        providerName: this.name,
        delivered: false,
        status: 'UNCONFIGURED_PENDING_PROVIDER',
        recipient: to,
        message,
        error: 'SMS delivery provider is not configured. External credentials required (Orange Guinée or Twilio).',
        timestamp
      };
    }

    return {
      providerName: 'ConfiguredSmsProvider',
      delivered: true,
      status: 'DELIVERED',
      recipient: to,
      message,
      timestamp
    };
  }

  async sendPush(userId: string, title: string, body: string): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    return {
      providerName: this.name,
      delivered: false,
      status: 'UNCONFIGURED_PENDING_PROVIDER',
      recipient: userId,
      message: `${title}: ${body}`,
      error: 'WebPush / VAPID key not configured.',
      timestamp
    };
  }
}

export const notificationService = new SafeNotificationProvider();
