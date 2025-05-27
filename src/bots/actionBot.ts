import { AtpAgent, AtpAgentOptions } from '@atproto/api';
import { Logger } from '../utils/logger';
import type { ActionBot } from '../types/bot';

export class ActionBotAgent extends AtpAgent {
  constructor(public opts: AtpAgentOptions, public actionBot: ActionBot) {
    super(opts);
  }

  async doAction(params:any): Promise<void> {
    this.actionBot.action(this, params);
  }
}

export const useActionBotAgent = async (actionBot: ActionBot): Promise<ActionBotAgent | null> => {
  const agent = new ActionBotAgent({ service: actionBot.service }, actionBot);
  
  try {
    Logger.info(`Initialize action bot ${actionBot.username ?? actionBot.identifier}`);
    const login = await agent.login({ identifier: actionBot.identifier, password: actionBot.password! });
    if (!login.success) {
      Logger.warn(`Failed to login action bot ${actionBot.username ?? actionBot.identifier}`);
      return null;
    }
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize action bot:", `${error}, ${actionBot.username ?? actionBot.identifier}`);
    return null;
  }
};