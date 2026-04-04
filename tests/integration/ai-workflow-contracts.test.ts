import assert from 'node:assert/strict';
import { afterEach, describe, mock, test } from 'node:test';

import {
  buildPipelineVisualPrompt,
  extractAudioUrl,
  extractAvatarImageUrl,
  extractPipelineVoiceOverText,
  parseMultiSpeakerScript,
  resolveOwnedVoiceSampleUrls,
} from '@/server/ai/workflow-contract-helpers';
import { assertSafeExternalUrl } from '@/server/ai/video-from-url-safety';
import { storageManager } from '@/lib/storage';

afterEach(() => {
  mock.restoreAll();
});

describe('ai workflow contracts', () => {
  test('persona avatar image extraction handles provider text responses', () => {
    const imageUrl = extractAvatarImageUrl({
      result: {
        content: [{ text: 'Image generated: https://cdn.example.com/avatar.png' }],
      },
    });

    assert.equal(imageUrl, 'https://cdn.example.com/avatar.png');
  });

  test('persona avatar image extraction handles inline base64 responses', () => {
    const imageUrl = extractAvatarImageUrl({
      message: {
        content: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'ZmFrZS1pbWFnZQ==',
            },
          },
        ],
      },
    });

    assert.equal(imageUrl, 'data:image/png;base64,ZmFrZS1pbWFnZQ==');
  });

  test('voice clone sample resolution only accepts owned storage keys', async () => {
    mock.method(storageManager, 'ensureInitialized', async () => true);
    mock.method(storageManager, 'isConfigured', () => true);
    mock.method(storageManager, 'getFileUrl', (key: string) => `https://storage.example.com/${key}`);

    const result = await resolveOwnedVoiceSampleUrls(
      ['media/user-1/sample-a.mp3', 'https://cdn.example.com/media/user-1/sample-b.mp3'],
      'user-1'
    );

    assert.deepEqual(result.sampleKeys, [
      'media/user-1/sample-a.mp3',
      'media/user-1/sample-b.mp3',
    ]);
    assert.deepEqual(result.sampleUrls, [
      'https://storage.example.com/media/user-1/sample-a.mp3',
      'https://storage.example.com/media/user-1/sample-b.mp3',
    ]);
  });

  test('voice clone sample resolution rejects cross-user sample keys', async () => {
    mock.method(storageManager, 'ensureInitialized', async () => true);
    mock.method(storageManager, 'isConfigured', () => true);

    await assert.rejects(
      () => resolveOwnedVoiceSampleUrls(['media/other-user/sample.mp3'], 'user-1'),
      /uploaded to your own storage/
    );
  });

  test('voice over multi-speaker parsing routes text to the selected voices', () => {
    const segments = parseMultiSpeakerScript(
      ['Speaker1: Hello there.', 'Speaker2: General Kenobi.', 'Speaker1: You are a bold one.'].join('\n'),
      [
        { speakerId: 'Speaker1', voice: 'voice-a' },
        { speakerId: 'Speaker2', voice: 'voice-b' },
      ]
    );

    assert.deepEqual(segments, [
      { speakerId: 'Speaker1', voice: 'voice-a', text: 'Hello there.' },
      { speakerId: 'Speaker2', voice: 'voice-b', text: 'General Kenobi.' },
      { speakerId: 'Speaker1', voice: 'voice-a', text: 'You are a bold one.' },
    ]);
  });

  test('voice over parsing fails when the script lacks labeled speakers', () => {
    assert.throws(
      () =>
        parseMultiSpeakerScript('Unlabeled line of dialogue', [
          { speakerId: 'Speaker1', voice: 'voice-a' },
          { speakerId: 'Speaker2', voice: 'voice-b' },
        ]),
      /Multi-speaker mode requires/
    );
  });

  test('voice over audio extraction accepts direct provider URLs', () => {
    const audioUrl = extractAudioUrl({
      result: {
        content: [{ text: 'Speech generated: https://cdn.example.com/audio.mp3' }],
      },
    });

    assert.equal(audioUrl, 'https://cdn.example.com/audio.mp3');
  });

  test('video-from-url safety rejects local and credentialed URLs', async () => {
    await assert.rejects(
      () => assertSafeExternalUrl('http://localhost:3000/private'),
      /hostname is not allowed/
    );

    await assert.rejects(
      () => assertSafeExternalUrl('https://user:pass@example.com/private'),
      /embedded credentials/
    );
  });

  test('video-from-url safety allows normal external https URLs', async () => {
    const safeUrl = await assertSafeExternalUrl('https://example.com/some-page');
    assert.equal(safeUrl.toString(), 'https://example.com/some-page');
  });

  test('pipeline voice-over extraction removes scene cues and keeps spoken lines', () => {
    const result = extractPipelineVoiceOverText(
      '[SCENE: A city skyline]\nVoiceover: Welcome to the future.\nNarrator: Let us begin.'
    );

    assert.equal(result.trim(), 'Welcome to the future. Let us begin.');
  });

  test('pipeline visual prompt extraction prefers scene descriptions', () => {
    const result = buildPipelineVisualPrompt(
      '[SCENE: A sunrise over mountains] [SCENE: A runner on a trail]\nVoiceover: Push forward.'
    );

    assert.equal(result.trim(), 'A sunrise over mountains  A runner on a trail');
  });
});
