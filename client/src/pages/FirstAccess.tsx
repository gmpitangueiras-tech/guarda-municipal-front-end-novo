import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { completeFirstAccess, signOut } from "@/lib/auth";
import { formatCpf, onlyDigits } from "@/lib/cpf";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

type Feedback = { type: "error" | "success"; message: string } | null;

type FirstAccessProps = {
  initialEmail?: string;
  initialName?: string;
  initialCpf?: string;
  onCompleted: () => void;
};

function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("pelo menos 8 caracteres");
  if (!/[a-z]/.test(password)) issues.push("uma letra minúscula");
  if (!/[A-Z]/.test(password)) issues.push("uma letra maiúscula");
  if (!/[0-9]/.test(password)) issues.push("um número");
  return issues;
}

export default function FirstAccess({
  initialEmail = "",
  initialName = "",
  initialCpf = "",
  onCompleted,
}: FirstAccessProps) {
  const [name, setName] = useState(initialName);
  const [cpf, setCpf] = useState(formatCpf(initialCpf));
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [registration, setRegistration] = useState("");
  const [nickname, setNickname] = useState("");
  const [keepBirthDate, setKeepBirthDate] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const normalizedCpf = onlyDigits(cpf);
    if (!name.trim() || normalizedCpf.length !== 11 || !birthDate || !email.trim()) {
      setFeedback({
        type: "error",
        message: "Preencha Nome Completo, CPF, Data de Nascimento e E-mail.",
      });
      return;
    }

    if (!keepBirthDate) {
      const issues = passwordIssues(password);
      if (issues.length > 0) {
        setFeedback({ type: "error", message: `A senha pessoal precisa ter ${issues.join(", ")}.` });
        return;
      }
      if (password !== confirmation) {
        setFeedback({ type: "error", message: "As senhas não conferem." });
        return;
      }
    }

    setIsLoading(true);
    const result = await completeFirstAccess({
      nomeCompleto: name,
      cpf,
      dataNascimento: birthDate,
      email,
      telefone: phone,
      matricula: registration,
      apelido: nickname,
      manterDataNascimento: keepBirthDate,
      novaSenha: password,
    });
    setIsLoading(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error ?? "Não foi possível concluir seu cadastro." });
      return;
    }

    setFeedback({ type: "success", message: "Cadastro concluído. Seu acesso foi liberado." });
    await signOut();
    window.setTimeout(onCompleted, 700);
  }

  return (
    <main className="login-shell first-access-shell">
      <section className="login-hero" aria-labelledby="first-access-title">
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
        <div className="hero-content">
          <div className="brand-lockup">
            <div className="brand-mark brand-mark-featured">
              <img src={brasaoGuarda} alt="Brasão da Guarda Municipal de Pitangueiras" />
            </div>
            <span>
              Guarda Municipal
              <small>Pitangueiras — PR</small>
            </span>
          </div>
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">Primeiro acesso</p>
            <h1 id="first-access-title">
              Complete seu
              <span>perfil funcional.</span>
            </h1>
            <p>
              Confirme seus dados e defina como você vai entrar no sistema da Guarda Municipal.
            </p>
          </div>
          <div className="hero-trust" aria-label="Proteção dos dados">
            <div>
              <strong>01</strong>
              <span>Dados<br />conferidos</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Acesso<br />individual</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Formulário de primeiro acesso">
        <div className="login-card first-access-card">
          <div className="login-heading">
            <p className="eyebrow">Cadastro funcional</p>
            <h2>Seus dados</h2>
            <p>Os campos marcados com * são obrigatórios.</p>
          </div>

          <form className="login-form profile-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="full-name">Nome Completo *</label>
              <div className="input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input id="full-name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
            </div>

            <div className="profile-grid">
              <div className="field-group">
                <label htmlFor="cpf">CPF *</label>
                <div className="input-wrap">
                  <BadgeCheck size={18} aria-hidden="true" />
                  <input id="cpf" type="text" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} required />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="birth-date">Data de Nascimento *</label>
                <div className="input-wrap">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input id="birth-date" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required />
                </div>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="profile-email">E-mail *</label>
              <div className="input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input id="profile-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby="profile-email-hint" required />
              </div>
              <span className="field-hint" id="profile-email-hint">
                É para este e-mail que o link de redefinição de senha será enviado.
              </span>
            </div>

            <div className="profile-grid">
              <div className="field-group">
                <label htmlFor="phone">Telefone</label>
                <div className="input-wrap">
                  <Phone size={18} aria-hidden="true" />
                  <input id="phone" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="registration">Matrícula</label>
                <div className="input-wrap">
                  <BadgeCheck size={18} aria-hidden="true" />
                  <input id="registration" type="text" value={registration} onChange={(event) => setRegistration(event.target.value)} />
                </div>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="nickname">Apelido operacional</label>
              <div className="input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input id="nickname" type="text" placeholder="Ex.: GM Silva" value={nickname} onChange={(event) => setNickname(event.target.value)} />
              </div>
            </div>

            <fieldset className="choice-fieldset">
              <legend>Como você quer entrar no sistema?</legend>

              <label className={`choice-option ${keepBirthDate ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="credencial"
                  value="data"
                  checked={keepBirthDate}
                  onChange={() => setKeepBirthDate(true)}
                />
                <span className="choice-icon" aria-hidden="true">
                  <CalendarDays size={18} />
                </span>
                <span className="choice-text">
                  <strong>Usar minha data de nascimento</strong>
                  <small>Entrada com CPF + data de nascimento (DDMMAAAA). Mais simples no dia a dia.</small>
                </span>
              </label>

              <label className={`choice-option ${!keepBirthDate ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="credencial"
                  value="senha"
                  checked={!keepBirthDate}
                  onChange={() => setKeepBirthDate(false)}
                />
                <span className="choice-icon" aria-hidden="true">
                  <KeyRound size={18} />
                </span>
                <span className="choice-text">
                  <strong>Criar uma senha pessoal</strong>
                  <small>Entrada com CPF + senha. A data de nascimento deixa de valer como senha.</small>
                </span>
              </label>
            </fieldset>

            {!keepBirthDate && (
              <div className="profile-grid">
                <div className="field-group">
                  <label htmlFor="new-password">Senha pessoal *</label>
                  <div className="input-wrap">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-describedby="new-password-hint"
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
                    8+ caracteres, com maiúscula, minúscula e número.
                  </span>
                </div>
                <div className="field-group">
                  <label htmlFor="confirm-password">Repita a senha *</label>
                  <div className="input-wrap">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {feedback && (
              <div className={`form-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
                {feedback.type === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <button className="submit-button" type="submit" disabled={isLoading}>
              <span>{isLoading ? "Salvando dados..." : "Concluir primeiro acesso"}</span>
              {!isLoading && <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>
        </div>
        <p className="privacy-note">
          <ShieldCheck size={15} aria-hidden="true" />
          Seus dados são protegidos e utilizados apenas no ambiente operacional.
        </p>
      </section>
    </main>
  );
}
