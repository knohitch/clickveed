import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { spawn, type ChildProcess } from 'node:child_process';
import { after, before, describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const cwd = process.cwd();
const port = 3211;
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess: ChildProcess | null = null;
let serverLogs = '';

before(async () => {
  serverProcess = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (!serverProcess.stdout || !serverProcess.stderr) {
    throw new Error('Failed to capture Next dev server output.');
  }

  serverProcess.stdout.on('data', (chunk) => {
    serverLogs += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverLogs += chunk.toString();
  });

  try {
    await waitForServer(baseUrl, 120000);
  } catch (error) {
    throw new Error(`Next dev server did not become ready.\n${serverLogs}\n${String(error)}`);
  }
});

after(async () => {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await Promise.race([
    once(serverProcess, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 10000)),
  ]);
});

describe('route auth contracts', () => {
  test('notifications route requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/notifications`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Unauthorized');
  });

  test('storage delete route requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/storage/delete?key=media/user-1/file.mp4`, {
      method: 'DELETE',
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Unauthorized');
  });

  test('super-admin db health route fails closed without a session', async () => {
    const response = await fetch(`${baseUrl}/api/admin/db-health`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Unauthorized');
  });

  test('admin AI models route fails closed without a session', async () => {
    const response = await fetch(`${baseUrl}/api/ai/models`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Unauthorized');
  });
});

async function waitForServer(base: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${base}/api/health`, {
        headers: { accept: 'application/json' },
      });

      if (response.status > 0) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw lastError instanceof Error ? lastError : new Error('Server readiness probe timed out');
}
