export type Post = {
  uri: string;
  cid: string;
  authorDid: string;
  authorHandle?: string;
  text: string;
  rootUri: string;
  rootCid: string;
  createdAt?: Date;
};

export type UriCid = {
  cid: string;
  uri: string;
};
