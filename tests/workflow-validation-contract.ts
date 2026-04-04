import {
  validateAutomationWorkflow,
  validateDetectedAutomationWorkflow,
} from '@/lib/automation-workflow-validator';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const validN8nWorkflow = {
  name: 'Post Ready Video',
  nodes: [
    {
      parameters: { events: ['video.ready'] },
      name: 'ClickVeed Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [0, 0] as [number, number],
    },
    {
      parameters: { text: 'Video ready' },
      name: 'Slack Notify',
      type: 'n8n-nodes-base.slack',
      typeVersion: 1,
      position: [280, 0] as [number, number],
    },
  ],
  connections: {
    'ClickVeed Trigger': {
      main: [
        [
          {
            node: 'Slack Notify',
            type: 'main',
            index: 0,
          },
        ],
      ],
    },
  },
};

const validMakeBlueprint = {
  name: 'Publish Ready Video',
  flow: [
    {
      id: 1,
      module: 'webhooks:receive',
      version: 1,
      parameters: {},
      metadata: {
        designer: { x: 0, y: 0 },
      },
    },
    {
      id: 2,
      module: 'json:ParseJSON',
      version: 1,
      metadata: {
        designer: { x: 200, y: 0 },
      },
    },
  ],
  metadata: {
    version: 1,
    scenario: {
      roundtrips: 1,
    },
  },
};

function main(): void {
  const n8nValidation = validateAutomationWorkflow('n8n', validN8nWorkflow);
  assert(n8nValidation.ok, 'Expected valid n8n workflow fixture to pass validation');

  const makeValidation = validateAutomationWorkflow('Make.com', validMakeBlueprint);
  assert(makeValidation.ok, 'Expected valid Make.com blueprint fixture to pass validation');

  const detectedValidation = validateDetectedAutomationWorkflow(validMakeBlueprint);
  assert(
    detectedValidation.ok && detectedValidation.platform === 'Make.com',
    'Expected platform detection to recognize Make.com fixtures'
  );

  const invalidN8n = validateAutomationWorkflow('n8n', {
    name: 'Broken Workflow',
    nodes: [
      {
        parameters: {},
        name: 'Source',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [0, 0],
      },
    ],
    connections: {
      Source: {
        main: [[{ node: 'Missing Target', type: 'main', index: 0 }]],
      },
    },
  });
  assert(!invalidN8n.ok, 'Expected invalid n8n workflow fixture to fail validation');

  const invalidMake = validateAutomationWorkflow('Make.com', {
    name: 'Broken Blueprint',
    flow: [
      { id: 1, module: 'webhooks:receive', version: 1 },
      { id: 1, module: 'json:ParseJSON', version: 1 },
    ],
    metadata: {
      version: 1,
    },
  });
  assert(!invalidMake.ok, 'Expected invalid Make.com blueprint fixture to fail validation');

  console.log('Workflow validation contract checks passed');
}

main();
