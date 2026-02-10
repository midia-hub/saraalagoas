// Edge Function: convida um usuário por e-mail (Supabase Auth).
// Só admins podem chamar. Requer SERVICE_ROLE no Deno para auth.admin.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas admins podem convidar usuários" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = body?.email?.trim();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Campo email é obrigatório" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // URL do app para o link de convite (evita redirecionar para localhost em produção)
    const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || supabaseUrl;
    const redirectTo = `${appUrl.replace(/\/$/, "")}/admin/completar-cadastro`;
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo }
    );
    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Convite enviado",
        user_id: inviteData?.user?.id,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
