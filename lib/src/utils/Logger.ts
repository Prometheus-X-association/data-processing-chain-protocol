import { WriteStream, createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { format } from 'util';

/**
 * Represents the log levels for the Logger.
 * @typedef {'info' | 'warn' | 'error' | 'header'} LogLevel
 */
type LogLevel =
  | 'event'
  | 'info'
  | 'warn'
  | 'error'
  | 'header'
  | 'debug'
  | 'special';

/**
 * Configuration options for the Logger.
 * @interface LoggerConfig
 * @property {boolean} [preserveLogs] - If true, logs will be preserved and passed to an external callback.
 * @property {function(LogLevel, string, string): void} [externalCallback] - A callback function to handle preserved logs.
 */
interface LoggerConfig {
  preserveLogs?: boolean;
  externalCallback?: (
    _level: LogLevel,
    _message: string,
    _timestamp: string,
  ) => void;
}

// ANSI color codes for console output
const Colors = {
  reset: '\x1b[0m',
  info: '\x1b[32m', // green
  warn: '\x1b[93m', // yellow
  error: '\x1b[31m', // red
  header: '\x1b[36m', // cyan
  debug: '\x1b[90m', // gray
  event: '\x1b[35m', // magenta
  special: '\x1b[37m', // white
} as const;

/**
 * Logger class for logging messages to the console and optionally to disk.
 */
export class Logger {
  private static noPrint: boolean = false; // Flag to disable console output

  private static config: LoggerConfig = {
    preserveLogs: false,
  };

  /**
   * Configures the logger with the provided options.
   * @param {LoggerConfig} config - The configuration settings for the logger.
   */
  static configure(config: LoggerConfig) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Formats a log message with a timestamp and color based on the log level.
   * @param {LogLevel} level - The log level for the message.
   * @param {string} message - The message to format.
   * @returns {string} - The formatted log message.
   */
  private static formatMessage(level: LogLevel, message: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}:${hours}.${minutes}.${seconds}`;
    if (level === 'special') {
      return `${Colors.reset}${Colors.special}${timestamp} [${level.toUpperCase()}]: \x1b[31m[${message}\x1b[31m]${Colors.reset}\n`;
    }
    return `${Colors.reset}${Colors[level]}${timestamp} [${level.toUpperCase()}]: ${message}${Colors.reset}\n`;
  }

  /**
   * Logs a message with the specified log level.
   * @param {LogLevel} level - The log level of the message.
   * @param {string} message - The message to log.
   */
  private static log(level: LogLevel, message: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = this.formatMessage(level, message);

    if (!this.noPrint) {
      process.stdout.write(formattedMessage);
    }

    if (this.config.preserveLogs && this.config.externalCallback) {
      this.config.externalCallback(level, message, timestamp);
    }
  }

  static special(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('special', msg);
  }

  static event(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('event', msg);
  }

  /**
   * Logs a debug message.
   * @param {string | object} message - The message to log, can be a string or an object.
   */
  static debug(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('debug', msg);
  }

  /**
   * Logs an informational message.
   * @param {string | object} message - The message to log, can be a string or an object.
   */
  static info(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('info', msg);
  }

  /**
   * Logs a warning message.
   * @param {string | object} message - The message to log, can be a string or an object.
   */
  static warn(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('warn', msg);
  }

  /**
   * Logs an error message.
   * @param {string | object} message - The message to log, can be a string or an object.
   */
  static error(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('error', msg);
  }

  /**
   * Logs a header message.
   * @param {string | object} message - The message to log, can be a string or an object.
   */
  static header(message: string | object) {
    const msg = typeof message === 'string' ? message : format(message);
    this.log('header', msg);
  }
}

// Default log path for disk logging
const DEFAULT_LOG_PATH = join(process.cwd(), 'logs');
let logStream: WriteStream;

/**
 * Generates a log file name based on the current timestamp.
 * @returns {string} - The generated log file name.
 */
const getLogFileName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `dpcp-${timestamp}.log`;
};

/**
 * Initializes the disk logger by creating the log directory and file.
 * @returns {boolean} - True if the logger was successfully initialized, otherwise false.
 */
const initDiskLogger = () => {
  try {
    mkdirSync(DEFAULT_LOG_PATH, { recursive: true });
    const logFile = join(DEFAULT_LOG_PATH, getLogFileName());
    logStream = createWriteStream(logFile, { flags: 'a' });
    return true;
  } catch (err) {
    process.stderr.write(`Failed to create log directory: ${err}\n`);
    return false;
  }
};

/**
 * Default callback function for handling logs that should be preserved.
 * @param {LogLevel} level - The log level of the message.
 * @param {string} message - The message to log.
 * @param {string} timestamp - The timestamp of the log message.
 */
const defaultDiskCallback = (
  level: LogLevel,
  message: string,
  timestamp: string,
) => {
  if (!logStream && !initDiskLogger()) {
    return;
  }
  const plainMessage = `${timestamp} [LOGGER][${level.toUpperCase()}]: ${message}\n`;
  logStream.write(plainMessage);
};

// Initial configuration of the logger to preserve logs on disk
Logger.configure({
  preserveLogs: true,
  externalCallback: defaultDiskCallback,
});
