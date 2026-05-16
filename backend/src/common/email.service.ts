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

export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** No-op provider: log email thay vì gửi thật. Dùng khi EMAIL_PROVIDER=log hoặc chưa cấu hình. */
class LogEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('EmailService[log-provider]');

  async send(message: EmailMessage): Promise<void> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;
    this.logger.log(
      `[NO-OP EMAIL] To: ${recipients} | Subject: "${message.subject}" | Body: ${(message.text ?? message.html ?? '').slice(0, 120)}`,
    );
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

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: ENV.EMAIL.SMTP_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(`Email sent successfully to ${message.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${message.to}`, error);
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
  }): Promise<void> {
    const statusText =
      opts.status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
    const reasonText = opts.reason ? ` Lý do: ${opts.reason}` : '';

    await this.provider.send({
      to: opts.recipientEmail,
      subject: `[HRM] Đơn nghỉ phép của bạn ${statusText}`,
      text: `Xin chào ${opts.employeeName},\n\nĐơn nghỉ phép của bạn ${statusText}.${reasonText}\n\nTrân trọng,\nHệ thống HRM`,
    });
  }

  async sendTimesheetNotification(opts: {
    recipientEmail: string;
    employeeName: string;
    month: number;
    year: number;
    status: 'submitted' | 'approved' | 'rejected';
    reason?: string;
  }): Promise<void> {
    const period = `${String(opts.month).padStart(2, '0')}/${opts.year}`;
    const statusText =
      opts.status === 'submitted'
        ? 'đã được gửi đi'
        : opts.status === 'approved'
          ? 'đã được duyệt'
          : 'đã bị từ chối';
    const reasonText = opts.reason ? ` Lý do: ${opts.reason}` : '';

    await this.provider.send({
      to: opts.recipientEmail,
      subject: `[HRM] Bảng công tháng ${period} ${statusText}`,
      text: `Xin chào ${opts.employeeName},\n\nBảng công tháng ${period} của bạn ${statusText}.${reasonText}\n\nTrân trọng,\nHệ thống HRM`,
    });
  }

  /** Generic send cho các notification khác */
  async send(message: EmailMessage): Promise<void> {
    await this.provider.send(message);
  }
}
