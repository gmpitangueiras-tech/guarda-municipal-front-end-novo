import { FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, IdCard, Mail, MailCheck } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { requestPasswordReset } from "@/lib/auth";
import { formatCpf, onlyDigits } from "@/lib/cpf";

type Feedback = { type: "error" | "success"; message: string } | null;

type ResetRequestProps = {
  onBack: () => void;
};

export default function ResetRequest({ onBack }: ResetRequestProps) {
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (onlyDigits(cpf).length !== 11) {
      setFeedback({ type: "error", message: "Informe o CPF completo (11 dígitos)." });
      return;
    }
    if (!email.trim()) {
      setFeedback({ type: "error", message: "Informe o e-mail cadastrado na sua conta." });
      return;
    }

    setIsLoading(true);
    const result = await requestPasswordReset(cpf, email);
    setIsLoading(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error ?? "Não foi possível enviar o e-mail agora." });
      return;
    }

    setSent(true);
    setFeedback({
      type: "success",
      message: `Enviamos um link de redefinição para ${email.trim().toLowerCase()}. O link vale por 60 minutos.`,
    });
  }

  return (
    <AuthShell
      ariaLabel="Formulário de redefinição de senha"
      eyebrow="Recuperar acesso"
      heading="Redefinir senha"
      description="Confirme seu CPF e o e-mail cadastrado para receber o link de redefinição."
      heroTitle="Recupere seu"
      heroHighlight="acesso com segurança."
      heroText="A redefinição é enviada apenas para o e-mail já cadastrado no seu perfil funcional da Guarda Municipal."
      trust={[
        { index: "01", label: "Link de uso único" },
        { index: "02", label: "Expira em 60 minutos" },
      ]}
      privacy="Por segurança, nunca compartilhe o link recebido. O acesso é individual e registrado."
      backLabel="Voltar para o login"
      onBack={onBack}
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="reset-cpf">CPF</label>
          <div className="input-wrap">
            <IdCard size={18} aria-hidden="true" />
            <input
              id="reset-cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              aria-describedby="reset-cpf-hint"
              required
            />
          </div>
          <span className="field-hint" id="reset-cpf-hint">
            CPF cadastrado no sistema funcional.
          </span>
        </div>

        <div className="field-group">
          <label htmlFor="reset-email">E-mail cadastrado</label>
          <div className="input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              id="reset-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby="reset-email-hint"
              required
            />
          </div>
          <span className="field-hint" id="reset-email-hint">
            Precisa ser o mesmo e-mail informado no seu cadastro.
          </span>
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
          <span>{isLoading ? "Enviando..." : sent ? "Reenviar link de redefinição" : "Enviar link de redefinição"}</span>
          {!isLoading && (sent ? <MailCheck size={19} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />)}
        </button>

        {sent && (
          <p className="field-hint" role="status">
            Não recebeu? Confira a caixa de spam ou procure o administrador do sistema para conferir o e-mail cadastrado.
          </p>
        )}
      </form>
    </AuthShell>
  );
}
