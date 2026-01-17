import type { APIRoute } from 'astro';
import { type D1Database } from '@dear-margeaux/auth';
import { getLucia, destroySession } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies, redirect, locals }) => {
  const session = locals.session;

  if (!session) {
    return redirect('/login');
  }

  // Get D1 database from Cloudflare runtime
  const runtime = locals.runtime;
  const db = runtime?.env?.DB as D1Database | undefined;

  if (!db) {
    // In development without D1, just clear cookie and redirect
    cookies.delete('admin_session', { path: '/' });
    return redirect('/login');
  }

  try {
    // Destroy session
    const lucia = getLucia(db);
    await destroySession(lucia, session.id, cookies);

    return redirect('/login');
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, try to redirect to login
    cookies.delete('admin_session', { path: '/' });
    return redirect('/login');
  }
};

// Also support GET for simple logout links
export const GET: APIRoute = async (context) => {
  return POST(context);
};
