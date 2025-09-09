import { AtpAgent, AtpAgentOptions } from "@atproto/api";
import { Logger } from "../utils/logger";
import type { ActionBot } from "../types/bot";

export class ActionBotAgent extends AtpAgent {
  constructor(
    public opts: AtpAgentOptions,
    public actionBot: ActionBot
  ) {
    super(opts);
  }

  async doAction(params?: unknown): Promise<void> {
    const correlationId = Logger.startOperation("actionBot.doAction", {
      botId: this.actionBot.username || this.actionBot.identifier,
    });

    const startTime = Date.now();

    try {
      await this.actionBot.action(this, params);
      Logger.endOperation("actionBot.doAction", startTime, {
        correlationId,
        botId: this.actionBot.username || this.actionBot.identifier,
      });
    } catch (error) {
      Logger.error("Action bot execution failed", {
        correlationId,
        botId: this.actionBot.username || this.actionBot.identifier,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
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
