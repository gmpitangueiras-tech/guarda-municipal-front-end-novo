import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  CircleAlert,
  ClipboardList,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import DashboardActivity from "@/components/DashboardActivity";
import { supabase, supabaseUrl } from "@/lib/supabase";
import {
  isManagementRole,
  loadDashboardData,
  setAllNotificationReadState,
  setNotificationReadState,
  type DashboardData,
  type DashboardNotification,
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

function notificationDestination(item: DashboardNotification) {
  const routeText = `${item.tipo ?? ""} ${item.link ?? ""}`.toLowerCase();
  const route = routeText.includes("ocorrencia") ? "ocorrencias" : "consulta";
  return `${BOMOBILE_URL}#${route}`;
}

function shortName(profile: PerfilFuncional) {
  const value = profile.apelido?.trim() || profile.nome_completo?.trim() || "Guarda Municipal";
  return value.split(/\s+/)[0];
}

function profilePhotoPath(value: string | null) {
  if (!value || !supabaseUrl) return null;
  try {
    const photoUrl = new URL(value);
    if (photoUrl.origin !== new URL(supabaseUrl).origin) return null;
    const match = photoUrl.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/gm-avatars\/(.+)$/i);
    if (!match) return null;
    const segments = match[1].split("/").map((part) => decodeURIComponent(part));
    if (segments.length < 1 || segments.some((part) => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\") || part.includes("\0"))) return null;
    return segments.join("/");
  } catch {
    return null;
  }
}

function ProfileAvatar({ photoUrl }: { photoUrl: string | null }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const activeImageUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    const path = profilePhotoPath(photoUrl);
    if (!supabase || !path) return () => { cancelled = true; };

    void supabase.storage.from("gm-avatars").download(path).then(({ data, error }) => {
      if (error || !data) return;
      const localUrl = URL.createObjectURL(data);
      if (cancelled) {
        URL.revokeObjectURL(localUrl);
        return;
      }
      activeImageUrl.current = localUrl;
      setImageUrl(localUrl);
    }).catch(() => {
      // Se a imagem não estiver disponível, o avatar permanece com o ícone institucional.
    });

    return () => {
      cancelled = true;
      if (activeImageUrl.current) URL.revokeObjectURL(activeImageUrl.current);
      activeImageUrl.current = null;
    };
  }, [photoUrl]);

  return (
    <span className="dashboard-user-avatar" aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" /> : <UserRound size={19} />}
    </span>
  );
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

export default function Dashboard({ profile, onSignOut }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const notificationRef = useRef<HTMLDivElement>(null);
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
          <div className="dashboard-user-presence" role="status" aria-label={`Modo ${isOnline ? "online" : "offline"}`}>
            <span className={`dashboard-user-avatar-wrap ${isOnline ? "is-online" : "is-offline"}`}>
              <ProfileAvatar photoUrl={profile.foto_url} />
              <i className="dashboard-user-presence-dot" aria-hidden="true" />
            </span>
            <span className="dashboard-user-presence-label">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </header>

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
          <a className="dashboard-sync-alert" href={`${BOMOBILE_URL}#ocorrencias`} aria-label={`${data.pendingSyncCount} registros pendentes de sincronização. Abrir ocorrências`}>
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
                <a className="dashboard-quick-card" href={`${BOMOBILE_URL}#${action.route}`} key={action.title}>
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
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
    </main>
  );
}
