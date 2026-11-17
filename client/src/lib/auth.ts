import { onlyDigits } from "./cpf";
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from "./supabase";

export type PerfilFuncional = {
  id: string;
  nome_completo: string | null;
  matricula: string | null;
  apelido: string | null;
  email: string | null;
  telefone: string | null;
  perfil: string | null;
  status: string | null;
  primeiro_acesso: boolean | null;
  foto_url: string | null;
};

export type LoginResult =
  | { success: true; profile: PerfilFuncional }
  | { success: false; error: string; blocked?: boolean };

type LegacyLoginPayload = {
  success?: boolean;
  error?: string;
  blocked?: boolean;
  session?: { access_token?: string; refresh_token?: string };
  usuario?: Partial<PerfilFuncional>;
};

function toProfile(usuario: Partial<PerfilFuncional> | null | undefined): PerfilFuncional | null {
  if (!usuario || typeof usuario.id !== "string") return null;
  return {
    id: usuario.id,
    nome_completo: usuario.nome_completo ?? null,
    matricula: usuario.matricula ?? null,
    apelido: usuario.apelido ?? null,
    email: usuario.email ?? null,
    telefone: usuario.telefone ?? null,
    perfil: usuario.perfil ?? null,
    status: usuario.status ?? null,
    primeiro_acesso: usuario.primeiro_acesso ?? null,
    foto_url: usuario.foto_url ?? null,
  };
}

/**
 * Autentica com CPF e senha.
 *
 * As contas do Supabase Auth deste projeto usam e-mails internos
 * (`gm-<id>@auth.gm-pitangueiras.invalid`) e a senha funcional fica em
 * `public.usuarios.senha_hash`. Por isso o e-mail nunca é enviado ao GoTrue:
 * a validação acontece na Edge Function `legacy-login`, que devolve a sessão.
 */
export async function loginWithCpf(cpf: string, senha: string): Promise<LoginResult> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: false,
      error:
        "O serviço de autenticação não está configurado. Avise o administrador do sistema.",
    };
  }

  const cpfDigits = onlyDigits(cpf);
  if (cpfDigits.length !== 11) {
    return { success: false, error: "Informe um CPF com 11 dígitos." };
  }
  if (!senha) {
    return { success: false, error: "Informe sua senha para continuar." };
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/legacy-login`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfDigits, senha }),
    });
  } catch {
    return {
      success: false,
      error: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    };
  }

  let payload: LegacyLoginPayload | null = null;
  try {
    payload = (await response.json()) as LegacyLoginPayload;
  } catch {
    payload = null;
  }

  const accessToken = payload?.session?.access_token;
  const refreshToken = payload?.session?.refresh_token;
  if (!response.ok || payload?.success !== true || !accessToken || !refreshToken) {
    return {
      success: false,
      error: payload?.error ?? "CPF ou senha inválidos.",
      blocked: response.status === 429 || payload?.blocked === true,
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError || !sessionData?.user?.id) {
    return { success: false, error: "Não foi possível concluir a autenticação." };
  }

  const { data: profileData, error: profileError } = await supabase.rpc("gm_my_profile");
  const profile = profileError ? null : toProfile(profileData as Partial<PerfilFuncional> | null);

  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { success: false, error: "Conta autenticada, mas o perfil funcional não foi localizado." };
  }

  return { success: true, profile };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut({ scope: "local" });
}
