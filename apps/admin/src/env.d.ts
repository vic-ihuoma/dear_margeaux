/// <reference types="astro/client" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />

import type { Session, User } from 'lucia';
import type { D1Database } from '@dear-margeaux/auth';

// Extend the built-in Astro.locals
declare global {
  namespace App {
    interface Locals {
      runtime?: {
        env: {
          DB?: D1Database;
        };
      };
      user:
        | (User & { email: string; name: string | null; active: boolean })
        | null;
      session: Session | null;
    }
  }
}

export {};
