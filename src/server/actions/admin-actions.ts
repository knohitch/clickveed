
'use server';

import type { Plan, Promotion, ApiKeys, EmailSettings, EmailTemplates } from '@/contexts/admin-settings-context';
import prisma from '@/server/prisma';
import { sendEmail } from '@/server/services/email-service';
import { revalidatePath } from 'next/cache';

// Define default email templates
const defaultEmailTemplates: EmailTemplates = {
    userSignup: { subject: 'Welcome!', body: 'Hello {{name}}...' },
    userInvitation: { subject: 'You have been invited!', body: 'Hello {{name}},\n\nYou have been invited to join our platform. Click on link below to set up your password:\n\n{{invitationLink}}' },
    emailVerification: { subject: 'Verify Your Email Address', body: 'Hello {{name}}, please verify your email address by clicking the link below: {{verificationLink}}' },
    accountApproved: { subject: 'Your Account Has Been Approved', body: 'Hello {{name}},\n\nGreat news! Your account has been approved by an administrator. You can now log in and access all features.\n\nClick here to log in: {{loginLink}}\n\nWelcome to {{appName}}!' },
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
        
        // Build API keys from database
        const mergedApiKeys: Record<string, string> = { ...apiKeys.reduce((acc, key) => {
          acc[key.name] = key.value;
          return acc;
        }, {} as Record<string, string>) };
        
        // REMOVED: Environment variable override for API keys
        // Previously, env vars would override DB values which caused confusion
        // when users tried to delete keys in admin panel but they kept coming back.
        // Now: Database is the single source of truth for API keys configured via admin panel.
        // For production security, use environment variables directly in code that needs them,
        // not through the admin settings system.
        
        const emailSettingsData = await prisma.emailSettings.findFirst();
        const emailTemplatesData = await prisma.emailTemplate.findMany();
        const plans = await prisma.plan.findMany({ include: { features: true } });
        const promotions = await prisma.promotion.findMany({ include: { applicablePlans: true } });

        const appName = settings.find(s => s.key === 'appName')?.value as string || 'AI Video Creator';

        const defaultEmailSettings: EmailSettings = {
            id: 1,
            smtpHost: '', smtpPort: '587', smtpSecure: 'auto', smtpUser: '', smtpPass: '',
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

        // Parse storage settings from database safely
        let parsedStorageSettings: Record<string, string> = {};
        try {
            const storageSettingsValue = settings.find(s => s.key === 'storageSettings')?.value;
            if (storageSettingsValue) {
                parsedStorageSettings = JSON.parse(storageSettingsValue);
            }
        } catch (error) {
            console.warn('Failed to parse storageSettings JSON:', error);
        }

        const storageSettings = {
            wasabiEndpoint: parsedStorageSettings.wasabiEndpoint || 's3.us-west-1.wasabisys.com',
            wasabiRegion: parsedStorageSettings.wasabiRegion || 'us-west-1',
            wasabiBucket: parsedStorageSettings.wasabiBucket || 'clickvid-media',
            bunnyCdnUrl: parsedStorageSettings.bunnyCdnUrl || 'https://clickvid.b-cdn.net',
            wasabiAccessKey: parsedStorageSettings.wasabiAccessKey || '',
            wasabiSecretKey: parsedStorageSettings.wasabiSecretKey || '',
        };

        return {
            appName: settings.find(s => s.key === 'appName')?.value as string || 'AI Video Creator',
            logoUrl: settings.find(s => s.key === 'logoUrl')?.value === 'null' ? null : settings.find(s => s.key === 'logoUrl')?.value as string | null,
            faviconUrl: settings.find(s => s.key === 'faviconUrl')?.value === 'null' ? null : settings.find(s => s.key === 'faviconUrl')?.value as string | null,
            allowAdminSignup: settings.find(s => s.key === 'allowAdminSignup')?.value === 'true',
            isSupportOnline: settings.find(s => s.key === 'isSupportOnline')?.value === 'true',
            plans,
            promotions: promotions.map(p => ({ ...p, applicablePlanIds: p.applicablePlans.map(ap => ap.planId) })),
            apiKeys: mergedApiKeys,
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
        smtpHost: '', smtpPort: '587', smtpSecure: 'auto', smtpUser: '', smtpPass: '',
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
    console.log('[AdminSettings] Settings saved:', Object.keys(data));
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
        // Include all plan fields including featureTier and Stripe Price IDs
        const planData = {
            name: plan.name,
            description: plan.description,
            priceMonthly: plan.priceMonthly,
            priceQuarterly: plan.priceQuarterly,
            priceYearly: plan.priceYearly,
            featureTier: (plan as any).featureTier || 'free',
            stripePriceIdMonthly: plan.stripePriceIdMonthly || null,
            stripePriceIdQuarterly: plan.stripePriceIdQuarterly || null,
            stripePriceIdYearly: plan.stripePriceIdYearly || null,
            stripeProductId: plan.stripeProductId || null,
            videoExports: plan.videoExports ?? null,
            aiCredits: plan.aiCredits ?? null,
            storageGB: plan.storageGB ?? null,
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

    // Revalidate paths to ensure users see updated plan data
    revalidatePath('/dashboard');
    revalidatePath('/chin/dashboard/plans');
    revalidatePath('/chin/dashboard/users');
    revalidatePath('/kanri/dashboard/plans');
    revalidatePath('/kanri/dashboard/users');
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
 * Updates API keys in production database.
 */
export async function updateApiKeys(keys: ApiKeys) {
    // Log only non-sensitive key names, not values
    console.log('[updateApiKeys] Updating keys:', Object.keys(keys).join(', '));
    
    const stripeKeysChanged =
        keys.stripeSecretKey !== undefined ||
        keys.stripePublishableKey !== undefined ||
        keys.stripeWebhookSecret !== undefined;

    // Get all existing keys
    const existingKeys = await prisma.apiKey.findMany();
    const existingKeyNames = new Set(existingKeys.map(k => k.name));
    console.log('[updateApiKeys] Existing keys in DB:', Array.from(existingKeyNames));

    // Update or create new keys, or delete if empty
    for (const [name, value] of Object.entries(keys)) {
        const isEmpty = value === '' || value === undefined;
        console.log(`[updateApiKeys] Processing key: ${name}, isEmpty: ${isEmpty}`);
        
        if (value !== '' && value !== undefined) {
            console.log(`[updateApiKeys] Upserting key: ${name}`);
            await prisma.apiKey.upsert({
                where: { name },
                update: { value },
                create: { name, value }
            });
        } else if (existingKeyNames.has(name)) {
            // Delete key if it's being set to empty
            console.log(`[updateApiKeys] Deleting key: ${name}`);
            await prisma.apiKey.delete({
                where: { name }
            });
        } else {
            console.log(`[updateApiKeys] Key ${name} not in DB and value is empty - skipping`);
        }
    }

    // Revalidate paths to ensure new API keys are picked up
    revalidatePath('/dashboard');
    revalidatePath('/chin/dashboard/settings');
    revalidatePath('/kanri/dashboard/settings');

    // Reinitialize the AI provider manager to pick up new keys
    try {
        const { aiProviderManager } = await import('@/lib/ai/provider-manager');
        await aiProviderManager.reinitialize();
        console.log('[updateApiKeys] AI provider manager reinitialized');
    } catch (error) {
        console.error('[updateApiKeys] Failed to reinitialize AI provider manager:', error);
    }

    // Also reset the api-service-manager circuit breaker and health tracking
    // This ensures stale failure data from old/missing keys doesn't block new keys
    try {
        const { resetProviderStates } = await import('@/lib/ai/api-service-manager');
        resetProviderStates();
        console.log('[updateApiKeys] API service manager provider states reset');
    } catch (error) {
        console.error('[updateApiKeys] Failed to reset API service manager states:', error);
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

        if (!emailSettings.smtpUser || !emailSettings.smtpPass) {
            return { success: false, message: 'SMTP username and password are required. Please configure SMTP authentication settings.' };
        }

        if (!emailSettings.fromAdminEmail) {
            return { success: false, message: 'From email address is not configured. Please set the "From Email Address" in SMTP settings.' };
        }

        // Use the sendEmail service function for consistency
        await sendEmail({
            to: testEmail,
            templateKey: 'userSignup', // Using existing template for testing
            data: {
                name: 'SMTP Test User',
                appName: appName || 'Your App',
            }
        });

        return { success: true, message: `Test email sent successfully to ${testEmail}. Check your inbox for a welcome message.` };
    } catch (error: any) {
        console.error('SMTP Test Error:', error);

        // Provide more specific error messages
        if (error.code === 'EAUTH') {
            return { success: false, message: 'SMTP authentication failed. Please check your username and password.' };
        } else if (error.code === 'ENOTFOUND') {
            return { success: false, message: 'SMTP host not found. Please check your SMTP host setting.' };
        } else if (error.code === 'ECONNREFUSED') {
            return { success: false, message: 'Connection refused. Please check your SMTP host and port settings.' };
        } else if (error.code === 'ETIMEDOUT') {
            return { success: false, message: 'Connection timeout. Please check your SMTP settings and network connection.' };
        }

        return { success: false, message: `Failed to send test email: ${error.message || 'Unknown error'}` };
    }
}

/**
 * Get cron job settings from the database
 */
export async function getCronJobSettings(): Promise<Record<string, boolean>> {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'cronJobSettings' }
        });
        
        if (setting?.value) {
            return JSON.parse(setting.value);
        }
        
        // Return default settings if none exist
        return {
            'daily-signup-report': true,
            'weekly-analytics-rollup': true,
            'hourly-api-health-check': true,
            'monthly-subscription-renewal': false,
            'nightly-db-backup': true,
            'autorotation-health-check': true,
        };
    } catch (error) {
        console.error('Error getting cron job settings:', error);
        return {
            'daily-signup-report': true,
            'weekly-analytics-rollup': true,
            'hourly-api-health-check': true,
            'monthly-subscription-renewal': false,
            'nightly-db-backup': true,
            'autorotation-health-check': true,
        };
    }
}

/**
 * Save cron job settings to the database
 */
export async function saveCronJobSettings(settings: Record<string, boolean>): Promise<{ success: boolean; message: string }> {
    try {
        await prisma.setting.upsert({
            where: { key: 'cronJobSettings' },
            update: { value: JSON.stringify(settings) },
            create: { key: 'cronJobSettings', value: JSON.stringify(settings) }
        });
        
        return { success: true, message: 'Cron job settings saved successfully.' };
    } catch (error: any) {
        console.error('Error saving cron job settings:', error);
        return { success: false, message: `Failed to save cron job settings: ${error.message}` };
    }
}

/**
 * Toggle a single cron job setting
 */
export async function toggleCronJob(commandSlug: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    try {
        const currentSettings = await getCronJobSettings();
        currentSettings[commandSlug] = isActive;
        
        await prisma.setting.upsert({
            where: { key: 'cronJobSettings' },
            update: { value: JSON.stringify(currentSettings) },
            create: { key: 'cronJobSettings', value: JSON.stringify(currentSettings) }
        });
        
        return { success: true, message: `Cron job "${commandSlug}" ${isActive ? 'enabled' : 'disabled'}.` };
    } catch (error: any) {
        console.error('Error toggling cron job:', error);
        return { success: false, message: `Failed to toggle cron job: ${error.message}` };
    }
}
