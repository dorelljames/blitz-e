import { createClient } from "jsr:@supabase/supabase-js@2";

// Supabase clients
export const supabasePgmqSchemaClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "pgmq_public" } },
);

export const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "public" } },
);
