
'use server';

import { config } from 'dotenv';
config();

import './flows/generate-video-script';
import './flows/summarize-video-content';
import './flows/generate-video-from-image';
import './flows/generate-automation-workflow';
import './flows/generate-persona-avatar';
import './flows/generate-voice-over';
import './flows/create-voice-clone';
import './flows/generate-video-from-url';
import './flows/generate-stock-media';
import './flows/video-pipeline';
import './flows/find-viral-clips';
import './flows/generate-timed-transcript';
import './flows/remove-image-background';
import './flows/creative-assistant-chat';
import './flows/repurpose-content';
import './flows/analyze-thumbnails';
import './flows/research-video-topic';
import './flows/support-chat';
import './flows/suggest-b-roll';

// Import tools
import '@/server/ai/tools/pexels-tool';
import '@/server/ai/tools/pixabay-tool';
import '@/server/ai/tools/unsplash-tool';
