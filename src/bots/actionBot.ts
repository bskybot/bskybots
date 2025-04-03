import { AtpAgent, AtpAgentOptions } from '@atproto/api';
import { Logger } from '../utils/logger';
import type { ActionBot } from '../types/bot';

export class ActionBotAgent extends AtpAgent {
  constructor(public opts: AtpAgentOptions, public actionBot: ActionBot) {
    super(opts);
    Logger.info(`Initialize cronbot ${actionBot.identifier}`);
  }

  async doAction(): Promise<void> {
    this.actionBot.action(this);
  }
}

export const useActionBotAgent = async (actionBot: ActionBot): Promise<ActionBotAgent | null> => {
  const agent = new ActionBotAgent({ service: actionBot.service }, actionBot);
  
  try {
    const login = await agent.login({ identifier: actionBot.identifier, password: actionBot.password! });
    if (!login.success) {
      return null;
    }
    Logger.info(`Start cronbot ${actionBot.identifier}`);
    return agent;
  } catch (error) {
    Logger.error("Failed to initialize bot:", `${error}, ${actionBot.identifier}`);
    return null;
  }
};