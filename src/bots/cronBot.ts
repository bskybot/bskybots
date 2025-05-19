import { AtpAgent, AtpAgentOptions } from '@atproto/api';
import { CronJob } from 'cron';
import { Logger } from '../utils/logger';
import type { CronBot } from '../types/bot';

export class CronBotAgent extends AtpAgent {
  public job: CronJob;

  constructor(public opts: AtpAgentOptions, public cronBot: CronBot) {
    super(opts);
    Logger.info(`Initialize cronbot ${cronBot.username ?? cronBot.identifier}`);

    this.job = new CronJob(
      cronBot.cronJob.scheduleExpression,
      async () => cronBot.action(this),
      cronBot.cronJob.callback,
      false,
      cronBot.cronJob.timeZone,
    );
  }
}

export const useCronBotAgent = async (cronBot: CronBot): Promise<CronBotAgent | null> => {
  const agent = new CronBotAgent({ service: cronBot.service }, cronBot);
  
  try {
    const login = await agent.login({ identifier: cronBot.identifier, password: cronBot.password! });
    if (!login.success) {
      return null;
    }
    Logger.info(`Start cronbot ${cronBot.identifier ?? cronBot.identifier}`);
    agent.job.start();
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize bot:", `${error}, ${cronBot.username ?? cronBot.identifier}`);
    return null;
  }
};