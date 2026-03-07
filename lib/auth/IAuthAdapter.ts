export interface LoginResult {
  success: boolean;
  sessionId?: string;
  userId?: number;
  role?: string;
  firstLogin?: boolean;
  error?: 'invalid_credentials' | 'account_disabled' | 'rate_limited' | 'server_error';
}

export interface SessionInfo {
  userId: number;
  username: string;
  fullName: string;
  role: string;
}

export interface CreateUserData {
  username: string;
  passwordHash: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export interface UserRecord {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  firstLogin: boolean;
  createdAt?: Date;
}

export interface UserListFilter {
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface IAuthAdapter {
  login(username: string, password: string, ip: string): Promise<LoginResult>;
  logout(sessionId: string): Promise<void>;
  validateSession(sessionId: string): Promise<SessionInfo | null>;
  createUser(data: CreateUserData): Promise<number>;
  getUserById(id: number): Promise<UserRecord | null>;
  getUserByUsername(username: string): Promise<UserRecord | null>;
  listUsers(filter?: UserListFilter): Promise<{ users: UserRecord[]; total: number }>;
  updateUser(id: number, data: Partial<Pick<UserRecord, 'fullName' | 'email' | 'role' | 'isActive' | 'firstLogin'>>): Promise<void>;
  updatePasswordHash(userId: number, newHash: string): Promise<void>;
  getPasswordHash(userId: number): Promise<string | null>;
}
