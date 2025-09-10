import WebSocket from "ws";
import { Post } from "../types/post";
import {
  BaseJetstreamMessage,
  isCommitMessage,
  isPostCommitMessage,
  isCreateOperation,
} from "../types/message";
import { Logger } from "./logger";

/**
 * Safely parses WebSocket data to a string, handling different data types from ws v8.x
 */
function parseWebSocketData(data: WebSocket.Data): string {
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  } else if (typeof data === "string") {
    return data;
  } else {
    return Buffer.from(data as ArrayBuffer).toString("utf8");
  }
}

/**
 * Converts a raw WebSocket message into a `Post` object, if possible.
 *
 * This function only processes Jetstream commit messages for posts (app.bsky.feed.post)
 * that are create operations. All other messages are ignored and return null.
 *
 * @param data - The raw WebSocket data from Jetstream.
 * @returns A `Post` object if the data represents a newly created post, otherwise `null`.
 */
export function websocketToFeedEntry(data: WebSocket.Data): Post | null {
  try {
    // Step 1: Safely parse WebSocket data to string
    const messageString = parseWebSocketData(data);

    // Step 2: Parse JSON with error handling
    let parsedMessage: unknown;
    try {
      parsedMessage = JSON.parse(messageString);
    } catch (jsonError) {
      Logger.debug("Failed to parse WebSocket message as JSON", { error: jsonError });
      return null;
    }

    // Step 3: Type guard - ensure it's a valid Jetstream message
    if (!parsedMessage || typeof parsedMessage !== "object") {
      return null;
    }

    const message = parsedMessage as BaseJetstreamMessage;

    // Step 4: Check if it's a commit message
    if (!isCommitMessage(message)) {
      return null; // Not a commit message, ignore
    }

    // Step 5: Check if it's a create operation
    if (!isCreateOperation(message)) {
      return null; // Not a create operation, ignore
    }

    // Step 6: Check if it's specifically a post record
    if (!isPostCommitMessage(message)) {
      return null; // Not a post record, ignore
    }

    // Step 7: Validate required fields for Post creation
    const commit = message.commit;
    if (!commit.record.text || !message.did || !commit.cid || !commit.rkey) {
      Logger.debug("Post message missing required fields", {
        hasText: !!commit.record.text,
        hasDid: !!message.did,
        hasCid: !!commit.cid,
        hasRkey: !!commit.rkey,
      });
      return null;
    }

    // Step 8: Build the Post object
    const messageUri = `at://${message.did}/${commit.record.$type}/${commit.rkey}`;

    return {
      cid: commit.cid,
      uri: messageUri,
      authorDid: message.did,
      text: commit.record.text,
      rootCid: commit.record.reply?.root.cid ?? commit.cid,
      rootUri: commit.record.reply?.root.uri ?? messageUri,
      createdAt: commit.record.createdAt ? new Date(commit.record.createdAt) : undefined,
    };
  } catch (error) {
    Logger.error("Unexpected error in websocketToFeedEntry", { error });
    return null;
  }
}
