import { AtpAgent, AtpAgentOptions } from "@atproto/api";
import { Logger } from "../utils/logger";
import type { Bot } from "../types/bot";

/**
 * Base class for all bot agents with common functionality.
 * Provides correlation tracking and structured logging capabilities.
 */
export abstract class BotAgent extends AtpAgent {
  protected currentCorrelationId: string | null = null;
  protected operationStartTime: number | null = null;

  constructor(
    public opts: AtpAgentOptions,
    protected bot: Bot
  ) {
    super(opts);
  }

  /**
   * Start tracking an operation with correlation ID and timing.
   * @protected
   */
  protected startOperationTracking(): void {
    this.currentCorrelationId = Logger.generateCorrelationId();
    this.operationStartTime = Date.now();
  }

  /**
   * Clear operation tracking state.
   * @protected
   */
  protected clearOperationTracking(): void {
    this.currentCorrelationId = null;
    this.operationStartTime = null;
  }

  /**
   * Get the bot identifier for logging purposes.
   * @protected
   */
  protected getBotId(): string {
    return this.bot.username || this.bot.identifier;
  }

  /**
   * Log a message with correlation ID during bot execution.
   * Call this from within your bot methods to log with proper correlation tracking.
   */
  logAction(
    level: "info" | "warn" | "error",
    message: string,
    additionalContext?: Record<string, unknown>
  ): void {
    const logContext: Record<string, unknown> = {
      botId: this.getBotId(),
      ...additionalContext,
    };

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

  /**
   * Get the operation name for logging. Override in subclasses.
   * @protected
   */
  protected abstract getOperationName(): string;
}

/**
 * Generic bot initialization function that handles common setup.
 */
export async function initializeBotAgent<T extends BotAgent>(
  botType: string,
  bot: Bot,
  createAgent: (opts: AtpAgentOptions, bot: Bot) => T
): Promise<T | null> {
  const botId = bot.username ?? bot.identifier;
  const correlationId = Logger.startOperation(`initialize${botType}`, { botId });
  const startTime = Date.now();

  const agent = createAgent({ service: bot.service }, bot);

  try {
    Logger.info(`Initializing ${botType.toLowerCase()}`, { correlationId, botId });

    const login = await agent.login({
      identifier: bot.identifier,
      password: bot.password!,
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
      duration: Date.now() - startTime,
    });
    return null;
  }
}
