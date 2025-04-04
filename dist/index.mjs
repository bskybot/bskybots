var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/bots/actionBot.ts
import { AtpAgent } from "@atproto/api";

// src/utils/logger.ts
var Logger = class {
  /**
   * Logs an informational message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (object or string) to log alongside the message.
   */
  static info(message, context) {
    console.log(`${(/* @__PURE__ */ new Date()).toLocaleString()} [INFO]: ${message}`, context || "");
  }
  /**
   * Logs a warning message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (object or string) to log alongside the message.
   */
  static warn(message, context) {
    console.log(`${(/* @__PURE__ */ new Date()).toLocaleString()} [WARNING]: ${message}`, context || "");
  }
  /**
   * Logs an error message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (object or string) to log alongside the message.
   */
  static error(message, context) {
    console.error(`${(/* @__PURE__ */ new Date()).toLocaleString()} [ERROR]: ${message}`, context || "");
  }
  /**
   * Logs a debug message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (object or string) to log alongside the message.
   */
  static debug(message, context) {
    console.debug(`${(/* @__PURE__ */ new Date()).toLocaleString()} [DEBUG]: ${message}`, context || "");
  }
};

// src/bots/actionBot.ts
var ActionBotAgent = class extends AtpAgent {
  constructor(opts, actionBot) {
    super(opts);
    this.opts = opts;
    this.actionBot = actionBot;
    Logger.info(`Initialize cronbot ${actionBot.identifier}`);
  }
  doAction() {
    return __async(this, null, function* () {
      this.actionBot.action(this);
    });
  }
};
var useActionBotAgent = (actionBot) => __async(void 0, null, function* () {
  const agent = new ActionBotAgent({ service: actionBot.service }, actionBot);
  try {
    const login = yield agent.login({ identifier: actionBot.identifier, password: actionBot.password });
    if (!login.success) {
      return null;
    }
    Logger.info(`Start cronbot ${actionBot.identifier}`);
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize bot:", `${error}, ${actionBot.identifier}`);
    return null;
  }
});

// src/bots/cronBot.ts
import { AtpAgent as AtpAgent2 } from "@atproto/api";
import { CronJob } from "cron";
var CronBotAgent = class extends AtpAgent2 {
  constructor(opts, cronBot) {
    super(opts);
    this.opts = opts;
    this.cronBot = cronBot;
    Logger.info(`Initialize cronbot ${cronBot.identifier}`);
    this.job = new CronJob(
      cronBot.cronJob.scheduleExpression,
      () => __async(this, null, function* () {
        return cronBot.action(this);
      }),
      cronBot.cronJob.callback,
      false,
      cronBot.cronJob.timeZone
    );
  }
};
var useCronBotAgent = (cronBot) => __async(void 0, null, function* () {
  const agent = new CronBotAgent({ service: cronBot.service }, cronBot);
  try {
    const login = yield agent.login({ identifier: cronBot.identifier, password: cronBot.password });
    if (!login.success) {
      return null;
    }
    Logger.info(`Start cronbot ${cronBot.identifier}`);
    agent.job.start();
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize bot:", `${error}, ${cronBot.identifier}`);
    return null;
  }
});

// src/bots/keywordBot.ts
import { AtpAgent as AtpAgent3 } from "@atproto/api";
var KeywordBotAgent = class extends AtpAgent3 {
  constructor(opts, keywordBot) {
    super(opts);
    this.opts = opts;
    this.keywordBot = keywordBot;
  }
  likeAndReplyIfFollower(post) {
    return __async(this, null, function* () {
      var _a;
      if (post.authorDid === this.assertDid) {
        return;
      }
      const replies = filterBotReplies(post.text, this.keywordBot.replies);
      if (replies.length < 1) {
        return;
      }
      try {
        const actorProfile = yield this.getProfile({ actor: post.authorDid });
        if (actorProfile.success) {
          if (!((_a = actorProfile.data.viewer) == null ? void 0 : _a.followedBy)) {
            return;
          }
          const replyCfg = replies[Math.floor(Math.random() * replies.length)];
          const message = replyCfg.messages[Math.floor(Math.random() * replyCfg.messages.length)];
          const reply = buildReplyToPost(
            { uri: post.rootUri, cid: post.rootCid },
            { uri: post.uri, cid: post.cid },
            message
          );
          yield Promise.all([this.like(post.uri, post.cid), this.post(reply)]);
          Logger.info(`Replied to post: ${post.uri}`, this.keywordBot.identifier);
        }
      } catch (error) {
        Logger.error("Error while replying:", `${error}, ${this.keywordBot.identifier}`);
      }
    });
  }
};
function buildReplyToPost(root, parent, message) {
  return {
    $type: "app.bsky.feed.post",
    text: message,
    reply: {
      "root": root,
      "parent": parent
    }
  };
}
function filterBotReplies(text, botReplies) {
  return botReplies.filter((reply) => {
    const keyword = reply.keyword.toLowerCase();
    const keywordFound = text.toLowerCase().includes(keyword);
    if (!keywordFound) {
      return false;
    }
    if (Array.isArray(reply.exclude) && reply.exclude.length > 0) {
      for (const excludeWord of reply.exclude) {
        if (text.toLowerCase().includes(excludeWord.toLowerCase())) {
          return false;
        }
      }
    }
    return true;
  });
}
var useKeywordBotAgent = (keywordBot) => __async(void 0, null, function* () {
  const agent = new KeywordBotAgent({ service: keywordBot.service }, keywordBot);
  try {
    const login = yield agent.login({ identifier: keywordBot.identifier, password: keywordBot.password });
    if (!login.success) {
      return null;
    }
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize bot:", `${error}, ${keywordBot.identifier}`);
    return null;
  }
});

// src/utils/websocketClient.ts
import WebSocket from "ws";
var WebSocketClient = class {
  /**
   * Creates a new instance of `WebSocketClient`.
   * 
   * @param options - Configuration options for the WebSocket client, including URL, reconnect interval, and ping interval.
   */
  constructor(options) {
    this.ws = null;
    this.pingTimeout = null;
    this.url = options.url;
    this.reconnectInterval = options.reconnectInterval || 5e3;
    this.pingInterval = options.pingInterval || 1e4;
    this.run();
  }
  /**
   * Initiates a WebSocket connection to the specified URL.
   * 
   * This method sets up event listeners for `open`, `message`, `error`, and `close` events.
   * When the connection opens, it starts the heartbeat mechanism.
   * On close, it attempts to reconnect after a specified interval.
   */
  run() {
    this.ws = new WebSocket(this.url);
    this.ws.on("open", () => {
      Logger.info("WebSocket connected");
      this.startHeartbeat();
      this.onOpen();
    });
    this.ws.on("message", (data) => {
      this.onMessage(data);
    });
    this.ws.on("error", (error) => {
      Logger.error("WebSocket error:", error);
      this.onError(error);
    });
    this.ws.on("close", () => {
      Logger.info("WebSocket disconnected");
      this.stopHeartbeat();
      this.onClose();
      this.reconnect();
    });
  }
  /**
   * Attempts to reconnect to the WebSocket server after the specified `reconnectInterval`.
   * It clears all event listeners on the old WebSocket and initiates a new connection.
   */
  reconnect() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws = null;
    }
    setTimeout(() => this.run(), this.reconnectInterval);
  }
  /**
   * Starts sending periodic ping messages to the server.
   * 
   * This function uses `setInterval` to send a ping at the configured `pingInterval`.
   * If the WebSocket is not open, pings are not sent.
   */
  startHeartbeat() {
    this.pingTimeout = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.pingInterval);
  }
  /**
   * Stops sending heartbeat pings by clearing the ping interval.
   */
  stopHeartbeat() {
    if (this.pingTimeout) {
      clearInterval(this.pingTimeout);
      this.pingTimeout = null;
    }
  }
  /**
   * Called when the WebSocket connection is successfully opened.
   * 
   * Override this method in a subclass to implement custom logic on connection.
   */
  onOpen() {
  }
  /**
   * Called when a WebSocket message is received.
   * 
   * @param data - The data received from the WebSocket server.
   * 
   * Override this method in a subclass to implement custom message handling.
   */
  onMessage(data) {
  }
  /**
   * Called when a WebSocket error occurs.
   * 
   * @param error - The error that occurred.
   * 
   * Override this method in a subclass to implement custom error handling.
   */
  onError(error) {
  }
  /**
   * Called when the WebSocket connection is closed.
   * 
   * Override this method in a subclass to implement custom logic on disconnection.
   */
  onClose() {
  }
  /**
   * Sends data to the connected WebSocket server, if the connection is open.
   * 
   * @param data - The data to send.
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }
  /**
   * Closes the WebSocket connection gracefully.
   */
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
};

// src/utils/jetstreamSubscription.ts
var JetstreamSubscription = class extends WebSocketClient {
  /**
   * Creates a new `JetstreamSubscription`.
   * 
   * @param service - The URL of the Jetstream server to connect to.
   * @param interval - The interval (in milliseconds) for reconnect attempts.
   * @param onMessageCallback - An optional callback function that is invoked whenever a message is received from the server.
   */
  constructor(service, interval, onMessageCallback) {
    super({ url: service, reconnectInterval: interval });
    this.service = service;
    this.interval = interval;
    this.onMessageCallback = onMessageCallback;
  }
  /**
   * Called when the WebSocket connection is successfully opened.
   * Logs a message indicating that the connection to the Jetstream server has been established.
   */
  onOpen() {
    Logger.info("Connected to Jetstream server.");
  }
  /**
   * Called when a WebSocket message is received.
   * 
   * If an `onMessageCallback` was provided, it is invoked with the received data.
   * 
   * @param data - The data received from the Jetstream server.
   */
  onMessage(data) {
    if (this.onMessageCallback) {
      this.onMessageCallback(data);
    }
  }
  /**
   * Called when a WebSocket error occurs.
   * Logs the error message indicating that Jetstream encountered an error.
   * 
   * @param error - The error that occurred.
   */
  onError(error) {
    Logger.error("Jetstream encountered an error:", error);
  }
  /**
   * Called when the WebSocket connection is closed.
   * Logs a message indicating that the Jetstream connection has closed.
   */
  onClose() {
    Logger.info("Jetstream connection closed.");
  }
};

// src/utils/strings.ts
var maybeStr = (val) => {
  if (!val) return void 0;
  return val;
};
var maybeInt = (val) => {
  if (!val) return void 0;
  const int = parseInt(val, 10);
  if (isNaN(int)) return void 0;
  return int;
};

// src/utils/wsToFeed.ts
function websocketToFeedEntry(data) {
  var _a, _b, _c, _d;
  const message = data;
  if (!message.commit || !message.commit.record || !message.commit.record["$type"] || !message.did || !message.commit.cid || !message.commit.rkey || message.commit.operation !== "create") {
    return null;
  }
  const messageUri = `at://${message.did}/${message.commit.record["$type"]}/${message.commit.rkey}`;
  return {
    cid: message.commit.cid,
    uri: messageUri,
    authorDid: message.did,
    text: message.commit.record.text,
    rootCid: (_b = (_a = message.commit.record.reply) == null ? void 0 : _a.root.cid) != null ? _b : message.commit.cid,
    rootUri: (_d = (_c = message.commit.record.reply) == null ? void 0 : _c.root.uri) != null ? _d : messageUri
  };
}
export {
  ActionBotAgent,
  CronBotAgent,
  JetstreamSubscription,
  KeywordBotAgent,
  Logger,
  WebSocketClient,
  buildReplyToPost,
  filterBotReplies,
  maybeInt,
  maybeStr,
  useActionBotAgent,
  useCronBotAgent,
  useKeywordBotAgent,
  websocketToFeedEntry
};
//# sourceMappingURL=index.mjs.map