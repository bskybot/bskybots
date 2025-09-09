import { AtpAgentOptions } from "@atproto/api";
import type { BotReply, KeywordBot } from "../types/bot";
import type { Post, UriCid } from "../types/post";
import { Logger } from "../utils/logger";
import { BotAgent, initializeBotAgent } from "./baseBotAgent";

export class KeywordBotAgent extends BotAgent {
  public keywordBot: KeywordBot;

  constructor(opts: AtpAgentOptions, keywordBot: KeywordBot) {
    super(opts, keywordBot);
    this.keywordBot = keywordBot;
  }

  async likeAndReplyIfFollower(post: Post): Promise<void> {
    if (post.authorDid === this.assertDid) {
      return;
    }

    const replies = filterBotReplies(post.text, this.keywordBot.replies);
    if (replies.length < 1) {
      return;
    }

    // Start operation tracking when actual work begins
    this.startOperationTracking();

    try {
      const actorProfile = await this.getProfile({ actor: post.authorDid });

      if (actorProfile.success) {
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

        this.logAction("info", `Replied to post: ${post.uri}`, {
          postUri: post.uri,
          authorDid: post.authorDid,
          keyword: replyCfg.keyword,
          message: message,
        });
      }
    } catch (error) {
      Logger.error("Keyword bot execution failed", {
        correlationId: this.currentCorrelationId,
        botId: this.getBotId(),
        operation: "keywordBot.likeAndReplyIfFollower",
        error: error instanceof Error ? error.message : String(error),
        postUri: post.uri,
        authorDid: post.authorDid,
      });
    } finally {
      // Clean up tracking state
      this.clearOperationTracking();
    }
  }

  protected getOperationName(): string {
    return "keywordBot.likeAndReplyIfFollower";
  }
}

export function buildReplyToPost(root: UriCid, parent: UriCid, message: string) {
  return {
    $type: "app.bsky.feed.post" as const,
    text: message,
    reply: {
      root: root,
      parent: parent,
    },
  };
}

export function filterBotReplies(text: string, botReplies: BotReply[]) {
  // Cache the lowercased text to avoid multiple toLowerCase() calls
  const lowerText = text.toLowerCase();

  return botReplies.filter(reply => {
    // Use cached lowercase comparison
    const keyword = reply.keyword.toLowerCase();
    if (!lowerText.includes(keyword)) {
      return false;
    }

    // Early return if no exclusions
    if (!Array.isArray(reply.exclude) || reply.exclude.length === 0) {
      return true;
    }

    // Use some() for early exit on first match
    const hasExcludedWord = reply.exclude.some(excludeWord =>
      lowerText.includes(excludeWord.toLowerCase())
    );

    return !hasExcludedWord;
  });
}

export const useKeywordBotAgent = async (
  keywordBot: KeywordBot
): Promise<KeywordBotAgent | null> => {
  return initializeBotAgent(
    "KeywordBot",
    keywordBot,
    (opts, bot) => new KeywordBotAgent(opts, bot as KeywordBot)
  );
};
