/**
 * email.service.ts
 *
 * EmailService abstraction cho toàn bộ hệ thống.
 *
 * Hiện tại dùng LogEmailProvider (no-op):
 *   - Không gửi email thật.
 *   - Chỉ log ra console / NestJS Logger.
 *   - Phù hợp cho môi trường dev/demo khi chưa có SMTP credentials.
 *
 * Để tích hợp SMTP thật (Nodemailer, Resend, SendGrid, ...):
 *   1. Thêm env vars EMAIL_PROVIDER, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 *   2. Implement SmtpEmailProvider extends IEmailProvider.
 *   3. Đổi provider trong EmailService constructor theo EMAIL_PROVIDER.
 *
 * Production readiness: DEMO / NOT PRODUCTION-READY
 */

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ENV } from './env';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailDeliveryResult {
  provider: 'log' | 'smtp' | 'resend' | 'gmail_api' | 'gas_webhook';
  attempted: boolean;
  sent: boolean;
  message: string;
  error?: string;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

/** No-op provider: log email thay vì gửi thật. Dùng khi EMAIL_PROVIDER=log hoặc chưa cấu hình. */
class LogEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('EmailService[log-provider]');

  send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;
    this.logger.log(
      `[NO-OP EMAIL] To: ${recipients} | Subject: "${message.subject}" | Body: ${(message.text ?? message.html ?? '').slice(0, 120)}`,
    );
    return Promise.resolve({
      provider: 'log',
      attempted: false,
      sent: false,
      message: 'EMAIL_LOGGED_ONLY',
    });
  }
}

/** SMTP provider: gửi email thật qua SMTP server. */
class SmtpEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('EmailService[smtp-provider]');
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: ENV.EMAIL.SMTP_HOST,
      port: ENV.EMAIL.SMTP_PORT,
      secure: ENV.EMAIL.SMTP_PORT === 465,
      auth: {
        user: ENV.EMAIL.SMTP_USER,
        pass: ENV.EMAIL.SMTP_PASS,
      },
    });
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;

    try {
      await this.transporter.sendMail({
        from: ENV.EMAIL.SMTP_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(`Email sent successfully to ${recipients}`);
      return {
        provider: 'smtp',
        attempted: true,
        sent: true,
        message: 'EMAIL_SENT',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${recipients}`, error);
      return {
        provider: 'smtp',
        attempted: true,
        sent: false,
        message: 'EMAIL_SEND_FAILED',
        error: errorMessage,
      };
    }
  }
}

/** Resend provider: gửi email qua Resend HTTP API. */
class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('EmailService[resend-provider]');

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;

    const fromAddress =
      ENV.EMAIL.SMTP_FROM &&
      ENV.EMAIL.SMTP_FROM !== '"HRM System" <no-reply@hrm.com>'
        ? ENV.EMAIL.SMTP_FROM
        : 'HRM System <onboarding@resend.dev>';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.EMAIL.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Resend API error response: ${errorData}`);
        return {
          provider: 'resend',
          attempted: true,
          sent: false,
          message: 'EMAIL_SEND_FAILED',
          error: `Resend API returned status ${response.status}: ${errorData}`,
        };
      }

      const resJson = (await response.json()) as { id?: string };
      this.logger.log(
        `Email sent successfully via Resend to ${recipients}. ID: ${resJson?.id}`,
      );

      return {
        provider: 'resend',
        attempted: true,
        sent: true,
        message: 'EMAIL_SENT',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email via Resend to ${recipients}`,
        error,
      );
      return {
        provider: 'resend',
        attempted: true,
        sent: false,
        message: 'EMAIL_SEND_FAILED',
        error: errorMessage,
      };
    }
  }
}

/** Gmail API provider: gửi email qua Google Gmail API HTTP (port 443). */
class GmailApiEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('EmailService[gmail-api-provider]');

  private async getAccessToken(): Promise<string> {
    const clientId = ENV.EMAIL.GMAIL?.CLIENT_ID;
    const clientSecret = ENV.EMAIL.GMAIL?.CLIENT_SECRET;
    const refreshToken = ENV.EMAIL.GMAIL?.REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Thiếu GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET hoặc GMAIL_REFRESH_TOKEN',
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to refresh Gmail access token: ${response.status} - ${errorText}`,
      );
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;

    const fromAddress =
      ENV.EMAIL.SMTP_FROM || '"HRM System" <no-reply@hrm.com>';

    try {
      const accessToken = await this.getAccessToken();

      // Compose RFC 2822 MIME message
      const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;
      const headers = [
        `From: ${fromAddress}`,
        `To: ${recipients}`,
        `Subject: =?utf-8?B?${Buffer.from(message.subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
      ];

      const bodyParts: string[] = [];

      if (message.text) {
        bodyParts.push(
          `--${boundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          Buffer.from(message.text).toString('base64'),
        );
      }

      if (message.html) {
        bodyParts.push(
          `--${boundary}`,
          'Content-Type: text/html; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          Buffer.from(message.html).toString('base64'),
        );
      } else if (!message.text && !message.html) {
        bodyParts.push(
          `--${boundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          '',
        );
      }

      bodyParts.push(`--${boundary}--`);

      const rawMime = [...headers, ...bodyParts].join('\r\n');

      // base64url encode MIME string for Gmail API
      const base64UrlSafe = Buffer.from(rawMime).toString('base64url');

      const sendResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: base64UrlSafe,
          }),
        },
      );

      if (!sendResponse.ok) {
        const errorData = await sendResponse.text();
        this.logger.error(`Gmail API error response: ${errorData}`);
        return {
          provider: 'gmail_api',
          attempted: true,
          sent: false,
          message: 'EMAIL_SEND_FAILED',
          error: `Gmail API returned status ${sendResponse.status}: ${errorData}`,
        };
      }

      const resJson = (await sendResponse.json()) as { id?: string };
      this.logger.log(
        `Email sent successfully via Gmail API to ${recipients}. ID: ${resJson?.id}`,
      );

      return {
        provider: 'gmail_api',
        attempted: true,
        sent: true,
        message: 'EMAIL_SENT',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email via Gmail API to ${recipients}`,
        error,
      );
      return {
        provider: 'gmail_api',
        attempted: true,
        sent: false,
        message: 'EMAIL_SEND_FAILED',
        error: errorMessage,
      };
    }
  }
}

/** Google Apps Script Webhook provider: gửi email qua URL webhook (thường dùng cho Google Apps Script). */
class GasWebhookEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('EmailService[gas-webhook-provider]');

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;

    try {
      const htmlContent =
        message.html ||
        (message.text ? message.text.replace(/\n/g, '<br>') : '');

      const response = await fetch(ENV.EMAIL.GAS_WEBHOOK_URL as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipients,
          subject: message.subject,
          text: message.text || '',
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`GAS Webhook HTTP error: ${errorData}`);
        return {
          provider: 'gas_webhook',
          attempted: true,
          sent: false,
          message: 'EMAIL_SEND_FAILED',
          error: `HTTP ${response.status}: ${errorData}`,
        };
      }

      // Read JSON response from GAS script
      const resData = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (resData && resData.success === false) {
        this.logger.error(`GAS Webhook logical error: ${resData.message}`);
        return {
          provider: 'gas_webhook',
          attempted: true,
          sent: false,
          message: 'EMAIL_SEND_FAILED',
          error: `GAS Error: ${resData.message}`,
        };
      }

      this.logger.log(
        `Email sent successfully via GAS Webhook to ${recipients}. GAS Response: ${JSON.stringify(resData)}`,
      );

      return {
        provider: 'gas_webhook',
        attempted: true,
        sent: true,
        message: 'EMAIL_SENT',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email via GAS Webhook to ${recipients}`,
        error,
      );
      return {
        provider: 'gas_webhook',
        attempted: true,
        sent: false,
        message: 'EMAIL_SEND_FAILED',
        error: errorMessage,
      };
    }
  }
}

@Injectable()
export class EmailService {
  private readonly provider: IEmailProvider;

  constructor() {
    const emailProvider = ENV.EMAIL.PROVIDER;

    if (emailProvider === 'smtp') {
      if (
        !ENV.EMAIL.SMTP_HOST ||
        !ENV.EMAIL.SMTP_USER ||
        !ENV.EMAIL.SMTP_PASS
      ) {
        new Logger('EmailService').warn(
          'SMTP_HOST, SMTP_USER hoặc SMTP_PASS thiếu. Fallback về log-provider.',
        );
        this.provider = new LogEmailProvider();
      } else {
        this.provider = new SmtpEmailProvider();
      }
    } else if (emailProvider === 'resend') {
      if (!ENV.EMAIL.RESEND_API_KEY) {
        new Logger('EmailService').warn(
          'RESEND_API_KEY thiếu. Fallback về log-provider.',
        );
        this.provider = new LogEmailProvider();
      } else {
        this.provider = new ResendEmailProvider();
      }
    } else if (emailProvider === 'gmail_api') {
      if (
        !ENV.EMAIL.GMAIL?.CLIENT_ID ||
        !ENV.EMAIL.GMAIL?.CLIENT_SECRET ||
        !ENV.EMAIL.GMAIL?.REFRESH_TOKEN
      ) {
        new Logger('EmailService').warn(
          'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET hoặc GMAIL_REFRESH_TOKEN thiếu. Fallback về log-provider.',
        );
        this.provider = new LogEmailProvider();
      } else {
        this.provider = new GmailApiEmailProvider();
      }
    } else if (emailProvider === 'gas_webhook') {
      if (!ENV.EMAIL.GAS_WEBHOOK_URL) {
        new Logger('EmailService').warn(
          'GAS_EMAIL_WEBHOOK_URL thiếu. Fallback về log-provider.',
        );
        this.provider = new LogEmailProvider();
      } else {
        this.provider = new GasWebhookEmailProvider();
      }
    } else {
      if (emailProvider !== 'log') {
        new Logger('EmailService').warn(
          `EMAIL_PROVIDER="${emailProvider}" chưa được hỗ trợ. Dùng log-provider.`,
        );
      }
      this.provider = new LogEmailProvider();
    }
  }

  async sendLeaveNotification(opts: {
    recipientEmail: string;
    employeeName: string;
    status: 'approved' | 'rejected';
    reason?: string;
    leaveApplicationID: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    reviewerName: string;
    reviewedAt: Date;
  }): Promise<EmailDeliveryResult> {
    const statusText =
      opts.status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';

    // Helper to format date and time in Vietnam timezone
    const formatDate = (date: Date) =>
      date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const formatDateTime = (date: Date) =>
      date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // Calculate work resume date (next working day after endDate)
    const workResumeDate = new Date(opts.endDate);
    workResumeDate.setDate(workResumeDate.getDate() + 1);
    if (workResumeDate.getDay() === 6) {
      // Saturday -> Monday
      workResumeDate.setDate(workResumeDate.getDate() + 2);
    } else if (workResumeDate.getDay() === 0) {
      // Sunday -> Monday
      workResumeDate.setDate(workResumeDate.getDate() + 1);
    }

    const textBody = `Xin chào ${opts.employeeName},\n\nĐơn xin nghỉ phép của bạn ${statusText}.\n${opts.status === 'rejected' && opts.reason ? `Lý do từ chối: ${opts.reason}\n\n` : '\n'}Thông tin chi tiết:\n- Loại đơn: Đơn xin nghỉ phép\n- Mã đơn: ${opts.leaveApplicationID}\n- Thời gian tạo: ${formatDateTime(opts.createdAt)}\n- Ngày nghỉ: Từ ngày ${formatDate(opts.startDate)} đến ngày ${formatDate(opts.endDate)}\n- Ngày bắt đầu làm việc: ${formatDate(workResumeDate)}\n- Người duyệt: ${opts.reviewerName}\n- Thời gian duyệt: ${formatDateTime(opts.reviewedAt)}\n\nTrân trọng,\nHệ thống HRM`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Xin chào ${opts.employeeName},</h2>
        <p>Đơn xin nghỉ phép của bạn <strong>${statusText}</strong>.</p>
        ${opts.status === 'rejected' && opts.reason ? `<p><strong>Lý do từ chối:</strong> <span style="color: red;">${opts.reason}</span></p>` : ''}
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Thông tin chi tiết:</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;"><strong>Loại đơn:</strong> Đơn xin nghỉ phép</li>
            <li style="margin-bottom: 8px;"><strong>Mã đơn:</strong> ${opts.leaveApplicationID}</li>
            <li style="margin-bottom: 8px;"><strong>Thời gian tạo:</strong> ${formatDateTime(opts.createdAt)}</li>
            <li style="margin-bottom: 8px;"><strong>Ngày nghỉ:</strong> Từ ngày ${formatDate(opts.startDate)} đến ngày ${formatDate(opts.endDate)}</li>
            <li style="margin-bottom: 8px;"><strong>Ngày bắt đầu làm việc:</strong> ${formatDate(workResumeDate)}</li>
            <li style="margin-bottom: 8px;"><strong>Người duyệt:</strong> ${opts.reviewerName}</li>
            <li style="margin-bottom: 8px;"><strong>Thời gian duyệt:</strong> ${formatDateTime(opts.reviewedAt)}</li>
          </ul>
        </div>
        
        <p>Trân trọng,<br><strong>Hệ thống HRM</strong></p>
      </div>
    `;

    return this.provider.send({
      to: opts.recipientEmail,
      subject: `[HRM] Đơn nghỉ phép của bạn ${statusText}`,
      text: textBody,
      html: htmlBody,
    });
  }

  async sendTimesheetNotification(opts: {
    recipientEmail: string;
    employeeName: string;
    month: number;
    year: number;
    status: 'submitted' | 'approved' | 'rejected';
    reason?: string;
  }): Promise<EmailDeliveryResult> {
    const period = `${String(opts.month).padStart(2, '0')}/${opts.year}`;
    const statusText =
      opts.status === 'submitted'
        ? 'đã được gửi đi'
        : opts.status === 'approved'
          ? 'đã được duyệt'
          : 'đã bị từ chối';
    const reasonText = opts.reason ? ` Lý do: ${opts.reason}` : '';

    return this.provider.send({
      to: opts.recipientEmail,
      subject: `[HRM] Bảng công tháng ${period} ${statusText}`,
      text: `Xin chào ${opts.employeeName},\n\nBảng công tháng ${period} của bạn ${statusText}.${reasonText}\n\nTrân trọng,\nHệ thống HRM`,
    });
  }

  async sendCorrectionNotification(opts: {
    recipientEmail: string;
    employeeName: string;
    status: 'approved' | 'rejected';
    reason?: string;
    correctionID: string;
    date: string;
    oldCheckIn: string;
    oldCheckOut: string;
    proposedCheckIn: string;
    proposedCheckOut: string;
    createdAt: Date;
    reviewerName: string;
    reviewedAt: Date;
  }): Promise<EmailDeliveryResult> {
    const statusText =
      opts.status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';

    // Helper to format date and time in Vietnam timezone
    const formatDateTime = (date: Date) =>
      date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const textBody = `Xin chào ${opts.employeeName},\n\nYêu cầu chỉnh sửa công của bạn ${statusText}.\n${opts.status === 'rejected' && opts.reason ? `Lý do từ chối: ${opts.reason}\n\n` : '\n'}Thông tin chi tiết:\n- Loại đơn: Yêu cầu chỉnh sửa công\n- Mã yêu cầu: ${opts.correctionID}\n- Ngày cần sửa: ${opts.date}\n- Giờ Check-in / Check-out cũ: ${opts.oldCheckIn} - ${opts.oldCheckOut}\n- Giờ Check-in / Check-out sửa đổi: ${opts.proposedCheckIn} - ${opts.proposedCheckOut}\n- Thời gian tạo: ${formatDateTime(opts.createdAt)}\n- Người duyệt: ${opts.reviewerName}\n- Thời gian duyệt: ${formatDateTime(opts.reviewedAt)}\n\nTrân trọng,\nHệ thống HRM`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Xin chào ${opts.employeeName},</h2>
        <p>Yêu cầu chỉnh sửa công của bạn <strong>${statusText}</strong>.</p>
        ${opts.status === 'rejected' && opts.reason ? `<p><strong>Lý do từ chối:</strong> <span style="color: red;">${opts.reason}</span></p>` : ''}
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Thông tin chi tiết:</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;"><strong>Loại đơn:</strong> Yêu cầu chỉnh sửa công</li>
            <li style="margin-bottom: 8px;"><strong>Mã yêu cầu:</strong> ${opts.correctionID}</li>
            <li style="margin-bottom: 8px;"><strong>Ngày cần sửa:</strong> ${opts.date}</li>
            <li style="margin-bottom: 8px;"><strong>Giờ Check-in / Check-out cũ:</strong> ${opts.oldCheckIn} - ${opts.oldCheckOut}</li>
            <li style="margin-bottom: 8px;"><strong>Giờ Check-in / Check-out sửa đổi:</strong> ${opts.proposedCheckIn} - ${opts.proposedCheckOut}</li>
            <li style="margin-bottom: 8px;"><strong>Thời gian tạo:</strong> ${formatDateTime(opts.createdAt)}</li>
            <li style="margin-bottom: 8px;"><strong>Người duyệt:</strong> ${opts.reviewerName}</li>
            <li style="margin-bottom: 8px;"><strong>Thời gian duyệt:</strong> ${formatDateTime(opts.reviewedAt)}</li>
          </ul>
        </div>
        
        <p>Trân trọng,<br><strong>Hệ thống HRM</strong></p>
      </div>
    `;

    return this.provider.send({
      to: opts.recipientEmail,
      subject: `[HRM] Yêu cầu chỉnh sửa công của bạn ${statusText}`,
      text: textBody,
      html: htmlBody,
    });
  }

  /** Generic send cho các notification khác */
  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    return this.provider.send(message);
  }
}
