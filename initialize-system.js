#!/usr/bin/env node

/**
 * System Initialization Script
 * Ensures all required database records exist for the application to function
 * Run this: node initialize-system.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initializeSystem() {
  console.log('🚀 Starting system initialization...\n');

  try {
    // 1. Create email settings if they don't exist
    console.log('📧 Setting up email configuration...');
    const emailSettings = await prisma.emailSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: process.env.SMTP_PORT || '587',
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        fromAdminEmail: process.env.FROM_EMAIL || 'noreply@clickvid.ai',
        fromSupportEmail: process.env.FROM_SUPPORT_EMAIL || 'support@clickvid.ai',
        fromName: process.env.FROM_NAME || 'ClickVid AI',
      },
    });
    console.log('✅ Email settings configured\n');

    // 2. Create API keys
    console.log('🔑 Setting up API keys...');
    const apiKeys = [
      { name: 'stripeSecretKey', value: process.env.STRIPE_SECRET_KEY || '' },
      { name: 'stripePublishableKey', value: process.env.STRIPE_PUBLISHABLE_KEY || '' },
      { name: 'stripeWebhookSecret', value: process.env.STRIPE_WEBHOOK_SECRET || '' },
      { name: 'openai', value: process.env.OPENAI_API_KEY || '' },
      { name: 'elevenlabs', value: process.env.ELEVENLABS_API_KEY || '' },
      { name: 'runwayml', value: process.env.RUNWAYML_API_KEY || '' },
      { name: 'pika', value: process.env.PIKA_API_KEY || '' },
      { name: 'wasabiEndpoint', value: process.env.WASABI_ENDPOINT || 's3.us-west-1.wasabisys.com' },
      { name: 'wasabiRegion', value: process.env.WASABI_REGION || 'us-west-1' },
      { name: 'wasabiBucket', value: process.env.WASABI_BUCKET || 'clickvid-media' },
      { name: 'wasabiAccessKey', value: process.env.WASABI_ACCESS_KEY_ID || '' },
      { name: 'wasabiSecretKey', value: process.env.WASABI_SECRET_ACCESS_KEY || '' },
      { name: 'bunnyCdnUrl', value: process.env.BUNNY_CDN_URL || '' },
      { name: 'bunnyApiKey', value: process.env.BUNNY_API_KEY || '' },
      { name: 'bunnyStorageZone', value: process.env.BUNNY_STORAGE_ZONE || '' },
      { name: 'unsplash', value: process.env.UNSPLASH_ACCESS_KEY || '' },
      { name: 'pexels', value: process.env.PEXELS_API_KEY || '' },
      { name: 'pixabay', value: process.env.PIXABAY_API_KEY || '' },
    ];

    for (const key of apiKeys) {
      if (key.value) { // Only create if value exists
        await prisma.apiKey.upsert({
          where: { name: key.name },
          update: { value: key.value },
          create: { name: key.name, value: key.value },
        });
        console.log(`✅ API key created: ${key.name}`);
      }
    }
    console.log('');

    // 3. Create default plans
    console.log('💳 Setting up default subscription plans...');
    const defaultPlans = [
      {
        id: 'free',
        name: 'Free Tier',
        description: 'Get started with basic features',
        priceMonthly: 0,
        priceQuarterly: 0,
        priceYearly: 0,
        features: [
          { text: '3 video generations per month' },
          { text: 'Basic AI Script Writer' },
          { text: 'Thumbnail creation tools' },
          { text: 'Basic media library (5GB)' },
        ],
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for content creators',
        priceMonthly: 29,
        priceQuarterly: 75,
        priceYearly: 276,
        features: [
          { text: '50 video generations per month' },
          { text: 'Advanced AI Script Writer' },
          { text: 'Voice cloning capabilities' },
          { text: 'Premium media library (50GB)' },
          { text: 'Priority support' },
        ],
      },
      {
        id: 'pro',
        name: 'Professional',
        description: 'For serious content creators',
        priceMonthly: 99,
        priceQuarterly: 267,
        priceYearly: 948,
        features: [
          { text: 'Unlimited video generations' },
          { text: 'All AI tools included' },
          { text: 'API access' },
          { text: 'Team collaboration' },
          { text: 'Premium support' },
        ],
      },
    ];

    for (const plan of defaultPlans) {
      await prisma.plan.upsert({
        where: { id: plan.id },
        update: {
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceQuarterly: plan.priceQuarterly,
          priceYearly: plan.priceYearly,
        },
        create: plan,
      });
      console.log(`✅ Plan created: ${plan.name}`);
    }
    console.log('');

    // 4. Create general settings
    console.log('⚙️ Setting up general application settings...');
    const settings = [
      { key: 'appName', value: process.env.APP_NAME || 'ClickVid AI' },
      { key: 'logoUrl', value: process.env.LOGO_URL || '' },
      { key: 'faviconUrl', value: process.env.FAVICON_URL || '' },
      { key: 'allowAdminSignup', value: 'false' },
      { key: 'isSupportOnline', value: 'true' },
      { key: 'storageSettings', value: JSON.stringify({
        wasabiEndpoint: process.env.WASABI_ENDPOINT || 's3.us-west-1.wasabisys.com',
        wasabiRegion: process.env.WASABI_REGION || 'us-west-1',
        wasabiBucket: process.env.WASABI_BUCKET || 'clickvid-media',
        wasabiAccessKey: process.env.WASABI_ACCESS_KEY_ID || '',
        wasabiSecretKey: process.env.WASABI_SECRET_ACCESS_KEY || '',
        bunnyCdnUrl: process.env.BUNNY_CDN_URL || '',
        bunnyApiKey: process.env.BUNNY_API_KEY || '',
        bunnyStorageZone: process.env.BUNNY_STORAGE_ZONE || '',
      })},
    ];

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
      console.log(`✅ Setting created: ${setting.key}`);
    }
    console.log('');

    // 5. Create default email templates
    console.log('📧 Creating default email templates...');
    const emailTemplates = [
      {
        key: 'userSignup',
        subject: 'Welcome to {{appName}}!',
        body: 'Hello {{name}},\n\nWelcome to {{appName}}! Your account has been created successfully.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe {{appName}} Team',
      },
      {
        key: 'emailVerification',
        subject: 'Verify Your Email Address',
        body: 'Hello {{name}},\n\nPlease verify your email address by clicking the link below:\n\n{{verificationLink}}\n\nIf you did not create an account, please ignore this email.\n\nBest regards,\nThe {{appName}} Team',
      },
      {
        key: 'passwordReset',
        subject: 'Reset Your Password',
        body: 'Hello {{name}},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{{resetLink}}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe {{appName}} Team',
      },
      {
        key: 'subscriptionActivated',
        subject: 'Subscription Activated - {{planName}}',
        body: 'Hello {{name}},\n\nYour {{planName}} subscription has been activated!\n\nYou now have access to all premium features.\n\nBest regards,\nThe {{appName}} Team',
      },
    ];

    for (const template of emailTemplates) {
      await prisma.emailTemplate.upsert({
        where: { key: template.key },
        update: { subject: template.subject, body: template.body },
        create: template,
      });
      console.log(`✅ Email template created: ${template.key}`);
    }
    console.log('');

    console.log('🎉 System initialization completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your application');
    console.log('2. Log in as Super Admin');
    console.log('3. Configure your API keys in Settings > API Integrations');
    console.log('4. Test email configuration in Settings > Email');
    console.log('5. Adjust plans and pricing as needed');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization
initializeSystem().catch(console.error);
