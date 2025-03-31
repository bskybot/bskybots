import { AtpAgent } from "@atproto/api";


type Cron = {
    scheduleExpression: string;
    callback: (() => void) | null;
    startAutomatically: boolean;
    timeZone: string;
}

export type BotReply = {
    keyword: string;
    exclude?: string[];
    messages: string[];
}

export type Bot = {
    identifier: string;
    password: string;
    service: string;
}

export type ActionBot = Bot & {
    action: (agent: AtpAgent) => Promise<void>;
}

export type CronBot = ActionBot & {
    cronJob: Cron;
}


export type KeywordBot = Bot & {
    replies: BotReply[];
}

