// backend/src/utils/email.js
import nodemailer from "nodemailer";
import { logger } from "./logger.js";

/**
 * NOTE:
 * - Set EMAIL_ENABLED=true to actually send emails.
 * - Otherwise we use a stub transporter that just logs messages.
 *
 * Supported configs:
 *   EMAIL_SERVICE=gmail  -> EMAIL_USER, EMAIL_PASSWORD
 *   EMAIL_SERVICE=sendgrid -> SENDGRID_API_KEY (SMTP)
 *   EMAIL_SERVICE=ses (SMTP is recommended) -> SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *   default SMTP -> SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE
 *
 * Required "from" fields:
 *   EMAIL_FROM or (EMAIL_USER as fallback)
 *   EMAIL_FROM_NAME (optional, default "VFXB")
 */

// ---------------- Templates ----------------
const emailTemplates = {
  "email-verification": {
    subject: "Verify Your Email Address - VFXB",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email Verification</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>🎬 VFXB</h1><p>AI-Powered Video Editing Platform</p></div><div class="content"><h2>Welcome, {{username}}!</h2><p>Thanks for joining VFXB. Please verify your email address to complete registration.</p><p><a href="{{verificationUrl}}" class="button">Verify Email Address</a></p><p>If the button doesn't work, copy this link:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p><p>This link expires in 24 hours.</p></div><div class="footer"><p>© 2024 VFXB. All rights reserved.</p></div></div></body></html>`,
  },
  "password-reset": {
    subject: "Reset Your Password - VFXB",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password Reset</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#e74c3c;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}.warning{background:#fff3cd;border:1px solid #ffeaa7;padding:15px;border-radius:5px;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1>🎬 VFXB</h1><p>Password Reset Request</p></div><div class="content"><h2>Reset Your Password</h2><p>Hello {{username}},</p><p>Click the button to reset your password:</p><p><a href="{{resetUrl}}" class="button">Reset Password</a></p><p>If the button doesn't work, use this link:</p><p><a href="{{resetUrl}}">{{resetUrl}}</a></p><div class="warning"><strong>⚠️ Security Notice:</strong><ul><li>Link expires in 1 hour</li><li>If you didn't request this, ignore this email</li></ul></div></div><div class="footer"><p>© 2024 VFXB. All rights reserved.</p></div></div></body></html>`,
  },
  welcome: {
    subject: "Welcome to VFXB - Start Creating Amazing Videos!",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#27ae60;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.feature{background:#fff;padding:20px;margin:15px 0;border-radius:5px;border-left:4px solid #667eea}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>🎬 Welcome to VFXB!</h1><p>Your AI-Powered Video Editing Journey Starts Here</p></div><div class="content"><h2>Hello {{username}}! 👋</h2><p>Your account is active. You're ready to create amazing videos.</p><p><a href="{{dashboardUrl}}" class="button">Go to Dashboard</a></p><p>Need help? Visit <a href="{{helpUrl}}">docs</a>.</p></div><div class="footer"><p>© 2024 VFXB. All rights reserved.</p></div></div></body></html>`,
  },
  "subscription-updated": {
    subject: "Subscription Updated - VFXB",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Subscription Updated</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.plan-details{background:#fff;padding:20px;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>🎬 VFXB</h1><p>Subscription Updated</p></div><div class="content"><h2>Subscription Updated Successfully! 🎉</h2><p>Hello {{username}},</p><p>Your subscription has been updated.</p><div class="plan-details"><h3>{{planName}} Plan</h3><p><strong>Status:</strong> {{status}}</p><p><strong>Billing Cycle:</strong> {{billingCycle}}</p><p><strong>Next Billing Date:</strong> {{nextBillingDate}}</p></div><p><a href="{{dashboardUrl}}" class="button">Go to Dashboard</a></p></div><div class="footer"><p>© 2024 VFXB. All rights reserved.</p></div></div></body></html>`,
  },
};

// --------------- Transporter (with safe fallback) ---------------
let transporter = null;

function createTransporter() {
  // Dev-friendly stub if email disabled
  if (process.env.EMAIL_ENABLED !== "true") {
    logger.warn(
      "EMAIL_ENABLED is not 'true' — using email stub (no real emails will be sent)."
    );
    return {
      async sendMail(opts) {
        logger.info("Email stub -> would send:", {
          to: opts.to,
          subject: opts.subject,
          hasHtml: !!opts.html,
        });
        return { accepted: [opts.to], messageId: "stub", response: "stubbed" };
      },
      verify(cb) {
        cb?.(null, true);
      },
    };
  }

  const svc = (process.env.EMAIL_SERVICE || "").toLowerCase();

  try {
    if (svc === "gmail") {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }

    if (svc === "sendgrid") {
      return nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: { user: "apikey", pass: process.env.SENDGRID_API_KEY },
      });
    }

    if (svc === "ses") {
      // Prefer SES via SMTP; set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD.
      if (!process.env.SMTP_HOST) {
        logger.warn(
          "EMAIL_SERVICE=ses but SMTP_HOST not set; falling back to stub."
        );
        return null;
      }
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }

    // Default: generic SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
    });
  } catch (err) {
    logger.error("Error creating transporter:", err);
    return null;
  }
}

function initTransporter() {
  transporter = createTransporter();

  if (!transporter) {
    // If EMAIL_ENABLED=true but transporter failed, fall back to stub to avoid crashing dev
    logger.warn("Email transporter not configured; falling back to stub.");
    transporter = {
      async sendMail(opts) {
        logger.warn("Email fallback stub -> would send:", {
          to: opts.to,
          subject: opts.subject,
        });
        return { accepted: [opts.to], messageId: "stub", response: "stubbed" };
      },
      verify(cb) {
        cb?.(null, true);
      },
    };
  }

  if (process.env.NODE_ENV !== "test") {
    transporter.verify((error) => {
      if (error) logger.error("Email transporter verification failed:", error);
      else logger.info("Email transporter is ready");
    });
  }
}

initTransporter();

// ---------------- Helpers ----------------
const renderTemplate = (template, data = {}) => {
  let rendered = template;
  for (const [key, val] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), val ?? "");
  }
  return rendered;
};

const stripHtml = (html = "") =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

// ---------------- Main API ----------------
export async function sendEmail(options) {
  const {
    to,
    subject,
    template,
    data = {},
    html,
    text,
    attachments = [],
    priority = "normal",
  } = options || {};

  if (!to) throw new Error("Recipient email address is required");
  if (!transporter) throw new Error("Email transporter not configured");

  let emailHtml = html;
  let emailSubject = subject;

  if (template && emailTemplates[template]) {
    emailHtml = renderTemplate(emailTemplates[template].html, data);
    emailSubject =
      subject || renderTemplate(emailTemplates[template].subject, data);
  }

  const mailOptions = {
    from: {
      name: process.env.EMAIL_FROM_NAME || "VFXB",
      address:
        process.env.EMAIL_FROM ||
        process.env.EMAIL_USER ||
        "no-reply@vfxb.local",
    },
    to: Array.isArray(to) ? to.join(", ") : to,
    subject: emailSubject,
    html: emailHtml,
    text: text || stripHtml(emailHtml || ""),
    attachments,
    headers: {
      "X-Mailer": "VFXB Backend",
      "X-Priority": priority === "high" ? "1" : "3",
    },
  };

  if (process.env.EMAIL_REPLY_TO) {
    mailOptions.replyTo = process.env.EMAIL_REPLY_TO;
  }

  const result = await transporter.sendMail(mailOptions);

  logger.info("Email sent", {
    to: mailOptions.to,
    subject: emailSubject,
    template,
    messageId: result?.messageId,
  });

  return {
    success: true,
    messageId: result?.messageId,
    response: result?.response,
  };
}

export async function sendBulkEmail(emails) {
  const results = [];
  const batchSize = 10;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (opts) => {
        try {
          const r = await sendEmail(opts);
          return { success: true, ...r };
        } catch (e) {
          return { success: false, error: e.message, to: opts.to };
        }
      })
    );
    results.push(...batchResults);

    if (i + batchSize < emails.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;
  logger.info(`Bulk email done: ${successful} ok, ${failed} failed`);

  return { total: emails.length, successful, failed, results };
}

// ---------------- Convenience helpers ----------------
export function sendVerificationEmail(user, verificationToken) {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: user.email,
    template: "email-verification",
    data: { username: user.username, verificationUrl },
  });
}

export function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: user.email,
    template: "password-reset",
    data: { username: user.username, resetUrl },
  });
}

export function sendWelcomeEmail(user) {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
  const helpUrl = `${process.env.FRONTEND_URL}/help`;
  return sendEmail({
    to: user.email,
    template: "welcome",
    data: { username: user.username, dashboardUrl, helpUrl },
  });
}

export function sendSubscriptionUpdateEmail(user, subscription) {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
  return sendEmail({
    to: user.email,
    template: "subscription-updated",
    data: {
      username: user.username,
      planName:
        subscription.plan?.charAt(0).toUpperCase() +
        subscription.plan?.slice(1),
      status: subscription.status,
      billingCycle: subscription.billingCycle || "N/A",
      nextBillingDate: subscription.endDate
        ? new Date(subscription.endDate).toLocaleDateString()
        : "N/A",
      dashboardUrl,
    },
  });
}

// ---------------- Simple email queue ----------------
export class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
  }

  async add(emailOptions, priority = "normal") {
    this.queue.push({
      ...emailOptions,
      priority,
      retries: 0,
      addedAt: new Date(),
    });

    this.queue.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      return a.addedAt - b.addedAt;
    });

    if (!this.processing) this.process();
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length) {
      const emailOptions = this.queue.shift();
      try {
        await sendEmail(emailOptions);
        logger.info(`Queued email sent to ${emailOptions.to}`);
      } catch (error) {
        emailOptions.retries++;
        if (emailOptions.retries < this.maxRetries) {
          this.queue.unshift(emailOptions);
          logger.warn(
            `Email failed, retrying (${emailOptions.retries}/${this.maxRetries}): ${error.message}`
          );
        } else {
          logger.error(
            `Email failed permanently after ${this.maxRetries} retries: ${error.message}`
          );
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    this.processing = false;
  }

  getQueueLength() {
    return this.queue.length;
  }
  clear() {
    this.queue = [];
  }
}

export const emailQueue = new EmailQueue();
