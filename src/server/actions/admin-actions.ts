
'use server';

import type { Plan, Promotion, ApiKeys, EmailSettings, EmailTemplates } from '@/contexts/admin-settings-context';
import prisma from '@/server/prisma';

// Define default email templates
const defaultEmailTemplates: EmailTemplates = {
    userSignup: { subject: 'Welcome!', body: 'Hello {{name}}...' },
    emailVerification: { subject: 'Verify Your Email Address', body: 'Hello {{name}}, please verify your email address by clicking the link below: {{verificationLink}}' },
    passwordReset: { subject: 'Password Reset', body: 'Reset here: {{resetLink}}' },
    subscriptionActivated: { subject: 'Subscription Activated', body: 'Thanks for subscribing to {{planName}}.' },
    subscriptionRenewal: { subject: 'Subscription Renewal', body: 'Your plan {{planName}} will renew on {{renewalDate}}.' },
    subscriptionCanceled: { subject: 'Subscription Canceled', body: 'Your plan {{planName}} has been canceled.' },
    adminNewUser: { subject: 'New User Signup', body: 'A new user signed up: {{userEmail}}' },
    adminSubscriptionCanceled: { subject: 'Subscription Canceled', body: '{{userName}} canceled their plan.' },
    adminSubscriptionRenewed: { subject: 'Subscription Renewed', body: '{{userName}} renewed their plan.' },
    userNewTicket: { subject: 'Support Ticket Received', body: 'We received your ticket {{ticketId}}.' },
    userTicketReply: { subject: 'Reply to your ticket', body: 'An agent replied to your ticket {{ticketId}}.' },
    userTicketStatusChange: { subject: 'Ticket Status Updated', body: 'Your ticket {{ticketId}} status is now {{newStatus}}.' },
    adminNewTicket: { subject: 'New Support Ticket', body: 'New ticket from {{userName}}.' },
};

/**
 * Retrieves all admin settings from the production database.
 * Returns default values if database is not available (e.g., during build time).
 */
export async function getAdminSettings() {
    try {
        // Check if DATABASE_URL is available (skip database queries during build time)
        if (!process.env.DATABASE_URL) {
            console.warn('DATABASE_URL not found, using default settings for build time');
            return getDefaultSettings();
        }

        const settings = await prisma.setting.findMany();
        const apiKeys = await prisma.apiKey.findMany();
        const emailSettingsData = await prisma.emailSettings.findFirst();
        const emailTemplatesData = await prisma.emailTemplate.findMany();
        const plans = await prisma.plan.findMany({ include: { features: true } });
        const promotions = await prisma.promotion.findMany({ include: { applicablePlans: true } });

        const appName = settings.find(s => s.key === 'appName')?.value as string || 'AI Video Creator';

        const defaultEmailSettings: EmailSettings = {
            id: 1,
            smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
            fromAdminEmail: 'noreply@example.com', fromSupportEmail: 'support@example.com',
            fromName: appName || 'AI Video Creator'
        };

        const emailSettings = {
            ...defaultEmailSettings,
            ...emailSettingsData
        };

        // Combine default templates with database templates
        const emailTemplatesFromDb = emailTemplatesData.reduce((acc, tpl) => {
            acc[tpl.key as keyof EmailTemplates] = { subject: tpl.subject, body: tpl.body };
            return acc;
        }, {} as Partial<EmailTemplates>);

        const emailTemplates = { ...defaultEmailTemplates, ...emailTemplatesFromDb };

        // Parse storage settings from database
        const storageSettings = {
            wasabiEndpoint: settings.find(s => s.key === 'storageSettings')?.value ?
                JSON.parse(settings.find(s => s.key === 'storageSettings')?.value || '{}').wasabiEndpoint || 's3.us-west-1.wasabisys.com' : 's3.us-west-1.wasabisys.com',
            wasabiRegion: settings.find(s => s.key === 'storageSettings')?.value ?
                JSON.parse(settings.find(s => s.key === 'storageSettings')?.value || '{}').wasabiRegion || 'us-west-1' : 'us-west-1',
            wasabiBucket: settings.find(s => s.key === 'storageSettings')?.value ?
                JSON.parse(settings.find(s => s.key === 'storageSettings')?.value || '{}').wasabiBucket || 'clickvid-media' : 'clickvid-media',
            bunnyCdnUrl: settings.find(s => s.key === 'storageSettings')?.value ?
                JSON.parse(settings.find(s => s.key === 'storageSettings')?.value || '{}').bunnyCdnUrl || 'https://clickvid.b-cdn.net' : 'https://clickvid.b-cdn.net',
            wasabiAccessKey: settings.find(s => s.key === 'storageSettings')?.value ?
                JSON.parse(settings.find(s => s.key === 'storageSettings')?.value || '{}').wasabiAccessKey || '' : '',
            wasabiSecretKey: settings.find(s => s.key === 'storageSettings')?.value ?
                JSON.parse(settings.find(s => s.key === 'storageSettings')?.value || '{}').wasabiSecretKey || '' : '',
        };

        return {
            appName: settings.find(s => s.key === 'appName')?.value as string || 'AI Video Creator',
            logoUrl: settings.find(s => s.key === 'logoUrl')?.value === 'null' ? null : settings.find(s => s.key === 'logoUrl')?.value as string | null,
            faviconUrl: settings.find(s => s.key === 'faviconUrl')?.value === 'null' ? null : settings.find(s => s.key === 'faviconUrl')?.value as string | null,
            allowAdminSignup: settings.find(s => s.key === 'allowAdminSignup')?.value === 'true',
            isSupportOnline: settings.find(s => s.key === 'isSupportOnline')?.value === 'true',
            plans,
            promotions: promotions.map(p => ({ ...p, applicablePlanIds: p.applicablePlans.map(ap => ap.planId) })),
            apiKeys: apiKeys.reduce((acc, key) => {
              acc[key.name] = key.value;
              return acc;
            }, {} as Record<string, string>),
            emailSettings,
            emailTemplates,
            storageSettings,
        };
    } catch (error) {
        console.warn('Failed to fetch admin settings from database, using defaults:', error);
        return getDefaultSettings();
    }
}

/**
 * Returns default admin settings when database is not available.
 */
function getDefaultSettings() {
    const defaultEmailSettings: EmailSettings = {
        id: 1,
        smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
        fromAdminEmail: 'noreply@example.com', fromSupportEmail: 'support@example.com',
        fromName: 'AI Video Creator'
    };

    return {
        appName: 'AI Video Creator',
        logoUrl: null,
        faviconUrl: null,
        allowAdminSignup: false,
        isSupportOnline: true,
        plans: [],
        promotions: [],
        apiKeys: {} as Record<string, string>,
        emailSettings: defaultEmailSettings,
        emailTemplates: defaultEmailTemplates,
        storageSettings: {
            wasabiEndpoint: 's3.us-west-1.wasabisys.com',
            wasabiRegion: 'us-west-1',
            wasabiBucket: 'clickvid-media',
            bunnyCdnUrl: 'https://clickvid.b-cdn.net',
            wasabiAccessKey: '',
            wasabiSecretKey: '',
        },
    };
}

/**
 * Updates a general admin setting in the production database.
 */
export async function updateAdminSettings(data: { [key: string]: any }) {
    for (const [key, value] of Object.entries(data)) {
        const valueStr = value === null ? 'null' : String(value);
        await prisma.setting.upsert({
            where: { key },
            update: { value: valueStr },
            create: { key, value: valueStr },
        });
    }
}

/**
 * Updates the subscription plans in the production database.
 */
export async function updatePlans(plans: Plan[]) {
    // Get existing plans to identify which ones to delete
    const existingPlans = await prisma.plan.findMany();
    const existingPlanIds = existingPlans.map(p => p.id);
    const newPlanIds = plans.map(p => p.id);
    
    // Delete plans that are no longer in the new list
    const plansToDelete = existingPlanIds.filter(id => !newPlanIds.includes(id));
    if (plansToDelete.length > 0) {
        await prisma.plan.deleteMany({
            where: { id: { in: plansToDelete } }
        });
    }
    
    // Upsert the remaining plans
    for (const plan of plans) {
        const planData = {
            name: plan.name,
            description: plan.description,
            priceMonthly: plan.priceMonthly,
            priceQuarterly: plan.priceQuarterly,
            priceYearly: plan.priceYearly,
        };
        
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: {
                ...planData,
                features: {
                    deleteMany: {},
                    create: plan.features.map(f => ({ text: f.text }))
                }
            },
            create: {
                ...planData,
                id: plan.id,
                features: { create: plan.features.map(f => ({ text: f.text })) }
            }
        });
    }
}

/**
 * Deletes a specific plan from the database.
 */
export async function deletePlan(planId: string) {
    try {
        // Check if plan exists and has users
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!plan) {
            throw new Error('Plan not found');
        }

        if (plan._count.users > 0) {
            throw new Error(`Cannot delete plan with ${plan._count.users} active users`);
        }

        // Delete the plan (features will be deleted due to cascade)
        await prisma.plan.delete({
            where: { id: planId }
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting plan:', error);
        throw error;
    }
}

/**
 * Updates promotions in the production database.
 */
export async function updatePromotions(promotions: Promotion[]) {
    for (const promo of promotions) {
        const { applicablePlanIds, ...promoData } = promo;
        await prisma.promotion.upsert({
            where: { id: promo.id },
            update: {
                ...promoData,
                applicablePlans: {
                    set: promo.applicablePlanIds.map(id => ({ planId_promotionId: { planId: id, promotionId: promo.id } }))
                }
            },
            create: {
                ...promoData,
                applicablePlans: {
                    connect: promo.applicablePlanIds.map(id => ({ planId_promotionId: { planId: id, promotionId: promo.id } }))
                }
            }
        });
    }
}

/**
 * Updates API keys in the production database.
 */
export async function updateApiKeys(keys: ApiKeys) {
    for (const [name, value] of Object.entries(keys)) {
         if (value) { // Only upsert if value is not empty
            await prisma.apiKey.upsert({
                where: { name },
                update: { value },
                create: { name, value }
            });
        }
    }
}

/**
 * Updates email settings in the production database.
 */
export async function updateEmailSettings(settings: EmailSettings) {
    const { id, ...settingsData } = settings;
    await prisma.emailSettings.upsert({
        where: { id: 1 },
        update: settingsData,
        create: { id: 1, ...settingsData }
    });
}

/**
 * Updates email templates in the production database.
 */
export async function updateEmailTemplates(templates: EmailTemplates) {
    for (const [key, template] of Object.entries(templates)) {
        await prisma.emailTemplate.upsert({
            where: { key },
            update: template,
            create: { key, ...template }
        });
    }
}

/**
 * A server action to test the database connection.
 */
export async function testDbConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { success: true, message: 'Successfully connected to the database.' };
    } catch (e: any) {
        return { success: false, message: e.message || 'An unknown error occurred.' };
    }
}

/**
 * Test SMTP email configuration by sending a test email
 */
export async function sendTestEmail(testEmail: string) {
    try {
        const { emailSettings, appName } = await getAdminSettings();
        
        if (!emailSettings.smtpHost) {
            return { success: false, message: 'SMTP host is not configured. Please configure SMTP settings first.' };
        }

        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransporter({
            host: emailSettings.smtpHost,
            port: Number(emailSettings.smtpPort),
            secure: Number(emailSettings.smtpPort) === 465,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPass,
            },
        });

        const senderName = emailSettings.fromName || appName;
        
        await transporter.sendMail({
            from: `"${senderName}" <${emailSettings.fromAdminEmail}>`,
            to: testEmail,
            subject: 'SMTP Configuration Test',
            html: `
                <h2>SMTP Test Successful!</h2>
                <p>If you're reading this email, your SMTP configuration is working correctly.</p>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                    <li>SMTP Host: ${emailSettings.smtpHost}</li>
                    <li>SMTP Port: ${emailSettings.smtpPort}</li>
                    <li>From Email: ${emailSettings.fromAdminEmail}</li>
                    <li>Sender Name: ${senderName}</li>
                </ul>
                <p>Your email notifications will now be delivered successfully.</p>
            `,
        });

        return { success: true, message: `Test email sent successfully to ${testEmail}` };
    } catch (error: any) {
        console.error('SMTP Test Error:', error);
        return { success: false, message: `Failed to send test email: ${error.message}` };
    }
}
