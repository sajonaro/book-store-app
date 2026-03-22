export interface TenantInfo {
  id: string;
  store_name: string;
  slug: string;
  logo_url?: string | null;
  has_openai_key?: boolean;
}

interface Session {
  role: string;
  token?: string;
  user?: { id: string; name: string; email: string };
  tenant?: TenantInfo;
}

export function useSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem('session') || 'null') as Session | null;
  } catch {
    return null;
  }
}
