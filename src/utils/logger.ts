export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  correlationId?: string;
  botId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * A performance-optimized logging utility class providing static methods for various log levels.
 * Each log message is prefixed with a timestamp and log level.
 * Supports conditional logging based on log levels and configurable timezone.
 */
export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;
  private static timezone: string = "Europe/Vienna";
  private static correlationId: string | null = null;

  /**
   * Generate a new correlation ID for tracking related operations.
   */
  static generateCorrelationId(): string {
    return `${Date.now().toLocaleString("de-DE")}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Set the correlation ID for subsequent log entries.
   * @param id - The correlation ID to use, or null to generate a new one
   */
  static setCorrelationId(id?: string | null) {
    this.correlationId = id || this.generateCorrelationId();
  }

  /**
   * Get the current correlation ID.
   */
  static getCorrelationId(): string | null {
    return this.correlationId;
  }

  /**
   * Clear the current correlation ID.
   */
  static clearCorrelationId() {
    this.correlationId = null;
  }

  /**
   * Set the minimum log level. Messages below this level will not be logged.
   * @param level - The minimum log level
   */
  static setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  /**
   * Set the timezone for log timestamps.
   * @param timezone - The timezone string (e.g., "Europe/Vienna", "UTC")
   */
  static setTimezone(timezone: string) {
    this.timezone = timezone;
  }

  /**
   * Get the current log level.
   */
  static getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Generate a formatted timestamp string.
   * @private
   */
  private static getTimestamp(): string {
    return new Date().toLocaleString("de-DE", { timeZone: this.timezone });
  }

  /**
   * Internal logging method that checks log level before processing.
   * @private
   */
  private static log(
    level: LogLevel,
    levelName: string,
    message: string,
    context?: LogContext | object | string,
    logFn = console.log
  ) {
    if (level < this.logLevel) {
      return; // Skip logging if below threshold
    }

    const timestamp = this.getTimestamp();
    let formattedMessage = `${timestamp} [${levelName}]`;

    // Add correlation ID if available
    if (this.correlationId) {
      formattedMessage += ` [${this.correlationId}]`;
    }

    // Add context correlation ID if provided and different from global one
    if (
      context &&
      typeof context === "object" &&
      "correlationId" in context &&
      context.correlationId &&
      context.correlationId !== this.correlationId
    ) {
      formattedMessage += ` [${context.correlationId}]`;
    }

    formattedMessage += `: ${message}`;

    if (context) {
      // Create structured log entry for objects
      if (typeof context === "object") {
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: levelName,
          message,
          correlationId: this.correlationId,
          ...context,
        };
        logFn(formattedMessage, logEntry);
      } else {
        logFn(formattedMessage, context);
      }
    } else {
      logFn(formattedMessage);
    }
  }
  /**
   * Logs an informational message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static info(message: string, context?: LogContext | object | string) {
    this.log(LogLevel.INFO, "INFO", message, context, console.info);
  }

  /**
   * Logs a warning message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static warn(message: string, context?: LogContext | object | string) {
    this.log(LogLevel.WARN, "WARNING", message, context, console.warn);
  }

  /**
   * Logs an error message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static error(message: string, context?: LogContext | object | string) {
    this.log(LogLevel.ERROR, "ERROR", message, context, console.error);
  }

  /**
   * Logs a debug message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static debug(message: string, context?: LogContext | object | string) {
    this.log(LogLevel.DEBUG, "DEBUG", message, context, console.debug);
  }

  /**
   * Log operation start with timing.
   * @param operation - The operation name
   * @param context - Additional context
   */
  static startOperation(operation: string, context?: LogContext): string {
    const correlationId = context?.correlationId || this.generateCorrelationId();
    this.setCorrelationId(correlationId);

    this.info(`Starting operation: ${operation}`, {
      operation,
      correlationId,
      ...context,
    });

    return correlationId;
  }

  /**
   * Log operation completion with timing.
   * @param operation - The operation name
   * @param startTime - The start time from Date.now()
   * @param context - Additional context
   */
  static endOperation(operation: string, startTime: number, context?: LogContext) {
    const duration = Date.now() - startTime;

    this.info(`Completed operation: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...context,
    });
  }
}
