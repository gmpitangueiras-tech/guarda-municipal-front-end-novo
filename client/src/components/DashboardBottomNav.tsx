import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CarFront,
  Check,
  Clipboard,
  ClipboardList,
  Copy,
  FilePlus2,
  House,
  KeyRound,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Save,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { updateMyProfile, type PerfilFuncional } from "@/lib/auth";
import ProfileAvatar from "@/components/ProfileAvatar";

type Sheet = "create" | "more" | "profile" | null;
type ContactField = "email" | "telefone";
type ActivePage = "inicio" | "ocorrencias" | "abordagens";

function show(value: string | null | undefined) {
  return value?.trim() || "Não informado";
}

function roleLabel(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "supervisor") return "Supervisor";
  if (normalized === "admin" || normalized === "administrador") return "Administrador";
  if (normalized === "guarda") return "Guarda Municipal";
  return show(value);
}

function maskEmail(value: string | null) {
  if (!value) return "Não informado";
  const [local, domain] = value.split("@");
  if (!domain || local.length < 3) return "••••••••";
  return `${local.slice(0, 2)}${"•".repeat(Math.min(5, Math.max(3, local.length - 2)))}@${domain}`;
}

function maskPhone(value: string | null) {
  if (!value) return "Não informado";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••••••";
  return `•••• •••• ${digits.slice(-4)}`;
}

export default function DashboardBottomNav({
  profile,
  activePage,
  onSignOut,
  onOpenNotifications,
  onProfileUpdated,
}: {
  profile: PerfilFuncional;
  activePage: ActivePage;
  onSignOut: () => Promise<void>;
  onOpenNotifications: () => void;
  onProfileUpdated: (profile: PerfilFuncional) => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ apelido: profile.apelido ?? "", email: profile.email ?? "", telefone: profile.telefone ?? "" });
  const [revealed, setRevealed] = useState<Record<ContactField, boolean>>({ email: false, telefone: false });
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<ContactField | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    if (!sheet) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sheet]);

  useEffect(() => {
    const closeOnNavigation = () => setSheet(null);
    window.addEventListener("hashchange", closeOnNavigation);
    return () => window.removeEventListener("hashchange", closeOnNavigation);
  }, []);

  useEffect(() => {
    if (!editing) {
      setDraft({ apelido: profile.apelido ?? "", email: profile.email ?? "", telefone: profile.telefone ?? "" });
    }
  }, [editing, profile]);

  function openNotifications() {
    setSheet(null);
    onOpenNotifications();
  }

  function exit() {
    setSheet(null);
    void onSignOut();
  }

  function startEditing() {
    setProfileError(null);
    setProfileNotice(null);
    setDraft({ apelido: profile.apelido ?? "", email: profile.email ?? "", telefone: profile.telefone ?? "" });
    setEditing(true);
  }

  function cancelEditing() {
    setProfileError(null);
    setEditing(false);
  }

  async function saveProfile() {
    setProfileError(null);
    setProfileNotice(null);
    setSaving(true);
    try {
      const result = await updateMyProfile(profile.id, draft);
      if (!result.success) {
        setProfileError(result.error);
        return;
      }
      onProfileUpdated(result.profile);
      setEditing(false);
      setProfileNotice(result.emailConfirmationPending
        ? "Perfil salvo. Confirme o novo e-mail pelo link recebido."
        : "Perfil atualizado com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  async function copyContact(field: ContactField, value: string | null) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied((current) => current === field ? null : current), 1600);
    } catch {
      setProfileError("Não foi possível copiar este contato. Toque e segure para selecionar.");
    }
  }

  return (
    <>
      <nav className="dashboard-bottom-nav" aria-label="Navegação principal">
        <a className={`dashboard-nav-item${activePage === "inicio" ? " is-current" : ""}`} href="#/inicio" aria-current={activePage === "inicio" ? "page" : undefined}>
          <House size={19} aria-hidden="true" />
          <span>Início</span>
        </a>
        <a className={`dashboard-nav-item${activePage === "ocorrencias" ? " is-current" : ""}`} href="#/ocorrencias" aria-current={activePage === "ocorrencias" ? "page" : undefined}>
          <ClipboardList size={19} aria-hidden="true" />
          <span>Ocorrências</span>
        </a>
        <button className="dashboard-nav-create" type="button" onClick={() => setSheet("create")} aria-haspopup="dialog" aria-expanded={sheet === "create"} aria-label="Novo registro: boletim, abordagem de pessoa ou abordagem de veículo">
          <span className="dashboard-nav-create-icon"><Plus size={21} aria-hidden="true" /></span>
          <span>Novo registro</span>
        </button>
        <a className={`dashboard-nav-item${activePage === "abordagens" ? " is-current" : ""}`} href="#/abordagens" aria-current={activePage === "abordagens" ? "page" : undefined}>
          <Shield size={19} aria-hidden="true" />
          <span>Abordagens</span>
        </a>
        <button className={`dashboard-nav-item ${sheet === "more" || sheet === "profile" ? "is-current" : ""}`} type="button" onClick={() => setSheet("more")} aria-haspopup="dialog" aria-expanded={sheet === "more" || sheet === "profile"}>
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {sheet && (
        <div className="dashboard-menu-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          <section className={`dashboard-menu-sheet ${sheet === "profile" ? "dashboard-profile-sheet" : ""}`} role="dialog" aria-modal="true" aria-labelledby="dashboard-menu-title">
            <span className="dashboard-menu-handle" aria-hidden="true" />
            <div className="dashboard-menu-heading">
              {sheet === "profile" ? (
                <button className="dashboard-menu-back" type="button" onClick={() => { setEditing(false); setSheet("more"); }} aria-label="Voltar para Mais"><ArrowLeft size={18} aria-hidden="true" /></button>
              ) : <span className="dashboard-menu-heading-spacer" />}
              <div>
                <p className="dashboard-eyebrow">{sheet === "create" ? "ACESSO RÁPIDO" : sheet === "profile" ? "CONTA FUNCIONAL" : "MAIS OPÇÕES"}</p>
                <h2 id="dashboard-menu-title">{sheet === "create" ? "Novo registro" : sheet === "profile" ? "Meu perfil" : "Mais"}</h2>
              </div>
              <button className="dashboard-menu-close" type="button" onClick={() => setSheet(null)} aria-label="Fechar menu"><X size={18} aria-hidden="true" /></button>
            </div>

            {sheet === "create" && (
              <>
                <div className="dashboard-record-support-note" role="note"><span><Shield size={18} aria-hidden="true" /></span><span><strong>GM de apoio obrigatório</strong><small>Indique outro GM ativo. O sistema bloqueia abordagens sem esse vínculo e não sincroniza boletins sem equipe.</small></span></div>
                <div className="dashboard-menu-options">
                  <a className="dashboard-menu-option" href="#/ocorrencias/nova"><span className="dashboard-menu-option-icon is-gold"><FilePlus2 size={20} aria-hidden="true" /></span><span><strong>Boletim de ocorrência</strong><small>Registre o BO no novo formulário, com GM responsável e apoio.</small></span><ArrowRight size={17} aria-hidden="true" /></a>
                  <a className="dashboard-menu-option" href="#/abordagens/nova?tipo=pessoas"><span className="dashboard-menu-option-icon"><UserRound size={20} aria-hidden="true" /></span><span><strong>Abordagem de pessoa</strong><small>Registrar uma nova abordagem de pessoa.</small></span><ArrowRight size={17} aria-hidden="true" /></a>
                  <a className="dashboard-menu-option" href="#/abordagens/nova?tipo=veiculos"><span className="dashboard-menu-option-icon"><CarFront size={20} aria-hidden="true" /></span><span><strong>Abordagem de veículo</strong><small>Registrar uma nova abordagem de veículo.</small></span><ArrowRight size={17} aria-hidden="true" /></a>
                </div>
              </>
            )}

            {sheet === "more" && (
              <div className="dashboard-menu-options">
                <button className="dashboard-menu-option" type="button" onClick={() => setSheet("profile")}><span className="dashboard-menu-option-icon"><UserRound size={20} aria-hidden="true" /></span><span><strong>Meu perfil</strong><small>Ver e atualizar seus dados</small></span><ArrowRight size={17} aria-hidden="true" /></button>
                <button className="dashboard-menu-option" type="button" onClick={openNotifications}><span className="dashboard-menu-option-icon"><Bell size={20} aria-hidden="true" /></span><span><strong>Notificações</strong><small>Abrir seus avisos recentes</small></span><ArrowRight size={17} aria-hidden="true" /></button>
                <button className="dashboard-menu-option is-danger" type="button" onClick={exit}><span className="dashboard-menu-option-icon is-danger"><LogOut size={20} aria-hidden="true" /></span><span><strong>Sair do sistema</strong><small>Encerrar sua sessão neste aparelho</small></span><ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            )}

            {sheet === "profile" && (
              <div className="dashboard-profile-sheet-content">
                <div className="profile-summary-card">
                  <div className={`profile-avatar-wrap ${isOnline ? "is-online" : "is-offline"}`}>
                    <ProfileAvatar photoUrl={profile.foto_url} name={profile.apelido || profile.nome_completo} size="large" />
                    <i className="profile-presence-dot" aria-hidden="true" />
                  </div>
                  <div className="profile-summary-copy">
                    <p className="dashboard-eyebrow">{isOnline ? "ONLINE" : "OFFLINE"}</p>
                    <h3>{show(profile.apelido || profile.nome_completo)}</h3>
                    <p>{roleLabel(profile.perfil)}{profile.matricula ? ` · Matrícula ${profile.matricula}` : ""}</p>
                  </div>
                  {!editing && <button className="profile-edit-button" type="button" onClick={startEditing}><Pencil size={15} aria-hidden="true" /> Editar</button>}
                </div>

                {profileNotice && <p className="profile-feedback is-success" role="status"><Check size={15} aria-hidden="true" />{profileNotice}</p>}
                {profileError && <p className="profile-feedback is-error" role="alert">{profileError}</p>}

                {editing ? (
                  <form className="profile-edit-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
                    <div className="profile-section-heading"><span className="profile-section-icon"><Pencil size={15} aria-hidden="true" /></span><span><strong>Atualizar meus dados</strong><small>Altere apenas as informações de contato e identificação visual.</small></span></div>
                    <label className="profile-field"><span>Nome de guerra</span><input value={draft.apelido} onChange={(event) => setDraft({ ...draft, apelido: event.target.value })} maxLength={80} placeholder="Ex.: GM Silva" /></label>
                    <label className="profile-field"><span>E-mail</span><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} autoComplete="email" required /></label>
                    <label className="profile-field"><span>Telefone</span><input type="tel" value={draft.telefone} onChange={(event) => setDraft({ ...draft, telefone: event.target.value })} autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" /></label>
                    <div className="profile-edit-actions"><button type="button" className="profile-secondary-button" onClick={cancelEditing} disabled={saving}>Cancelar</button><button type="submit" className="profile-primary-button" disabled={saving}>{saving ? "Salvando…" : <><Save size={15} aria-hidden="true" /> Salvar alterações</>}</button></div>
                  </form>
                ) : (
                  <>
                    <section className="profile-info-section" aria-labelledby="profile-functional-title">
                      <div className="profile-section-heading"><span className="profile-section-icon"><Shield size={15} aria-hidden="true" /></span><span><strong id="profile-functional-title">Identificação funcional</strong><small>Dados institucionais somente para consulta.</small></span></div>
                      <dl className="profile-info-list"><div><dt>Nome completo</dt><dd>{show(profile.nome_completo)}</dd></div><div><dt>Nome de guerra</dt><dd>{show(profile.apelido)}</dd></div><div><dt>Matrícula</dt><dd>{show(profile.matricula)}</dd></div><div><dt>Perfil</dt><dd>{roleLabel(profile.perfil)}</dd></div><div><dt>Situação</dt><dd><span className={`profile-status ${profile.status === "ativo" ? "is-active" : ""}`}>{profile.status === "ativo" ? "Ativo" : show(profile.status)}</span></dd></div></dl>
                    </section>
                    <section className="profile-info-section" aria-labelledby="profile-contact-title">
                      <div className="profile-section-heading"><span className="profile-section-icon"><Phone size={15} aria-hidden="true" /></span><span><strong id="profile-contact-title">Contato</strong><small>Toque no olho para revelar ou copie o dado.</small></span></div>
                      <div className="profile-contact-list">
                        <div className="profile-contact-row"><span className="profile-contact-icon"><Mail size={16} aria-hidden="true" /></span><span><small>E-mail</small><strong>{revealed.email ? show(profile.email) : maskEmail(profile.email)}</strong></span><button type="button" onClick={() => setRevealed({ ...revealed, email: !revealed.email })} aria-label={revealed.email ? "Ocultar e-mail" : "Revelar e-mail"}>{revealed.email ? "Ocultar" : "Revelar"}</button><button type="button" onClick={() => void copyContact("email", profile.email)} aria-label="Copiar e-mail">{copied === "email" ? <Check size={16} /> : <Copy size={16} />}</button></div>
                        <div className="profile-contact-row"><span className="profile-contact-icon"><Phone size={16} aria-hidden="true" /></span><span><small>Telefone</small><strong>{revealed.telefone ? show(profile.telefone) : maskPhone(profile.telefone)}</strong></span><button type="button" onClick={() => setRevealed({ ...revealed, telefone: !revealed.telefone })} aria-label={revealed.telefone ? "Ocultar telefone" : "Revelar telefone"}>{revealed.telefone ? "Ocultar" : "Revelar"}</button><button type="button" onClick={() => void copyContact("telefone", profile.telefone)} aria-label="Copiar telefone">{copied === "telefone" ? <Check size={16} /> : <Copy size={16} />}</button></div>
                      </div>
                    </section>
                    <section className="profile-security-section" aria-label="Segurança da conta"><div><span className="profile-section-icon"><KeyRound size={15} aria-hidden="true" /></span><span><strong>Segurança da conta</strong><small>Altere ou recupere sua senha pelo fluxo seguro.</small></span></div><a href="#/redefinir"><ArrowRight size={17} aria-hidden="true" /></a></section>
                  </>
                )}

                <div className="profile-logout-area"><button className="profile-logout-button" type="button" onClick={exit}><LogOut size={17} aria-hidden="true" /><span><strong>Sair do sistema</strong><small>Encerrar a sessão neste aparelho</small></span><ArrowRight size={16} aria-hidden="true" /></button></div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
