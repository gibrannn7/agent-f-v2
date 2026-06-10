import { createClient } from '@/lib/client';
import * as jose from 'jose';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  } else if (process.env.NODE_ENV === 'development') {
    const secret = new TextEncoder().encode("fallback_secret_for_local_dev_only");
    const token = await new jose.SignJWT({ sub: 'tenant_dev_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const config = {
    ...options,
    headers,
  };
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response;
}
