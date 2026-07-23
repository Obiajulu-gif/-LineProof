import type { Server } from 'node:http';

export interface ShutdownLogger {
  info(message: string): void;
  error(message: string): void;
}

export interface SignalSource {
  once(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  off(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

export interface GracefulShutdownOptions {
  server: Server;
  timeoutMs: number;
  onShutdown?: () => void | Promise<void>;
  exit?: (code: number) => void;
  logger?: ShutdownLogger;
  signalSource?: SignalSource;
}

export interface GracefulShutdownController {
  shutdown(signal: 'SIGTERM' | 'SIGINT'): void;
  dispose(): void;
}

/**
 * Register SIGTERM/SIGINT handlers that stop new connections and allow active
 * requests to finish before the process exits. A hard timeout prevents a stale
 * keep-alive or hung request from blocking a deployment forever.
 */
export function installGracefulShutdown(
  options: GracefulShutdownOptions,
): GracefulShutdownController {
  const {
    server,
    timeoutMs,
    onShutdown,
    exit = (code) => process.exit(code),
    logger = console,
    signalSource = process,
  } = options;

  let shuttingDown = false;
  let forceTimer: ReturnType<typeof setTimeout> | undefined;

  const shutdown = (signal: 'SIGTERM' | 'SIGINT'): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Graceful shutdown initiated (${signal})`);

    forceTimer = setTimeout(() => {
      logger.error(
        `Graceful shutdown timed out after ${timeoutMs}ms; forcing open connections closed`,
      );
      server.closeAllConnections?.();
      exit(1);
    }, timeoutMs);
    forceTimer.unref?.();

    void Promise.resolve(onShutdown?.())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Shutdown cleanup failed: ${message}`);
      })
      .finally(() => {
        server.close((error?: Error) => {
          if (forceTimer) clearTimeout(forceTimer);

          if (error) {
            logger.error(`Server close failed: ${error.message}`);
            exit(1);
            return;
          }

          logger.info('Server closed');
          exit(0);
        });

        // Explicitly close idle keep-alive sockets while active requests drain.
        server.closeIdleConnections?.();
      });
  };

  const onSigterm = (): void => shutdown('SIGTERM');
  const onSigint = (): void => shutdown('SIGINT');
  signalSource.once('SIGTERM', onSigterm);
  signalSource.once('SIGINT', onSigint);

  return {
    shutdown,
    dispose(): void {
      signalSource.off('SIGTERM', onSigterm);
      signalSource.off('SIGINT', onSigint);
      if (forceTimer) clearTimeout(forceTimer);
    },
  };
}
