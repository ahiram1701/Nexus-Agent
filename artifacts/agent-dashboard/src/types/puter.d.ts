interface PuterAIMessage {
  content: string;
}

interface PuterAIResponse {
  message?: PuterAIMessage;
  content?: string;
}

interface PuterAI {
  chat(prompt: string, options?: { model?: string }): Promise<string | PuterAIResponse>;
}

interface PuterKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  list(pattern?: string): Promise<string[]>;
}

interface PuterFS {
  write(path: string, data: string): Promise<void>;
  read(path: string): Promise<Blob>;
}

interface PuterUser {
  username: string;
  uuid: string;
}

interface PuterAuth {
  isLoggedIn(): boolean;
  signIn(): Promise<PuterUser>;
  signOut(): Promise<void>;
  getUser(): Promise<PuterUser>;
}

interface Puter {
  ai: PuterAI;
  kv: PuterKV;
  fs: PuterFS;
  auth: PuterAuth;
}

declare global {
  interface Window {
    puter?: Puter;
  }
}

export {};
