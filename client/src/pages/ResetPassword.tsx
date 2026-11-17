import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldAlert } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { openRecoverySession, setNewPassword, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Feedback = { type: "error" | "success"; message: string } | null;
type Stage = "verificando" | "pronto" | "invalido";

type ResetPasswordProps = {
  tokenHash: string | null;
  onDone: (message?: string) => void;
};

function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("pelo menos 8 caracteres");
  if (!/[a-z]/.test(password)) issues.push("uma letra minúscula");
  if (!/[A-Z]/.test(password)) issues.push("uma letra maiúscula");
  if (!/[0-9]/.test(password)) issues.push("um número");
  return issues;
}

export default function ResetPassword({ tokenHash, onDone }: ResetPasswordProps) {
  const [stage, setStage] = useState<Stage>("verificando");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (tokenHash) {
        const result = await openRecoverySession(tokenHash);
        if (cancelled) return;
        if (!result.success) {
          setFeedback({ type: "error", message: result.error ?? "Link inválido." });
          setStage("invalido");
          return;
        }
        setStage("pronto");
        return;
      }

      // Fluxo nativo do Supabase: a sessão chega pelo hash da URL (type=recovery).
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (cancelled) return;
      if (data?.session) {
        setStage("pronto");
        return;
      }

      // O Supabase pode levar alguns instantes para processar o hash da URL.
      setTimeout(async () => {
        const { data: retry } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        if (cancelled) return;
        setStage(retry?.session ? "pronto" : "invalido");
        if (!retry?.session) {
          setFeedback({
            type: "error",
            message: "Link de redefinição inválido ou expirado. Solicite um novo e-mail.",
          });
        }
      }, 1500);
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [tokenHash]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const issues = passwordIssues(password);
    if (issues.length > 0) {
      setFeedback({ type: "error", message: `A nova senha precisa ter ${issues.join(", ")}.` });
      return;
    }
    if (password !== confirmation) {
      setFeedback({ type: "error", message: "As senhas não conferem." });
      return;
    }

    setIsLoading(true);
    const result = await setNewPassword(password);
    if (!result.success) {
      setIsLoading(false);
      setFeedback({ type: "error", message: result.error ?? "Não foi possível gravar a nova senha." });
      return;
    }

    await signOut();
    setIsLoading(false);
    onDone("Senha redefinida com sucesso. Entre com seu CPF e a nova senha.");
  }

  if (stage === "verificando") {
    return (
      <AuthShell
        ariaLabel="Validando link de redefinição"
        eyebrow="Recuperar acesso"
        heading="Validando link"
        description="Estamos conferindo o seu link de redefinição."
        heroTitle="Recupere seu"
        heroHighlight="acesso com segurança."
        heroText="Aguarde alguns instantes enquanto validamos o link enviado ao seu e-mail."
        trust={[
          { index: "01", label: "Link de uso único" },
          { index: "02", label: "Expira em 60 minutos" },
        ]}
      >
        <p className="field-hint" role="status">
          Validando o link de redefinição...
        </p>
      </AuthShell>
    );
  }

  if (stage === "invalido") {
    return (
      <AuthShell
        ariaLabel="Link de redefinição inválido"
        eyebrow="Recuperar acesso"
        heading="Link inválido"
        description="Não foi possível validar este link de redefinição."
        heroTitle="Recupere seu"
        heroHighlight="acesso com segurança."
        heroText="Por segurança, cada link pode ser usado uma única vez e expira em 60 minutos."
        trust={[
          { index: "01", label: "Link de uso único" },
          { index: "02", label: "Expira em 60 minutos" },
        ]}
      >
        <div className="form-feedback error" role="alert">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>{feedback?.message ?? "Link inválido ou expirado."}</span>
        </div>
        <button className="submit-button" type="button" onClick={() => onDone()}>
          <span>Voltar para o login e pedir novo link</span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      ariaLabel="Formulário de nova senha"
      eyebrow="Recuperar acesso"
      heading="Criar nova senha"
      description="Defina uma senha pessoal para entrar no sistema."
      heroTitle="Recupere seu"
      heroHighlight="acesso com segurança."
      heroText="Depois de definir a senha pessoal, o acesso passa a usar CPF + senha (a data de nascimento deixa de valer)."
      trust={[
        { index: "01", label: "Senha forte" },
        { index: "02", label: "Acesso individual" },
      ]}
      privacy="Sua senha é gravada de forma criptografada e nunca é exibida no sistema."
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="new-password">Nova senha</label>
          <div className="input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="new-password-hint"
              required
            />
            <button
              className="icon-button"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className="field-hint" id="new-password-hint">
            Use pelo menos 8 caracteres, com letra maiúscula, minúscula e número.
          </span>
        </div>

        <div className="field-group">
          <label htmlFor="confirm-password">Repita a nova senha</label>
          <div className="input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="confirm-password"
              name="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
        </div>

        {feedback && (
          <div
            className={`form-feedback ${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.type === "error" ? (
              <AlertCircle size={18} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <button className="submit-button" type="submit" disabled={isLoading}>
          <span>{isLoading ? "Salvando..." : "Salvar nova senha"}</span>
          {!isLoading && <ArrowRight size={19} aria-hidden="true" />}
        </button>
      </form>
    </AuthShell>
  );
}
