import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { DashboardData, DashboardNotification } from "@/lib/dashboard";

type NotificationFilter = "all" | "unread" | "operational" | "system";
type NotificationPriority = "urgent" | "attention" | "informative";

type NotificationCenterProps = {
  data: DashboardData | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onMarkAll: (isRead: boolean) => void;
  onToggle: (item: DashboardNotification) => void;
  onOpen: (item: DashboardNotification) => void;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Data não informada";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function timestamp(value: string | null) {
  if (!value) return 0;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function groupLabel(value: string | null) {
  if (!value) return "Anteriores";
  const date = new Date(timestamp(value));
  if (Number.isNaN(date.getTime())) return "Anteriores";
  const difference = Math.round((dayStart(new Date()) - dayStart(date)) / 86400000);
  if (difference === 0) return "Hoje";
  if (difference === 1) return "Ontem";
  if (difference >= 2 && difference <= 6) return "Esta semana";
  return "Anteriores";
}

function notificationKind(item: DashboardNotification) {
  const type = `${item.tipo ?? ""} ${item.link ?? ""}`.toLowerCase();
  if (type.includes("retificacao_rejeitada")) return { label: "Retificação rejeitada", tone: "danger", priority: "urgent" as NotificationPriority, Icon: CircleAlert };
  if (type.includes("retificacao_pendente")) return { label: "Retificação pendente", tone: "warning", priority: "attention" as NotificationPriority, Icon: ClipboardList };
  if (type.includes("sincron")) return { label: "Sincronização", tone: "warning", priority: "attention" as NotificationPriority, Icon: RefreshCw };
  if (type.includes("retificacao_aprovada")) return { label: "Retificação aprovada", tone: "success", priority: "informative" as NotificationPriority, Icon: CheckCheck };
  if (type.includes("ocorrencia")) return { label: "Ocorrência", tone: "operational", priority: "informative" as NotificationPriority, Icon: ClipboardList };
  if (type.includes("sistema")) return { label: "Aviso do sistema", tone: "system", priority: "informative" as NotificationPriority, Icon: ShieldCheck };
  return { label: "Aviso", tone: "system", priority: "informative" as NotificationPriority, Icon: Bell };
}

function isOperational(item: DashboardNotification) {
  return notificationKind(item).tone !== "system";
}

function filterItems(items: DashboardNotification[], filter: NotificationFilter) {
  return items
    .filter((item) => {
      if (filter === "unread") return item.lida !== true;
      if (filter === "operational") return isOperational(item);
      if (filter === "system") return !isOperational(item);
      return true;
    })
    .sort((a, b) => timestamp(b.criado_em) - timestamp(a.criado_em));
}

export default function NotificationCenter({
  data,
  loading,
  busy,
  error,
  onClose,
  onRefresh,
  onMarkAll,
  onToggle,
  onOpen,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? notifications.filter((item) => item.lida !== true).length;
  const operationalCount = notifications.filter(isOperational).length;
  const systemCount = notifications.length - operationalCount;
  const visibleItems = useMemo(() => filterItems(notifications, filter), [notifications, filter]);
  const grouped = useMemo(() => {
    const groups = new Map<string, DashboardNotification[]>();
    for (const item of visibleItems) {
      const label = groupLabel(item.criado_em);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    }
    return ["Hoje", "Ontem", "Esta semana", "Anteriores"]
      .filter((label) => groups.has(label))
      .map((label) => ({ label, items: groups.get(label) ?? [] }));
  }, [visibleItems]);

  return (
    <div className="notification-center-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="notification-center" role="dialog" aria-modal="true" aria-labelledby="notification-center-title">
        <div className="notification-center-topbar">
          <div className="notification-center-heading">
            <span className="notification-center-mark"><Bell size={17} aria-hidden="true" /></span>
            <div>
              <p className="dashboard-eyebrow">CENTRAL DE AVISOS</p>
              <h2 id="notification-center-title">Notificações</h2>
              <span>{unreadCount === 0 ? "Tudo em dia" : `${unreadCount} ${unreadCount === 1 ? "aviso pendente" : "avisos pendentes"}`}</span>
            </div>
          </div>
          <div className="notification-center-actions">
            <button type="button" onClick={onRefresh} disabled={loading || busy} aria-label="Atualizar notificações"><RefreshCw size={16} className={loading ? "spin" : ""} aria-hidden="true" /></button>
            <button type="button" onClick={onClose} aria-label="Fechar notificações"><X size={18} aria-hidden="true" /></button>
          </div>
        </div>

        <div className="notification-center-toolbar">
          <div className="notification-center-summary" aria-label="Resumo das notificações">
            <div><strong>{unreadCount}</strong><span>não lidas</span></div>
            <div><strong>{operationalCount}</strong><span>operacionais</span></div>
            <div><strong>{systemCount}</strong><span>do sistema</span></div>
          </div>
          <div className="notification-center-filters" role="tablist" aria-label="Filtrar notificações">
            {([
              ["all", "Todas", notifications.length],
              ["unread", "Pendentes", unreadCount],
              ["operational", "Operacionais", operationalCount],
              ["system", "Sistema", systemCount],
            ] as const).map(([value, label, count]) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>
                <span>{label}</span><small>{count}</small>
              </button>
            ))}
          </div>
          <button className="notification-center-mark-all" type="button" onClick={() => onMarkAll(true)} disabled={busy || unreadCount === 0}>
            <CheckCheck size={14} aria-hidden="true" /> Marcar todas como lidas
          </button>
        </div>

        {error && <div className="notification-center-error" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{error}</span><button type="button" onClick={onRefresh}>Tentar novamente</button></div>}
        {loading && <div className="notification-center-loading" role="status"><RefreshCw size={17} className="spin" aria-hidden="true" /> Atualizando seus avisos…</div>}

        {!loading && visibleItems.length === 0 && (
          <div className="notification-center-empty">
            <span><ShieldCheck size={28} aria-hidden="true" /></span>
            <strong>{filter === "unread" ? "Nenhum aviso pendente" : "Tudo em dia"}</strong>
            <p>{filter === "all" ? "Não existem notificações pendentes para sua revisão." : "Não há avisos nesta categoria no momento."}</p>
            {filter !== "all" && <button type="button" onClick={() => setFilter("all")}><SlidersHorizontal size={14} aria-hidden="true" /> Ver todas</button>}
          </div>
        )}

        {visibleItems.length > 0 && (
          <div className="notification-center-list">
            {grouped.map((group) => (
              <section key={group.label} className="notification-center-group" aria-labelledby={`notification-group-${group.label}`}>
                <h3 id={`notification-group-${group.label}`}>{group.label}<span>{group.items.length}</span></h3>
                <div className="notification-center-items">
                  {group.items.map((item) => {
                    const kind = notificationKind(item);
                    const Icon = kind.Icon;
                    return (
                      <article key={item.id} className={`notification-center-item ${item.lida ? "is-read" : "is-unread"} is-priority-${kind.priority}`}>
                        <button className="notification-center-item-open" type="button" onClick={() => onOpen(item)}>
                          <span className={`notification-center-item-icon is-${kind.tone}`}><Icon size={16} aria-hidden="true" /></span>
                          <span className="notification-center-item-copy">
                            <span className="notification-center-item-meta"><span className="notification-center-item-kind">{!item.lida && <i className="notification-center-unread-dot" aria-label="Não lida" />}{kind.label}</span><time>{formatDate(item.criado_em)}</time></span>
                            <b>{item.titulo}</b>
                            <span>{item.mensagem}</span>
                            <em>Ver detalhes <ArrowRight size={12} aria-hidden="true" /></em>
                          </span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                        {item.lida ? <span className="notification-center-read-state"><Check size={12} aria-hidden="true" /> Lida</span> : <button className="notification-center-item-toggle" type="button" onClick={() => onToggle(item)} disabled={busy} aria-label="Marcar notificação como lida"><Check size={12} aria-hidden="true" /> Lida</button>}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
