import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  FilePlus2,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import PrivateRecordThumbnail from "@/components/PrivateRecordThumbnail";
import type { PerfilFuncional } from "@/lib/auth";
import { isManagementRole } from "@/lib/dashboard";
import {
  EMPTY_OCCURRENCE_FILTERS,
  EMPTY_OCCURRENCE_SUMMARY,
  loadOfficerOptions,
  loadOccurrencePage,
  type OccurrenceFilters,
  type OccurrenceListItem,
  type OccurrenceSummary,
  type QuickOccurrenceFilter,
} from "@/lib/occurrences";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

const LEGACY_OPERATIONAL_URL = `${window.location.origin}/bomobile/`;

const QUICK_FILTERS: Array<{ id: QuickOccurrenceFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "mine", label: "Minhas" },
  { id: "pending", label: "Pendentes" },
  { id: "finalized", label: "Finalizadas" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "pending_sync", label: "Pendente de sincronização" },
  { value: "synced", label: "Sincronizada" },
  { value: "pending_rectification", label: "Retificação pendente" },
  { value: "rectified", label: "Retificada" },
  { value: "rectification_rejected", label: "Retificação rejeitada" },
  { value: "cancelled", label: "Cancelada" },
];

function dateLabel(value: string | null) {
  if (!value) return "Data não informada";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function typeLabel(value: string | null) {
  const source = value?.trim().replaceAll("_", " ").replace(/\s+/g, " ");
  if (!source) return "Ocorrência registrada";
  const lower = source.toLocaleLowerCase("pt-BR");
  const particles = new Set(["a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "para", "por"]);
  return lower.split(" ").map((word, index) => {
    if (index > 0 && particles.has(word)) return word;
    return word.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
  }).join(" ");
}

function locationLabel(item: OccurrenceListItem) {
  const pieces = [item.local_ocorrencia?.trim(), item.bairro_ocorrencia?.trim()].filter(Boolean);
  return pieces.length ? pieces.join(" · ") : "Local não informado";
}

function numberLabel(item: OccurrenceListItem) {
  const official = item.numero_ocorrencia?.trim() || item.numero_bo?.trim();
  if (official) return `BO ${official}`;
  const temporary = item.numero_temporario?.trim();
  return temporary ? `Temporário ${temporary}` : "Número em processamento";
}

function statusLabel(item: OccurrenceListItem) {
  const status = (item.status ?? "").trim().toLowerCase();
  if (item.data_hora_finalizacao && status === "synced") return "Finalizada";
  const labels: Record<string, string> = {
    draft: "Rascunho",
    pending_sync: "Pendente de sincronização",
    synced: "Sincronizada",
    cancelled: "Cancelada",
    rectified: "Retificada",
    pending_rectification: "Retificação pendente",
    rectification_rejected: "Retificação rejeitada",
  };
  return labels[status] ?? "Em acompanhamento";
}

function statusTone(item: OccurrenceListItem) {
  const status = (item.status ?? "").trim().toLowerCase();
  if (status === "draft") return "is-draft";
  if (status === "pending_sync" || status === "pending_rectification") return "is-pending";
  if (status === "cancelled" || status === "rectification_rejected") return "is-danger";
  if (status === "rectified" || item.data_hora_finalizacao) return "is-complete";
  return "is-active";
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`occurrence-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString("pt-BR")}</strong>
    </div>
  );
}

function OccurrenceCard({ item, onOpen }: { item: OccurrenceListItem; onOpen: (item: OccurrenceListItem) => void }) {
  const type = typeLabel(item.tipo_ocorrencia || item.sub_tipo_ocorrencia);
  const location = locationLabel(item);
  const date = item.data_hora_inicio || item.criado_em;
  return (
    <li className="occurrence-list-item">
      <button
        className="occurrence-card"
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`Ver detalhes: ${type}, ${numberLabel(item)}`}
      >
        <span className="occurrence-card-art">
          <PrivateRecordThumbnail
            photo={item.photo}
            fallback={<ClipboardList size={22} aria-hidden="true" />}
          />
        </span>
        <span className="occurrence-card-copy">
          <span className="occurrence-card-heading">
            <strong>{type}</strong>
            <span className={`occurrence-status ${statusTone(item)}`}>{statusLabel(item)}</span>
          </span>
          <span className="occurrence-card-number">{numberLabel(item)}</span>
          <span className="occurrence-card-location" title={location}><MapPin size={13} aria-hidden="true" />{location}</span>
          <span className="occurrence-card-meta">
            <time dateTime={date ?? undefined}><CalendarDays size={12} aria-hidden="true" />{dateLabel(date)}</time>
            <span className="occurrence-severity">{item.gravidade?.trim() ? `Gravidade ${typeLabel(item.gravidade)}` : "Gravidade não informada"}</span>
          </span>
          <span className="occurrence-card-team">
            <span><UserRound size={12} aria-hidden="true" />{item.creatorName ?? "GM sem apelido cadastrado"}</span>
            <span><UsersRound size={12} aria-hidden="true" />{item.supportName ?? (item.supportAssigned ? "GM de apoio sem apelido" : "Apoio não informado")}</span>
          </span>
          {item.status === "pending_sync" && (
            <span className="occurrence-sync-note">
              <RefreshCw size={12} aria-hidden="true" />
              Pendente de sincronização
              {item.sync_attempts > 0 && <small>{item.sync_attempts} tentativa{item.sync_attempts === 1 ? "" : "s"}</small>}
            </span>
          )}
          {item.hasRectification && <span className="occurrence-rectification"><ShieldCheck size={12} aria-hidden="true" />Registro com retificação</span>}
        </span>
        <span className="occurrence-card-open">Ver detalhes <ArrowRight size={15} aria-hidden="true" /></span>
      </button>
    </li>
  );
}

function OccurrenceDetail({ item, onClose }: { item: OccurrenceListItem; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButton.current?.focus());
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        : [];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusOutside = !dialog?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusOutside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose]);

  const fields = [
    { label: "Número", value: numberLabel(item) },
    { label: "Status", value: statusLabel(item) },
    { label: "Data e hora", value: dateLabel(item.data_hora_inicio || item.criado_em) },
    { label: "Local", value: locationLabel(item) },
    { label: "Gravidade", value: item.gravidade?.trim() ? typeLabel(item.gravidade) : "Não informada" },
    { label: "GM responsável", value: item.creatorName ?? "GM sem apelido cadastrado" },
    { label: "GM de apoio", value: item.supportName ?? (item.supportAssigned ? "GM de apoio sem apelido" : "Apoio não informado") },
  ];

  return (
    <div className="occurrence-detail-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="occurrence-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="occurrence-detail-title" tabIndex={-1}>
        <div className="occurrence-detail-topline">
          <span className="occurrence-detail-mark"><ClipboardList size={19} aria-hidden="true" /></span>
          <button ref={closeButton} type="button" className="occurrence-detail-close" onClick={onClose} aria-label="Fechar detalhes"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="dashboard-eyebrow">RESUMO OPERACIONAL</p>
        <h2 id="occurrence-detail-title">{typeLabel(item.tipo_ocorrencia || item.sub_tipo_ocorrencia)}</h2>
        <span className={`occurrence-status ${statusTone(item)}`}>{statusLabel(item)}</span>
        <dl className="occurrence-detail-fields">
          {fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
        </dl>
        <p className="occurrence-detail-privacy"><ShieldCheck size={15} aria-hidden="true" />Dados pessoais de envolvidos e evidências detalhadas permanecem fora desta lista protegida e não são exibidos nesta etapa.</p>
      </section>
    </div>
  );
}

export default function Occurrences({ profile }: { profile: PerfilFuncional }) {
  const manager = isManagementRole(profile.perfil);
  const [quickFilter, setQuickFilter] = useState<QuickOccurrenceFilter>(manager ? "all" : "mine");
  const [filters, setFilters] = useState<OccurrenceFilters>(EMPTY_OCCURRENCE_FILTERS);
  const [draftFilters, setDraftFilters] = useState<OccurrenceFilters>(EMPTY_OCCURRENCE_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [officers, setOfficers] = useState<Array<{ id: string; label: string }>>([]);
  const [items, setItems] = useState<OccurrenceListItem[]>([]);
  const [summary, setSummary] = useState<OccurrenceSummary>(EMPTY_OCCURRENCE_SUMMARY);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [selectedItem, setSelectedItem] = useState<OccurrenceListItem | null>(null);
  const requestId = useRef(0);
  const itemsRef = useRef<OccurrenceListItem[]>([]);

  const load = useCallback(async (page: number, append: boolean, filterChanged = false) => {
    const request = ++requestId.current;
    setError(null);
    if (append) setIsLoadingMore(true);
    else {
      setIsLoadingMore(false);
      if (filterChanged || itemsRef.current.length === 0) setIsLoading(true);
      else setIsRefreshing(true);
    }

    try {
      const result = await loadOccurrencePage({
        profileId: profile.id,
        profileRole: profile.perfil,
        quickFilter,
        filters,
        page,
        includeSummary: !append,
      });
      if (request !== requestId.current) return;
      const nextItems = append
        ? [...itemsRef.current, ...result.items.filter((item) => !itemsRef.current.some((current) => current.id === item.id))]
        : result.items;
      itemsRef.current = nextItems;
      setItems(nextItems);
      setCurrentPage(page);
      setTotalCount(result.totalCount);
      if (!append) setSummary(result.summary);
    } catch (cause) {
      if (request !== requestId.current) return;
      console.error("Erro ao carregar ocorrências:", cause);
      setError("Não foi possível carregar as ocorrências. Confira a conexão e tente novamente.");
    } finally {
      if (request === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  }, [filters, profile.id, profile.perfil, quickFilter]);

  useEffect(() => {
    itemsRef.current = [];
    setItems([]);
    setTotalCount(0);
    setCurrentPage(0);
    void load(0, false, true);
    return () => { requestId.current += 1; };
  }, [load]);

  useEffect(() => {
    if (!manager) return;
    void loadOfficerOptions().then(setOfficers);
  }, [manager]);

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

  const hasMore = items.length < totalCount;
  const closeSelectedItem = useCallback(() => setSelectedItem(null), []);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ ...draftFilters });
    setShowAdvanced(false);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_OCCURRENCE_FILTERS);
    setFilters(EMPTY_OCCURRENCE_FILTERS);
  }

  function loadMore() {
    const nextPage = currentPage + 1;
    void load(nextPage, true);
  }

  function goBack() {
    window.location.hash = "#/inicio";
  }

  return (
    <main className="occurrences-shell">
      <header className="occurrences-topbar">
        <button className="occurrences-back" type="button" onClick={goBack} aria-label="Voltar ao painel"><ArrowLeft size={18} aria-hidden="true" /><span>Painel</span></button>
        <a className="occurrences-brand" href="#/inicio" aria-label="Guarda Municipal de Pitangueiras, início">
          <img src={brasaoGuarda} alt="" />
          <span><strong>Guarda Municipal</strong><small>Pitangueiras · PR</small></span>
        </a>
        <div className={`occurrences-connectivity ${isOnline ? "is-online" : "is-offline"}`} role="status" aria-label={isOnline ? "Você está online" : "Você está offline"}>
          {isOnline ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
      </header>

      <div className="occurrences-content">
        <section className="occurrences-hero" aria-labelledby="occurrences-title">
          <div className="occurrences-hero-copy">
            <p className="dashboard-eyebrow">{manager ? "CENTRAL DA EQUIPE" : "SUA ATUAÇÃO"} · REGISTROS OPERACIONAIS</p>
            <h1 id="occurrences-title">Ocorrências</h1>
            <p>{manager ? "Acompanhe os registros da equipe e identifique o que precisa de atenção." : "Consulte suas ocorrências e acompanhe a situação dos registros."}</p>
          </div>
          <div className="occurrences-hero-actions">
            <span className="occurrences-total"><strong>{totalCount.toLocaleString("pt-BR")}</strong> {totalCount === 1 ? "registro visível" : "registros visíveis"}</span>
            <button className="occurrences-refresh" type="button" onClick={() => void load(0, false)} disabled={isLoading || isRefreshing}>
              <RefreshCw size={15} className={isRefreshing ? "spin" : ""} aria-hidden="true" />
              <span>{isRefreshing ? "Atualizando…" : "Atualizar"}</span>
            </button>
            <a className="occurrences-create" href={`${LEGACY_OPERATIONAL_URL}#nova-ocorrencia`}>
              <FilePlus2 size={17} aria-hidden="true" /><span>Nova ocorrência</span>
            </a>
          </div>
        </section>

        {!isOnline && (
          <div className="occurrences-offline-banner" role="status"><WifiOff size={15} aria-hidden="true" /><span>Sem conexão. Os dados já carregados permanecem visíveis; novos registros continuam no fluxo operacional existente.</span></div>
        )}

        <section className="occurrences-summary" aria-label="Resumo de ocorrências">
          <StatCard label="Rascunhos" value={summary.drafts} tone="is-draft" />
          <StatCard label="Pendentes" value={summary.pending} tone="is-pending" />
          <StatCard label="Em andamento" value={summary.inProgress} tone="is-progress" />
          <StatCard label="Finalizadas" value={summary.finalized} tone="is-finalized" />
        </section>

        <section className="occurrences-workspace" aria-label="Lista e filtros de ocorrências">
          <div className="occurrences-toolbar">
            <div className="occurrences-filter-tabs" role="group" aria-label="Filtrar ocorrências">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={quickFilter === filter.id}
                  className={quickFilter === filter.id ? "is-active" : ""}
                  onClick={() => setQuickFilter(filter.id)}
                >{filter.label}</button>
              ))}
            </div>
            <div className="occurrences-toolbar-actions">
              <button className={`occurrences-advanced-toggle ${showAdvanced ? "is-open" : ""}`} type="button" onClick={() => setShowAdvanced((value) => !value)} aria-expanded={showAdvanced} aria-controls="occurrences-advanced-panel">
                <SlidersHorizontal size={15} aria-hidden="true" /><span>Filtros</span><ChevronDown size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {showAdvanced && (
            <form id="occurrences-advanced-panel" className="occurrences-advanced-panel" onSubmit={applyFilters}>
              <label className="occurrences-search-field">
                <span>Buscar</span>
                <span className="occurrences-input-wrap"><Search size={15} aria-hidden="true" /><input type="search" value={draftFilters.search} onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })} placeholder="Tipo, número ou local" /></span>
              </label>
              <label><span>Período inicial</span><input type="date" value={draftFilters.from} onChange={(event) => setDraftFilters({ ...draftFilters, from: event.target.value })} /></label>
              <label><span>Período final</span><input type="date" value={draftFilters.to} onChange={(event) => setDraftFilters({ ...draftFilters, to: event.target.value })} /></label>
              <label><span>Status</span><select value={draftFilters.status} onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })}><option value="">Todos os status</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span>Gravidade</span><select value={draftFilters.severity} onChange={(event) => setDraftFilters({ ...draftFilters, severity: event.target.value })}><option value="">Todas</option><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option></select></label>
              <label><span>Tipo de ocorrência</span><input value={draftFilters.type} onChange={(event) => setDraftFilters({ ...draftFilters, type: event.target.value })} placeholder="Ex.: furto" /></label>
              <label><span>Local</span><input value={draftFilters.locality} onChange={(event) => setDraftFilters({ ...draftFilters, locality: event.target.value })} placeholder="Rua, bairro ou referência" /></label>
              {manager && <label><span>GM responsável</span><select value={draftFilters.responsibleId} onChange={(event) => setDraftFilters({ ...draftFilters, responsibleId: event.target.value })}><option value="">Todos os GMs</option>{officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.label}</option>)}</select></label>}
              <div className="occurrences-filter-checks">
                <label><input type="checkbox" checked={draftFilters.rectificationsOnly} onChange={(event) => setDraftFilters({ ...draftFilters, rectificationsOnly: event.target.checked })} /><span>Com retificação</span></label>
                <label><input type="checkbox" checked={draftFilters.pendingSyncOnly} onChange={(event) => setDraftFilters({ ...draftFilters, pendingSyncOnly: event.target.checked })} /><span>Pendente de sincronização</span></label>
              </div>
              <div className="occurrences-filter-actions"><button type="button" className="occurrences-clear-button" onClick={clearFilters}>Limpar filtros</button><button type="submit" className="occurrences-apply-button"><Filter size={14} aria-hidden="true" />Aplicar filtros</button></div>
            </form>
          )}

          <div className="occurrences-list-heading">
            <div><p className="dashboard-eyebrow">{manager ? "VISÃO DA EQUIPE" : "REGISTROS PRÓPRIOS E COM PARTICIPAÇÃO"}</p><h2>{quickFilter === "pending" ? "Pendências" : quickFilter === "finalized" ? "Ocorrências finalizadas" : quickFilter === "mine" ? "Minhas ocorrências" : "Todas as ocorrências"}</h2></div>
            {isRefreshing && <span className="occurrences-refreshing"><RefreshCw size={13} className="spin" aria-hidden="true" />Atualizando lista</span>}
          </div>

          {error && items.length > 0 && (
            <div className="occurrences-error" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => void load(0, false)}>Tentar novamente</button></div>
          )}

          {isLoading && items.length === 0 ? (
            <div className="occurrences-loading" role="status" aria-live="polite"><span className="occurrences-spinner" aria-hidden="true" /><strong>Carregando ocorrências</strong><small>Consultando os registros permitidos para o seu perfil.</small></div>
          ) : error && items.length === 0 ? (
            <div className="occurrences-empty-state is-error"><CircleAlert size={25} aria-hidden="true" /><strong>Não foi possível carregar a lista</strong><p>{error}</p><button type="button" onClick={() => void load(0, false)}><RefreshCw size={14} aria-hidden="true" />Tentar novamente</button></div>
          ) : items.length === 0 ? (
            <div className="occurrences-empty-state"><span><ClipboardList size={25} aria-hidden="true" /></span><strong>Nenhuma ocorrência encontrada</strong><p>Altere os filtros ou tente novamente quando houver novos registros.</p><button type="button" onClick={clearFilters}><X size={14} aria-hidden="true" />Limpar filtros</button></div>
          ) : (
            <>
              <ul className="occurrence-list">
                {items.map((item) => <OccurrenceCard key={item.id} item={item} onOpen={setSelectedItem} />)}
              </ul>
              {hasMore && <div className="occurrences-load-more"><button type="button" onClick={loadMore} disabled={isLoadingMore}>{isLoadingMore ? <><RefreshCw size={14} className="spin" aria-hidden="true" />Carregando…</> : <>Carregar mais <ArrowRight size={14} aria-hidden="true" /></>}</button><small>{items.length.toLocaleString("pt-BR")} de {totalCount.toLocaleString("pt-BR")} registros</small></div>}
              {!hasMore && totalCount > 0 && <p className="occurrences-list-end"><Check size={14} aria-hidden="true" />Você está vendo todas as {totalCount.toLocaleString("pt-BR")} ocorrências deste filtro.</p>}
            </>
          )}
        </section>

        <footer className="occurrences-footer"><ShieldCheck size={15} aria-hidden="true" /><span>Consulta protegida · Os resultados obedecem à sessão e às permissões do Supabase.</span><span className="occurrences-footer-role">{manager ? "Visão da equipe" : "Visão individual"}</span></footer>
      </div>

      {selectedItem && <OccurrenceDetail item={selectedItem} onClose={closeSelectedItem} />}
    </main>
  );
}
