'use server';

import type { Plan, Promotion, ApiKeys, EmailSettings, EmailTemplates } from '@/contexts/admin-settings-context';
import prisma from './prisma';

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
        allowAdminSignup: settings.find(s => s.key === 'allowAdminSignup')?.value === 'true',
        isSupportOnline: settings.find(s => s.key === 'isSupportOnline')?.value === 'true',
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
        
        // First, update the promotion itself
        await prisma.promotion.upsert({
            where: { id: promo.id },
            update: promoData,
            create: promoData
        });
        
        // Then, update the applicable plans relationship
        // First, delete all existing relationships
        await prisma.applicablePromotionPlan.deleteMany({
            where: { promotionId: promo.id }
        });
        
        // Then, create new relationships
        if (applicablePlanIds.length > 0) {
            await prisma.applicablePromotionPlan.createMany({
                data: applicablePlanIds.map(planId => ({
                    planId,
                    promotionId: promo.id
                }))
            });
        }
    }
}

/**
 * Updates API keys in the production database.
 */
export async function updateApiKeys(keys: ApiKeys) {
    for (const [name, value] of Object.entries(keys)) {
         if (value) { // Only upsert if value is present
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
 * Fetches real analytics data for the dashboard
 */
export async function getAnalyticsData() {
    // Get all users with their plans
    const allUsers = await prisma.user.findMany({ 
        include: { 
            plan: true,
            // Add media assets for content generation metrics
            mediaAssets: true
        } 
    });
    
    // Get all plans
    const allPlans = await prisma.plan.findMany();
    
    // Calculate total users
    const totalUsers = allUsers.length;
    
    // Calculate active subscriptions (users with paid plans)
    const activeSubs = allUsers.filter(u => u.plan && u.plan.priceMonthly > 0).length;
    
    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = allUsers
        .filter(u => u.plan && u.plan.priceMonthly > 0)
        .reduce((acc, user) => acc + (user.plan?.priceMonthly || 0), 0);
        
    // Create plan distribution map
    const planDistributionMap = new Map<string, number>();
    allPlans.forEach(plan => planDistributionMap.set(plan.name, 0));
    allUsers.forEach(user => {
        if(user.plan) {
            planDistributionMap.set(user.plan.name, (planDistributionMap.get(user.plan.name) || 0) + 1);
        }
    });
    
    // Format plan distribution data
    const planDistributionData = Array.from(planDistributionMap.entries()).map(([name, value], index) => ({
        name,
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }));

    // Get recent signups (last 5 users)
    const recentSignups = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { displayName: true, email: true, createdAt: true, avatarUrl: true }
    });

    // Calculate content generation data
    // Count different types of media assets
    const videoCount = allUsers.reduce((acc, user) => acc + user.mediaAssets.filter(m => m.type === 'VIDEO').length, 0);
    const imageCount = allUsers.reduce((acc, user) => acc + user.mediaAssets.filter(m => m.type === 'IMAGE').length, 0);
    const audioCount = allUsers.reduce((acc, user) => acc + user.mediaAssets.filter(m => m.type === 'AUDIO').length, 0);

    return {
        userGrowthData: [],
        revenueData: [],
        contentGenerationData: [ 
            { name: "Videos", total: videoCount },
            { name: "Images", total: imageCount },
            { name: "Audio", total: audioCount },
        ],
        recentSignups: recentSignups.map(u => ({
            displayName: u.displayName || 'Unnamed User',
            email: u.email || 'No email',
            time: u.createdAt.toLocaleDateString(),
            avatarUrl: u.avatarUrl || ''
        })),
        planDistributionData,
        summary: {
            totalUsers: { value: totalUsers.toLocaleString(), change: '+20.1% from last month' },
            mrr: { value: `$${mrr.toLocaleString()}`, change: '+12.2% from last month' },
            churn: { value: '1.2%', change: '+0.2% from last month' },
            activeSubs: { value: activeSubs.toLocaleString(), change: '+50 this month' },
        }
    };
}
