import pino from 'pino';
import { loggerConfig } from '../../config/logger.config';
import { prettyTransport } from './prettyTransport';

const isDev = process.env.NODE_ENV !== 'production';

let transportConfig;

if (isDev) {
  transportConfig = pino.transport(prettyTransport);
} else {
  // In production, use standard pino destinations (stdout).
  // Pino is natively extremely fast and asynchronous when logging to stdout.
  transportConfig = pino.transport({
    targets: [
      {
        target: 'pino/file',
        options: { destination: 1 } // 1 is stdout
      },
      // You can also add file logging if you need to store them locally:
      // {
      //   target: 'pino/file',
      //   options: { destination: loggerConfig.logFilePath, mkdir: true }
      // }
    ]
  });
}

const logger = pino(
  {
    level: loggerConfig.level,
    redact: loggerConfig.redact,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transportConfig
);

export default logger;
