/**
 * A simple logging utility class providing static methods for various log levels.
 * Each log message is prefixed with a timestamp and log level.
 */
export class Logger {
    /**
     * Logs an informational message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static info(message: string, context?: object | string) {
        console.info(`${new Date().toLocaleString("de-DE", {timeZone: "Europe/Vienna"})} [INFO]: ${message}`, context || '');
    }

    /**
     * Logs a warning message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static warn(message: string, context?: object | string) {
        console.warn(`${new Date().toLocaleString("de-DE", {timeZone: "Europe/Vienna"})} [WARNING]: ${message}`, context || '');
    }

    /**
     * Logs an error message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static error(message: string, context?: object | string) {
        console.error(`${new Date().toLocaleString("de-DE", {timeZone: "Europe/Vienna"})} [ERROR]: ${message}`, context || '');
    }

    /**
     * Logs a debug message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static debug(message: string, context?: object | string) {
        console.debug(`${new Date().toLocaleString("de-DE", {timeZone: "Europe/Vienna"})} [DEBUG]: ${message}`, context || '');
    }
}