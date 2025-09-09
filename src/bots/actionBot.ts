import { AtpAgentOptions } from "@atproto/api";
import { Logger } from "../utils/logger";
import type { ActionBot } from "../types/bot";
import { BotAgent, initializeBotAgent } from "./baseBotAgent";

export class ActionBotAgent extends BotAgent {
  public actionBot: ActionBot;

  constructor(opts: AtpAgentOptions, actionBot: ActionBot) {
    super(opts, actionBot);
    this.actionBot = actionBot;
  }

  async doAction(params?: unknown): Promise<void> {
    // Start operation tracking but don't log yet
    this.startOperationTracking();

    try {
      await this.actionBot.action(this, params);
    } catch (error) {
      Logger.error("Action bot execution failed", {
        correlationId: this.currentCorrelationId,
        botId: this.getBotId(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // Clean up tracking state
      this.clearOperationTracking();
    }
  }

  protected getOperationName(): string {
    return "actionBot.doAction";
  }
}

export const useActionBotAgent = async (actionBot: ActionBot): Promise<ActionBotAgent | null> => {
  return initializeBotAgent(
    "ActionBot",
    actionBot,
    (opts, bot) => new ActionBotAgent(opts, bot as ActionBot)
  );
};
