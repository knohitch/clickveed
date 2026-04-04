import { storageManager } from '@/lib/storage';
import { getUserOwnedStorageKey } from '@/lib/storage-key-utils';

export type VoiceSegment = {
  speakerId: string;
  voice: string;
  text: string;
};

function normalizeSpeakerId(value: string): string {
  return value.replace(/\s+/g, '').trim().toLowerCase();
}

export function extractAvatarImageUrl(imageResponse: unknown): string {
  const payload = imageResponse as any;

  const text = payload?.result?.content?.[0]?.text;
  if (typeof text === 'string' && text.startsWith('Image generated: ')) {
    return text.replace('Image generated: ', '').trim();
  }

  if (typeof payload?.media?.url === 'string' && payload.media.url.length > 0) {
    return payload.media.url;
  }

  if (Array.isArray(payload?.media) && typeof payload.media[0]?.url === 'string') {
    return payload.media[0].url;
  }

  const messageParts = payload?.message?.content;
  if (Array.isArray(messageParts)) {
    for (const part of messageParts) {
      if (typeof part?.media?.url === 'string' && part.media.url.length > 0) {
        return part.media.url;
      }
      if (typeof part?.inlineData?.data === 'string' && part.inlineData.data.length > 0) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data.replace(/\s+/g, '')}`;
      }
    }
  }

  const customParts = payload?.custom?.candidates?.[0]?.content?.parts;
  if (Array.isArray(customParts)) {
    for (const part of customParts) {
      if (typeof part?.inlineData?.data === 'string' && part.inlineData.data.length > 0) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data.replace(/\s+/g, '')}`;
      }
      if (typeof part?.fileData?.fileUri === 'string' && part.fileData.fileUri.length > 0) {
        return part.fileData.fileUri;
      }
    }
  }

  return '';
}

export async function resolveOwnedVoiceSampleUrls(sampleInputs: string[], userId: string): Promise<{ sampleKeys: string[]; sampleUrls: string[] }> {
  const isInitialized = await storageManager.ensureInitialized();
  if (!isInitialized || !storageManager.isConfigured()) {
    throw new Error('Storage is not configured for voice sample uploads.');
  }

  const sampleKeys = sampleInputs.map((input) => {
    const ownedKey = getUserOwnedStorageKey(input, userId);
    if (!ownedKey) {
      throw new Error('Voice samples must be uploaded to your own storage before cloning.');
    }
    return ownedKey;
  });

  const sampleUrls = sampleKeys.map((key) => storageManager.getFileUrl(key));
  return { sampleKeys, sampleUrls };
}

export function parseMultiSpeakerScript(
  script: string,
  speakers: Array<{ speakerId: string; voice: string }>
): VoiceSegment[] {
  const speakerMap = new Map(
    speakers
      .filter((speaker) => speaker.speakerId?.trim() && speaker.voice?.trim())
      .map((speaker) => [normalizeSpeakerId(speaker.speakerId), speaker.voice.trim()])
  );

  const segments: VoiceSegment[] = [];
  let currentSegment: VoiceSegment | null = null;

  for (const rawLine of script.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const delimiterIndex = line.indexOf(':');
    if (delimiterIndex > 0) {
      const rawLabel = line.slice(0, delimiterIndex).trim();
      const normalizedLabel = normalizeSpeakerId(rawLabel);
      const matchedVoice = speakerMap.get(normalizedLabel);

      if (matchedVoice) {
        if (currentSegment?.text.trim()) {
          segments.push(currentSegment);
        }

        currentSegment = {
          speakerId: rawLabel,
          voice: matchedVoice,
          text: line.slice(delimiterIndex + 1).trim(),
        };
        continue;
      }
    }

    if (!currentSegment) {
      throw new Error(
        'Multi-speaker mode requires each section to start with labels like "Speaker1:" and "Speaker2:" that match the selected speaker list.'
      );
    }

    currentSegment.text = `${currentSegment.text}\n${line}`.trim();
  }

  if (currentSegment?.text.trim()) {
    segments.push(currentSegment);
  }

  if (!segments.length) {
    throw new Error(
      'No labeled speaker segments were found. Format the script with prefixes like "Speaker1:" and "Speaker2:".'
    );
  }

  return segments;
}

export function extractAudioUrl(ttsResponse: unknown): string {
  const payload = ttsResponse as any;
  const responseText = payload?.result?.content?.[0]?.text || '';
  let audioUrl = typeof responseText === 'string'
    ? responseText.replace('Speech generated: ', '').trim()
    : '';

  if (!audioUrl || !audioUrl.startsWith('http')) {
    audioUrl = payload?.audioUrl || payload?.media?.url || '';
  }

  const isLikelyAbsoluteHostPath = /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(audioUrl);
  if (audioUrl && !audioUrl.startsWith('http') && isLikelyAbsoluteHostPath) {
    audioUrl = `https://${audioUrl.replace(/^\/+/, '')}`;
  }

  return audioUrl;
}

export function extractPipelineVoiceOverText(script: string): string {
  const extracted = script.match(/Voiceover:|VO:|Narrator:|Dialogue:/g)
    ? script.split(/Voiceover:|VO:|Narrator:|Dialogue:/).slice(1).join(' ').replace(/\[.*?\]/g, '')
    : script;
  return extracted.replace(/\s+/g, ' ').trim();
}

export function buildPipelineVisualPrompt(script: string): string {
  const sceneDescriptions = script.match(/\[SCENE:.*?\]/g) || [];
  return sceneDescriptions.length > 0
    ? sceneDescriptions.join(' ').replace(/\[SCENE:/g, '').replace(/\]/g, '')
    : script.substring(0, 200);
}
