import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

type AuthShellProps = {
  ariaLabel: string;
  eyebrow: string;
  heading: string;
  description: string;
  heroTitle: string;
  heroHighlight: string;
  heroText: string;
  trust: Array<{ index: string; label: string }>;
  children: ReactNode;
  privacy?: string;
  backLabel?: string;
  onBack?: () => void;
};

export default function AuthShell({
  ariaLabel,
  eyebrow,
  heading,
  description,
  heroTitle,
  heroHighlight,
  heroText,
  trust,
  children,
  privacy = "Seus dados são protegidos e utilizados apenas no ambiente operacional.",
  backLabel,
  onBack,
}: AuthShellProps) {
  return (
    <main className="login-shell login-theme-blue">
      <section className="login-hero" aria-labelledby="auth-title">
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />

        <div className="hero-content">
          <div className="brand-lockup">
            <div className="brand-mark">
              <img src={brasaoGuarda} alt="Brasão da Guarda Municipal de Pitangueiras" />
            </div>
            <span>
              Guarda Municipal
              <small>Pitangueiras — PR</small>
            </span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">{eyebrow}</p>
            <h1 id="auth-title">
              {heroTitle}
              <span> {heroHighlight}</span>
            </h1>
            <p>{heroText}</p>
          </div>

          <div className="hero-trust" aria-label="Compromissos do serviço">
            {trust.map((item) => (
              <div key={item.index}>
                <strong>{item.index}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label={ariaLabel}>
        <div className="login-card">
          {backLabel && onBack && (
            <button className="text-button back-button" type="button" onClick={onBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              {backLabel}
            </button>
          )}
          <div className="login-heading">
            <p className="eyebrow">{eyebrow}</p>
            <h2>{heading}</h2>
            <p>{description}</p>
          </div>

          {children}
        </div>

        <p className="privacy-note">
          <ShieldCheck size={15} aria-hidden="true" />
          {privacy}
        </p>
      </section>
    </main>
  );
}
