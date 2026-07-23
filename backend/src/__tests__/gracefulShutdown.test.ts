import { EventEmitter } from 'node:events';
import http from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  installGracefulShutdown,
  type SignalSource,
} from '../gracefulShutdown.js';

const openServers = new Set<http.Server>();

afterEach(async () => {
  await Promise.all(
    [...openServers].map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections?.();
        }),
    ),
  );
  openServers.clear();
});

describe('installGracefulShutdown', () => {
  it('drains an in-flight request after SIGTERM before exiting', async () => {
    const app = express();
    let markStarted!: () => void;
    let finishRequest!: () => void;
    const requestStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const mayFinish = new Promise<void>((resolve) => {
      finishRequest = resolve;
    });

    app.get('/slow', async (_req, res) => {
      markStarted();
      await mayFinish;
      res.status(200).json({ status: 'completed' });
    });

    const server = http.createServer(app);
    openServers.add(server);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port');
    }

    const signalSource = new EventEmitter() as SignalSource & EventEmitter;
    const logger = { info: vi.fn(), error: vi.fn() };
    let resolveExit!: (code: number) => void;
    const exitCode = new Promise<number>((resolve) => {
      resolveExit = resolve;
    });

    const controller = installGracefulShutdown({
      server,
      timeoutMs: 1_000,
      signalSource,
      logger,
      exit: resolveExit,
    });

    const response = new Promise<{ statusCode?: number; body: string }>(
      (resolve, reject) => {
        http
          .get(
            {
              host: '127.0.0.1',
              port: address.port,
              path: '/slow',
            },
            (res) => {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', (chunk: string) => {
                body += chunk;
              });
              res.on('end', () => resolve({ statusCode: res.statusCode, body }));
            },
          )
          .on('error', reject);
      },
    );

    await requestStarted;
    signalSource.emit('SIGTERM');
    finishRequest();

    await expect(response).resolves.toEqual({
      statusCode: 200,
      body: JSON.stringify({ status: 'completed' }),
    });
    await expect(exitCode).resolves.toBe(0);
    expect(logger.info).toHaveBeenCalledWith(
      'Graceful shutdown initiated (SIGTERM)',
    );
    expect(logger.info).toHaveBeenCalledWith('Server closed');
    expect(logger.error).not.toHaveBeenCalled();

    controller.dispose();
    openServers.delete(server);
  });
});
