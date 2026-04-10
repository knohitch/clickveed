import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { spawn, type ChildProcess } from 'node:child_process';
import { after, before, describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const cwd = process.cwd();
const port = 3212;
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

describe('route auth behavior', () => {
  test('landing route redirects unauthenticated users to login', async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    assertRedirect(response, '/login');
  });

  test('dashboard route redirects unauthenticated users to login', async () => {
    const response = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
    assertRedirect(response, '/login');
  });

  test('kanri route redirects unauthenticated users to login', async () => {
    const response = await fetch(`${baseUrl}/kanri`, { redirect: 'manual' });
    assertRedirect(response, '/login');
  });

  test('chin route redirects unauthenticated users to login', async () => {
    const response = await fetch(`${baseUrl}/chin`, { redirect: 'manual' });
    assertRedirect(response, '/login');
  });

  test('login route remains publicly reachable for unauthenticated users', async () => {
    const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
    assert.equal(response.status, 200);
  });
});

function assertRedirect(response: Response, expectedPathname: string) {
  assert.ok(
    [301, 302, 303, 307, 308].includes(response.status),
    `Expected redirect status, got ${response.status}`
  );

  const location = response.headers.get('location');
  assert.ok(location, 'Expected redirect location header');

  const locationUrl = new URL(location, baseUrl);
  assert.equal(locationUrl.pathname, expectedPathname);
}

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
