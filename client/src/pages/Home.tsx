import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { loginWithCpf, type PerfilFuncional } from "@/lib/auth";
import { formatCpf } from "@/lib/cpf";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

type Feedback = {
  type: "error" | "success";
  message: string;
} | null;

type HomeProps = {
  notice?: string | null;
  onLoginSuccess: (profile: PerfilFuncional) => void;
  onFirstAccess: (profile: { email?: string | null; name?: string | null; cpf?: string | null }) => void;
  onResetRequest: () => void;
};

export default function Home({ notice, onLoginSuccess, onFirstAccess, onResetRequest }: HomeProps) {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(notice ? { type: "success", message: notice } : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!cpf.trim() || !password) {
      setFeedback({
        type: "error",
        message: "Informe seu CPF e sua data de nascimento (ou senha pessoal) para continuar.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithCpf(cpf, password);
      if (!result.success) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      const { profile, precisaPrimeiroAcesso } = result;
      if (precisaPrimeiroAcesso) {
        onFirstAccess({ email: profile.email, name: profile.nome_completo, cpf });
        return;
      }

      onLoginSuccess(profile);
    } catch {
      setFeedback({
        type: "error",
        message: "Não foi possível concluir o acesso. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleForgotPassword() {
    onResetRequest();
  }

  return (
    <main className="login-shell login-theme-blue">
      <section className="login-hero" aria-labelledby="login-title">
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />

        <div className="hero-content">
          <div className="brand-lockup">
            <div className="brand-mark">
              <img
                src={brasaoGuarda}
                alt="Brasão da Guarda Municipal de Pitangueiras"
              />
            </div>
            <span>
              Guarda Municipal
              <small>Pitangueiras — PR</small>
            </span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">Acesso operacional</p>
            <h1 id="login-title">
              Segurança em ação,
              <span> todos os dias.</span>
            </h1>
            <p>
              Acesse o ambiente interno da Guarda Municipal de Pitangueiras
              para trabalhar com segurança e agilidade.
            </p>
          </div>

          <div className="hero-trust" aria-label="Compromissos do serviço">
            <div>
              <strong>01</strong>
              <span>Operação<br />integrada</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Informação<br />protegida</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Formulário de entrada">
        <div className="login-card">
          <div className="login-heading">
            <p className="eyebrow">Área segura</p>
            <h2>Entrar no sistema</h2>
            <p>Use suas credenciais funcionais para continuar.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
            <div className="field-group">
              <label htmlFor="cpf">CPF</label>
              <div className="input-wrap">
                <IdCard size={18} aria-hidden="true" />
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  autoComplete="username"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  disabled={isLoading}
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  aria-describedby="cpf-hint"
                  required
                />
              </div>
              <span className="field-hint" id="cpf-hint">
                CPF cadastrado no sistema funcional.
              </span>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="password">Data de nascimento ou senha</label>
                <button
                  className="text-button"
                  type="button"
                  onClick={handleForgotPassword}
                >
                  Redefinir senha
                </button>
              </div>
              <div className="input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="DDMMAAAA ou sua senha pessoal"
                  value={password}
                  disabled={isLoading}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="password-hint"
                  required
                />
                <button
                  className="icon-button"
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="field-hint" id="password-hint">
                Digite a data de nascimento (DDMMAAAA) ou a senha pessoal criada no primeiro acesso.
              </span>
            </div>

            {isLoading && (
              <div className="login-waiting" role="status" aria-live="polite" aria-atomic="true">
                <div className="login-waiting-emblem" aria-hidden="true">
                  <img src={brasaoGuarda} alt="" />
                  <span className="login-waiting-ring" />
                </div>
                <div className="login-waiting-copy">
                  <strong>Aguardando validação do login</strong>
                  <span>Estamos conferindo seu acesso com segurança.</span>
                </div>
                <div className="login-waiting-track" aria-hidden="true"><span /></div>
                <small>Isso pode levar alguns instantes. Não feche esta página.</small>
              </div>
            )}

            {feedback && !isLoading && (
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
              <span>{isLoading ? "Validando seu acesso..." : "Entrar na minha conta"}</span>
              {isLoading ? <span className="button-loader" aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>

        </div>

        <p className="privacy-note">
          <ShieldCheck size={15} aria-hidden="true" />
          Seus dados são protegidos e utilizados apenas para atendimento.
        </p>
      </section>
    </main>
  );
}
