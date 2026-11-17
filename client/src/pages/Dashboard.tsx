import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Bell,
  CarFront,
  CheckCheck,
  CircleAlert,
  ClipboardList,
  FilePlus2,
  MapPin,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import {
  isManagementRole,
  loadDashboardData,
  setAllNotificationReadState,
  setNotificationReadState,
  type ApproachPreview,
  type DashboardData,
  type DashboardNotification,
  type OccurrencePreview,
} from "@/lib/dashboard";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

type DashboardProps = {
  profile: PerfilFuncional;
  onSignOut: () => Promise<void>;
};

const BOMOBILE_URL = `${window.location.origin}/bomobile/`;

function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "Data não informada";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

function occurrenceNumber(item: OccurrencePreview) {
  return item.numero_ocorrencia || item.numero_temporario || "Registro sem número";
}

function occurrenceStatus(item: OccurrencePreview) {
  if (item.cancelado_em) return "Cancelada";
  if (item.status === "pending_sync") return "Pendente de sincronização";
  if (item.status === "draft") return "Rascunho";
  if (item.status === "synced") return "Sincronizada";
  return item.status ? item.status.replaceAll("_", " ") : "Em acompanhamento";
}

function notificationDestination(item: DashboardNotification) {
  const routeText = `${item.tipo ?? ""} ${item.link ?? ""}`.toLowerCase();
  const route = routeText.includes("ocorrencia") ? "ocorrencias" : "consulta";
  return `${BOMOBILE_URL}#${route}`;
}

function shortName(profile: PerfilFuncional) {
  const value = profile.apelido?.trim() || profile.nome_completo?.trim() || "Guarda Municipal";
  return value.split(/\s+/)[0];
}

function NotificationPanel({
  data,
  busy,
  error,
  onClose,
  onMarkAll,
  onToggle,
  onOpen,
}: {
  data: DashboardData | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onMarkAll: (isRead: boolean) => void;
  onToggle: (item: DashboardNotification) => void;
  onOpen: (item: DashboardNotification) => void;
}) {
  const notifications = data?.notifications ?? [];
  return (
    <section className="dashboard-notification-panel" role="dialog" aria-label="Notificações recentes">
      <div className="dashboard-notification-panel-head">
        <div>
          <p className="dashboard-eyebrow">CENTRAL DE AVISOS</p>
          <h2>Notificações</h2>
        </div>
        <button className="dashboard-icon-button" type="button" onClick={onClose} aria-label="Fechar notificações">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="dashboard-notification-tools">
        <span>{data?.unreadCount ?? 0} não lida{data?.unreadCount === 1 ? "" : "s"}</span>
        <div>
          <button type="button" onClick={() => onMarkAll(true)} disabled={busy || (data?.unreadCount ?? 0) === 0}>
            <CheckCheck size={14} aria-hidden="true" /> Todas lidas
          </button>
          <button type="button" onClick={() => onMarkAll(false)} disabled={busy || notifications.length === 0}>
            Marcar não lidas
          </button>
        </div>
      </div>

      {error && <p className="dashboard-inline-error" role="alert">{error}</p>}
      {busy && <p className="dashboard-panel-loading"><RefreshCw size={15} className="spin" /> Atualizando notificações...</p>}
      {!busy && notifications.length === 0 && (
        <div className="dashboard-empty-notifications">
          <ShieldCheck size={23} aria-hidden="true" />
          <strong>Nenhum aviso recente</strong>
          <span>Quando houver uma nova ocorrência ou abordagem, ela aparecerá aqui.</span>
        </div>
      )}
      {!busy && notifications.length > 0 && (
        <ul className="dashboard-notification-list">
          {notifications.map((item) => (
            <li key={item.id} className={item.lida ? "is-read" : "is-unread"}>
              <button className="dashboard-notification-open" type="button" onClick={() => onOpen(item)}>
                <span className="dashboard-notification-indicator" aria-hidden="true" />
                <span className="dashboard-notification-copy">
                  <strong>{item.titulo}</strong>
                  <span>{item.mensagem}</span>
                  <small>{formatDate(item.criado_em)}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              <button
                className="dashboard-notification-toggle"
                type="button"
                onClick={() => onToggle(item)}
                aria-label={item.lida ? "Marcar notificação como não lida" : "Marcar notificação como lida"}
              >
                {item.lida ? "Não lida" : "Marcar lida"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <a className="dashboard-notification-footer" href={`${BOMOBILE_URL}#notificacoes`}>
        Abrir central completa no aplicativo <ArrowRight size={15} aria-hidden="true" />
      </a>
    </section>
  );
}

function OccurrenceCard({ item }: { item: OccurrencePreview }) {
  const pending = item.status === "pending_sync";
  return (
    <li className="dashboard-record-row">
      <span className={`dashboard-record-icon ${pending ? "is-pending" : ""}`} aria-hidden="true">
        {pending ? <RefreshCw size={17} /> : <ClipboardList size={17} />}
      </span>
      <span className="dashboard-record-main">
        <strong>{item.tipo_ocorrencia || item.sub_tipo_ocorrencia || "Ocorrência registrada"}</strong>
        <span>{occurrenceNumber(item)}{item.bairro_ocorrencia ? ` · ${item.bairro_ocorrencia}` : ""}</span>
        <small><MapPin size={12} aria-hidden="true" /> {item.local_ocorrencia || "Local não informado"}</small>
      </span>
      <span className="dashboard-record-meta">
        <span className={`dashboard-status ${pending ? "is-pending" : ""}`}>{occurrenceStatus(item)}</span>
        <small>{formatDate(item.data_hora_inicio)}</small>
      </span>
    </li>
  );
}

function ApproachCard({ item }: { item: ApproachPreview }) {
  const person = item.kind === "pessoa";
  return (
    <li className="dashboard-record-row">
      <span className="dashboard-record-icon" aria-hidden="true">
        {person ? <UserRound size={17} /> : <CarFront size={17} />}
      </span>
      <span className="dashboard-record-main">
        <strong>Abordagem de {person ? "pessoa" : "veículo"}</strong>
        <span>{item.tipo_atendimento || item.tipo_abordagem || "Atendimento registrado"}</span>
        <small><MapPin size={12} aria-hidden="true" /> {item.local_abordagem || "Local não informado"}</small>
      </span>
      <span className="dashboard-record-meta">
        <small>{formatDate(item.data_hora_inicio || item.criado_em)}</small>
      </span>
    </li>
  );
}

function EmptyRecords({ children }: { children: string }) {
  return (
    <div className="dashboard-empty-records">
      <Activity size={20} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default function Dashboard({ profile, onSignOut }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const notificationRef = useRef<HTMLDivElement>(null);
  const showTeamOverview = isManagementRole(profile.perfil);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await loadDashboardData(profile.id, profile.perfil);
      setData(next);
    } catch (cause) {
      console.error("Erro ao carregar o painel do Guarda:", cause);
      setError("Não foi possível carregar seus dados agora. Verifique a conexão e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [profile.id, profile.perfil]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notificationsOpen]);

  async function markAll(isRead: boolean) {
    setActionError(null);
    setIsBusy(true);
    try {
      await setAllNotificationReadState(profile.id, isRead);
      await refresh();
    } catch (cause) {
      console.error("Erro ao atualizar todas as notificações:", cause);
      setActionError("Não foi possível atualizar as notificações. Tente novamente.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleNotification(item: DashboardNotification) {
    setActionError(null);
    setIsBusy(true);
    try {
      await setNotificationReadState(profile.id, item.id, !item.lida);
      await refresh();
    } catch (cause) {
      console.error("Erro ao atualizar notificação:", cause);
      setActionError("Não foi possível atualizar esta notificação.");
    } finally {
      setIsBusy(false);
    }
  }

  async function openNotification(item: DashboardNotification) {
    setActionError(null);
    setIsBusy(true);
    try {
      if (!item.lida) await setNotificationReadState(profile.id, item.id, true);
      window.location.assign(notificationDestination(item));
    } catch (cause) {
      console.error("Erro ao abrir notificação:", cause);
      setActionError("Não foi possível abrir o aviso. Tente novamente.");
      setIsBusy(false);
    }
  }

  const quickActions = [
    { title: "Registrar ocorrência", description: "Novo registro operacional", icon: FilePlus2, route: "nova-ocorrencia", accent: "gold" },
    { title: "Consultar ocorrências", description: "Pesquisar registros da equipe", icon: ClipboardList, route: "ocorrencias", accent: "blue" },
    { title: "Registrar abordagem", description: "Pessoa ou veículo", icon: Shield, route: "consulta", accent: "blue" },
    { title: "Consultar abordagens", description: "Acessar a consulta operacional", icon: UsersRound, route: "consulta", accent: "gold" },
  ];

  return (
    <main className="dashboard-shell dashboard-theme-blue">
      <header className="dashboard-topbar">
        <a className="dashboard-brand" href="#/inicio" aria-label="Início da Guarda Municipal">
          <span className="dashboard-brand-mark"><img src={brasaoGuarda} alt="" /></span>
          <span><strong>Guarda Municipal</strong><small>Pitangueiras — PR</small></span>
        </a>
        <div className="dashboard-topbar-actions">
          <span className={`dashboard-connection ${isOnline ? "is-online" : "is-offline"}`}>
            <i aria-hidden="true" />{isOnline ? "Conectado" : "Sem conexão"}
          </span>
          <div className="dashboard-notification-anchor" ref={notificationRef}>
            <button
              className={`dashboard-bell ${notificationsOpen ? "is-open" : ""}`}
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label={`Notificações: ${data?.unreadCount ?? 0} não lidas`}
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
            >
              <Bell size={19} aria-hidden="true" />
              {(data?.unreadCount ?? 0) > 0 && <span className="dashboard-bell-count">{(data?.unreadCount ?? 0) > 99 ? "99+" : data?.unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <NotificationPanel
                data={data}
                busy={isBusy}
                error={actionError}
                onClose={() => setNotificationsOpen(false)}
                onMarkAll={markAll}
                onToggle={toggleNotification}
                onOpen={openNotification}
              />
            )}
          </div>
          <button className="dashboard-signout" type="button" onClick={() => void onSignOut()}>
            Sair <ArrowDownRight size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">PAINEL OPERACIONAL · {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
            <h1>Bom serviço, <span>{shortName(profile)}.</span></h1>
            <p>{showTeamOverview
              ? "Visão rápida da equipe: os seis registros mais recentes em cada categoria."
              : "Este é seu espaço de acompanhamento. Aqui você vê as ocorrências das quais participou e seus avisos pessoais."}</p>
          </div>
          <div className="dashboard-profile-chip">
            <span className="dashboard-profile-avatar"><UserRound size={21} aria-hidden="true" /></span>
            <span><strong>{profile.apelido || profile.nome_completo || "Guarda Municipal"}</strong><small>{profile.matricula ? `Matrícula ${profile.matricula}` : profile.perfil || "GM"}</small></span>
          </div>
        </section>

        {data && data.pendingSyncCount > 0 && (
          <a className="dashboard-sync-alert" href={`${BOMOBILE_URL}#ocorrencias`}>
            <span className="dashboard-sync-alert-icon"><RefreshCw size={19} aria-hidden="true" /></span>
            <span><strong>{data.pendingSyncCount} registro{data.pendingSyncCount === 1 ? "" : "s"} pendente{data.pendingSyncCount === 1 ? "" : "s"} de sincronização</strong><small>Confira a situação dos registros no aplicativo operacional.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}

        <section className="dashboard-section dashboard-quick-actions" aria-labelledby="dashboard-actions-title">
          <div className="dashboard-section-heading">
            <div><p className="dashboard-eyebrow">ACESSO RÁPIDO</p><h2 id="dashboard-actions-title">O que você precisa fazer?</h2></div>
            <span className="dashboard-section-note">As telas de registro abrem no aplicativo operacional.</span>
          </div>
          <div className="dashboard-quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a className={`dashboard-quick-card accent-${action.accent}`} href={`${BOMOBILE_URL}#${action.route}`} key={action.title}>
                  <span className="dashboard-quick-icon"><Icon size={19} aria-hidden="true" /></span>
                  <span className="dashboard-quick-copy"><strong>{action.title}</strong><small>{action.description}</small></span>
                  <ArrowRight size={16} className="dashboard-quick-arrow" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="dashboard-load-error" role="alert">
            <CircleAlert size={18} aria-hidden="true" /><span>{error}</span>
            <button type="button" onClick={() => { setIsLoading(true); void refresh(); }}>Tentar novamente</button>
          </div>
        )}

        {showTeamOverview ? (
          <div className="dashboard-activity-grid dashboard-activity-grid-manager">
            <section className="dashboard-panel dashboard-panel-wide" aria-labelledby="dashboard-occurrences-title">
              <div className="dashboard-section-heading dashboard-panel-heading">
                <div><p className="dashboard-eyebrow">VISÃO DA EQUIPE</p><h2 id="dashboard-occurrences-title">Boletins de ocorrência</h2><p>Até seis dos boletins mais recentes de toda a equipe.</p></div>
                <a className="dashboard-text-link" href={`${BOMOBILE_URL}#ocorrencias`}>Ver registros <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
              {isLoading ? <div className="dashboard-loading-line"><span /> Carregando boletins...</div> : data?.occurrences.length ? (
                <ul className="dashboard-record-list">{data.occurrences.map((item) => <OccurrenceCard key={item.id} item={item} />)}</ul>
              ) : <EmptyRecords>Nenhum boletim recente para exibir.</EmptyRecords>}
            </section>

            <section className="dashboard-panel" aria-labelledby="dashboard-people-approaches-title">
              <div className="dashboard-section-heading dashboard-panel-heading">
                <div><p className="dashboard-eyebrow">VISÃO DA EQUIPE</p><h2 id="dashboard-people-approaches-title">Abordagens de pessoas</h2><p>Até seis registros mais recentes.</p></div>
                <a className="dashboard-text-link" href={`${BOMOBILE_URL}#consulta`} aria-label="Consultar abordagens de pessoas"><ArrowRight size={15} aria-hidden="true" /></a>
              </div>
              {isLoading ? <div className="dashboard-loading-line"><span /> Carregando abordagens...</div> : data?.peopleApproaches.length ? (
                <ul className="dashboard-record-list">{data.peopleApproaches.map((item) => <ApproachCard key={`pessoa-${item.id}`} item={item} />)}</ul>
              ) : <EmptyRecords>Nenhuma abordagem de pessoa recente.</EmptyRecords>}
            </section>

            <section className="dashboard-panel" aria-labelledby="dashboard-vehicle-approaches-title">
              <div className="dashboard-section-heading dashboard-panel-heading">
                <div><p className="dashboard-eyebrow">VISÃO DA EQUIPE</p><h2 id="dashboard-vehicle-approaches-title">Abordagens de veículos</h2><p>Até seis registros mais recentes.</p></div>
                <a className="dashboard-text-link" href={`${BOMOBILE_URL}#consulta`} aria-label="Consultar abordagens de veículos"><ArrowRight size={15} aria-hidden="true" /></a>
              </div>
              {isLoading ? <div className="dashboard-loading-line"><span /> Carregando abordagens...</div> : data?.vehicleApproaches.length ? (
                <ul className="dashboard-record-list">{data.vehicleApproaches.map((item) => <ApproachCard key={`veiculo-${item.id}`} item={item} />)}</ul>
              ) : <EmptyRecords>Nenhuma abordagem de veículo recente.</EmptyRecords>}
            </section>
          </div>
        ) : (
          <div className="dashboard-activity-grid">
            <section className="dashboard-panel dashboard-panel-wide" aria-labelledby="dashboard-occurrences-title">
              <div className="dashboard-section-heading dashboard-panel-heading">
                <div><p className="dashboard-eyebrow">SUA ATUAÇÃO</p><h2 id="dashboard-occurrences-title">Minhas ocorrências</h2><p>Registros criados por você ou com seu vínculo de participação.</p></div>
                <a className="dashboard-text-link" href={`${BOMOBILE_URL}#ocorrencias`}>Ver todas <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
              {isLoading ? <div className="dashboard-loading-line"><span /> Carregando seus registros...</div> : data?.occurrences.length ? (
                <ul className="dashboard-record-list">{data.occurrences.map((item) => <OccurrenceCard key={item.id} item={item} />)}</ul>
              ) : <EmptyRecords>Quando você registrar ou participar de uma ocorrência, ela aparecerá neste espaço.</EmptyRecords>}
            </section>

            <section className="dashboard-panel" aria-labelledby="dashboard-approaches-title">
              <div className="dashboard-section-heading dashboard-panel-heading">
                <div><p className="dashboard-eyebrow">CONSULTAS DE CAMPO</p><h2 id="dashboard-approaches-title">Abordagens recentes</h2><p>Atuações registradas por você ou com seu apoio.</p></div>
                <a className="dashboard-text-link" href={`${BOMOBILE_URL}#consulta`} aria-label="Consultar abordagens"><ArrowRight size={15} aria-hidden="true" /></a>
              </div>
              {isLoading ? <div className="dashboard-loading-line"><span /> Carregando abordagens...</div> : data?.approaches.length ? (
                <ul className="dashboard-record-list">{data.approaches.map((item) => <ApproachCard key={`${item.kind}-${item.id}`} item={item} />)}</ul>
              ) : <EmptyRecords>Suas abordagens recentes aparecerão aqui.</EmptyRecords>}
            </section>
          </div>
        )}

        <footer className="dashboard-footer">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{showTeamOverview
            ? "Visão da equipe · Até seis registros por categoria; notificações continuam individuais."
            : "Área individual · Suas notificações e atividades respeitam seu perfil funcional."}</span>
          <a href={`${BOMOBILE_URL}#notificacoes`}>Central de notificações</a>
        </footer>
      </div>
      <DashboardBottomNav
        profile={profile}
        onSignOut={onSignOut}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
    </main>
  );
}
