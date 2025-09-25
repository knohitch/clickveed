
'use server';

import type { Plan, Promotion, ApiKeys, EmailSettings, EmailTemplates } from '@/contexts/admin-settings-context';
import prisma from '@/server/prisma';

/**
 * Retrieves all admin settings from the production database.
 */
export async function getAdminSettings() {
    const settings = await prisma.setting.findMany();
    const apiKeys = await prisma.apiKey.findMany();
    const emailSettingsData = await prisma.emailSettings.findFirst();
    const emailTemplatesData = await prisma.emailTemplate.findMany();
    const plans = await prisma.plan.findMany({ include: { features: true } });
    const promotions = await prisma.promotion.findMany({ include: { applicablePlans: true } });
    
    const defaultEmailSettings: EmailSettings = {
        id: 1,
        smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
        fromAdminEmail: 'noreply@example.com', fromSupportEmail: 'support@example.com'
    };

    const defaultEmailTemplates: EmailTemplates = {
        userSignup: { subject: 'Welcome!', body: 'Hello {{name}}...' },
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
    
    const emailTemplates = emailTemplatesData.reduce((acc, tpl) => {
        acc[tpl.key as keyof EmailTemplates] = { subject: tpl.subject, body: tpl.body };
        return acc;
    }, {} as Partial<EmailTemplates>);

    return {
        appName: settings.find(s => s.key === 'appName')?.value as string || 'ClickVid Pro',
        logoUrl: settings.find(s => s.key === 'logoUrl')?.value === 'null' ? null : settings.find(s => s.key === 'logoUrl')?.value as string | null,
        faviconUrl: settings.find(s => s.key === 'faviconUrl')?.value === 'null' ? null : settings.find(s => s.key === 'faviconUrl')?.value as string | null,
        allowAdminSignup: settings.find(s => s.key === 'allowAdminSignup')?.value === 'true' || false,
        isSupportOnline: settings.find(s => s.key === 'isSupportOnline')?.value === 'true' || false,
        plans: plans.map(p => ({...p, features: p.features || [] })),
        promotions: promotions.map(p => ({ ...p, applicablePlanIds: p.applicablePlans.map(ap => ap.planId) })),
        apiKeys: apiKeys.reduce((acc, key) => {
          acc[key.name] = key.value;
          return acc;
        }, {} as Record<string, string>),
        emailSettings: emailSettingsData || defaultEmailSettings,
        emailTemplates: { ...defaultEmailTemplates, ...emailTemplates },
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
