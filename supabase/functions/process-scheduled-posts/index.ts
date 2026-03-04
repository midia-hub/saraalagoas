/**
 * Edge Function: process-scheduled-posts
 *
 * Chamada pelo pg_cron a cada 5 minutos para publicar postagens
 * que foram programadas e cujo horário já passou.
 *
 * Esta função é um proxy leve — delega toda a lógica de publicação
 * para o endpoint Next.js existente (/api/social/run-scheduled),
 * que usa o Admin Supabase client e as credenciais Meta.
 *
 * Não exige JWT (verify_jwt = false) pois é acionada internamente
 * pelo pg_cron, que não possui contexto de usuário.
 * A segurança real é o CRON_SECRET verificado pelo endpoint Next.js.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_req) => {
  const appUrl = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!appUrl || !cronSecret) {
    console.error("[process-scheduled-posts] APP_URL ou CRON_SECRET não configurados.");
    return new Response(
      JSON.stringify({ error: "APP_URL ou CRON_SECRET não configurados no Supabase." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = `${appUrl}/api/social/run-scheduled`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro de rede ao chamar run-scheduled";
    console.error("[process-scheduled-posts] Falha ao chamar Next.js:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await res.text();
  console.log(`[process-scheduled-posts] Next.js respondeu ${res.status}: ${body}`);

  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
