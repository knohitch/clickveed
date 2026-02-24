import { getProvidersForCapability } from '@/lib/ai/provider-registry';
import { providerSupportsCapability } from '@/lib/ai/provider-clients';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertPrimaryProviders(): void {
  const textPrimary = getProvidersForCapability('text')[0]?.name;
  const imagePrimary = getProvidersForCapability('image')[0]?.name;
  const videoPrimary = getProvidersForCapability('video')[0]?.name;

  assert(textPrimary === 'gemini', `Expected text primary to be gemini, got ${textPrimary}`);
  assert(imagePrimary === 'imagen', `Expected image primary to be imagen, got ${imagePrimary}`);
  assert(videoPrimary === 'googleVeo', `Expected video primary to be googleVeo, got ${videoPrimary}`);
}

function assertImplementedProvidersSupportCapabilities(): void {
  const caps: Array<'text' | 'text_stream' | 'image' | 'video' | 'tts'> = [
    'text',
    'text_stream',
    'image',
    'video',
    'tts',
  ];

  for (const cap of caps) {
    for (const provider of getProvidersForCapability(cap)) {
      if (!provider.implemented) continue;
      assert(
        providerSupportsCapability(provider.name, cap),
        `Provider ${provider.name} is marked implemented for ${cap} but adapter support is missing`
      );
    }
  }
}

function main(): void {
  assertPrimaryProviders();
  assertImplementedProvidersSupportCapabilities();
  console.log('AI provider contract checks passed');
}

main();

