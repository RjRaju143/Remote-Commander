
import { Permission } from "./auth";

export type ServerOwner = {
  _id: string;
  email: string;
};

export type Server = {
  _id?: string;
  id: string;
  name: string;
  ip: string;
  port: number | string;
  username: string;
  status: 'active' | 'inactive' | 'connecting';
  privateKey?: string | undefined;
  ownerId: string;
  owner?: ServerOwner;
  userPermission?: Permission; // Permission of the CURRENT user
};

export type CommandLog = {
  id: string;
  command: string;
  user: string;
  server: string;
  timestamp: string;
  status: 'success' | 'error';
};
