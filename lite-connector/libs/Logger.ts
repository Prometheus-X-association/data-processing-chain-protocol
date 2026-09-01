import {
  createLogger,
  format,
  transports,
  addColors,
  Logger as WinstonLogger,
} from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LEVEL = 'level';
const PROJECT_ROOT = process.cwd();
const winstonLogsMaxFiles = '14d';
const winstonLogsMaxSize = '20m';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  header: 5,
};

const level = () => process.env.LOG_LEVEL || 'header';

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  header: 'cyan',
};

addColors(colors);

const filterOnly = (level: string) => {
  return format((info) => {
    if (info[LEVEL] === level) return info;
    return false;
  })();
};

const zFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
  format.json(),
);

const customFormat = (level: string) => {
  return format.combine(
    filterOnly(level),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
    format.json(),
  );
};

const dailyTransportOptions = (level: string) => {
  return {
    filename: path.join(PROJECT_ROOT, `logs/${level}/${level}_%DATE%.log`),
    format: customFormat(level),
    level: level,
    maxFiles: winstonLogsMaxFiles,
    maxSize: winstonLogsMaxSize,
  } as DailyRotateFile.DailyRotateFileTransportOptions;
};

const loggerTransports: any[] = [
  ...(process.env.ENABLE_LOGS === 'true'
    ? [
        new transports.Console({
          level: level(),
          format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.colorize({ all: true }),
            format.printf((info) => {
              return `${info.timestamp} ${info.level}: ${info.message}`;
            }),
          ),
        }),
      ]
    : []),
  new DailyRotateFile({
    ...dailyTransportOptions('error'),
  }),
  new DailyRotateFile({
    ...dailyTransportOptions('warn'),
  }),
  new DailyRotateFile({
    ...dailyTransportOptions('http'),
  }),
  new DailyRotateFile({
    ...dailyTransportOptions('info'),
  }),
  new DailyRotateFile({
    maxFiles: '14d',
    maxSize: '20m',
    filename: path.join(PROJECT_ROOT, 'logs/all/all_%DATE%.log'),
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
      ),
    ),
    level: 'info',
  }),
  new DailyRotateFile({
    ...dailyTransportOptions('header'),
  }),
];

const NewWinstonLogger = createLogger({
  level: level(),
  levels,
  format: zFormat,
  transports: loggerTransports,
});

type LoggerOptions = {
  level?: 'error' | 'warn' | 'info' | 'debug' | 'http' | 'header';
  message?: string;
  location?: string;
  callback?: () => void;
};

const DEFAULT_LOGGER_OPTIIONS: LoggerOptions = {
  level: 'debug',
  message: 'Log fired with no message',
  location: '',
  callback: () => {},
};

export class Logger {
  static logger: WinstonLogger = NewWinstonLogger;

  static log(opts: LoggerOptions) {
    const options = this.getOptions(opts);
    this.doLog(options);
  }

  static error(opts: LoggerOptions | string) {
    this.logSpecific('error', opts);
  }

  static warn(opts: LoggerOptions) {
    this.logSpecific('warn', opts);
  }

  static info(opts: LoggerOptions) {
    this.logSpecific('info', opts);
  }

  static debug(opts: LoggerOptions | string) {
    this.logSpecific('debug', opts);
  }

  static http(opts: string) {
    this.logSpecific('http', opts);
  }

  static critical(opts: LoggerOptions) {
    const criticalCallback = () => {
      // Todo: handle critical log
    };
    const options = {
      ...DEFAULT_LOGGER_OPTIIONS,
      ...opts,
      callback: criticalCallback,
    };
    this.doLog(options);
  }

  static morganLog(message: string) {
    this.logger.log('http', message);
  }

  static header(opts: LoggerOptions | string) {
    this.logSpecific('header', opts);
  }

  private static logSpecific(
    level: LoggerOptions['level'],
    opts: LoggerOptions | string,
  ) {
    let options: LoggerOptions;
    if (typeof opts === 'string') {
      const { message, location } = this.locationFromMessage(opts);
      options = { ...DEFAULT_LOGGER_OPTIIONS, message, location };
    } else {
      options = this.getOptions(opts);
    }

    options.level = level;
    this.doLog(options);
  }

  private static getOptions(opts: LoggerOptions) {
    return { ...DEFAULT_LOGGER_OPTIIONS, ...opts };
  }

  private static doLog(opts: LoggerOptions) {
    const message = `${opts.message}${opts.location ? ' -- ' + opts.location : ''}`;
    this.logger.log(opts.level ?? 'error', message, opts.callback);
  }

  private static locationFromMessage(msg: string) {
    const split = msg.split(' -- ');
    if (split.length > 0) {
      return { message: split[1], location: split[0] };
    } else {
      return {
        message: split[0],
        location: DEFAULT_LOGGER_OPTIIONS.location,
      };
    }
  }
}
