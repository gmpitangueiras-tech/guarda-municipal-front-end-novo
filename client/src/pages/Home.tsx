import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

type Feedback = {
  type: "error" | "success";
  message: string;
} | null;

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!email.trim() || !password) {
      setFeedback({
        type: "error",
        message: "Informe seu e-mail e sua senha para continuar.",
      });
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setFeedback({
        type: "error",
        message:
          "O Supabase ainda não está conectado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente local.",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (error) {
      setFeedback({
        type: "error",
        message: "Não foi possível entrar. Confira seus dados e tente novamente.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Acesso autorizado. Estamos preparando seu atendimento.",
    });
  }

  function handleForgotPassword() {
    setFeedback({
      type: "success",
      message: "A recuperação de senha será adicionada na próxima etapa.",
    });
  }

  return (
    <main className="login-shell">
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

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="email">E-mail</label>
              <div className="input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-describedby="email-hint"
                  required
                />
              </div>
              <span className="field-hint" id="email-hint">
                E-mail funcional cadastrado no sistema.
              </span>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="password">Senha</label>
                <button
                  className="text-button"
                  type="button"
                  onClick={handleForgotPassword}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
              <span>{isLoading ? "Entrando..." : "Entrar na minha conta"}</span>
              {!isLoading && <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>

          <div className="login-footer">
            <span className="footer-line" aria-hidden="true" />
            <p>
              Ainda não possui acesso? <button type="button" onClick={() => setFeedback({ type: "success", message: "O cadastro será disponibilizado na próxima etapa." })}>Solicite seu cadastro</button>
            </p>
          </div>
        </div>

        <p className="privacy-note">
          <ShieldCheck size={15} aria-hidden="true" />
          Seus dados são protegidos e utilizados apenas para atendimento.
        </p>
      </section>
    </main>
  );
}
