// Environment variable validation at startup

interface EnvVarConfig {
  name: string;
  required: boolean;
  isPublic: boolean;
}

const ENV_VARS: EnvVarConfig[] = [
  // Database
  { name: 'DATABASE_URL', required: true, isPublic: false },
  { name: 'DIRECT_DATABASE_URL', required: true, isPublic: false },

  // Authentication
  { name: 'NEXTAUTH_SECRET', required: true, isPublic: false },
  { name: 'NEXTAUTH_URL', required: true, isPublic: true },

  // Stripe (optional but should warn if used)
  { name: 'STRIPE_SECRET_KEY', required: false, isPublic: false },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false, isPublic: false },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false, isPublic: true },

  // Storage (Wasabi/other object storage)
  { name: 'WASABI_ENDPOINT', required: false, isPublic: false },
  { name: 'WASABI_ACCESS_KEY_ID', required: false, isPublic: false },
  { name: 'WASABI_SECRET_ACCESS_KEY', required: false, isPublic: false },
  { name: 'WASABI_BUCKET', required: false, isPublic: false },

  // Site
  { name: 'NEXT_PUBLIC_SITE_URL', required: true, isPublic: true },

  // AI Services (optional)
  { name: 'OPENAI_API_KEY', required: false, isPublic: false },
  { name: 'GEMINI_API_KEY', required: false, isPublic: false },
];

export function validateEnvVars(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_VARS) {
    const value = process.env[config.name];
    const envVarName = config.isPublic ? `NEXT_PUBLIC_${config.name}` : config.name;

    if (config.required && !value) {
      errors.push(`Required environment variable is missing: ${envVarName}`);
    } else if (!value && config.name.includes('STRIPE')) {
      warnings.push(`Stripe integration may not work: ${envVarName} is not configured`);
    } else if (!value && config.name.includes('API_KEY')) {
      warnings.push(`AI service may not work: ${envVarName} is not configured`);
    }
  }

  // Log warnings but don't fail
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[Environment Validation Warnings]:', warnings.join('\n'));
  }

  // Fail on critical errors
  if (errors.length > 0) {
    console.error('[Environment Validation Errors]:', errors.join('\n'));
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Auto-validate on import in development
if (process.env.NODE_ENV === 'development') {
  validateEnvVars();
}
