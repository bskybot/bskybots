import { AtpAgent, AtpAgentOptions } from '@atproto/api';
import { CronJob } from 'cron';
import WebSocket from 'ws';

type Cron = {
    scheduleExpression: string;
    callback: (() => void) | null;
    timeZone: string;
};
type BotReply = {
    keyword: string;
    exclude?: string[];
    messages: string[];
};
type Bot = {
    identifier: string;
    password: string;
    username?: string;
    service: string;
};
type ActionBot = Bot & {
    action: (agent: AtpAgent, params?: unknown) => Promise<void>;
};
type CronBot = ActionBot & {
    cronJob: Cron;
};
type KeywordBot = Bot & {
    replies: BotReply[];
};

type Post = {
    uri: string;
    cid: string;
    authorDid: string;
    authorHandle?: string;
    text: string;
    rootUri: string;
    rootCid: string;
    createdAt?: Date;
};
type UriCid = {
    cid: string;
    uri: string;
};

/**
 * Represents a message received over WebSocket.
 *
 * - `did`: The Decentralized Identifier (DID) of the entity that created or owns the data.
 * - `time_us`: A timestamp in microseconds.
 * - `kind`: A string indicating the kind of message.
 * - `commit`: An object containing information about a particular commit or record creation event.
 *   - `rev`: The revision identifier of the commit.
 *   - `operation`: The type of operation performed (e.g., "create", "update", etc.).
 *   - `collection`: The name of the collection that the record belongs to.
 *   - `rkey`: The record key within the collection.
 *   - `record`: An object describing the record itself.
 *     - `'$type'`: The record's type.
 *     - `createdAt`: A timestamp indicating when the record was created.
 *     - `subject`: A string associated with the record, often referencing another entity.
 *     - `reply`: Optional object containing `root` and `parent` references (both `UriCid`)
 *                if the record is a reply to another post.
 *     - `text`: The textual content of the record.
 *   - `cid`: The content identifier (CID) of the commit.
 */
type WebsocketMessage = {
    did: string;
    time_us: number;
    kind: string;
    commit: {
        rev: string;
        operation: string;
        collection: string;
        rkey: string;
        record: {
            $type: string;
            createdAt: string;
            subject: string;
            reply?: {
                root: UriCid;
                parent: UriCid;
            };
            text: string;
        };
        cid: string;
    };
};

declare class ActionBotAgent extends AtpAgent {
    opts: AtpAgentOptions;
    actionBot: ActionBot;
    private currentCorrelationId;
    private operationStartTime;
    constructor(opts: AtpAgentOptions, actionBot: ActionBot);
    doAction(params?: unknown): Promise<void>;
    /**
     * Log a success message with correlation ID when the action bot actually performs work.
     * Call this from within your action function when meaningful work is done.
     */
    logSuccess(message: string, additionalContext?: Record<string, unknown>): void;
    /**
     * Log an error message with correlation ID during action bot execution.
     * Call this from within your action function when an error occurs that you want to handle gracefully.
     */
    logError(message: string, error?: Error | unknown, additionalContext?: Record<string, unknown>): void;
}
declare const useActionBotAgent: (actionBot: ActionBot) => Promise<ActionBotAgent | null>;

declare class CronBotAgent extends AtpAgent {
    opts: AtpAgentOptions;
    cronBot: CronBot;
    job: CronJob;
    constructor(opts: AtpAgentOptions, cronBot: CronBot);
}
declare const useCronBotAgent: (cronBot: CronBot) => Promise<CronBotAgent | null>;

declare class KeywordBotAgent extends AtpAgent {
    opts: AtpAgentOptions;
    keywordBot: KeywordBot;
    constructor(opts: AtpAgentOptions, keywordBot: KeywordBot);
    likeAndReplyIfFollower(post: Post): Promise<void>;
}
declare function buildReplyToPost(root: UriCid, parent: UriCid, message: string): {
    $type: "app.bsky.feed.post";
    text: string;
    reply: {
        root: UriCid;
        parent: UriCid;
    };
};
declare function filterBotReplies(text: string, botReplies: BotReply[]): BotReply[];
declare const useKeywordBotAgent: (keywordBot: KeywordBot) => Promise<KeywordBotAgent | null>;

interface WebSocketClientOptions {
    /** The URL of the WebSocket server to connect to. */
    service: string | string[];
    /** The interval in milliseconds to wait before attempting to reconnect when the connection closes. Default is 5000ms. */
    reconnectInterval?: number;
    /** The interval in milliseconds for sending ping messages (heartbeats) to keep the connection alive. Default is 10000ms. */
    pingInterval?: number;
    /** Maximum number of consecutive reconnection attempts per service. Default is 3. */
    maxReconnectAttempts?: number;
    /** Maximum delay between reconnection attempts in milliseconds. Default is 30000ms (30 seconds). */
    maxReconnectDelay?: number;
    /** Exponential backoff factor for reconnection delays. Default is 1.5. */
    backoffFactor?: number;
    /** Maximum number of attempts to cycle through all services before giving up. Default is 2. */
    maxServiceCycles?: number;
}
/**
 * A WebSocket client that automatically attempts to reconnect upon disconnection
 * and periodically sends ping messages (heartbeats) to ensure the connection remains alive.
 *
 * Extend this class and override the protected `onOpen`, `onMessage`, `onError`, and `onClose` methods
 * to implement custom handling of WebSocket events.
 */
declare class WebSocketClient {
    private service;
    private reconnectInterval;
    private pingInterval;
    private ws;
    private pingTimeout;
    private serviceIndex;
    private reconnectAttempts;
    private serviceCycles;
    private maxReconnectAttempts;
    private maxServiceCycles;
    private maxReconnectDelay;
    private backoffFactor;
    private reconnectTimeout;
    private isConnecting;
    private shouldReconnect;
    private messageCount;
    private lastMessageTime;
    private healthCheckName;
    /**
     * Creates a new instance of `WebSocketClient`.
     *
     * @param options - Configuration options for the WebSocket client, including URL, reconnect interval, and ping interval.
     */
    constructor(options: WebSocketClientOptions);
    /**
     * Initiates a WebSocket connection to the specified URL.
     *
     * This method sets up event listeners for `open`, `message`, `error`, and `close` events.
     * When the connection opens, it starts the heartbeat mechanism.
     * On close, it attempts to reconnect after a specified interval.
     */
    private run;
    /**
     * Attempts to reconnect to the WebSocket server after the specified `reconnectInterval`.
     * It clears all event listeners on the old WebSocket and initiates a new connection.
     */
    private scheduleReconnect;
    /**
     * Check if we should try the next service in the array.
     */
    private shouldTryNextService;
    /**
     * Move to the next service in the array and reset reconnection attempts.
     */
    private moveToNextService;
    private cleanup;
    /**
     * Starts sending periodic ping messages to the server.
     *
     * This function uses `setInterval` to send a ping at the configured `pingInterval`.
     * If the WebSocket is not open, pings are not sent.
     */
    private startHeartbeat;
    /**
     * Stops sending heartbeat pings by clearing the ping interval.
     */
    private stopHeartbeat;
    /**
     * Called when the WebSocket connection is successfully opened.
     *
     * Override this method in a subclass to implement custom logic on connection.
     */
    protected onOpen(): void;
    /**
     * Called when a WebSocket message is received.
     *
     * @param data - The data received from the WebSocket server.
     *
     * Override this method in a subclass to implement custom message handling.
     */
    protected onMessage(_data: WebSocket.Data): void;
    /**
     * Called when a WebSocket error occurs.
     *
     * @param error - The error that occurred.
     *
     * Override this method in a subclass to implement custom error handling.
     * Note: Service switching is now handled in the reconnection logic, not here.
     */
    protected onError(_error: Error): void;
    /**
     * Called when the WebSocket connection is closed.
     *
     * Override this method in a subclass to implement custom logic on disconnection.
     */
    protected onClose(): void;
    /**
     * Sends data to the connected WebSocket server, if the connection is open.
     *
     * @param data - The data to send.
     */
    send(data: string | Buffer | ArrayBuffer | Buffer[]): void;
    /**
     * Closes the WebSocket connection gracefully.
     */
    close(): void;
    getConnectionState(): string;
    getReconnectAttempts(): number;
    getServiceCycles(): number;
    getServiceIndex(): number;
    getAllServices(): string[];
    getCurrentService(): string;
    getMessageCount(): number;
    getLastMessageTime(): number;
    getHealthCheckName(): string;
}

/**
 * Represents a subscription to a Jetstream feed over WebSocket.
 *
 * This class extends `WebSocketClient` to automatically handle reconnections and heartbeats.
 * It invokes a provided callback function whenever a message is received from the Jetstream server.
 */
declare class JetstreamSubscription extends WebSocketClient {
    interval: number;
    private onMessageCallback?;
    /**
     * Creates a new `JetstreamSubscription`.
     *
     * @param service - The URL(-Array) of the Jetstream server(s) to connect to.
     * @param interval - The interval (in milliseconds) for reconnect attempts.
     * @param onMessageCallback - An optional callback function that is invoked whenever a message is received from the server.
     */
    constructor(service: string | string[], interval: number, onMessageCallback?: ((data: WebSocket.Data) => void) | undefined);
    /**
     * Called when the WebSocket connection is successfully opened.
     * Logs a message indicating that the connection to the Jetstream server has been established.
     */
    protected onOpen(): void;
    /**
     * Called when a WebSocket message is received.
     *
     * If an `onMessageCallback` was provided, it is invoked with the received data.
     *
     * @param data - The data received from the Jetstream server.
     */
    protected onMessage(data: WebSocket.Data): void;
    /**
     * Called when a WebSocket error occurs.
     * Logs the error message indicating that Jetstream encountered an error.
     *
     * @param error - The error that occurred.
     */
    protected onError(error: Error): void;
    /**
     * Called when the WebSocket connection is closed.
     * Logs a message indicating that the Jetstream connection has closed.
     */
    protected onClose(): void;
}

declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
interface LogContext {
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
declare class Logger {
    private static logLevel;
    private static timezone;
    private static correlationId;
    /**
     * Generate a new correlation ID for tracking related operations.
     */
    static generateCorrelationId(): string;
    /**
     * Set the correlation ID for subsequent log entries.
     * @param id - The correlation ID to use, or null to generate a new one
     */
    static setCorrelationId(id?: string | null): void;
    /**
     * Get the current correlation ID.
     */
    static getCorrelationId(): string | null;
    /**
     * Clear the current correlation ID.
     */
    static clearCorrelationId(): void;
    /**
     * Set the minimum log level. Messages below this level will not be logged.
     * @param level - The minimum log level
     */
    static setLogLevel(level: LogLevel): void;
    /**
     * Set the timezone for log timestamps.
     * @param timezone - The timezone string (e.g., "Europe/Vienna", "UTC")
     */
    static setTimezone(timezone: string): void;
    /**
     * Get the current log level.
     */
    static getLogLevel(): LogLevel;
    /**
     * Generate a formatted timestamp string.
     * @private
     */
    private static getTimestamp;
    /**
     * Internal logging method that checks log level before processing.
     * @private
     */
    private static log;
    /**
     * Logs an informational message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
     */
    static info(message: string, context?: LogContext | object | string): void;
    /**
     * Logs a warning message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
     */
    static warn(message: string, context?: LogContext | object | string): void;
    /**
     * Logs an error message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
     */
    static error(message: string, context?: LogContext | object | string): void;
    /**
     * Logs a debug message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
     */
    static debug(message: string, context?: LogContext | object | string): void;
    /**
     * Log operation start with timing.
     * @param operation - The operation name
     * @param context - Additional context
     */
    static startOperation(operation: string, context?: LogContext): string;
    /**
     * Log operation completion with timing.
     * @param operation - The operation name
     * @param startTime - The start time from Date.now()
     * @param context - Additional context
     */
    static endOperation(operation: string, startTime: number, context?: LogContext): void;
}

/**
 * Returns the given string if it is defined; otherwise returns `undefined`.
 *
 * @param val - The optional string value to check.
 * @returns The given string if defined, or `undefined` if `val` is falsy.
 */
declare const maybeStr: (val?: string) => string | undefined;
/**
 * Parses the given string as an integer if it is defined and a valid integer; otherwise returns `undefined`.
 *
 * @param val - The optional string value to parse.
 * @returns The parsed integer if successful, or `undefined` if the string is falsy or not a valid integer.
 */
declare const maybeInt: (val?: string) => number | undefined;

/**
 * Converts a raw WebSocket message into a `FeedEntry` object, if possible.
 *
 * This function checks if the incoming WebSocket data is structured like a feed commit message
 * with the required properties for a created post. If the data matches the expected shape,
 * it extracts and returns a `FeedEntry` object. Otherwise, it returns `null`.
 *
 * @param data - The raw WebSocket data.
 * @returns A `FeedEntry` object if the data represents a newly created post, otherwise `null`.
 */
declare function websocketToFeedEntry(data: WebSocket.Data): Post | null;

interface HealthStatus {
    healthy: boolean;
    timestamp: number;
    checks: Record<string, boolean>;
    metrics: Record<string, number>;
    details?: Record<string, unknown>;
}
interface HealthCheckOptions {
    interval?: number;
    timeout?: number;
    retries?: number;
}
/**
 * Health monitoring system for bot components.
 * Provides health checks and basic metrics collection.
 */
declare class HealthMonitor {
    private checks;
    private metrics;
    private lastCheckResults;
    private checkInterval;
    private options;
    constructor(options?: HealthCheckOptions);
    /**
     * Register a health check function.
     * @param name - Unique name for the health check
     * @param checkFn - Function that returns true if healthy
     */
    registerHealthCheck(name: string, checkFn: () => Promise<boolean>): void;
    /**
     * Remove a health check.
     * @param name - Name of the health check to remove
     */
    unregisterHealthCheck(name: string): void;
    /**
     * Set a metric value.
     * @param name - Metric name
     * @param value - Metric value
     */
    setMetric(name: string, value: number): void;
    /**
     * Increment a counter metric.
     * @param name - Metric name
     * @param increment - Value to add (default: 1)
     */
    incrementMetric(name: string, increment?: number): void;
    /**
     * Get current metric value.
     * @param name - Metric name
     * @returns Current value or 0 if not found
     */
    getMetric(name: string): number;
    /**
     * Get all current metrics.
     * @returns Object with all metrics
     */
    getAllMetrics(): Record<string, number>;
    /**
     * Run a single health check with timeout and retries.
     * @private
     */
    private runHealthCheck;
    /**
     * Wrap a promise with a timeout.
     * @private
     */
    private withTimeout;
    /**
     * Run all health checks and return the current health status.
     */
    getHealthStatus(): Promise<HealthStatus>;
    /**
     * Start periodic health monitoring.
     */
    start(): void;
    /**
     * Stop periodic health monitoring.
     */
    stop(): void;
    /**
     * Get a summary of the last health check results.
     */
    getLastCheckSummary(): Record<string, boolean>;
}
declare const healthMonitor: HealthMonitor;

export { type ActionBot, ActionBotAgent, type Bot, type BotReply, type CronBot, CronBotAgent, type HealthCheckOptions, HealthMonitor, type HealthStatus, JetstreamSubscription, type KeywordBot, KeywordBotAgent, type LogContext, LogLevel, Logger, type Post, type UriCid, WebSocketClient, type WebsocketMessage, buildReplyToPost, filterBotReplies, healthMonitor, maybeInt, maybeStr, useActionBotAgent, useCronBotAgent, useKeywordBotAgent, websocketToFeedEntry };
