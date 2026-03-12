interface Session {
  role: string;
  token?: string;
  user?: { id: string; name: string; email: string };
}

export function useSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem('session') || 'null') as Session | null;
  } catch {
    return null;
  }
}
