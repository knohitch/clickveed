import { z } from 'zod';

export type AutomationPlatform = 'n8n' | 'Make.com';

const N8nNodeSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().min(1, 'Each n8n node must have a name.'),
    type: z.string().min(1, 'Each n8n node must have a type.'),
    typeVersion: z.union([z.number(), z.string()]),
    position: z.tuple([z.number(), z.number()], {
      errorMap: () => ({ message: 'Each n8n node must include a 2-number position array.' }),
    }),
    parameters: z.record(z.unknown()),
  })
  .passthrough();

const N8nWorkflowSchema = z
  .object({
    name: z.string().min(1, 'n8n workflows must include a name.'),
    nodes: z.array(N8nNodeSchema).min(1, 'n8n workflows must include at least one node.'),
    connections: z.record(z.unknown()),
  })
  .passthrough();

const MakeModuleSchema = z
  .object({
    id: z.number().int().positive('Each Make.com module must have a positive numeric id.'),
    module: z.string().min(1, 'Each Make.com module must include a module identifier.'),
    version: z.number().int().positive('Each Make.com module must include a positive version number.'),
  })
  .passthrough();

const MakeBlueprintSchema = z
  .object({
    name: z.string().min(1, 'Make.com blueprints must include a name.'),
    flow: z.array(MakeModuleSchema).min(1, 'Make.com blueprints must include at least one module in flow.'),
    metadata: z
      .object({
        version: z.number().int().positive('Make.com blueprint metadata.version must be a positive integer.'),
      })
      .passthrough(),
  })
  .passthrough();

type ValidationSuccess = {
  ok: true;
  platform: AutomationPlatform;
  workflow: Record<string, unknown>;
};

type ValidationFailure = {
  ok: false;
  platform: AutomationPlatform;
  errors: string[];
};

export type AutomationWorkflowValidationResult = ValidationSuccess | ValidationFailure;

function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'workflow';
    return `${path}: ${issue.message}`;
  });
}

function normalizeJsonString(content: string): string {
  return content.replace(/```json\s*|\s*```/gi, '').trim();
}

function extractMakeBlueprintCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const payload = value as Record<string, unknown>;
  if (payload.response && typeof payload.response === 'object') {
    const responsePayload = payload.response as Record<string, unknown>;
    if (responsePayload.blueprint && typeof responsePayload.blueprint === 'object') {
      return responsePayload.blueprint;
    }
  }

  if (payload.blueprint && typeof payload.blueprint === 'object') {
    return payload.blueprint;
  }

  return value;
}

function detectPlatformFromWorkflow(value: unknown): AutomationPlatform | null {
  const candidate = extractMakeBlueprintCandidate(value);
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const payload = candidate as Record<string, unknown>;
  if (Array.isArray(payload.nodes)) {
    return 'n8n';
  }

  if (Array.isArray(payload.flow)) {
    return 'Make.com';
  }

  return null;
}

function collectN8nConnectionTargets(value: unknown, targets: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectN8nConnectionTargets(item, targets));
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.node === 'string') {
    targets.push(payload.node);
  }

  Object.values(payload).forEach((item) => collectN8nConnectionTargets(item, targets));
}

function validateN8nWorkflow(value: unknown): AutomationWorkflowValidationResult {
  const parsed = N8nWorkflowSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      platform: 'n8n',
      errors: formatZodIssues(parsed.error),
    };
  }

  const workflow = parsed.data;
  const nodeNames = workflow.nodes.map((node) => node.name.trim());
  const uniqueNodeNames = new Set(nodeNames);
  if (uniqueNodeNames.size !== nodeNames.length) {
    return {
      ok: false,
      platform: 'n8n',
      errors: ['n8n workflows must use unique node names so connections can resolve correctly.'],
    };
  }

  const missingSources = Object.keys(workflow.connections).filter((source) => !uniqueNodeNames.has(source));
  if (missingSources.length > 0) {
    return {
      ok: false,
      platform: 'n8n',
      errors: [`n8n connections reference missing source nodes: ${missingSources.join(', ')}.`],
    };
  }

  const targetNodes: string[] = [];
  collectN8nConnectionTargets(workflow.connections, targetNodes);
  const missingTargets = [...new Set(targetNodes.filter((target) => !uniqueNodeNames.has(target)))];
  if (missingTargets.length > 0) {
    return {
      ok: false,
      platform: 'n8n',
      errors: [`n8n connections reference missing target nodes: ${missingTargets.join(', ')}.`],
    };
  }

  return {
    ok: true,
    platform: 'n8n',
    workflow: workflow as unknown as Record<string, unknown>,
  };
}

function validateMakeBlueprint(value: unknown): AutomationWorkflowValidationResult {
  const blueprintCandidate = extractMakeBlueprintCandidate(value);
  const parsed = MakeBlueprintSchema.safeParse(blueprintCandidate);
  if (!parsed.success) {
    return {
      ok: false,
      platform: 'Make.com',
      errors: formatZodIssues(parsed.error),
    };
  }

  const workflow = parsed.data;
  const moduleIds = workflow.flow.map((module) => module.id);
  const uniqueModuleIds = new Set(moduleIds);
  if (uniqueModuleIds.size !== moduleIds.length) {
    return {
      ok: false,
      platform: 'Make.com',
      errors: ['Make.com blueprints must use unique module ids in flow.'],
    };
  }

  return {
    ok: true,
    platform: 'Make.com',
    workflow: workflow as unknown as Record<string, unknown>,
  };
}

export function parseWorkflowJson(content: string): unknown {
  return JSON.parse(normalizeJsonString(content));
}

export function validateAutomationWorkflow(
  platform: AutomationPlatform,
  workflow: unknown
): AutomationWorkflowValidationResult {
  return platform === 'n8n' ? validateN8nWorkflow(workflow) : validateMakeBlueprint(workflow);
}

export function detectAutomationWorkflowPlatform(workflow: unknown): AutomationPlatform | null {
  return detectPlatformFromWorkflow(workflow);
}

export function validateDetectedAutomationWorkflow(workflow: unknown): AutomationWorkflowValidationResult {
  const detectedPlatform = detectAutomationWorkflowPlatform(workflow);
  if (!detectedPlatform) {
    return {
      ok: false,
      platform: 'n8n',
      errors: ['Workflow JSON is missing the platform-specific structure for n8n or Make.com.'],
    };
  }

  return validateAutomationWorkflow(detectedPlatform, workflow);
}
