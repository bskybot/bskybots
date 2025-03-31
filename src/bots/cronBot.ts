import { AtpAgent, AtpAgentOptions } from '@atproto/api';
import { CronJob } from 'cron';
import { Logger } from '../utils/logger';
import type { CronBot } from '../types/bot';

export class CronBotAgent extends AtpAgent {
  public cronJob: CronJob;

  constructor(public opts: AtpAgentOptions, public cronBot: CronBot) {
    super(opts);
    Logger.info(`Initialize cronbot ${cronBot.identifier}`);

    this.cronJob = new CronJob(
      cronBot.cronJob.scheduleExpression,
      async () => { cronBot.action },
      cronBot.cronJob.callback,
      cronBot.cronJob.startAutomatically,
      cronBot.cronJob.timeZone,
    );

    this.start();
  }

  public start(): void {
    this.cronJob.start();
  }
}

export const useCronBotAgent = async (cronBot: CronBot): Promise<CronBotAgent | null> => {
  const agent = new CronBotAgent({ service: cronBot.service }, cronBot);
  
  try {
    const login = await agent.login({ identifier: cronBot.identifier, password: cronBot.password! });
    if (!login.success) {
      return null;
    }
    Logger.info(`Login cronbot ${cronBot.identifier}`);
    agent.start();
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize bot:", `${error}, ${cronBot.identifier}`);
    return null;
  }
};