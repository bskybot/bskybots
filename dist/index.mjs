var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
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

// src/utils/logger.ts
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  return LogLevel2;
})(LogLevel || {});
var Logger = class {
  /**
   * Generate a new correlation ID for tracking related operations.
   */
  static generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Set the correlation ID for subsequent log entries.
   * @param id - The correlation ID to use, or null to generate a new one
   */
  static setCorrelationId(id) {
    this.correlationId = id || this.generateCorrelationId();
  }
  /**
   * Get the current correlation ID.
   */
  static getCorrelationId() {
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
  static setLogLevel(level) {
    this.logLevel = level;
  }
  /**
   * Set the timezone for log timestamps.
   * @param timezone - The timezone string (e.g., "Europe/Vienna", "UTC")
   */
  static setTimezone(timezone) {
    this.timezone = timezone;
  }
  /**
   * Get the current log level.
   */
  static getLogLevel() {
    return this.logLevel;
  }
  /**
   * Generate a formatted timestamp string.
   * @private
   */
  static getTimestamp() {
    return (/* @__PURE__ */ new Date()).toLocaleString("de-DE", { timeZone: this.timezone });
  }
  /**
   * Internal logging method that checks log level before processing.
   * @private
   */
  static log(level, levelName, message, context, logFn = console.log) {
    if (level < this.logLevel) {
      return;
    }
    const timestamp = this.getTimestamp();
    let formattedMessage = `${timestamp} [${levelName}]`;
    if (this.correlationId) {
      formattedMessage += ` [${this.correlationId}]`;
    }
    if (context && typeof context === "object" && "correlationId" in context && context.correlationId && context.correlationId !== this.correlationId) {
      formattedMessage += ` [${context.correlationId}]`;
    }
    formattedMessage += `: ${message}`;
    if (context) {
      if (typeof context === "object") {
        const logEntry = __spreadValues({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          level: levelName,
          message,
          correlationId: this.correlationId
        }, context);
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
  static info(message, context) {
    this.log(1 /* INFO */, "INFO", message, context, console.info);
  }
  /**
   * Logs a warning message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static warn(message, context) {
    this.log(2 /* WARN */, "WARNING", message, context, console.warn);
  }
  /**
   * Logs an error message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static error(message, context) {
    this.log(3 /* ERROR */, "ERROR", message, context, console.error);
  }
  /**
   * Logs a debug message to the console.
   *
   * @param message - The message to be logged.
   * @param context - Optional additional context (LogContext, object or string) to log alongside the message.
   */
  static debug(message, context) {
    this.log(0 /* DEBUG */, "DEBUG", message, context, console.debug);
  }
  /**
   * Log operation start with timing.
   * @param operation - The operation name
   * @param context - Additional context
   */
  static startOperation(operation, context) {
    const correlationId = (context == null ? void 0 : context.correlationId) || this.generateCorrelationId();
    this.setCorrelationId(correlationId);
    this.info(`Starting operation: ${operation}`, __spreadValues({
      operation,
      correlationId
    }, context));
    return correlationId;
  }
  /**
   * Log operation completion with timing.
   * @param operation - The operation name
   * @param startTime - The start time from Date.now()
   * @param context - Additional context
   */
  static endOperation(operation, startTime, context) {
    const duration = Date.now() - startTime;
    this.info(`Completed operation: ${operation}`, __spreadValues({
      operation,
      duration: `${duration}ms`
    }, context));
  }
};
Logger.logLevel = 1 /* INFO */;
Logger.timezone = "Europe/Vienna";
Logger.correlationId = null;

// src/bots/baseBotAgent.ts
import { AtpAgent } from "@atproto/api";
var BotAgent = class extends AtpAgent {
  constructor(opts, bot) {
    super(opts);
    this.opts = opts;
    this.bot = bot;
    this.currentCorrelationId = null;
    this.operationStartTime = null;
  }
  /**
   * Start tracking an operation with correlation ID and timing.
   * @protected
   */
  startOperationTracking() {
    this.currentCorrelationId = Logger.generateCorrelationId();
    this.operationStartTime = Date.now();
  }
  /**
   * Clear operation tracking state.
   * @protected
   */
  clearOperationTracking() {
    this.currentCorrelationId = null;
    this.operationStartTime = null;
  }
  /**
   * Get the bot identifier for logging purposes.
   * @protected
   */
  getBotId() {
    return this.bot.username || this.bot.identifier;
  }
  /**
   * Log a message with correlation ID during bot execution.
   * Call this from within your bot methods to log with proper correlation tracking.
   */
  logAction(level, message, additionalContext) {
    const logContext = __spreadValues({
      botId: this.getBotId()
    }, additionalContext);
    if (this.currentCorrelationId && this.operationStartTime) {
      logContext.correlationId = this.currentCorrelationId;
      logContext.operation = this.getOperationName();
      logContext.duration = `${Date.now() - this.operationStartTime}ms`;
    }
    switch (level) {
      case "info":
        Logger.info(message, logContext);
        break;
      case "warn":
        Logger.warn(message, logContext);
        break;
      case "error":
        Logger.error(message, logContext);
        break;
    }
  }
};
function initializeBotAgent(botType, bot, createAgent) {
  return __async(this, null, function* () {
    var _a;
    const botId = (_a = bot.username) != null ? _a : bot.identifier;
    const correlationId = Logger.startOperation(`initialize${botType}`, { botId });
    const startTime = Date.now();
    const agent = createAgent({ service: bot.service }, bot);
    try {
      Logger.info(`Initializing ${botType.toLowerCase()}`, { correlationId, botId });
      const login = yield agent.login({
        identifier: bot.identifier,
        password: bot.password
      });
      if (!login.success) {
        Logger.warn(`${botType} login failed`, { correlationId, botId });
        return null;
      }
      Logger.endOperation(`initialize${botType}`, startTime, { correlationId, botId });
      return agent;
    } catch (error) {
      Logger.error(`Failed to initialize ${botType.toLowerCase()}`, {
        correlationId,
        botId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return null;
    }
  });
}

// src/bots/actionBot.ts
var ActionBotAgent = class extends BotAgent {
  constructor(opts, actionBot) {
    super(opts, actionBot);
    this.actionBot = actionBot;
  }
  doAction(params) {
    return __async(this, null, function* () {
      this.startOperationTracking();
      try {
        yield this.actionBot.action(this, params);
      } catch (error) {
        Logger.error("Action bot execution failed", {
          correlationId: this.currentCorrelationId,
          botId: this.getBotId(),
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        this.clearOperationTracking();
      }
    });
  }
  getOperationName() {
    return "actionBot.doAction";
  }
};
var useActionBotAgent = (actionBot) => __async(void 0, null, function* () {
  return initializeBotAgent(
    "ActionBot",
    actionBot,
    (opts, bot) => new ActionBotAgent(opts, bot)
  );
});

// src/bots/cronBot.ts
import { CronJob } from "cron";
var CronBotAgent = class extends BotAgent {
  constructor(opts, cronBot) {
    super(opts, cronBot);
    this.cronBot = cronBot;
    this.job = new CronJob(
      cronBot.cronJob.scheduleExpression,
      () => __async(this, null, function* () {
        this.startOperationTracking();
        try {
          yield cronBot.action(this);
        } catch (error) {
          Logger.error("Cron bot execution failed", {
            correlationId: this.currentCorrelationId,
            botId: this.getBotId(),
            operation: "cronBot.action",
            error: error instanceof Error ? error.message : String(error)
          });
        } finally {
          this.clearOperationTracking();
        }
      }),
      cronBot.cronJob.callback,
      false,
      cronBot.cronJob.timeZone
    );
  }
  getOperationName() {
    return "cronBot.action";
  }
};
var useCronBotAgent = (cronBot) => __async(void 0, null, function* () {
  const agent = yield initializeBotAgent(
    "CronBot",
    cronBot,
    (opts, bot) => new CronBotAgent(opts, bot)
  );
  if (agent) {
    agent.job.start();
  }
  return agent;
});

// src/bots/keywordBot.ts
var KeywordBotAgent = class extends BotAgent {
  constructor(opts, keywordBot) {
    super(opts, keywordBot);
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
      this.startOperationTracking();
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
          this.logAction("info", `Replied to post: ${post.uri}`, {
            postUri: post.uri,
            authorDid: post.authorDid,
            keyword: replyCfg.keyword,
            message
          });
        }
      } catch (error) {
        Logger.error("Keyword bot execution failed", {
          correlationId: this.currentCorrelationId,
          botId: this.getBotId(),
          operation: "keywordBot.likeAndReplyIfFollower",
          error: error instanceof Error ? error.message : String(error),
          postUri: post.uri,
          authorDid: post.authorDid
        });
      } finally {
        this.clearOperationTracking();
      }
    });
  }
  getOperationName() {
    return "keywordBot.likeAndReplyIfFollower";
  }
};
function buildReplyToPost(root, parent, message) {
  return {
    $type: "app.bsky.feed.post",
    text: message,
    reply: {
      root,
      parent
    }
  };
}
function filterBotReplies(text, botReplies) {
  const lowerText = text.toLowerCase();
  return botReplies.filter((reply) => {
    const keyword = reply.keyword.toLowerCase();
    if (!lowerText.includes(keyword)) {
      return false;
    }
    if (!Array.isArray(reply.exclude) || reply.exclude.length === 0) {
      return true;
    }
    const hasExcludedWord = reply.exclude.some(
      (excludeWord) => lowerText.includes(excludeWord.toLowerCase())
    );
    return !hasExcludedWord;
  });
}
var useKeywordBotAgent = (keywordBot) => __async(void 0, null, function* () {
  return initializeBotAgent(
    "KeywordBot",
    keywordBot,
    (opts, bot) => new KeywordBotAgent(opts, bot)
  );
});

// src/utils/websocketClient.ts
import WebSocket from "ws";

// src/utils/healthCheck.ts
var HealthMonitor = class {
  constructor(options = {}) {
    this.checks = /* @__PURE__ */ new Map();
    this.metrics = /* @__PURE__ */ new Map();
    this.lastCheckResults = /* @__PURE__ */ new Map();
    this.checkInterval = null;
    this.options = {
      interval: options.interval || 3e4,
      // 30 seconds
      timeout: options.timeout || 5e3,
      // 5 seconds
      retries: options.retries || 2
    };
  }
  /**
   * Register a health check function.
   * @param name - Unique name for the health check
   * @param checkFn - Function that returns true if healthy
   */
  registerHealthCheck(name, checkFn) {
    this.checks.set(name, checkFn);
    Logger.debug(`Registered health check: ${name}`);
  }
  /**
   * Remove a health check.
   * @param name - Name of the health check to remove
   */
  unregisterHealthCheck(name) {
    this.checks.delete(name);
    this.lastCheckResults.delete(name);
    Logger.debug(`Unregistered health check: ${name}`);
  }
  /**
   * Set a metric value.
   * @param name - Metric name
   * @param value - Metric value
   */
  setMetric(name, value) {
    this.metrics.set(name, value);
  }
  /**
   * Increment a counter metric.
   * @param name - Metric name
   * @param increment - Value to add (default: 1)
   */
  incrementMetric(name, increment = 1) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + increment);
  }
  /**
   * Get current metric value.
   * @param name - Metric name
   * @returns Current value or 0 if not found
   */
  getMetric(name) {
    return this.metrics.get(name) || 0;
  }
  /**
   * Get all current metrics.
   * @returns Object with all metrics
   */
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }
  /**
   * Run a single health check with timeout and retries.
   * @private
   */
  runHealthCheck(name, checkFn) {
    return __async(this, null, function* () {
      for (let attempt = 0; attempt <= this.options.retries; attempt++) {
        try {
          const result = yield this.withTimeout(checkFn(), this.options.timeout);
          if (result) {
            return true;
          }
        } catch (error) {
          Logger.debug(
            `Health check "${name}" failed (attempt ${attempt + 1}/${this.options.retries + 1}):`,
            { error: error.message }
          );
        }
      }
      return false;
    });
  }
  /**
   * Wrap a promise with a timeout.
   * @private
   */
  withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
  /**
   * Run all health checks and return the current health status.
   */
  getHealthStatus() {
    return __async(this, null, function* () {
      const timestamp = Date.now();
      const checkResults = {};
      const details = {};
      const checkPromises = Array.from(this.checks.entries()).map((_0) => __async(this, [_0], function* ([name, checkFn]) {
        const result = yield this.runHealthCheck(name, checkFn);
        checkResults[name] = result;
        this.lastCheckResults.set(name, result);
        if (!result) {
          details[`${name}_last_failure`] = (/* @__PURE__ */ new Date()).toISOString();
        }
        return result;
      }));
      yield Promise.allSettled(checkPromises);
      const healthy = Object.values(checkResults).every((result) => result);
      const metrics = this.getAllMetrics();
      return {
        healthy,
        timestamp,
        checks: checkResults,
        metrics,
        details
      };
    });
  }
  /**
   * Start periodic health monitoring.
   */
  start() {
    if (this.checkInterval) {
      this.stop();
    }
    Logger.info(`Starting health monitor with ${this.options.interval}ms interval`);
    this.checkInterval = setInterval(() => __async(this, null, function* () {
      try {
        const status = yield this.getHealthStatus();
        if (!status.healthy) {
          const failedChecks = Object.entries(status.checks).filter(([, healthy]) => !healthy).map(([name]) => name);
          Logger.warn(`Health check failed`, {
            operation: "health_check",
            failed_checks: failedChecks,
            metrics: status.metrics
          });
        } else {
          Logger.debug("Health check passed", {
            operation: "health_check",
            metrics: status.metrics
          });
        }
      } catch (error) {
        Logger.error("Error during health check:", { error: error.message });
      }
    }), this.options.interval);
  }
  /**
   * Stop periodic health monitoring.
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      Logger.info("Stopped health monitor");
    }
  }
  /**
   * Get a summary of the last health check results.
   */
  getLastCheckSummary() {
    return Object.fromEntries(this.lastCheckResults);
  }
};
var healthMonitor = new HealthMonitor();

// src/utils/websocketClient.ts
var WebSocketClient = class {
  /**
   * Creates a new instance of `WebSocketClient`.
   *
   * @param options - Configuration options for the WebSocket client, including URL, reconnect interval, and ping interval.
   */
  constructor(options) {
    this.ws = null;
    this.pingTimeout = null;
    this.serviceIndex = 0;
    this.reconnectAttempts = 0;
    this.serviceCycles = 0;
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.shouldReconnect = true;
    this.messageCount = 0;
    this.lastMessageTime = 0;
    this.service = options.service;
    this.reconnectInterval = options.reconnectInterval || 5e3;
    this.pingInterval = options.pingInterval || 1e4;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 3;
    this.maxServiceCycles = options.maxServiceCycles || 2;
    this.maxReconnectDelay = options.maxReconnectDelay || 3e4;
    this.backoffFactor = options.backoffFactor || 1.5;
    this.healthCheckName = `websocket_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    healthMonitor.registerHealthCheck(this.healthCheckName, () => __async(this, null, function* () {
      return this.getConnectionState() === "CONNECTED";
    }));
    healthMonitor.setMetric(`${this.healthCheckName}_messages_received`, 0);
    healthMonitor.setMetric(`${this.healthCheckName}_reconnect_attempts`, 0);
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
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    const currentService = Array.isArray(this.service) ? this.service[this.serviceIndex] : this.service;
    Logger.info(`Attempting to connect to WebSocket: ${currentService}`);
    this.ws = new WebSocket(currentService);
    this.ws.on("open", () => {
      Logger.info("WebSocket connected successfully", {
        service: this.getCurrentService(),
        serviceIndex: this.serviceIndex
      });
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.serviceCycles = 0;
      healthMonitor.setMetric(`${this.healthCheckName}_reconnect_attempts`, this.reconnectAttempts);
      this.startHeartbeat();
      this.onOpen();
    });
    this.ws.on("message", (data) => {
      this.messageCount++;
      this.lastMessageTime = Date.now();
      healthMonitor.incrementMetric(`${this.healthCheckName}_messages_received`);
      this.onMessage(data);
    });
    this.ws.on("error", (error) => {
      Logger.error("WebSocket error:", error);
      this.isConnecting = false;
      this.onError(error);
    });
    this.ws.on("close", (code, reason) => {
      Logger.info(`WebSocket disconnected. Code: ${code}, Reason: ${reason.toString()}`);
      this.isConnecting = false;
      this.stopHeartbeat();
      this.onClose();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });
  }
  /**
   * Attempts to reconnect to the WebSocket server after the specified `reconnectInterval`.
   * It clears all event listeners on the old WebSocket and initiates a new connection.
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    healthMonitor.setMetric(`${this.healthCheckName}_reconnect_attempts`, this.reconnectAttempts);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.shouldTryNextService()) {
        this.moveToNextService();
        return;
      } else {
        Logger.error("All services exhausted after maximum cycles", {
          totalServices: Array.isArray(this.service) ? this.service.length : 1,
          maxServiceCycles: this.maxServiceCycles,
          serviceCycles: this.serviceCycles
        });
        return;
      }
    }
    const delay = Math.min(
      this.reconnectInterval * Math.pow(this.backoffFactor, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    Logger.info(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} for service`,
      {
        service: this.getCurrentService(),
        serviceIndex: this.serviceIndex,
        delay: `${delay}ms`
      }
    );
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.cleanup();
      this.run();
    }, delay);
  }
  /**
   * Check if we should try the next service in the array.
   */
  shouldTryNextService() {
    if (!Array.isArray(this.service)) {
      return false;
    }
    return this.serviceCycles < this.maxServiceCycles;
  }
  /**
   * Move to the next service in the array and reset reconnection attempts.
   */
  moveToNextService() {
    if (!Array.isArray(this.service)) {
      return;
    }
    const previousIndex = this.serviceIndex;
    this.serviceIndex = (this.serviceIndex + 1) % this.service.length;
    if (this.serviceIndex === 0) {
      this.serviceCycles++;
    }
    this.reconnectAttempts = 0;
    Logger.info("Switching to next service", {
      previousService: this.service[previousIndex],
      previousIndex,
      newService: this.getCurrentService(),
      newIndex: this.serviceIndex,
      serviceCycle: this.serviceCycles
    });
    this.cleanup();
    this.run();
  }
  cleanup() {
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
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
  onMessage(_data) {
  }
  /**
   * Called when a WebSocket error occurs.
   *
   * @param error - The error that occurred.
   *
   * Override this method in a subclass to implement custom error handling.
   * Note: Service switching is now handled in the reconnection logic, not here.
   */
  onError(_error) {
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
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
    }
    healthMonitor.unregisterHealthCheck(this.healthCheckName);
  }
  getConnectionState() {
    if (!this.ws) return "DISCONNECTED";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "CONNECTED";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "DISCONNECTED";
      default:
        return "UNKNOWN";
    }
  }
  getReconnectAttempts() {
    return this.reconnectAttempts;
  }
  getServiceCycles() {
    return this.serviceCycles;
  }
  getServiceIndex() {
    return this.serviceIndex;
  }
  getAllServices() {
    return Array.isArray(this.service) ? [...this.service] : [this.service];
  }
  getCurrentService() {
    return Array.isArray(this.service) ? this.service[this.serviceIndex] : this.service;
  }
  getMessageCount() {
    return this.messageCount;
  }
  getLastMessageTime() {
    return this.lastMessageTime;
  }
  getHealthCheckName() {
    return this.healthCheckName;
  }
};

// src/utils/jetstreamSubscription.ts
var JetstreamSubscription = class extends WebSocketClient {
  /**
   * Creates a new `JetstreamSubscription`.
   *
   * @param service - The URL(-Array) of the Jetstream server(s) to connect to.
   * @param interval - The interval (in milliseconds) for reconnect attempts.
   * @param onMessageCallback - An optional callback function that is invoked whenever a message is received from the server.
   */
  constructor(service, interval, onMessageCallback) {
    super({ service, reconnectInterval: interval });
    this.interval = interval;
    this.onMessageCallback = onMessageCallback;
  }
  /**
   * Called when the WebSocket connection is successfully opened.
   * Logs a message indicating that the connection to the Jetstream server has been established.
   */
  onOpen() {
    Logger.info("Connected to Jetstream server.");
    super.onOpen();
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
    super.onError(error);
  }
  /**
   * Called when the WebSocket connection is closed.
   * Logs a message indicating that the Jetstream connection has closed.
   */
  onClose() {
    Logger.info("Jetstream connection closed.");
    super.onClose();
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
  BotAgent,
  CronBotAgent,
  HealthMonitor,
  JetstreamSubscription,
  KeywordBotAgent,
  LogLevel,
  Logger,
  WebSocketClient,
  buildReplyToPost,
  filterBotReplies,
  healthMonitor,
  initializeBotAgent,
  maybeInt,
  maybeStr,
  useActionBotAgent,
  useCronBotAgent,
  useKeywordBotAgent,
  websocketToFeedEntry
};
//# sourceMappingURL=index.mjs.map