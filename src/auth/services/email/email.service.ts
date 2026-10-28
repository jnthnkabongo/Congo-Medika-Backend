// import { Injectable, ServiceUnavailableException } from '@nestjs/common';
// import * as nodemailer from 'nodemailer';

// @Injectable()
// export class EmailService {
//   async sendCode(email: string, code: string, purpose: 'EMAIL_VERIFICATION' | 'LOGIN_2FA') {
//     const host = process.env.SMTP_HOST;
//     const user = process.env.SMTP_USER;
//     const pass = process.env.SMTP_PASSWORD;
//     const from = process.env.SMTP_FROM || user;
//     if (!host || !user || !pass || !from) {
//       throw new ServiceUnavailableException("L'envoi d'e-mails n'est pas configuré. Complétez les variables SMTP.");
//     }
//     const transporter = nodemailer.createTransport({
//       host, port: Number(process.env.SMTP_PORT || 587),
//       secure: process.env.SMTP_SECURE === 'true',
//       auth: { user, pass },
//     });
//     const subject = purpose === 'EMAIL_VERIFICATION' ? 'Vérification de votre adresse e-mail' : 'Code de connexion sécurisé';
//     await transporter.sendMail({
//       from, to: email, subject,
//       text: `Votre code est ${code}. Il expire dans 5 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
//       html: `<p>Votre code de sécurité est :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Il expire dans 5 minutes et ne peut être utilisé qu'une seule fois.</p>`,
//     });
//   }
// }
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.apiKey = process.env.API_KEY || '';
    this.senderEmail = process.env.EMAIL_FROM || '';
    this.senderName = "Congo Medika";

    if (this.apiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'be357b001@smtp-brevo.com',
          pass: this.apiKey,
        },
      });
      this.logger.log('Brevo email service initialisé (SMTP)');
    } else {
      this.logger.warn('Brevo API key non configurée - email désactivé');
    }
  }

  async sendEmail(message: EmailMessage): Promise<boolean> {
    if (!this.apiKey || !this.transporter) {
      this.logger.warn('Brevo non configuré - email ignoré');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: {
          name: this.senderName,
          address: this.senderEmail || 'djodjokabongo11@gmail.com',
        },
        to: message.to,
        subject: message.subject,
        html: message.htmlContent,
      });

      this.logger.log(`Email envoyé à ${message.to}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Erreur envoi email à ${message.to}: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  async sendEmails(
    messages: EmailMessage[],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      const success = await this.sendEmail(msg);
      if (success) sent++;
      else failed++;
    }

    this.logger.log(`Emails batch: ${sent} envoyés, ${failed} échecs`);
    return { sent, failed };
  }
}