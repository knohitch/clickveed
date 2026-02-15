// Fix Bug #12: Force NextAuth to use Node.js runtime (not Edge Runtime)
// bcryptjs is not compatible with Edge Runtime as it uses Node.js APIs
import { handlers } from "@/auth";

// Explicitly set runtime to 'nodejs' to avoid Edge Runtime issues with bcryptjs
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
