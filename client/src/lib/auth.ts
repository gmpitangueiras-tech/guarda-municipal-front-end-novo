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
  senha_personalizada: boolean | null;
  foto_url: string | null;
};

export type LoginResult =
  | { success: true; profile: PerfilFuncional; precisaPrimeiroAcesso: boolean }
  | { success: false; error: string; blocked?: boolean };

export type ProfileUpdateInput = {
  apelido: string;
  email: string;
  telefone: string;
};

type LegacyLoginPayload = {
  success?: boolean;
  error?: string;
  blocked?: boolean;
  session?: { access_token?: string; refresh_token?: string };
  usuario?: Partial<PerfilFuncional> & { precisa_primeiro_acesso?: boolean };
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
    senha_personalizada: usuario.senha_personalizada ?? null,
    foto_url: usuario.foto_url ?? null,
  };
}

const NETWORK_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

/**
 * Autentica com CPF e o segredo funcional: a data de nascimento (DDMMAAAA)
 * ou a senha pessoal criada pelo usuário.
 *
 * As contas do Supabase Auth usam e-mail interno/real e a validação acontece
 * na Edge Function `legacy-login`, que devolve a sessão já assinada.
 */
export async function loginWithCpf(cpf: string, segredo: string): Promise<LoginResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: "O serviço de autenticação não está configurado. Avise o administrador do sistema." };
  }

  const cpfDigits = onlyDigits(cpf);
  if (cpfDigits.length !== 11) return { success: false, error: "Informe um CPF com 11 dígitos." };
  if (!segredo) return { success: false, error: "Informe sua data de nascimento ou sua senha." };

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/legacy-login`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfDigits, senha: segredo }),
    });
  } catch {
    return { success: false, error: NETWORK_ERROR };
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

  const profile = toProfile(payload.usuario ?? null);
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { success: false, error: "Conta autenticada, mas o perfil funcional não foi localizado." };
  }

  return {
    success: true,
    profile,
    precisaPrimeiroAcesso: payload.usuario?.precisa_primeiro_acesso === true,
  };
}

export type FirstAccessInput = {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  matricula: string;
  apelido: string;
  manterDataNascimento: boolean;
  novaSenha: string;
};

/** Conclui o cadastro funcional: grava a data de nascimento e define a credencial. */
export async function completeFirstAccess(input: FirstAccessInput): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Serviço de autenticação indisponível." };

  const { error } = await supabase.rpc("gm_complete_first_access_profile", {
    p_nome_completo: input.nomeCompleto.trim(),
    p_cpf: onlyDigits(input.cpf),
    p_data_nascimento: input.dataNascimento,
    p_email: input.email.trim().toLowerCase(),
    p_telefone: input.telefone.trim() || null,
    p_matricula: input.matricula.trim() || null,
    p_apelido: input.apelido.trim() || null,
    p_manter_data_nascimento: input.manterDataNascimento,
    p_nova_senha: input.manterDataNascimento ? null : input.novaSenha,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("senha pessoal inválida")) {
      return { success: false, error: "A senha pessoal precisa ter pelo menos 8 caracteres." };
    }
    if (message.includes("primeiro acesso não permitido")) {
      return { success: false, error: "Este cadastro já foi concluído. Entre com sua data de nascimento ou senha." };
    }
    return { success: false, error: "Não foi possível concluir seu cadastro. Confira os dados ou procure o administrador." };
  }

  if (!input.manterDataNascimento) {
    // Mantém a conta de Auth alinhada com a senha pessoal escolhida.
    await supabase.auth.updateUser({ password: input.novaSenha }).catch(() => undefined);
  }

  return { success: true };
}

export type ResetRequestResult = { success: boolean; error?: string; delivery?: string };

/** Pede o e-mail de redefinição: CPF + e-mail cadastrado precisam conferir. */
export async function requestPasswordReset(cpf: string, email: string): Promise<ResetRequestResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "O serviço de autenticação não está configurado." };
  }

  const cpfDigits = onlyDigits(cpf);
  if (cpfDigits.length !== 11) return { success: false, error: "Informe um CPF com 11 dígitos." };
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email.trim())) {
    return { success: false, error: "Informe um e-mail válido." };
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/password-reset-request`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfDigits, email: email.trim().toLowerCase() }),
    });
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }

  let payload: ResetRequestResult | null = null;
  try {
    payload = (await response.json()) as ResetRequestResult;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success !== true) {
    return { success: false, error: payload?.error ?? "Não foi possível enviar o e-mail agora." };
  }

  return { success: true, delivery: payload.delivery };
}

/** Consome o token de recuperação recebido por e-mail. */
export async function openRecoverySession(tokenHash: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Serviço de autenticação indisponível." };

  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) {
    return {
      success: false,
      error: "Este link de redefinição expirou ou já foi utilizado. Solicite um novo e-mail.",
    };
  }
  return { success: true };
}

/** Grava a nova senha no perfil funcional (bcrypt) e na conta de Auth. */
export async function setNewPassword(password: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Serviço de autenticação indisponível." };

  const { error } = await supabase.rpc("gm_set_my_password", { p_password: password });
  if (error) {
    return { success: false, error: "Não foi possível gravar a nova senha. Solicite um novo link." };
  }

  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    return { success: false, error: "Senha do perfil atualizada, mas a conta de acesso não sincronizou. Tente novamente." };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut({ scope: "local" });
}

/** Atualiza apenas os dados de contato e o nome de guerra do próprio GM. */
export async function updateMyProfile(
  profileId: string,
  input: ProfileUpdateInput,
): Promise<{ success: true; profile: PerfilFuncional; emailConfirmationPending: boolean } | { success: false; error: string }> {
  if (!supabase) return { success: false, error: "Serviço de perfil indisponível." };

  const apelido = input.apelido.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase();
  const telefone = input.telefone.trim().slice(0, 30);
  if (apelido.length > 0 && apelido.length < 2) return { success: false, error: "O nome de guerra precisa ter pelo menos 2 caracteres." };
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) || email.length > 160) {
    return { success: false, error: "Informe um e-mail válido." };
  }

  const { data: currentUser } = await supabase.auth.getUser();
  let emailConfirmationPending = false;
  if (currentUser.user?.email && currentUser.user.email.toLowerCase() !== email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      if (/already registered|already exists|duplicate/i.test(error.message)) {
        return { success: false, error: "Este e-mail já está vinculado a outra conta." };
      }
      return { success: false, error: "Não foi possível solicitar a alteração do e-mail." };
    }
    emailConfirmationPending = true;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update({ apelido: apelido || null, email, telefone: telefone || null })
    .eq("id", profileId)
    .select("id,nome_completo,matricula,apelido,email,telefone,perfil,status,primeiro_acesso,senha_personalizada,foto_url")
    .single();

  if (error || !data) {
    return { success: false, error: "Não foi possível salvar seu perfil. Confira a conexão e tente novamente." };
  }

  const profile = toProfile(data as Partial<PerfilFuncional>);
  if (!profile) return { success: false, error: "O perfil salvo retornou dados incompletos." };
  return { success: true, profile, emailConfirmationPending };
}

/** Recupera o perfil funcional ligado à sessão Supabase atual. */
export async function getAuthenticatedProfile(): Promise<PerfilFuncional | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("gm_my_profile");
  if (error) {
    console.error("Não foi possível recuperar o perfil funcional:", error);
    return null;
  }
  const profile = toProfile(data as Partial<PerfilFuncional> | null);
  return profile?.status === "ativo" ? profile : null;
}
