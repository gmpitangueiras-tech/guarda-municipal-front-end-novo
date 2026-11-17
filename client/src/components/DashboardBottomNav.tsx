import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ClipboardList,
  FilePlus2,
  House,
  LogOut,
  MoreHorizontal,
  Plus,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";

const BOMOBILE_URL = `${window.location.origin}/bomobile/`;
type Sheet = "create" | "more" | "profile" | null;

function show(value: string | null | undefined) {
  return value?.trim() || "Não informado";
}

function roleLabel(value: string | null) {
  if (value === "supervisor") return "Supervisor";
  if (value === "admin") return "Administrador";
  if (value === "guarda") return "Guarda Municipal";
  return show(value);
}

export default function DashboardBottomNav({
  profile,
  onSignOut,
  onOpenNotifications,
}: {
  profile: PerfilFuncional;
  onSignOut: () => Promise<void>;
  onOpenNotifications: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    if (!sheet) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sheet]);

  function openNotifications() {
    setSheet(null);
    onOpenNotifications();
  }

  function exit() {
    setSheet(null);
    void onSignOut();
  }

  return (
    <>
      <nav className="dashboard-bottom-nav" aria-label="Navegação principal">
        <a className="dashboard-nav-item is-current" href="#/inicio" aria-current="page">
          <House size={19} aria-hidden="true" />
          <span>Início</span>
        </a>
        <a className="dashboard-nav-item" href={`${BOMOBILE_URL}#ocorrencias`}>
          <ClipboardList size={19} aria-hidden="true" />
          <span>Ocorrências</span>
        </a>
        <button
          className="dashboard-nav-create"
          type="button"
          onClick={() => setSheet("create")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "create"}
          aria-label="Novo registro: escolher ocorrência ou abordagem"
        >
          <span className="dashboard-nav-create-icon"><Plus size={21} aria-hidden="true" /></span>
          <span>Novo registro</span>
        </button>
        <a className="dashboard-nav-item" href={`${BOMOBILE_URL}#consulta`}>
          <Shield size={19} aria-hidden="true" />
          <span>Abordagens</span>
        </a>
        <button
          className={`dashboard-nav-item ${sheet === "more" || sheet === "profile" ? "is-current" : ""}`}
          type="button"
          onClick={() => setSheet("more")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "more" || sheet === "profile"}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {sheet && (
        <div
          className="dashboard-menu-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSheet(null);
          }}
        >
          <section
            className="dashboard-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-menu-title"
          >
            <span className="dashboard-menu-handle" aria-hidden="true" />
            <div className="dashboard-menu-heading">
              {sheet === "profile" ? (
                <button className="dashboard-menu-back" type="button" onClick={() => setSheet("more")} aria-label="Voltar para Mais">
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
              ) : <span className="dashboard-menu-heading-spacer" />}
              <div>
                <p className="dashboard-eyebrow">
                  {sheet === "create" ? "ACESSO RÁPIDO" : sheet === "profile" ? "CONTA FUNCIONAL" : "MAIS OPÇÕES"}
                </p>
                <h2 id="dashboard-menu-title">
                  {sheet === "create" ? "Novo registro" : sheet === "profile" ? "Meu perfil" : "Mais"}
                </h2>
              </div>
              <button className="dashboard-menu-close" type="button" onClick={() => setSheet(null)} aria-label="Fechar menu">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {sheet === "create" && (
              <div className="dashboard-menu-options">
                <a className="dashboard-menu-option" href={`${BOMOBILE_URL}#nova-ocorrencia`}>
                  <span className="dashboard-menu-option-icon is-gold"><FilePlus2 size={20} aria-hidden="true" /></span>
                  <span><strong>Novo boletim / ocorrência</strong><small>Registrar uma ocorrência com GM de apoio</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a className="dashboard-menu-option" href={`${BOMOBILE_URL}#consulta`}>
                  <span className="dashboard-menu-option-icon"><Shield size={20} aria-hidden="true" /></span>
                  <span><strong>Nova abordagem</strong><small>Registrar abordagem de pessoa ou veículo</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
            )}

            {sheet === "more" && (
              <div className="dashboard-menu-options">
                <button className="dashboard-menu-option" type="button" onClick={() => setSheet("profile")}>
                  <span className="dashboard-menu-option-icon"><UserRound size={20} aria-hidden="true" /></span>
                  <span><strong>Meu perfil</strong><small>Ver seus dados funcionais</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <button className="dashboard-menu-option" type="button" onClick={openNotifications}>
                  <span className="dashboard-menu-option-icon"><Bell size={20} aria-hidden="true" /></span>
                  <span><strong>Notificações</strong><small>Abrir seus avisos recentes</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <button className="dashboard-menu-option is-danger" type="button" onClick={exit}>
                  <span className="dashboard-menu-option-icon is-danger"><LogOut size={20} aria-hidden="true" /></span>
                  <span><strong>Sair do sistema</strong><small>Encerrar sua sessão neste aparelho</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            )}

            {sheet === "profile" && (
              <div className="dashboard-profile-sheet-content">
                <div className="dashboard-profile-sheet-identity">
                  <span className="dashboard-profile-avatar"><UserRound size={24} aria-hidden="true" /></span>
                  <span><strong>{show(profile.apelido || profile.nome_completo)}</strong><small>{profile.matricula ? `Matrícula ${profile.matricula}` : roleLabel(profile.perfil)}</small></span>
                </div>
                <dl className="dashboard-profile-details">
                  <div><dt>Nome completo</dt><dd>{show(profile.nome_completo)}</dd></div>
                  <div><dt>Nome de guerra</dt><dd>{show(profile.apelido)}</dd></div>
                  <div><dt>Matrícula</dt><dd>{show(profile.matricula)}</dd></div>
                  <div><dt>Perfil de acesso</dt><dd>{roleLabel(profile.perfil)}</dd></div>
                  <div><dt>E-mail cadastrado</dt><dd>{show(profile.email)}</dd></div>
                  <div><dt>Telefone</dt><dd>{show(profile.telefone)}</dd></div>
                  <div><dt>Situação</dt><dd>{profile.status === "ativo" ? "Ativo" : show(profile.status)}</dd></div>
                </dl>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
