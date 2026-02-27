export type User = {
  id: string;
  username: string;
};

export type Channel = {
  id: string;
  name: string;
  _count: { members: number; messages: number };
};

export type Message = {
  id: string;
  content: string;
  createdAt: Date;
  sender: { id: string; username: string };
};
