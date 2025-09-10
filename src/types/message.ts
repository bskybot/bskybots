import { UriCid } from "./post";

/**
 * Base Jetstream message structure
 */
export interface BaseJetstreamMessage {
  did: string;
  time_us: number;
  kind: "commit" | "identity" | "account";
}

/**
 * Commit operation types
 */
export type CommitOperation = "create" | "update" | "delete";

/**
 * Base record interface - all records must have $type
 */
export interface BaseRecord {
  $type: string;
  createdAt?: string;
}

/**
 * Post record specific to app.bsky.feed.post
 */
export interface PostRecord extends BaseRecord {
  $type: "app.bsky.feed.post";
  text: string;
  createdAt: string;
  reply?: {
    root: UriCid;
    parent: UriCid;
  };
  embed?: unknown; // Can be various embed types
  langs?: string[];
  labels?: unknown;
  tags?: string[];
}

/**
 * Commit event from Jetstream
 */
export interface JetstreamCommitMessage extends BaseJetstreamMessage {
  kind: "commit";
  commit: {
    rev: string;
    operation: CommitOperation;
    collection: string;
    rkey: string;
    record: BaseRecord;
    cid: string;
  };
}

/**
 * Post-specific commit message
 */
export interface JetstreamPostCommitMessage extends BaseJetstreamMessage {
  kind: "commit";
  commit: {
    rev: string;
    operation: CommitOperation;
    collection: "app.bsky.feed.post";
    rkey: string;
    record: PostRecord;
    cid: string;
  };
}

/**
 * Type guard to check if a message is a commit message
 */
export function isCommitMessage(message: BaseJetstreamMessage): message is JetstreamCommitMessage {
  return message.kind === "commit" && "commit" in message;
}

/**
 * Type guard to check if a commit message is for a post
 */
export function isPostCommitMessage(
  message: JetstreamCommitMessage
): message is JetstreamPostCommitMessage {
  return (
    message.commit.collection === "app.bsky.feed.post" &&
    message.commit.record.$type === "app.bsky.feed.post"
  );
}

/**
 * Type guard to check if a commit is a create operation
 */
export function isCreateOperation(message: JetstreamCommitMessage): boolean {
  return message.commit.operation === "create";
}

/**
 * Legacy type for backward compatibility
 * @deprecated Use JetstreamCommitMessage instead
 */
export type WebsocketMessage = JetstreamCommitMessage;
