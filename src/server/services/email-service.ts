
'use server';

import nodemailer from 'nodemailer';
import { getAdminSettings } from '@/server/actions/admin-actions';
import type { EmailTemplates } from '@/contexts/admin-settings-context';

type TemplateKey = keyof EmailTemplates;
type TemplateData = Record<string, string | number | undefined>;

interface SendEmailParams {
    to: 'admin' | string;
    templateKey: TemplateKey;
    data: TemplateData;
}

export async function sendEmail({ to, templateKey, data }: SendEmailParams) {
    const { emailSettings, emailTemplates, appName } = await getAdminSettings();

    // Validate SMTP configuration before attempting to send
    if (!emailSettings.smtpHost) {
        const error = new Error('SMTP host is not configured. Please configure SMTP settings in admin panel.');
        console.error(`SMTP is not configured. Cannot send email for template: ${templateKey}.`);
        throw error;
    }

    if (!emailSettings.smtpUser || !emailSettings.smtpPass) {
        const error = new Error('SMTP authentication credentials are not configured. Please configure SMTP username and password.');
        console.error('SMTP credentials missing.');
        throw error;
    }

    if (!emailSettings.fromAdminEmail) {
        const error = new Error('From email address is not configured. Please set the sender email address.');
        console.error('From email address missing.');
        throw error;
    }

    // Determine secure/TLS settings based on smtpSecure option
    const port = Number(emailSettings.smtpPort);
    const smtpSecure = (emailSettings as any).smtpSecure || 'auto';

    let secure: boolean;
    let requireTLS: boolean | undefined;
    let ignoreTLS: boolean | undefined;

    switch (smtpSecure) {
        case 'ssl':
            // SSL/TLS on connection (typically port 465)
            secure = true;
            break;
        case 'tls':
            // STARTTLS upgrade (typically port 587)
            secure = false;
            requireTLS = true;
            break;
        case 'none':
            // No encryption
            secure = false;
            ignoreTLS = true;
            break;
        case 'auto':
        default:
            // Auto-detect based on port
            secure = port === 465;
            break;
    }

    // Fix Bug #14: Add TLS options to handle self-signed certificates (Alibaba SMTP)
    const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: port,
        secure: secure,
        requireTLS: requireTLS,
        ignoreTLS: ignoreTLS,
        // Allow self-signed certificates (needed for Alibaba SMTP)
        tls: {
            rejectUnauthorized: false,
        },
        auth: {
            user: emailSettings.smtpUser,
            pass: emailSettings.smtpPass,
        },
    });

    const template = emailTemplates[templateKey];
    if (!template) {
        const error = new Error(`Email template not found for key: ${templateKey}`);
        console.error(error.message);
        throw error;
    }

    // Determine the sender name: use fromName if set, otherwise default to appName
    const senderName = emailSettings.fromName || appName;

    // Add appName to data if not already present
    const finalData = { appName, ...data };

    // Replace placeholders in subject and body
    const subject = Object.entries(finalData).reduce(
        (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
        template.subject
    );

    const html = Object.entries(finalData).reduce(
        (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
        template.body
    );

    const mailOptions = {
        from: `"${senderName}" <${emailSettings.fromAdminEmail}>`,
        to: to === 'admin' ? emailSettings.fromAdminEmail : to,
        subject,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${mailOptions.to} with template ${templateKey}`);
    } catch (error) {
        console.error(`Failed to send email with template ${templateKey}:`, error);
        // Re-throw the error so callers can handle it appropriately
        throw error;
    }
}
