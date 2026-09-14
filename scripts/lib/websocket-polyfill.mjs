// Node 20 has no global WebSocket, and @supabase/realtime-js refuses to build a
// client without one: on Node < 22 it does not auto-load `ws`, it throws
// "Node.js 20 detected without native WebSocket support" and asks you to pass a
// transport. Next.js defines globalThis.WebSocket in its own server runtime,
// which is why the app works and standalone scripts do not.
//
// Import this module FIRST in any script that constructs a Supabase client:
//
//   import '../lib/websocket-polyfill.mjs';
//   import { createClient } from '@supabase/supabase-js';
//
// ES modules evaluate imports in order, so the global exists before
// supabase-js initialises its Realtime client. `ws` is a devDependency.

import WebSocket from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

export {};
