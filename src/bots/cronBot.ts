import { AtpAgentOptions } from "@atproto/api";
import { CronJob } from "cron";
import { Logger } from "../utils/logger";
import type { CronBot } from "../types/bot";
import { BotAgent, initializeBotAgent } from "./baseBotAgent";

export class CronBotAgent extends BotAgent {
  public job: CronJob;
  public cronBot: CronBot;

  constructor(opts: AtpAgentOptions, cronBot: CronBot) {
    super(opts, cronBot);
    this.cronBot = cronBot;

    this.job = new CronJob(
      cronBot.cronJob.scheduleExpression,
      async () => {
        // Start operation tracking for cron execution
        this.startOperationTracking();

        try {
          await cronBot.action(this);
        } catch (error) {
          Logger.error("Cron bot execution failed", {
            correlationId: this.currentCorrelationId,
            botId: this.getBotId(),
            operation: "cronBot.action",
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          // Clean up tracking state
          this.clearOperationTracking();
        }
      },
      cronBot.cronJob.callback,
      false,
      cronBot.cronJob.timeZone
    );
  }

  protected getOperationName(): string {
    return "cronBot.action";
  }
}

export const useCronBotAgent = async (cronBot: CronBot): Promise<CronBotAgent | null> => {
  const agent = await initializeBotAgent(
    "CronBot",
    cronBot,
    (opts, bot) => new CronBotAgent(opts, bot as CronBot)
  );

  // Start the cron job after successful initialization
  if (agent) {
    agent.job.start();
  }

  return agent;
};
