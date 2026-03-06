import { getProvidersForCapability } from '@/lib/ai/provider-registry';
import { providerSupportsCapability } from '@/lib/ai/provider-clients';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertPrimaryProviders(): void {
  const textPrimary = getProvidersForCapability('text')[0]?.name;
  const imagePrimary = getProvidersForCapability('image')[0]?.name;
  const videoPrimary = getProvidersForCapability('video')[0]?.name;
  const ttsPrimary = getProvidersForCapability('tts')[0]?.name;

  assert(textPrimary === 'gemini', `Expected text primary to be gemini, got ${textPrimary}`);
  assert(imagePrimary === 'fal', `Expected image primary to be fal, got ${imagePrimary}`);
  assert(videoPrimary === 'minimax', `Expected video primary to be minimax (Hailuo path), got ${videoPrimary}`);
  assert(ttsPrimary === 'awsPolly', `Expected tts primary to be awsPolly, got ${ttsPrimary}`);
}

function assertFallbackProviders(): void {
  const videoProviders = getProvidersForCapability('video').map((provider) => provider.name);
  const ttsProviders = getProvidersForCapability('tts').map((provider) => provider.name);

  assert(videoProviders.includes('runwayml'), 'Expected video fallback providers to include runwayml');
  assert(videoProviders.includes('pika'), 'Expected video fallback providers to include pika');
  assert(ttsProviders.includes('elevenlabs'), 'Expected tts fallback providers to include elevenlabs');
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
  assertFallbackProviders();
  assertImplementedProvidersSupportCapabilities();
  console.log('AI provider contract checks passed');
}

main();
