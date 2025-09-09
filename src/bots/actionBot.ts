import { AtpAgent, AtpAgentOptions } from "@atproto/api";
import { Logger } from "../utils/logger";
import type { ActionBot } from "../types/bot";

export class ActionBotAgent extends AtpAgent {
  private currentCorrelationId: string | null = null;
  private operationStartTime: number | null = null;

  constructor(
    public opts: AtpAgentOptions,
    public actionBot: ActionBot
  ) {
    super(opts);
  }

  async doAction(params?: unknown): Promise<void> {
    // Start operation tracking but don't log yet
    this.currentCorrelationId = Logger.generateCorrelationId();
    this.operationStartTime = Date.now();

    try {
      await this.actionBot.action(this, params);
    } catch (error) {
      Logger.error("Action bot execution failed", {
        correlationId: this.currentCorrelationId,
        botId: this.actionBot.username || this.actionBot.identifier,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // Clean up tracking state
      this.currentCorrelationId = null;
      this.operationStartTime = null;
    }
  }

  /**
   * Log a success message with correlation ID when the action bot actually performs work.
   * Call this from within your action function when meaningful work is done.
   */
  logSuccess(message: string, additionalContext?: Record<string, unknown>): void {
    if (this.currentCorrelationId && this.operationStartTime) {
      Logger.info(message, {
        correlationId: this.currentCorrelationId,
        botId: this.actionBot.username || this.actionBot.identifier,
        operation: "actionBot.doAction",
        duration: `${Date.now() - this.operationStartTime}ms`,
        ...additionalContext,
      });
    } else {
      // Fallback for calls outside of doAction context
      Logger.info(message, {
        botId: this.actionBot.username || this.actionBot.identifier,
        ...additionalContext,
      });
    }
  }

  /**
   * Log an error message with correlation ID during action bot execution.
   * Call this from within your action function when an error occurs that you want to handle gracefully.
   */
  logError(
    message: string,
    error?: Error | unknown,
    additionalContext?: Record<string, unknown>
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.currentCorrelationId && this.operationStartTime) {
      Logger.error(message, {
        correlationId: this.currentCorrelationId,
        botId: this.actionBot.username || this.actionBot.identifier,
        operation: "actionBot.doAction",
        duration: `${Date.now() - this.operationStartTime}ms`,
        error: errorMessage,
        ...additionalContext,
      });
    } else {
      // Fallback for calls outside of doAction context
      Logger.error(message, {
        botId: this.actionBot.username || this.actionBot.identifier,
        error: errorMessage,
        ...additionalContext,
      });
    }
  }
}

export const useActionBotAgent = async (actionBot: ActionBot): Promise<ActionBotAgent | null> => {
  const botId = actionBot.username ?? actionBot.identifier;
  const correlationId = Logger.startOperation("initializeActionBot", { botId });
  const startTime = Date.now();

  const agent = new ActionBotAgent({ service: actionBot.service }, actionBot);

  try {
    Logger.info("Initializing action bot", { correlationId, botId });

    const login = await agent.login({
      identifier: actionBot.identifier,
      password: actionBot.password!,
    });

    if (!login.success) {
      Logger.warn("Action bot login failed", { correlationId, botId });
      return null;
    }

    Logger.endOperation("initializeActionBot", startTime, { correlationId, botId });
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize action bot", {
      correlationId,
      botId,
      error: error.message,
      duration: Date.now() - startTime,
    });
    return null;
  }
};
