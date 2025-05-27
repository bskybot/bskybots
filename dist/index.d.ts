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
    action: (agent: AtpAgent, params?: any) => Promise<void>;
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
            '$type': string;
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
    constructor(opts: AtpAgentOptions, actionBot: ActionBot);
    doAction(params: any): Promise<void>;
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
    url: string;
    /** The interval in milliseconds to wait before attempting to reconnect when the connection closes. Default is 5000ms. */
    reconnectInterval?: number;
    /** The interval in milliseconds for sending ping messages (heartbeats) to keep the connection alive. Default is 10000ms. */
    pingInterval?: number;
}
/**
 * A WebSocket client that automatically attempts to reconnect upon disconnection
 * and periodically sends ping messages (heartbeats) to ensure the connection remains alive.
 *
 * Extend this class and override the protected `onOpen`, `onMessage`, `onError`, and `onClose` methods
 * to implement custom handling of WebSocket events.
 */
declare class WebSocketClient {
    private url;
    private reconnectInterval;
    private pingInterval;
    private ws;
    private pingTimeout;
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
    private reconnect;
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
    protected onMessage(data: WebSocket.Data): void;
    /**
     * Called when a WebSocket error occurs.
     *
     * @param error - The error that occurred.
     *
     * Override this method in a subclass to implement custom error handling.
     */
    protected onError(error: Error): void;
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
    send(data: any): void;
    /**
     * Closes the WebSocket connection gracefully.
     */
    close(): void;
}

/**
 * Represents a subscription to a Jetstream feed over WebSocket.
 *
 * This class extends `WebSocketClient` to automatically handle reconnections and heartbeats.
 * It invokes a provided callback function whenever a message is received from the Jetstream server.
 */
declare class JetstreamSubscription extends WebSocketClient {
    service: string;
    interval: number;
    private onMessageCallback?;
    /**
     * Creates a new `JetstreamSubscription`.
     *
     * @param service - The URL of the Jetstream server to connect to.
     * @param interval - The interval (in milliseconds) for reconnect attempts.
     * @param onMessageCallback - An optional callback function that is invoked whenever a message is received from the server.
     */
    constructor(service: string, interval: number, onMessageCallback?: ((data: WebSocket.Data) => void) | undefined);
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

/**
 * A simple logging utility class providing static methods for various log levels.
 * Each log message is prefixed with a timestamp and log level.
 */
declare class Logger {
    /**
     * Logs an informational message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static info(message: string, context?: object | string): void;
    /**
     * Logs a warning message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static warn(message: string, context?: object | string): void;
    /**
     * Logs an error message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static error(message: string, context?: object | string): void;
    /**
     * Logs a debug message to the console.
     *
     * @param message - The message to be logged.
     * @param context - Optional additional context (object or string) to log alongside the message.
     */
    static debug(message: string, context?: object | string): void;
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

export { type ActionBot, ActionBotAgent, type Bot, type BotReply, type CronBot, CronBotAgent, JetstreamSubscription, type KeywordBot, KeywordBotAgent, Logger, type Post, type UriCid, WebSocketClient, type WebsocketMessage, buildReplyToPost, filterBotReplies, maybeInt, maybeStr, useActionBotAgent, useCronBotAgent, useKeywordBotAgent, websocketToFeedEntry };
