import fs from 'node:fs';
import path from 'node:path';
import { getProvidersForCapability, MODEL_CONSTANTS } from '@/lib/ai/provider-registry';

const outJson = path.join(process.cwd(), 'docs', 'ai-provider-map.generated.json');
const outMd = path.join(process.cwd(), 'docs', 'ai-provider-map.generated.md');

const capabilities: Array<'text' | 'text_stream' | 'image' | 'video' | 'tts'> = [
  'text',
  'text_stream',
  'image',
  'video',
  'tts',
];

const data = {
  generatedAt: new Date().toISOString(),
  modelConstants: MODEL_CONSTANTS,
  capabilities: capabilities.map((capability) => ({
    capability,
    providers: getProvidersForCapability(capability),
  })),
};

const lines: string[] = [];
lines.push('# AI Provider Map (Generated)');
lines.push('');
lines.push(`Generated at: ${data.generatedAt}`);
lines.push('');
lines.push('## Model Constants');
lines.push('');
for (const [name, value] of Object.entries(MODEL_CONSTANTS)) {
  lines.push(`- ${name}: \`${value}\``);
}
lines.push('');

for (const cap of capabilities) {
  lines.push(`## ${cap}`);
  lines.push('');
  for (const p of getProvidersForCapability(cap)) {
    lines.push(
      `- ${p.priority}. ${p.name} (${p.implemented ? 'implemented' : 'not implemented'}) model=\`${p.model}\``
    );
  }
  lines.push('');
}

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(outMd, lines.join('\n'), 'utf8');
console.log(`Generated ${outJson}`);
console.log(`Generated ${outMd}`);

