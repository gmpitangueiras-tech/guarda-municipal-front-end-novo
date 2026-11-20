import { useEffect, useState, type ReactNode } from "react";
import { Bell } from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import ProfileAvatar from "@/components/ProfileAvatar";

type ActivePage = "inicio" | "ocorrencias" | "abordagens";

type AuthenticatedAppShellProps = {
  profile: PerfilFuncional;
  activePage: ActivePage;
  unreadCount: number | null;
  onSignOut: () => Promise<void>;
  onProfileUpdated: (profile: PerfilFuncional) => void;
  children: ReactNode;
};

export default function AuthenticatedAppShell({
  profile,
  activePage,
  unreadCount,
  onSignOut,
  onProfileUpdated,
  children,
}: AuthenticatedAppShellProps) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

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

  function openNotifications() {
    const currentPath = window.location.hash.split("?")[0];
    if (currentPath === "#/inicio" || currentPath === "#/painel") {
      window.dispatchEvent(new Event("gm:open-notifications"));
    } else {
      window.location.hash = "#/inicio?abrir=notificacoes";
    }
  }

  const notificationLabel = unreadCount === null
    ? "Abrir notificações"
    : `Notificações: ${unreadCount} não lidas`;

  return (
    <div className="dashboard-shell dashboard-theme-blue authenticated-app-shell">
      <header className="dashboard-topbar">
        <a className="dashboard-brand" href="#/inicio" aria-label="Início da Guarda Municipal">
          <span className="dashboard-brand-mark"><img src={brasaoGuarda} alt="" /></span>
          <span><strong>Guarda Municipal</strong><small>Pitangueiras — PR</small></span>
        </a>
        <div className="dashboard-topbar-actions">
          <button
            className="dashboard-bell"
            type="button"
            onClick={openNotifications}
            aria-label={notificationLabel}
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount !== null && unreadCount > 0 ? (
              <span className="dashboard-bell-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>
          <div className="dashboard-user-presence" role="status" aria-label={`Modo ${isOnline ? "online" : "offline"}`}>
            <span className={`dashboard-user-avatar-wrap ${isOnline ? "is-online" : "is-offline"}`}>
              <ProfileAvatar className="dashboard-user-avatar" photoUrl={profile.foto_url} name={profile.apelido || profile.nome_completo} />
              <i className="dashboard-user-presence-dot" aria-hidden="true" />
            </span>
            <span className="dashboard-user-presence-label">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </header>

      {children}

      <DashboardBottomNav
        profile={profile}
        activePage={activePage}
        onSignOut={onSignOut}
        onOpenNotifications={openNotifications}
        onProfileUpdated={onProfileUpdated}
      />
    </div>
  );
}
