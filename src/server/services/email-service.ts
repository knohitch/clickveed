
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

    // Do not proceed if SMTP host is not configured
    if (!emailSettings.smtpHost) {
        console.warn(`SMTP is not configured. Suppressing email send for template: ${templateKey}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: Number(emailSettings.smtpPort),
        secure: Number(emailSettings.smtpPort) === 465, // true for 465, false for other ports
        auth: {
            user: emailSettings.smtpUser,
            pass: emailSettings.smtpPass,
        },
    });

    const template = emailTemplates[templateKey];
    if (!template) {
        console.error(`Email template not found for key: ${templateKey}`);
        return;
    }
    
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
        from: `"${appName}" <${emailSettings.fromAdminEmail}>`,
        to: to === 'admin' ? emailSettings.fromAdminEmail : to,
        subject,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${mailOptions.to} with template ${templateKey}`);
    } catch (error) {
        console.error(`Failed to send email with template ${templateKey}:`, error);
        // Depending on requirements, you might want to throw the error
        // or handle it silently. For now, we log it.
    }
}
