/**
 * AI Environment Validation
 * Validates that required AI provider API keys are configured
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  configuredProviders: string[];
}

interface ValidateOptions {
  apiKeys?: Record<string, string>;
}

export function validateAIEnvironment(options: ValidateOptions = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configuredProviders: string[] = [];
  const apiKeys = options.apiKeys || {};
  
  console.log('🔍 Validating AI Environment Variables...\n');
  
  // Check OpenAI
  const openaiKey = apiKeys.openai || process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    warnings.push('⚠️  OPENAI_API_KEY is not set');
  } else if (!openaiKey.startsWith('sk-')) {
    warnings.push('⚠️  OPENAI_API_KEY may be invalid (should start with sk-)');
    configuredProviders.push('openai');
  } else {
    console.log('✅ OPENAI_API_KEY is configured');
    configuredProviders.push('openai');
  }
  
  // Check Google AI (Gemini)
  const geminiKey = apiKeys.gemini || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    warnings.push('⚠️  GOOGLE_AI_API_KEY/GEMINI_API_KEY is not set');
  } else {
    console.log('✅ GOOGLE_AI_API_KEY is configured');
    configuredProviders.push('gemini');
  }
  
  // Check Anthropic
  const anthropicKey = apiKeys.claude || apiKeys.anthropic || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    warnings.push('⚠️  ANTHROPIC_API_KEY is not set');
  } else if (!anthropicKey.startsWith('sk-ant-')) {
    warnings.push('⚠️  ANTHROPIC_API_KEY may be invalid (should start with sk-ant-)');
    configuredProviders.push('anthropic');
  } else {
    console.log('✅ ANTHROPIC_API_KEY is configured');
    configuredProviders.push('anthropic');
  }
  
  // Check if at least one is configured
  const hasAtLeastOne = configuredProviders.length > 0;
  
  if (!hasAtLeastOne) {
    errors.push('❌ CRITICAL: No AI provider API keys configured!');
    errors.push('Please add at least one API key to your .env file or admin settings:');
    errors.push('  OPENAI_API_KEY=sk-... (or admin key: openai)');
    errors.push('  GOOGLE_AI_API_KEY=AIza... (or admin key: gemini)');
    errors.push('  ANTHROPIC_API_KEY=sk-ant-... (or admin key: claude)');
  }
  
  // Print warnings
  warnings.forEach(w => console.log(w));
  
  // Print errors
  if (errors.length > 0) {
    console.error('\n❌ CRITICAL ERRORS:');
    errors.forEach(e => console.error(e));
  } else {
    console.log(`\n✅ AI Environment validation passed (${configuredProviders.length} provider(s) configured)\n`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configuredProviders,
  };
}

/**
 * Throws an error if AI environment is not properly configured
 */
export function requireValidAIEnvironment(): void {
  const result = validateAIEnvironment();
  if (!result.isValid) {
    throw new Error(result.errors.join('\n'));
  }
}
