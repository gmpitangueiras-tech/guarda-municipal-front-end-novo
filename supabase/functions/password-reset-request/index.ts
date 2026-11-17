import { createClient } from "npm:@supabase/supabase-js@2";
import { buildRecoveryEmail } from "./email-template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "Guarda Municipal de Pitangueiras <nao-responda@gm-pitangueiras.invalid>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://gmpitangueiras-tech.github.io/guarda-municipal-front-end-novo/";
const RESET_PATH = "#/redefinir-senha";
const LINK_TTL_MINUTES = 60;
const encoder = new TextEncoder();

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:5500",
  "https://gmpitangueiras-tech.github.io",
]);

const CORS_BASE = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(req: Request, body: unknown, status = 200) {
  const origin = req.headers.get("origin");
  const headers = new Headers({ ...CORS_BASE, "Content-Type": "application/json; charset=utf-8" });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(JSON.stringify(body), { status, headers });
}

async function fingerprint(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isUsableEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) && email.length >= 5 && email.length <= 160;
}

const GENERIC_MISMATCH = "CPF e e-mail não conferem com o cadastro. Confira os dados ou procure o administrador.";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response("", { status: 403, headers: CORS_BASE });
    const response = new Response("ok", { status: 200, headers: CORS_BASE });
    if (origin) response.headers.set("Access-Control-Allow-Origin", origin);
    return response;
  }
  if (req.method !== "POST") return json(req, { success: false, error: "Método não permitido." }, 405);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { success: false, error: "Origem não autorizada." }, 403);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(req, { success: false, error: "Serviço indisponível." }, 503);

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return json(req, { success: false, error: "Requisição inválida." }, 413);

  try {
    const raw = await req.text();
    if (raw.length > 4096) return json(req, { success: false, error: "Requisição inválida." }, 413);
    const body = JSON.parse(raw);
    const cpf = String(body?.cpf ?? "").replace(/\D/g, "");
    const email = normalizeEmail(body?.email);

    if (cpf.length !== 11) return json(req, { success: false, error: "Informe um CPF com 11 dígitos." }, 400);
    if (!isUsableEmail(email)) return json(req, { success: false, error: "Informe um e-mail válido." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown")
      .split(",")[0].trim().slice(0, 80);
    const cpfAttemptKey = await fingerprint(`reset-cpf:${cpf}`);
    const ipAttemptKey = await fingerprint(`reset-ip:${ip}`);
    const [cpfLimit, ipLimit] = await Promise.all([
      admin.rpc("gm_record_login_attempt", { p_attempt_key: cpfAttemptKey }),
      admin.rpc("gm_record_login_attempt", { p_attempt_key: ipAttemptKey }),
    ]);
    if (cpfLimit.error || ipLimit.error) {
      return json(req, { success: false, error: "Não foi possível processar agora. Tente novamente." }, 503);
    }
    if (cpfLimit.data !== true || ipLimit.data !== true) {
      return json(req, { success: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, 429);
    }

    const { data: profile, error: profileError } = await admin
      .from("usuarios")
      .select("id,auth_user_id,nome_completo,email,status,deleted_at")
      .eq("cpf", cpf)
      .maybeSingle();

    if (profileError) return json(req, { success: false, error: "Não foi possível processar agora. Tente novamente." }, 503);

    const registeredEmail = normalizeEmail(profile?.email);
    const profileUsable = Boolean(
      profile &&
      ["ativo", "primeiro_acesso"].includes(String(profile.status)) &&
      !profile.deleted_at &&
      isUsableEmail(registeredEmail),
    );

    if (!profileUsable || registeredEmail !== email) {
      // Mensagem única para não revelar se o CPF existe ou qual e-mail está cadastrado.
      return json(req, { success: false, error: GENERIC_MISMATCH }, 401);
    }

    const profileId = String(profile!.id);

    // Garante a conta de Auth com o e-mail real: é para ele que o link de recuperação vai.
    let authUserId = typeof profile!.auth_user_id === "string" ? profile!.auth_user_id : null;
    if (authUserId) {
      const { error } = await admin.auth.admin.updateUserById(authUserId, {
        email,
        email_confirm: true,
        user_metadata: { gm_user_id: profileId },
      });
      if (error) return json(req, { success: false, error: "Não foi possível processar agora. Tente novamente." }, 503);
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { gm_user_id: profileId },
      });
      if (createError || !created.user) {
        return json(req, { success: false, error: "Não foi possível processar agora. Tente novamente." }, 503);
      }
      authUserId = created.user.id;
      await admin.from("usuarios").update({ auth_user_id: authUserId }).eq("id", profileId).is("auth_user_id", null);
    }

    const redirectTo = `${SITE_URL}${RESET_PATH}`;
    let delivery: "custom" | "supabase" = "supabase";

    if (RESEND_API_KEY) {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      const tokenHash = linkData?.properties?.hashed_token;
      if (linkError || !tokenHash) {
        return json(req, { success: false, error: "Não foi possível gerar o link de redefinição." }, 503);
      }

      const link = `${SITE_URL}${RESET_PATH}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
      const { subject, html, text } = buildRecoveryEmail({
        nome: profile!.nome_completo,
        email,
        link,
        expiresInMinutes: LINK_TTL_MINUTES,
      });

      const mailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: MAIL_FROM, to: [email], subject, html, text }),
      });

      if (!mailResponse.ok) {
        console.error("password-reset mail failed", mailResponse.status);
        return json(req, { success: false, error: "Não foi possível enviar o e-mail agora. Tente novamente." }, 503);
      }
      delivery = "custom";
    } else {
      const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")
        ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
        ?? req.headers.get("apikey");
      if (!publishableKey) return json(req, { success: false, error: "Serviço indisponível." }, 503);

      const mailClient = createClient(SUPABASE_URL, publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: mailError } = await mailClient.auth.resetPasswordForEmail(email, { redirectTo });
      if (mailError) {
        console.error("password-reset supabase mail failed", mailError.status ?? mailError.name);
        return json(req, { success: false, error: "Não foi possível enviar o e-mail agora. Tente novamente." }, 503);
      }
    }

    await Promise.all([
      admin.rpc("gm_clear_login_attempt", { p_attempt_key: cpfAttemptKey }),
      admin.rpc("gm_clear_login_attempt", { p_attempt_key: ipAttemptKey }),
    ]);

    try {
      await admin.rpc("gm_record_security_event", {
        p_event_type: "password_reset_requested",
        p_attempt_key_hash: await fingerprint(`cpf:${cpf}`),
        p_ip_hash: await fingerprint(`ip:${ip}`),
        p_reason: delivery,
        p_user_agent: (req.headers.get("user-agent") ?? "unknown").slice(0, 200),
        p_metadata: { usuario_id: profileId, delivery },
      });
    } catch {
      // Auditoria não pode bloquear a redefinição.
    }

    return json(req, { success: true, delivery });
  } catch (error) {
    console.error("password-reset-request failed", error instanceof Error ? error.name : "unknown");
    return json(req, { success: false, error: "Não foi possível processar agora. Tente novamente." }, 503);
  }
});
