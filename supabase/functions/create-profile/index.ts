import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

serve(async (req) => {
  try {
    const body = await req.json();
    const id = body?.id;
    const email = body?.email;
    const role = body?.role;

    if (!id || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL"),
      Deno.env.get("SERVICE_ROLE_KEY")
    );

    const { error } = await supabaseClient.from("profiles").insert([{ id, email, role }]);

    if (error) {
      console.error("DB Insert Error:", error);
      return new Response(JSON.stringify({ error: error.message ?? error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Function Error:", err);
    return new Response(JSON.stringify({ error: err.message ?? err }), { status: 500 });
  }
});
