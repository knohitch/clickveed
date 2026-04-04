import assert from 'node:assert/strict';
import { afterEach, describe, mock, test } from 'node:test';

import * as prismaRuntimeModule from '../../src/server/prisma';
import { deleteFromStorage } from '@/server/actions/storage-actions';
import { markNotificationAsRead } from '@/server/services/notification-service';
import { storageManager } from '@/lib/storage';
import { getUserOwnedStorageKey } from '@/lib/storage-key-utils';

const prisma: any =
  (prismaRuntimeModule as any).default?.default ??
  (prismaRuntimeModule as any).default ??
  prismaRuntimeModule;
const restorers: Array<() => void> = [];

function replaceMethod<T extends object, K extends keyof T>(target: T, key: K, replacement: T[K]) {
  const original = target[key];
  target[key] = replacement;
  restorers.push(() => {
    target[key] = original;
  });
}

afterEach(() => {
  mock.restoreAll();
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
});

describe('auth hardening contracts', () => {
  test('storage delete rejects keys outside the authenticated user namespace', async () => {
    const deleteSpy = mock.method(storageManager, 'deleteFile', async () => {});
    mock.method(storageManager, 'ensureInitialized', async () => true);
    mock.method(storageManager, 'isConfigured', () => true);

    const result = await deleteFromStorage('media/other-user/file.mp4', 'user-1');

    assert.deepEqual(result, {
      success: false,
      error: 'Forbidden',
    });
    assert.equal(deleteSpy.mock.callCount(), 0);
  });

  test('storage delete stops when storage is not configured', async () => {
    const deleteSpy = mock.method(storageManager, 'deleteFile', async () => {});
    mock.method(storageManager, 'ensureInitialized', async () => false);
    mock.method(storageManager, 'isConfigured', () => false);

    const result = await deleteFromStorage('media/user-1/file.mp4', 'user-1');

    assert.deepEqual(result, {
      success: false,
      error: 'Storage not configured',
    });
    assert.equal(deleteSpy.mock.callCount(), 0);
  });

  test('storage delete only deletes normalized keys for the owning user', async () => {
    mock.method(storageManager, 'ensureInitialized', async () => true);
    mock.method(storageManager, 'isConfigured', () => true);
    const deleteSpy = mock.method(storageManager, 'deleteFile', async () => {});

    const result = await deleteFromStorage(
      'https://cdn.example.com/media/user-1/folder/file.mp4',
      'user-1'
    );

    assert.deepEqual(result, { success: true });
    assert.equal(deleteSpy.mock.callCount(), 1);
    assert.deepEqual(deleteSpy.mock.calls[0].arguments, ['media/user-1/folder/file.mp4']);
  });

  test('notification mark-as-read is scoped to the owning user', async () => {
    let callCount = 0;
    replaceMethod(prisma.notification, 'updateMany', (async (args: any) => {
      callCount += 1;
      assert.deepEqual(args.where, {
        id: 'notif-1',
        userId: 'user-1',
      });

      return { count: 1 } as any;
    }) as any);

    const result = await markNotificationAsRead('user-1', 'notif-1');

    assert.deepEqual(result, { success: true });
    assert.equal(callCount, 1);
  });

  test('notification mark-as-read fails when another user notification is targeted', async () => {
    replaceMethod(prisma.notification, 'updateMany', (async () => ({ count: 0 }) as any));

    await assert.rejects(
      () => markNotificationAsRead('user-1', 'notif-owned-by-someone-else'),
      /Notification not found/
    );
  });

  test('storage key helper only accepts keys within the expected user prefix', () => {
    assert.equal(
      getUserOwnedStorageKey('https://cdn.example.com/media/user-1/file.png', 'user-1'),
      'media/user-1/file.png'
    );
    assert.equal(
      getUserOwnedStorageKey('media/user-2/file.png', 'user-1'),
      null
    );
    assert.equal(
      getUserOwnedStorageKey('https://cdn.example.com/videos/user-1/file.mp4', 'user-1'),
      null
    );
    assert.equal(
      getUserOwnedStorageKey('/media/user-1/nested/file.mp4', 'user-1'),
      'media/user-1/nested/file.mp4'
    );
  });
});
