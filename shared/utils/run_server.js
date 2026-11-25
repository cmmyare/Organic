// Starts an HTTP server and shuts it down gracefully on SIGINT/SIGTERM,
// closing the HTTP listener first and then the given resources.
export function run_server({ app, host, port, logger, on_shutdown = async () => {} }) {
  const server = app.listen(port, host, () => {
    logger.info({ host, port }, 'http server listening');
  });

  server.on('error', (error) => {
    logger.fatal({ err: error.message, code: error.code }, 'http server failed to start');
    process.exit(1);
  });

  let shutting_down = false;
  const shutdown = async (signal) => {
    if (shutting_down) return;
    shutting_down = true;
    logger.info({ signal }, 'shutting down');
    const force_timer = setTimeout(() => {
      logger.error('forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
    force_timer.unref();
    server.close(async () => {
      try {
        await on_shutdown();
        logger.info('shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error.message }, 'error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}
