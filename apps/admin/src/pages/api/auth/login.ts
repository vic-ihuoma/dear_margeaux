import type { APIRoute } from 'astro';
import { validateAdminCredentials, type D1Database } from '@dear-margeaux/auth';
import { getLucia, createSession } from '../../../lib/auth';

export const POST: APIRoute = async ({
  request,
  cookies,
  redirect,
  locals,
}) => {
  // Get form data
  const formData = await request.formData();
  const email = formData.get('email')?.toString() ?? '';
  const password = formData.get('password')?.toString() ?? '';

  // Validate input
  if (!email || !password) {
    return redirect('/login?error=invalid');
  }

  // Get D1 database from Cloudflare runtime
  const runtime = locals.runtime;
  const db = runtime?.env?.DB as D1Database | undefined;

  if (!db) {
    // In development without D1, just redirect with error
    console.error('No D1 database binding available');
    return redirect('/login?error=configuration');
  }

  try {
    // Validate credentials
    const user = await validateAdminCredentials(db, email, password);

    if (!user) {
      return redirect('/login?error=invalid');
    }

    // Create session
    const lucia = getLucia(db);
    await createSession(lucia, user.id, cookies);

    // Redirect to dashboard
    return redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    return redirect('/login?error=server');
  }
};
