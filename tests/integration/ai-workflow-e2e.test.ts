import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  runPersonaAvatarWorkflow,
  runVoiceCloneWorkflow,
  runVoiceOverWorkflow,
  runPipelineVideoWorkflow,
  runPipelineVoiceOverWorkflow,
} from '@/server/ai/workflow-e2e-helpers';
import { runVideoFromUrlWorkflow } from '@/server/ai/video-from-url-workflow';

describe('ai workflow e2e', () => {
  test('persona avatar workflow generates image, persists asset, and queues render job', async () => {
    const createdAssets: Array<Record<string, unknown>> = [];
    const createdJobs: Array<Record<string, unknown>> = [];

    const result = await runPersonaAvatarWorkflow(
      {
        personaName: 'Ava',
        personaDescription: 'Helpful guide',
        avatarDescription: 'Studio portrait with warm lighting',
        script: 'Welcome to the demo.',
      },
      {
        userId: 'user-1',
        generateImage: async () => ({
          result: {
            content: [{ text: 'Image generated: https://cdn.example.com/avatar.png' }],
          },
        }),
        uploadImage: async () => ({
          publicUrl: 'https://storage.example.com/images/avatar.png',
          sizeMB: 1.2,
        }),
        createMediaAsset: async (asset) => {
          createdAssets.push(asset);
        },
        createJob: async (job) => {
          createdJobs.push(job);
          return { id: 'job-123' };
        },
        enqueueJob: async () => ({
          jobStatus: 'queued',
          videoStatus: 'Avatar video has been queued for rendering.',
        }),
      }
    );

    assert.equal(result.jobId, 'job-123');
    assert.equal(result.jobStatus, 'queued');
    assert.equal(result.avatarImageUrl, 'https://storage.example.com/images/avatar.png');
    assert.equal(createdAssets.length, 1);
    assert.equal(createdJobs.length, 1);
    assert.equal(createdJobs[0].avatarImageUrl, 'https://storage.example.com/images/avatar.png');
  });

  test('voice clone workflow resolves samples, calls provider, and stores normalized keys', async () => {
    const records: Array<Record<string, unknown>> = [];

    const result = await runVoiceCloneWorkflow(
      {
        voiceName: 'Narrator',
        fileUrls: ['media/user-1/sample-a.mp3', 'media/user-1/sample-b.mp3'],
      },
      {
        userId: 'user-1',
        userEmail: 'creator@example.com',
        resolveSamples: async () => ({
          sampleKeys: ['media/user-1/sample-a.mp3', 'media/user-1/sample-b.mp3'],
          sampleUrls: ['https://storage.example.com/a.mp3', 'https://storage.example.com/b.mp3'],
        }),
        addVoiceClone: async (voiceName, sampleUrls) => {
          assert.equal(voiceName, 'Narrator');
          assert.equal(sampleUrls.length, 2);
          return { voiceId: 'voice-123', name: 'Narrator', category: 'generated' };
        },
        createVoiceCloneRecord: async (record) => {
          records.push(record);
        },
      }
    );

    assert.equal(result.voiceId, 'voice-123');
    assert.equal(records.length, 1);
    assert.deepEqual(records[0].sampleUrls, ['media/user-1/sample-a.mp3', 'media/user-1/sample-b.mp3']);
  });

  test('voice over workflow stitches multi-speaker audio and stores the uploaded file', async () => {
    const assets: Array<Record<string, unknown>> = [];
    const fetchedUrls: string[] = [];

    const result = await runVoiceOverWorkflow(
      {
        script: 'Speaker1: Hello there.\nSpeaker2: General Kenobi.',
        speakers: [
          { speakerId: 'Speaker1', voice: 'voice-a' },
          { speakerId: 'Speaker2', voice: 'voice-b' },
        ],
      },
      {
        userId: 'user-1',
        synthesizeSegmentAudio: async (_text, voiceId) => `https://audio.example.com/${voiceId}.mp3`,
        fetchAudioBuffer: async (audioUrl) => {
          fetchedUrls.push(audioUrl);
          return {
            buffer: Buffer.from(audioUrl.includes('voice-a') ? 'ID3AAAABBBBB' : 'ID3CCCCCDDDDD'),
            contentType: 'audio/mpeg',
          };
        },
        uploadCombinedAudio: async () => ({
          publicUrl: 'https://storage.example.com/audio/combined.mp3',
        }),
        assertPlayableAudioUrl: async (audioUrl) => {
          assert.equal(audioUrl, 'https://storage.example.com/audio/combined.mp3');
        },
        createMediaAsset: async (asset) => {
          assets.push(asset);
        },
      }
    );

    assert.equal(result.audioUrl, 'https://storage.example.com/audio/combined.mp3');
    assert.deepEqual(fetchedUrls, [
      'https://audio.example.com/voice-a.mp3',
      'https://audio.example.com/voice-b.mp3',
    ]);
    assert.equal(assets.length, 1);
  });

  test('video-from-url workflow fetches content, consumes credits, and generates a script', async () => {
    let creditsConsumed = 0;
    let generatedPrompt = '';

    const result = await runVideoFromUrlWorkflow(
      {
        url: 'https://example.com/post',
        topic: 'Focus on the product launch',
      },
      {
        assertSafeUrl: async (url) => new URL(url),
        fetchUrl: async () => ({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => {
              if (name === 'content-type') return 'text/html; charset=utf-8';
              if (name === 'content-length') return '1024';
              return null;
            },
          },
          text: async () => '<html><body><h1>Launch Day</h1><p>The new platform is live.</p></body></html>',
        }),
        consumeCredits: async () => {
          creditsConsumed += 1;
          return { success: true };
        },
        generateScript: async (prompt) => {
          generatedPrompt = prompt;
          return {
            output: { script: 'Hook line main point CTA' },
            provider: 'test-provider',
            model: 'test-model',
          };
        },
      }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(creditsConsumed, 1);
    assert.match(generatedPrompt, /Launch Day/);
    assert.match(generatedPrompt, /Focus on the product launch/);
  });

  test('pipeline voice over workflow uploads generated audio and stores the asset', async () => {
    const assets: Array<Record<string, unknown>> = [];

    const result = await runPipelineVoiceOverWorkflow(
      {
        script: 'Core Idea: Product launch\n[SCENE: City skyline]\nVoiceover: This changes everything.',
        voice: 'voice-a',
      },
      {
        userId: 'user-1',
        generateTts: async () => ({
          media: {
            url: 'data:audio/raw;base64,UklGRg==',
          },
        }),
        uploadAudio: async () => ({
          publicUrl: 'https://storage.example.com/audio/pipeline.wav',
          sizeMB: 0.4,
        }),
        createMediaAsset: async (asset) => {
          assets.push(asset);
        },
        encodeWav: async () => 'UklGRg==',
      }
    );

    assert.equal(result.audioUrl, 'https://storage.example.com/audio/pipeline.wav');
    assert.equal(assets.length, 1);
    assert.equal(assets[0].name, 'Product launch');
  });

  test('pipeline video workflow generates image and video, then stores the final asset', async () => {
    const assets: Array<Record<string, unknown>> = [];

    const result = await runPipelineVideoWorkflow(
      {
        script: '[SCENE: A sunrise over mountains]\nVoiceover: Start strong.',
      },
      {
        userId: 'user-1',
        generateImage: async () => ({
          result: {
            content: [{ text: 'Image generated: https://cdn.example.com/scene.png' }],
          },
        }),
        generateVideo: async (prompt) => {
          assert.match(prompt, /Image: https:\/\/cdn\.example\.com\/scene\.png/);
          return {
            result: {
              content: [{ text: 'Video generated: https://cdn.example.com/video.mp4' }],
            },
          };
        },
        createMediaAsset: async (asset) => {
          assets.push(asset);
        },
      }
    );

    assert.equal(result.videoUrl, 'https://cdn.example.com/video.mp4');
    assert.equal(assets.length, 1);
  });
});
