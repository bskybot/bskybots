import WebSocket from "ws";
import { Post } from "../types/post";
import { WebsocketMessage } from "../types/message";
/**
 * Converts a raw WebSocket message into a `FeedEntry` object, if possible.
 *
 * This function checks if the incoming WebSocket data is structured like a feed commit message
 * with the required properties for a created post. If the data matches the expected shape,
 * it extracts and returns a `FeedEntry` object. Otherwise, it returns `null`.
 *
 * @param data - The raw WebSocket data.
 * @returns A `FeedEntry` object if the data represents a newly created post, otherwise `null`.
 */
export function websocketToFeedEntry(data: WebSocket.Data): Post | null {
  const message = JSON.parse(data.toString()) as WebsocketMessage;
  if (
    !message.commit ||
    !message.commit.record ||
    !message.commit.record["$type"] ||
    !message.did ||
    !message.commit.cid ||
    !message.commit.rkey ||
    message.commit.operation !== "create"
  ) {
    return null;
  }
  const messageUri = `at://${message.did}/${message.commit.record["$type"]}/${message.commit.rkey}`;
  return {
    cid: message.commit.cid,
    uri: messageUri,
    authorDid: message.did,
    text: message.commit.record.text,
    rootCid: message.commit.record.reply?.root.cid ?? message.commit.cid,
    rootUri: message.commit.record.reply?.root.uri ?? messageUri,
  };
}
