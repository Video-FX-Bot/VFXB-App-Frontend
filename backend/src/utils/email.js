import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

// Email templates
const emailTemplates = {
  'email-verification': {
    subject: 'Verify Your Email Address - VFXB',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 VFXB</h1>
            <p>AI-Powered Video Editing Platform</p>
          </div>
          <div class="content">
            <h2>Welcome, {{username}}!</h2>
            <p>Thank you for joining VFXB. To complete your registration and start creating amazing videos with AI assistance, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>
            <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with VFXB, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 VFXB. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  'password-reset': {
    subject: 'Reset Your Password - VFXB',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 VFXB</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello {{username}},</p>
            <p>We received a request to reset your password for your VFXB account. If you made this request, click the button below to reset your password:</p>
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This reset link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            <p>For security reasons, we recommend using a strong, unique password that you don't use for other accounts.</p>
          </div>
          <div class="footer">
            <p>© 2024 VFXB. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  'welcome': {
    subject: 'Welcome to VFXB - Start Creating Amazing Videos!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VFXB</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Welcome to VFXB!</h1>
            <p>Your AI-Powered Video Editing Journey Starts Here</p>
          </div>
          <div class="content">
            <h2>Hello {{username}}! 👋</h2>
            <p>Congratulations! Your email has been verified and your VFXB account is now active. You're ready to start creating amazing videos with the power of AI.</p>
            
            <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
            
            <h3>🚀 What you can do with VFXB:</h3>
            
            <div class="feature">
              <h4>💬 Chat-Based Video Editing</h4>
              <p>Simply tell our AI what you want to do with your video in natural language. "Trim the first 10 seconds" or "Add a vintage filter" - it's that easy!</p>
            </div>
            
            <div class="feature">
              <h4>🎨 Advanced AI Effects</h4>
              <p>Apply professional-grade filters, color corrections, and visual effects with just a few words.</p>
            </div>
            
            <div class="feature">
              <h4>🎵 Audio Enhancement</h4>
              <p>Remove background noise, enhance audio quality, and add transcriptions automatically.</p>
            </div>
            
            <div class="feature">
              <h4>📊 Smart Analytics</h4>
              <p>Get AI-powered insights about your videos and suggestions for improvements.</p>
            </div>
            
            <h3>🎯 Quick Start Tips:</h3>
            <ol>
              <li>Upload your first video</li>
              <li>Start a chat conversation about what you want to edit</li>
              <li>Watch as AI transforms your video in real-time</li>
              <li>Export and share your masterpiece!</li>
            </ol>
            
            <p>Need help? Check out our <a href="{{helpUrl}}">documentation</a> or reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 VFXB. All rights reserved.</p>
            <p>Happy editing! 🎬✨</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  'subscription-updated': {
    subject: 'Subscription Updated - VFXB',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .plan-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 VFXB</h1>
            <p>Subscription Updated</p>
          </div>
          <div class="content">
            <h2>Subscription Updated Successfully! 🎉</h2>
            <p>Hello {{username}},</p>
            <p>Your VFXB subscription has been updated. Here are your new plan details:</p>
            
            <div class="plan-details">
              <h3>{{planName}} Plan</h3>
              <p><strong>Status:</strong> {{status}}</p>
              <p><strong>Billing Cycle:</strong> {{billingCycle}}</p>
              <p><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>
            </div>
            
            <p>Your new features and limits are now active. Enjoy creating with VFXB!</p>
            
            <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
          </div>
          <div class="footer">
            <p>© 2024 VFXB. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Create email transporter
let transporter;

const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'ses') {
    return nodemailer.createTransporter({
      SES: {
        aws: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        }
      }
    });
  } else {
    // SMTP configuration
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  }
};

// Initialize transporter
try {
  transporter = createTransporter();
  
  // Verify transporter configuration
  if (process.env.NODE_ENV !== 'test') {
    transporter.verify((error, success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error);
      } else {
        logger.info('Email transporter is ready');
      }
    });
  }
} catch (error) {
  logger.error('Failed to create email transporter:', error);
}

// Template rendering function
const renderTemplate = (template, data) => {
  let rendered = template;
  
  // Replace placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, data[key] || '');
  });
  
  return rendered;
};

// Main email sending function
export const sendEmail = async (options) => {
  try {
    const {
      to,
      subject,
      template,
      data = {},
      html,
      text,
      attachments = [],
      priority = 'normal'
    } = options;
    
    if (!to) {
      throw new Error('Recipient email address is required');
    }
    
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }
    
    let emailHtml = html;
    let emailSubject = subject;
    
    // Use template if provided
    if (template && emailTemplates[template]) {
      emailHtml = renderTemplate(emailTemplates[template].html, data);
      emailSubject = subject || renderTemplate(emailTemplates[template].subject, data);
    }
    
    // Email options
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'VFXB',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: emailSubject,
      html: emailHtml,
      text: text || stripHtml(emailHtml),
      attachments,
      priority: priority === 'high' ? 'high' : 'normal',
      headers: {
        'X-Mailer': 'VFXB Backend',
        'X-Priority': priority === 'high' ? '1' : '3'
      }
    };
    
    // Add reply-to if specified
    if (process.env.EMAIL_REPLY_TO) {
      mailOptions.replyTo = process.env.EMAIL_REPLY_TO;
    }
    
    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      to: mailOptions.to,
      subject: emailSubject,
      template,
      messageId: result.messageId
    });
    
    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };
    
  } catch (error) {
    logger.error('Failed to send email:', {
      error: error.message,
      to: options.to,
      template: options.template,
      subject: options.subject
    });
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Bulk email sending function
export const sendBulkEmail = async (emails) => {
  const results = [];
  const batchSize = 10; // Send emails in batches to avoid rate limits
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (emailOptions) => {
      try {
        const result = await sendEmail(emailOptions);
        return { success: true, ...result };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          to: emailOptions.to
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.info(`Bulk email completed: ${successful} successful, ${failed} failed`);
  
  return {
    total: emails.length,
    successful,
    failed,
    results
  };
};

// Email verification helper
export const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  return sendEmail({
    to: user.email,
    template: 'email-verification',
    data: {
      username: user.username,
      verificationUrl
    }
  });
};

// Password reset helper
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to: user.email,
    template: 'password-reset',
    data: {
      username: user.username,
      resetUrl
    }
  });
};

// Welcome email helper
export const sendWelcomeEmail = async (user) => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
  const helpUrl = `${process.env.FRONTEND_URL}/help`;
  
  return sendEmail({
    to: user.email,
    template: 'welcome',
    data: {
      username: user.username,
      dashboardUrl,
      helpUrl
    }
  });
};

// Subscription update helper
export const sendSubscriptionUpdateEmail = async (user, subscription) => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
  
  return sendEmail({
    to: user.email,
    template: 'subscription-updated',
    data: {
      username: user.username,
      planName: subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
      status: subscription.status,
      billingCycle: subscription.billingCycle || 'N/A',
      nextBillingDate: subscription.endDate ? 
        new Date(subscription.endDate).toLocaleDateString() : 'N/A',
      dashboardUrl
    }
  });
};

// Utility function to strip HTML tags
const stripHtml = (html) => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// Email queue for handling high volume (optional)
export class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
  }
  
  async add(emailOptions, priority = 'normal') {
    this.queue.push({
      ...emailOptions,
      priority,
      retries: 0,
      addedAt: new Date()
    });
    
    // Sort by priority (high priority first)
    this.queue.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.addedAt - b.addedAt;
    });
    
    if (!this.processing) {
      this.process();
    }
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const emailOptions = this.queue.shift();
      
      try {
        await sendEmail(emailOptions);
        logger.info(`Queued email sent successfully to ${emailOptions.to}`);
      } catch (error) {
        emailOptions.retries++;
        
        if (emailOptions.retries < this.maxRetries) {
          // Re-queue for retry
          this.queue.unshift(emailOptions);
          logger.warn(`Email failed, retrying (${emailOptions.retries}/${this.maxRetries}): ${error.message}`);
        } else {
          logger.error(`Email failed permanently after ${this.maxRetries} retries: ${error.message}`);
        }
      }
      
      // Add delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
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

// Export email queue instance
export const emailQueue = new EmailQueue();