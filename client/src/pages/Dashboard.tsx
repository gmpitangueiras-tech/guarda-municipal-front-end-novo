import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import DashboardActivity from "@/components/DashboardActivity";
import NotificationCenter from "@/components/NotificationCenter";
import {
  loadDashboardData,
  setAllNotificationReadState,
  setNotificationReadState,
  type DashboardData,
  type DashboardNotification,
} from "@/lib/dashboard";

type DashboardProps = {
  profile: PerfilFuncional;
  onUnreadCountChange: (count: number) => void;
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

export default function Dashboard({ profile, onUnreadCountChange }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const hasLoadedRef = useRef(false);

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
    if (data) onUnreadCountChange(data.unreadCount);
  }, [data, onUnreadCountChange]);

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

  const openNotifications = useCallback(() => {
    setActionError(null);
    setNotificationsOpen(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleOpenRequest = () => openNotifications();
    const handleHashChange = () => {
      const query = window.location.hash.split("?")[1] ?? "";
      if (new URLSearchParams(query).get("abrir") !== "notificacoes") return;
      openNotifications();
      window.history.replaceState(null, "", `${window.location.pathname}#/inicio`);
    };
    window.addEventListener("gm:open-notifications", handleOpenRequest);
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => {
      window.removeEventListener("gm:open-notifications", handleOpenRequest);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [openNotifications]);

  return (
    <>
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

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</p>
            <h1>Bom serviço, <span>{shortName(profile)}.</span></h1>
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
      </main>
    </>
  );
}
