import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

type Feedback = { type: "error" | "success"; message: string } | null;

type FirstAccessProps = {
  initialEmail?: string;
  initialName?: string;
  onCompleted: () => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatCpf(value: string) {
  const digits = onlyDigits(value);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function FirstAccess({
  initialEmail = "",
  initialName = "",
  onCompleted,
}: FirstAccessProps) {
  const [name, setName] = useState(initialName);
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [registration, setRegistration] = useState("");
  const [nickname, setNickname] = useState("");
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

    if (!supabase) {
      setFeedback({
        type: "error",
        message: "Não foi possível conectar ao Supabase. Tente novamente.",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.rpc("gm_complete_first_access_profile", {
      p_nome_completo: name.trim(),
      p_cpf: normalizedCpf,
      p_data_nascimento: birthDate,
      p_email: email.trim().toLowerCase(),
      p_telefone: phone.trim() || null,
      p_matricula: registration.trim() || null,
      p_apelido: nickname.trim() || null,
    });
    setIsLoading(false);

    if (error) {
      setFeedback({
        type: "error",
        message:
          "Não foi possível concluir seu cadastro. Confira os dados ou procure o administrador do sistema.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Cadastro concluído. Seu acesso foi liberado.",
    });
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
              Precisamos confirmar seus dados para liberar o ambiente interno da Guarda Municipal.
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
                <input id="profile-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
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
