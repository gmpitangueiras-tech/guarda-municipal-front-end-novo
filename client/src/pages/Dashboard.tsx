import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  CircleAlert,
  ClipboardList,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import DashboardActivity from "@/components/DashboardActivity";
import NotificationCenter from "@/components/NotificationCenter";
import { supabase } from "@/lib/supabase";
import {
  isManagementRole,
  loadDashboardData,
  setAllNotificationReadState,
  setNotificationReadState,
  type DashboardData,
  type DashboardNotification,
} from "@/lib/dashboard";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";
import ProfileAvatar from "@/components/ProfileAvatar";

type DashboardProps = {
  profile: PerfilFuncional;
  onSignOut: () => Promise<void>;
  onProfileUpdated: (profile: PerfilFuncional) => void;
};

const BOMOBILE_URL = `${window.location.origin}/bomobile/`;

function notificationDestination(item: DashboardNotification) {
  const routeText = `${item.tipo ?? ""} ${item.link ?? ""}`.toLowerCase();
  const route = routeText.includes("ocorrencia") ? "ocorrencias" : "consulta";
  return route === "ocorrencias" ? "#/ocorrencias" : `${BOMOBILE_URL}#${route}`;
}

function shortName(profile: PerfilFuncional) {
  const value = profile.apelido?.trim() || profile.nome_completo?.trim() || "Guarda Municipal";
  return value.split(/\s+/)[0];
}

export default function Dashboard({ profile, onSignOut, onProfileUpdated }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const hasLoadedRef = useRef(false);
  const showTeamOverview = isManagementRole(profile.perfil);

  const refresh = useCallback(async () => {
    setError(null);
    if (hasLoadedRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const next = await loadDashboardData(profile.id, profile.perfil);
      setData(next);
      hasLoadedRef.current = true;
    } catch (cause) {
      console.error("Erro ao carregar o painel do Guarda:", cause);
      setError("Não foi possível carregar seus dados agora. Verifique a conexão e tente novamente.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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

  function openNotifications() {
    setActionError(null);
    setNotificationsOpen(true);
    void refresh();
  }

  const quickActions = [
    { title: "Consultar ocorrências", description: "Abrir a consulta operacional", icon: ClipboardList, route: "ocorrencias" },
    { title: "Consultar abordagens", description: "Pessoas e veículos", icon: Shield, route: "consulta" },
  ];

  return (
    <main className="dashboard-shell dashboard-theme-blue">
      <header className="dashboard-topbar">
        <a className="dashboard-brand" href="#/inicio" aria-label="Início da Guarda Municipal">
          <span className="dashboard-brand-mark"><img src={brasaoGuarda} alt="" /></span>
          <span><strong>Guarda Municipal</strong><small>Pitangueiras — PR</small></span>
        </a>
        <div className="dashboard-topbar-actions">
          <div className="dashboard-notification-anchor">
            <button
              className={`dashboard-bell ${notificationsOpen ? "is-open" : ""}`}
              type="button"
              onClick={() => (notificationsOpen ? setNotificationsOpen(false) : openNotifications())}
              aria-label={`Notificações: ${data?.unreadCount ?? 0} não lidas`}
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
            >
              <Bell size={19} aria-hidden="true" />
              {(data?.unreadCount ?? 0) > 0 && <span className="dashboard-bell-count">{(data?.unreadCount ?? 0) > 99 ? "99+" : data?.unreadCount}</span>}
            </button>
          </div>
          <div className="dashboard-user-presence" role="status" aria-label={`Modo ${isOnline ? "online" : "offline"}`}>
            <span className={`dashboard-user-avatar-wrap ${isOnline ? "is-online" : "is-offline"}`}>
              <ProfileAvatar className="dashboard-user-avatar" photoUrl={profile.foto_url} name={profile.apelido || profile.nome_completo} />
              <i className="dashboard-user-presence-dot" aria-hidden="true" />
            </span>
            <span className="dashboard-user-presence-label">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </header>

      {notificationsOpen && (
        <NotificationCenter
          data={data}
          loading={isLoading || isRefreshing}
          busy={isBusy}
          error={actionError}
          onClose={() => setNotificationsOpen(false)}
          onRefresh={() => void refresh()}
          onMarkAll={markAll}
          onToggle={toggleNotification}
          onOpen={openNotification}
        />
      )}

      <div className="dashboard-content">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">{showTeamOverview ? "PAINEL DA EQUIPE" : "PAINEL INDIVIDUAL"} · {new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</p>
            <h1>Bom serviço, <span>{shortName(profile)}.</span></h1>
            <p>{showTeamOverview
              ? "Acompanhe os registros mais recentes de toda a equipe."
              : "Acompanhe suas ocorrências, abordagens e avisos pessoais."}</p>
          </div>
        </section>

        {isLoading && !data && !error && (
          <div className="dashboard-sync-checking" role="status" aria-live="polite">
            <RefreshCw size={15} className="spin" aria-hidden="true" /> Verificando registros pendentes de sincronização…
          </div>
        )}
        {data && data.pendingSyncCount > 0 && (
          <a className="dashboard-sync-alert" href="#/ocorrencias" aria-label={`${data.pendingSyncCount} registros pendentes de sincronização. Abrir ocorrências`}>
            <span className="dashboard-sync-alert-icon"><RefreshCw size={19} aria-hidden="true" /></span>
            <span><strong>{data.pendingSyncCount} registro{data.pendingSyncCount === 1 ? "" : "s"} pendente{data.pendingSyncCount === 1 ? "" : "s"} de sincronização</strong><small>Confira a situação dos registros no aplicativo operacional.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}

        <section className="dashboard-section dashboard-quick-actions" aria-labelledby="dashboard-actions-title">
          <div className="dashboard-section-heading">
            <div><p className="dashboard-eyebrow">CONSULTA RÁPIDA</p><h2 id="dashboard-actions-title">Acesse seus registros</h2></div>
            <span className="dashboard-section-note">Para criar, use “Novo registro” no menu inferior.</span>
          </div>
          <div className="dashboard-quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a className="dashboard-quick-card" href={action.route === "ocorrencias" ? "#/ocorrencias" : `${BOMOBILE_URL}#${action.route}`} key={action.title}>
                  <span className="dashboard-quick-icon"><Icon size={19} aria-hidden="true" /></span>
                  <span className="dashboard-quick-copy"><strong>{action.title}</strong><small>{action.description}</small></span>
                  <ArrowRight size={16} className="dashboard-quick-arrow" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        {error && data && (
          <div className="dashboard-load-error" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{error} Os dados anteriores continuam visíveis.</span>
            <button type="button" onClick={() => void refresh()}>Tentar novamente</button>
          </div>
        )}

        <DashboardActivity
          profileRole={profile.perfil}
          data={data}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          onRefresh={() => void refresh()}
        />

        <footer className="dashboard-footer">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{showTeamOverview
            ? "Visão da equipe · Até seis registros de qualquer período em cada categoria; notificações continuam individuais."
            : "Área individual · Até seis ocorrências e abordagens criadas por você ou com sua participação."}</span>
          <a href={`${BOMOBILE_URL}#notificacoes`}>Central de notificações</a>
        </footer>
      </div>
      <DashboardBottomNav
        profile={profile}
        onSignOut={onSignOut}
        onOpenNotifications={openNotifications}
        onProfileUpdated={onProfileUpdated}
      />
    </main>
  );
}
