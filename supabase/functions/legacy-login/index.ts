import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

function internalEmail(profileId: string): string {
  return `gm-${profileId}@auth.gm-pitangueiras.invalid`;
}

function isUsableEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = value.trim().toLowerCase();
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) && email.length <= 160;
}

function authEmailFor(profile: Record<string, unknown>): string {
  return isUsableEmail(profile.email) ? String(profile.email).trim().toLowerCase() : internalEmail(String(profile.id));
}

function needsFirstAccess(profile: Record<string, unknown>): boolean {
  return (
    profile.data_nascimento === null ||
    profile.data_nascimento === undefined ||
    profile.primeiro_acesso === true ||
    profile.status === "primeiro_acesso" ||
    !isUsableEmail(profile.email)
  );
}

async function findOrProvisionAuthUser(
  admin: ReturnType<typeof createClient>,
  profile: Record<string, unknown>,
  password: string,
) {
  const profileId = String(profile.id);
  const candidates = [authEmailFor(profile)];
  if (candidates[0] !== internalEmail(profileId)) candidates.push(internalEmail(profileId));

  let authUserId = typeof profile.auth_user_id === "string" ? profile.auth_user_id : null;
  let lastError: unknown = null;

  for (const email of candidates) {
    try {
      if (authUserId) {
        const { error } = await admin.auth.admin.updateUserById(authUserId, {
          password,
          email,
          email_confirm: true,
        });
        if (error) throw new Error(error.message || "auth_account_update_failed");
        return authUserId;
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { gm_user_id: profileId },
      });
      if (!createError && created.user) {
        authUserId = created.user.id;
      } else {
        const duplicate = createError && (
          ["email_exists", "user_already_exists"].includes(String(createError.code ?? ""))
          || /already registered|already exists|duplicate/i.test(String(createError.message ?? ""))
        );
        if (!duplicate) throw new Error("auth_account_provision_failed");
        // Recupera somente o caso raro de Auth user criado antes de uma falha ao gravar o vínculo.
        let found: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
        for (let page = 1; page <= 100; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
          if (error) throw new Error("auth_account_lookup_failed");
          const users = data.users ?? [];
          found = users.find((u) => u.email === email) ?? null;
          if (found) break;
          if (users.length < 100) break;
        }
        if (!found || found.user_metadata?.gm_user_id !== profileId) {
          throw new Error("auth_account_provision_failed");
        }
        authUserId = found.id;
        const { error } = await admin.auth.admin.updateUserById(authUserId, {
          password,
          email,
          email_confirm: true,
          user_metadata: { gm_user_id: profileId },
        });
        if (error) throw new Error("auth_account_update_failed");
      }

      const { data: linked, error: linkError } = await admin
        .from("usuarios")
        .update({ auth_user_id: authUserId })
        .eq("id", profileId)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();
      if (linkError) throw new Error("auth_profile_link_failed");
      if (!linked) {
        const { data: current, error: readError } = await admin
          .from("usuarios")
          .select("auth_user_id")
          .eq("id", profileId)
          .maybeSingle();
        if (readError || current?.auth_user_id !== authUserId) {
          throw new Error("auth_profile_link_conflict");
        }
      }
      return authUserId;
    } catch (error) {
      lastError = error;
      authUserId = null;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("auth_account_provision_failed");
}

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
    const password = typeof body?.senha === "string" ? body.senha : "";
    if (cpf.length !== 11 || password.length < 1 || password.length > 128) {
      return json(req, { success: false, error: "CPF ou senha inválidos." }, 401);
    }

    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")
      ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
      ?? req.headers.get("apikey");
    if (!publishableKey) return json(req, { success: false, error: "Serviço indisponível." }, 503);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown")
      .split(",")[0].trim().slice(0, 80);
    const cpfAttemptKey = await fingerprint(`cpf:${cpf}`);
    const ipAttemptKey = await fingerprint(`ip:${ip}`);
    const [cpfLimit, ipLimit] = await Promise.all([
      admin.rpc("gm_record_login_attempt", { p_attempt_key: cpfAttemptKey }),
      admin.rpc("gm_record_login_attempt", { p_attempt_key: ipAttemptKey }),
    ]);
    const limitError = cpfLimit.error || ipLimit.error;
    const allowed = cpfLimit.data === true && ipLimit.data === true;
    if (limitError || !allowed) {
      return json(req, { success: false, error: "Não foi possível autenticar agora. Aguarde e tente novamente." }, limitError ? 503 : 429);
    }

    // Aceita senha pessoal (bcrypt) ou a data de nascimento, conforme o cadastro do usuário.
    const { data: valid, error: verifyError } = await admin.rpc("gm_verify_login_secret", {
      p_cpf: cpf,
      p_secret: password,
    });
    if (verifyError) return json(req, { success: false, error: "Não foi possível autenticar agora." }, 503);
    if (valid !== true) return json(req, { success: false, error: "CPF ou senha inválidos." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("usuarios")
      .select("id,auth_user_id,nome_completo,matricula,apelido,email,telefone,perfil,status,primeiro_acesso,data_nascimento,senha_personalizada,foto_url")
      .eq("cpf", cpf)
      .maybeSingle();
    if (profileError || !profile || !["ativo", "primeiro_acesso"].includes(String(profile.status))) {
      return json(req, { success: false, error: "CPF ou senha inválidos." }, 401);
    }

    const authUserId = await findOrProvisionAuthUser(admin, profile, password);
    const authClient = createClient(SUPABASE_URL, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: authEmailFor(profile),
      password,
    });
    if (signInError || !signedIn.session || signedIn.user?.id !== authUserId) {
      return json(req, { success: false, error: "Não foi possível concluir a autenticação." }, 503);
    }

    await Promise.all([
      admin.rpc("gm_clear_login_attempt", { p_attempt_key: cpfAttemptKey }),
      admin.rpc("gm_clear_login_attempt", { p_attempt_key: ipAttemptKey }),
    ]);

    return json(req, {
      success: true,
      session: {
        access_token: signedIn.session.access_token,
        refresh_token: signedIn.session.refresh_token,
      },
      usuario: {
        id: profile.id,
        nome_completo: profile.nome_completo,
        matricula: profile.matricula,
        apelido: profile.apelido,
        email: profile.email,
        telefone: profile.telefone,
        perfil: profile.perfil,
        status: profile.status,
        primeiro_acesso: profile.primeiro_acesso,
        senha_personalizada: profile.senha_personalizada,
        foto_url: profile.foto_url,
        precisa_primeiro_acesso: needsFirstAccess(profile),
      },
    });
  } catch (error) {
    // Não registrar corpo da requisição, CPF, senha, tokens ou detalhes pessoais.
    console.error("legacy-login failed", error instanceof Error ? error.name : "unknown");
    return json(req, { success: false, error: "Não foi possível autenticar agora." }, 503);
  }
});
