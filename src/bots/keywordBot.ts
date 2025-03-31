import { AtpAgent, AtpAgentOptions } from '@atproto/api';
import type { BotReply, KeywordBot } from '../types/bot';
import type { Post, UriCid } from "../types/post";
import { Logger } from '../utils/logger';


export class KeywordBotAgent extends AtpAgent {
    constructor(public opts: AtpAgentOptions, public keywordBot: KeywordBot) {
        super(opts);
    }
    
    async likeAndReplyIfFollower(post: Post): Promise<void> {
        if (post.authorDid === this.assertDid) {
            return;
        }

        const replies = filterBotReplies(post.text, this.keywordBot.replies);
        if (replies.length < 1) {
            return;
        }

        try {
            const actorProfile = await this.getProfile({actor: post.authorDid});

            if(actorProfile.success) {
                
                if (!actorProfile.data.viewer?.followedBy) {
                    return;
                }

                const replyCfg = replies[Math.floor(Math.random() * replies.length)];
                const message = replyCfg.messages[Math.floor(Math.random() * replyCfg.messages.length)];
                const reply = buildReplyToPost(
                    { uri: post.rootUri, cid: post.rootCid },
                    { uri: post.uri, cid: post.cid },
                    message
                );

                await Promise.all([this.like(post.uri, post.cid), this.post(reply)]);
                Logger.info(`Replied to post: ${post.uri}`, this.keywordBot.identifier);
            }
        } catch (error) {
            Logger.error("Error while replying:", `${error}, ${this.keywordBot.identifier}`);
        }
    }
}

export function buildReplyToPost (root: UriCid, parent: UriCid, message: string) {    
    return {
        $type: "app.bsky.feed.post" as "app.bsky.feed.post",
        text: message,
        reply: {
            "root": root,
            "parent": parent
        }
    };
}

export function filterBotReplies(text: string, botReplies: BotReply[]) {
    return botReplies.filter(reply => {
        const keyword = reply.keyword.toLowerCase();
        const keywordFound = text.toLowerCase().includes(keyword);
        if (!keywordFound) {
            return false;
        }

        if (Array.isArray(reply.exclude) && reply.exclude.length > 0) {
            for (const excludeWord of reply.exclude) {
                if (text.toLowerCase().includes(excludeWord.toLowerCase())) {
                    return false;
                }
            }
        }

        return true;
    });
}

export const useKeywordBotAgent = async (keywordBot: KeywordBot): Promise<KeywordBotAgent | null> => {
    const agent = new KeywordBotAgent({ service: keywordBot.service }, keywordBot);

    try {
        const login = await agent.login({ identifier: keywordBot.identifier, password: keywordBot.password! });

        if (!login.success) { 
            return null;
        }

        return agent;
    } catch (error) {
        Logger.error("Failed to initialize bot:", `${error}, ${keywordBot.identifier}`);
        return null;
    }
};