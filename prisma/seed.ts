
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');
  
  // It's better to fetch the secret key once
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  let stripe: Stripe | null = null;
  if (stripeSecretKey) {
      stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
      console.log('Stripe client initialized.');
  } else {
      console.warn('STRIPE_SECRET_KEY not found. Seeding will not create Stripe products/prices.');
  }

  // --- Seed Plans ---
  const plansToSeed = [
    {
        id: 'plan_free',
        name: 'Free',
        description: 'For users getting started. Access basic features and a limited amount of resources.',
        priceMonthly: 0,
        priceQuarterly: 0,
        priceYearly: 0,
        videoExports: 5,
        aiCredits: 1000,
        storageGB: 2,
        features: [
            '5 Video Exports / mo',
            '1,000 AI Credits',
            '2 GB Storage',
            'Standard Support',
        ],
    },
    {
        id: 'plan_creator',
        name: 'Creator',
        description: 'Perfect for individual creators and small businesses getting started with AI video.',
        priceMonthly: 49,
        priceQuarterly: 129,
        priceYearly: 499,
        videoExports: 15,
        aiCredits: 15000,
        storageGB: 20,
        features: [
            '15 Video Exports / mo',
            '15,000 AI Credits',
            '20 GB Storage',
            'AI Script & Image Generation',
            'Standard AI Voices',
            'Social Scheduler',
            'Standard Support',
        ],
    },
    {
        id: 'plan_pro',
        name: 'Pro',
        description: 'For serious creators and businesses scaling their content production.',
        priceMonthly: 99,
        priceQuarterly: 269,
        priceYearly: 999,
        videoExports: null, // Unlimited
        aiCredits: 50000,
        storageGB: 100,
        features: [
            'Unlimited Video Exports',
            '50,000 AI Credits',
            '100 GB Storage',
            'AI Voice Cloning',
            'Magic Clips Generator',
            'Advanced Analytics',
            'Priority Support',
        ],
    },
    {
        id: 'plan_agency',
        name: 'Agency',
        description: 'For large agencies needing collaboration and advanced features.',
        priceMonthly: 249,
        priceQuarterly: 679,
        priceYearly: 2499,
        videoExports: null, // Unlimited
        aiCredits: null, // Unlimited
        storageGB: 500,
        features: [
            'All Pro Features',
            'Unlimited AI Credits',
            '500 GB Storage',
            'Team Collaboration (5 Seats)',
            'API Access & Integrations',
            'Dedicated Account Manager',
        ],
    }
  ];

  const seededPlans = [];

  for (const planData of plansToSeed) {
    let { stripeProductId, stripePriceIdMonthly, stripePriceIdQuarterly, stripePriceIdYearly } = await prisma.plan.findUnique({ where: { id: planData.id } }) || {};
    
    if (stripe && planData.priceMonthly > 0) {
        if (!stripeProductId) {
            try {
                const product = await stripe.products.create({ id: planData.id, name: planData.name, description: planData.description });
                stripeProductId = product.id;
                console.log(`Created Stripe product for ${planData.name}`);
            } catch (e: any) {
                if (e.code === 'resource_already_exists') {
                    stripeProductId = planData.id;
                    console.log(`Stripe product ${stripeProductId} already exists. Using it.`);
                } else { throw e; }
            }
        }
        
        if (!stripePriceIdMonthly && planData.priceMonthly > 0) {
            stripePriceIdMonthly = (await stripe.prices.create({ product: stripeProductId, unit_amount: Math.round(planData.priceMonthly * 100), currency: 'usd', recurring: { interval: 'month' } })).id;
        }
        if (!stripePriceIdQuarterly && planData.priceQuarterly > 0) {
            stripePriceIdQuarterly = (await stripe.prices.create({ product: stripeProductId, unit_amount: Math.round(planData.priceQuarterly * 100), currency: 'usd', recurring: { interval: 'month', interval_count: 3 } })).id;
        }
        if (!stripePriceIdYearly && planData.priceYearly > 0) {
            stripePriceIdYearly = (await stripe.prices.create({ product: stripeProductId, unit_amount: Math.round(planData.priceYearly * 100), currency: 'usd', recurring: { interval: 'year' } })).id;
        }
    }
    
    const upsertedPlan = await prisma.plan.upsert({
      where: { id: planData.id },
      update: { ...planData, stripeProductId, stripePriceIdMonthly, stripePriceIdQuarterly, stripePriceIdYearly, features: { deleteMany: {}, create: planData.features.map(text => ({ text })) } },
      create: { ...planData, stripeProductId, stripePriceIdMonthly, stripePriceIdQuarterly, stripePriceIdYearly, features: { create: planData.features.map(text => ({ text })) } },
      include: { features: true },
    });
    seededPlans.push(upsertedPlan);
  }
  
  console.log('Seeded plans...');

  // Seed Promotions
  await prisma.promotion.deleteMany({}); // Clear old promotions
  const summerSale = await prisma.promotion.create({
    data: {
      name: 'Launch Discount',
      discountPercentage: 25,
      isActive: true,
    }
  });

  await prisma.promotionOnPlan.createMany({
    data: [
      { planId: seededPlans.find(p => p.name === 'Pro')!.id, promotionId: summerSale.id },
      { planId: seededPlans.find(p => p.name === 'Agency')!.id, promotionId: summerSale.id },
    ],
    skipDuplicates: true
  });
  console.log('Seeded promotions...');

  // Seed Settings
  await prisma.setting.createMany({
    data: [
        { key: 'appName', value: 'ClickVid Pro' },
        { key: 'logoUrl', value: 'null' },
        { key: 'faviconUrl', value: 'null' },
        { key: 'allowAdminSignup', value: 'true' },
        { key: 'isSupportOnline', value: 'true' },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded settings...');

  // Seed Email Settings
  await prisma.emailSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
        id: 1,
        smtpHost: '',
        smtpPort: '587',
        smtpUser: '',
        smtpPass: '',
        fromAdminEmail: 'noreply@example.com',
        fromSupportEmail: 'support@example.com',
    }
  });
  console.log('Seeded email settings...');

    const emailTemplates = {
        userSignup: { subject: 'Welcome to ClickVid Pro!', body: 'Hello {{name}}, welcome to our platform!' },
        emailVerification: { subject: 'Verify Your Email Address', body: 'Hello {{name}}, please verify your email address by clicking the link below: {{verificationLink}}' },
        passwordReset: { subject: 'Reset Your Password', body: 'Click here to reset: {{resetLink}}' },
        subscriptionActivated: { subject: 'Subscription Activated', body: 'Your {{planName}} plan is now active.' },
        subscriptionRenewal: { subject: 'Upcoming Renewal', body: 'Your {{planName}} plan will renew on {{renewalDate}}.' },
        subscriptionCanceled: { subject: 'Subscription Canceled', body: 'Your {{planName}} plan has been canceled. It will end on {{endDate}}.' },
        adminNewUser: { subject: 'New User Signup', body: 'A new user has signed up: {{userEmail}} on plan {{planName}}.' },
        adminSubscriptionCanceled: { subject: 'Subscription Canceled by User', body: 'User {{userName}} has canceled their {{planName}} plan.' },
        adminSubscriptionRenewed: { subject: 'Subscription Renewed', body: 'User {{userName}} has renewed their {{planName}} plan for ${{amount}}.' },
        userNewTicket: { subject: 'Support Ticket Received ({{ticketId}})', body: 'Hi {{userName}}, we have received your support request regarding "{{ticketSubject}}" and will get back to you shortly.' },
        userTicketReply: { subject: 'Re: {{ticketSubject}} ({{ticketId}})', body: 'Hi {{userName}}, a support agent has replied to your ticket. \n\n> {{replyMessage}}' },
        userTicketStatusChange: { subject: 'Your Ticket Status has Changed ({{ticketId}})', body: 'Hi {{userName}}, the status of your ticket "{{ticketSubject}}" has been updated to: {{newStatus}}.' },
        adminNewTicket: { subject: 'New Support Ticket from {{userName}} ({{ticketId}})', body: 'A new support ticket has been created by {{userName}} ({{userEmail}}).\n\nSubject: {{ticketSubject}}' },
    };

    for (const [key, template] of Object.entries(emailTemplates)) {
        await prisma.emailTemplate.upsert({
            where: { key },
            update: template,
            create: { key, ...template },
        });
    }
  console.log('Seeded email templates...');

  // Seed sample support tickets for demonstration purposes only
  await prisma.supportTicket.deleteMany({ where: { id: { startsWith: 'tkt_sample' } } });
  await prisma.supportTicket.createMany({
      data: [
        {
            id: 'tkt_sample_001',
            userName: 'Alice Johnson (Demo)',
            userEmail: 'alice@example.com',
            userAvatar: 'https://placehold.co/40x40.png',
            subject: '[SAMPLE] Problem with video export',
            preview: 'Hi, I was trying to export my video but it keeps failing at 99%...',
            status: 'Open',
            conversation: [
                { sender: 'user', text: 'Hi, I was trying to export my video but it keeps failing at 99%. Can you help?', timestamp: new Date().toISOString() },
                { sender: 'user', text: 'NOTE: This is a sample ticket for demonstration purposes only.', timestamp: new Date().toISOString() },
            ]
        },
        {
            id: 'tkt_sample_002',
            userName: 'Bob Williams (Demo)',
            userEmail: 'bob@example.com',
            userAvatar: 'https://placehold.co/40x40.png',
            subject: '[SAMPLE] Billing question',
            preview: 'I have a question about my last invoice. I was charged twice...',
            status: 'Open',
            conversation: [
                { sender: 'user', text: 'I have a question about my last invoice. I was charged twice and I need a refund for one of them.', timestamp: new Date().toISOString() },
                { sender: 'user', text: 'NOTE: This is a sample ticket for demonstration purposes only.', timestamp: new Date().toISOString() },
            ]
        }
      ]
  });

  console.log('Seeded sample support tickets for demonstration...');


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
