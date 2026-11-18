import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  CarFront,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  MapPin,
  RefreshCw,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { ApproachPreview, DashboardData, OccurrencePreview, PrivateImageReference } from "@/lib/dashboard";
import { isManagementRole } from "@/lib/dashboard";
import PrivateRecordThumbnail from "@/components/PrivateRecordThumbnail";

const BOMOBILE_URL = `${window.location.origin}/bomobile/`;

type DashboardRecordTabId = "occurrences" | "people" | "vehicles" | "approaches";
type RecordTab = {
  id: DashboardRecordTabId;
  label: string;
  title: string;
  description: string;
  count: number | null;
  emptyTitle: string;
  emptyDescription: string;
  destination: string;
  actionLabel: string;
};

type SelectedRecord =
  | { kind: "occurrence"; item: OccurrencePreview }
  | { kind: "approach"; item: ApproachPreview };

function formatDate(value: string | null | undefined) {
  if (!value) return "Data não informada";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function humanizeStatus(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return fallback;
  const known: Record<string, string> = {
    pending_sync: "Pendente de sincronização",
    draft: "Rascunho",
    synced: "Sincronizada",
    cancelled: "Cancelada",
    cancelado: "Cancelada",
    cancelada: "Cancelada",
    em_andamento: "Em andamento",
    aberta: "Em andamento",
    aberto: "Em andamento",
    finalizada: "Concluída",
    finalizado: "Concluída",
    concluida: "Concluída",
    concluido: "Concluída",
    encerrada: "Encerrada",
    encerrado: "Encerrado",
  };
  return known[normalized] ?? normalized.replaceAll("_", " ").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function statusTone(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  if (normalized.includes("pending") || normalized.includes("pendente") || normalized === "draft" || normalized === "rascunho") return "is-pending";
  if (normalized.includes("cancel")) return "is-cancelled";
  if (normalized.includes("conclu") || normalized.includes("finaliz") || normalized.includes("encerr") || normalized === "synced") return "is-complete";
  if (normalized.includes("andamento") || normalized === "aberta" || normalized === "aberto") return "is-active";
  return "";
}

function occurrenceNumber(item: OccurrencePreview) {
  return item.numero_ocorrencia?.trim() || item.numero_temporario?.trim() || null;
}

function occurrenceStatus(item: OccurrencePreview) {
  if (item.cancelado_em) return "Cancelada";
  return humanizeStatus(item.status, "Em acompanhamento");
}

function readableRecordType(value: string | null | undefined, fallback: string) {
  const source = value?.trim().replaceAll("_", " ").replace(/\s+/g, " ");
  if (!source) return fallback;
  const lower = source.toLocaleLowerCase("pt-BR");
  if (source !== lower && source !== source.toLocaleUpperCase("pt-BR")) return source;
  const particles = new Set(["a", "ao", "aos", "as", "à", "às", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "para", "por", "sem"]);
  return lower.split(" ").map((word, index) => {
    if (index > 0 && particles.has(word)) return word;
    return word.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
  }).join(" ");
}

function officerSupportLabel(supportName: string | null, supportAssigned: boolean) {
  return supportName?.trim() || (supportAssigned ? "GM indisponível" : "Apoio não informado");
}

function approachTypeLabel(value: string | null | undefined) {
  const normalized = value?.trim().replaceAll("_", " ").replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  if (normalized === "legado não classificado" || normalized === "legado não identificado") return "Orientação";
  return readableRecordType(value, "Tipo não informado");
}

function OfficerDetails({
  creatorName,
  supportName,
  supportAssigned,
}: {
  creatorName: string | null;
  supportName: string | null;
  supportAssigned: boolean;
}) {
  return (
    <div className="dashboard-record-officers">
      <span><UserRound size={12} aria-hidden="true" /><span>Criado por <strong>{creatorName?.trim() || "GM não identificado"}</strong></span></span>
      <span><UsersRound size={12} aria-hidden="true" /><span>Apoio <strong>{officerSupportLabel(supportName, supportAssigned)}</strong></span></span>
    </div>
  );
}

function RecordArtwork({ photo, kind, size = "card" }: { photo: PrivateImageReference | null; kind: "occurrence" | "person" | "vehicle"; size?: "card" | "detail" }) {
  const fallback = kind === "occurrence"
    ? <ClipboardList size={21} aria-hidden="true" />
    : kind === "person"
      ? <UserRound size={21} aria-hidden="true" />
      : <CarFront size={21} aria-hidden="true" />;
  return <PrivateRecordThumbnail photo={photo} fallback={fallback} size={size} />;
}

function occurrenceLocation(item: OccurrencePreview) {
  const parts = [item.local_ocorrencia?.trim(), item.bairro_ocorrencia?.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Local não informado";
}

function OccurrenceCard({ item, onOpen }: { item: OccurrencePreview; onOpen: (record: SelectedRecord) => void }) {
  const status = occurrenceStatus(item);
  const dateValue = item.data_hora_inicio || item.criado_em;
  const type = readableRecordType(item.tipo_ocorrencia || item.sub_tipo_ocorrencia, "Ocorrência registrada");
  const severity = readableRecordType(item.gravidade, "Não informada");
  const number = occurrenceNumber(item);
  const location = occurrenceLocation(item);
  return (
    <li className="dashboard-record-row dashboard-record-rich">
      <button className="dashboard-record-card-button" type="button" onClick={() => onOpen({ kind: "occurrence", item })}>
        <RecordArtwork photo={item.photo} kind="occurrence" />
        <div className="dashboard-record-main dashboard-record-rich-main">
          <div className="dashboard-record-titleline dashboard-occurrence-titleline">
            <strong>{type}</strong>
            <span className="dashboard-severity-chip">Gravidade · {severity}</span>
            <span className={`dashboard-status ${statusTone(item.cancelado_em ? "cancelled" : item.status)}`}>{status}</span>
          </div>
          <div className={`dashboard-record-summary-line ${number ? "" : "is-time-only"}`}>
            {number && <span className="dashboard-record-number">BO nº {number}</span>}
            <time dateTime={dateValue || undefined}>{formatDate(dateValue)}</time>
          </div>
          <div className="dashboard-record-location" title={location}><MapPin size={13} aria-hidden="true" /><span>{location}</span></div>
          <OfficerDetails creatorName={item.creatorName} supportName={item.supportName} supportAssigned={item.supportAssigned} />
        </div>
      </button>
    </li>
  );
}

function ApproachCard({ item, onOpen }: { item: ApproachPreview; onOpen: (record: SelectedRecord) => void }) {
  const person = item.kind === "pessoa";
  const kindLabel = `Abordagem de ${person ? "pessoa" : "veículo"}`;
  const type = approachTypeLabel(item.tipo_atendimento || item.tipo_abordagem);
  const situation = item.fase || item.status_abordagem || item.status_regularizacao;
  const status = humanizeStatus(situation, "Situação não informada");
  const dateValue = item.data_hora_inicio || item.criado_em;
  const location = item.local_abordagem?.trim() || "Local não informado";
  return (
    <li className="dashboard-record-row dashboard-record-rich">
      <button className="dashboard-record-card-button" type="button" onClick={() => onOpen({ kind: "approach", item })}>
        <RecordArtwork photo={item.photo} kind={person ? "person" : "vehicle"} />
        <div className="dashboard-record-main dashboard-record-rich-main">
          <div className="dashboard-record-titleline">
            <strong>{kindLabel}</strong>
            <ChevronRight className="dashboard-record-open-indicator" size={16} aria-hidden="true" />
          </div>
          <div className="dashboard-record-summary-line">
            <span className="dashboard-record-kind-chip">Tipo · {type}</span>
            <time dateTime={dateValue || undefined}>{formatDate(dateValue)}</time>
          </div>
          <div className="dashboard-record-location" title={location}><MapPin size={13} aria-hidden="true" /><span>{location}</span></div>
          <div className="dashboard-record-state-line">
            <span className={`dashboard-status ${statusTone(situation)}`}>{status}</span>
          </div>
          <OfficerDetails creatorName={item.creatorName} supportName={item.supportName} supportAssigned={item.supportAssigned} />
        </div>
      </button>
    </li>
  );
}

function EmptyRecords({
  title,
  children,
  href,
  actionLabel,
}: {
  title: string;
  children: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="dashboard-empty-records">
      <span className="dashboard-empty-records-icon"><Activity size={19} aria-hidden="true" /></span>
      <span className="dashboard-empty-records-copy"><strong>{title}</strong><small>{children}</small></span>
      <a href={href}>{actionLabel}<ArrowRight size={14} aria-hidden="true" /></a>
    </div>
  );
}

function LoadingRecords() {
  return (
    <div className="dashboard-record-skeleton" role="status" aria-live="polite" aria-label="Carregando registros recentes">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="dashboard-record-skeleton-row" key={index} aria-hidden="true">
          <span />
          <span><i /><i /></span>
          <span />
        </div>
      ))}
      <span className="visually-hidden">Carregando registros recentes.</span>
    </div>
  );
}

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dashboard-panel-error" role="alert">
      <CircleAlert size={20} aria-hidden="true" />
      <span><strong>Não foi possível carregar os registros</strong><small>{message}</small></span>
      <button type="button" onClick={onRetry}>Tentar novamente</button>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function RecordDetailsDialog({ record, onClose }: { record: SelectedRecord; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const item = record.item;
  const isOccurrence = record.kind === "occurrence";
  const dateValue = item.data_hora_inicio || item.criado_em;
  const type = record.kind === "occurrence"
    ? readableRecordType(record.item.tipo_ocorrencia || record.item.sub_tipo_ocorrencia, "Ocorrência registrada")
    : approachTypeLabel(record.item.tipo_atendimento || record.item.tipo_abordagem);
  const category = record.kind === "occurrence" ? "Boletim de ocorrência" : `Abordagem de ${record.item.kind}`;
  const number = record.kind === "occurrence" ? occurrenceNumber(record.item) : null;
  const location = record.kind === "occurrence" ? occurrenceLocation(record.item) : record.item.local_abordagem?.trim() || "Local não informado";
  const status = record.kind === "occurrence"
    ? occurrenceStatus(record.item)
    : humanizeStatus(record.item.fase || record.item.status_abordagem || record.item.status_regularizacao, "Situação não informada");
  const fields = record.kind === "occurrence"
    ? [
        { label: "Número do boletim", value: number ? `BO nº ${number}` : "Não informado" },
        { label: "Data e hora", value: formatDate(dateValue) },
        { label: "Localização", value: location },
        { label: "Status", value: status },
        { label: "Gravidade", value: readableRecordType(record.item.gravidade, "Não informada") },
      ]
    : [
        { label: "Categoria", value: category },
        { label: "Tipo", value: type },
        { label: "Data e hora", value: formatDate(dateValue) },
        { label: "Localização", value: location },
        { label: "Fase / situação", value: status },
      ];
  const artKind = record.kind === "occurrence" ? "occurrence" : record.item.kind === "pessoa" ? "person" : "vehicle";

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
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
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div className="dashboard-record-detail-backdrop dashboard-theme-blue" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        className="dashboard-record-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-record-detail-title"
        aria-describedby="dashboard-record-detail-description"
        tabIndex={-1}
      >
        <div className="dashboard-record-detail-topbar">
          <p className="dashboard-eyebrow">DETALHES DO REGISTRO</p>
          <button ref={closeButtonRef} className="dashboard-record-detail-close" type="button" onClick={onClose} aria-label="Fechar detalhes">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="dashboard-record-detail-intro">
          <RecordArtwork photo={item.photo} kind={artKind} size="detail" />
          <div>
            <span className="dashboard-record-detail-category">{category}</span>
            <h2 id="dashboard-record-detail-title">{type}</h2>
            <p id="dashboard-record-detail-description">Informações principais do registro, sem exibir dados pessoais desnecessários.</p>
          </div>
        </div>
        <dl className="dashboard-record-detail-grid">
          {fields.map((field) => <DetailField key={field.label} label={field.label} value={field.value} />)}
        </dl>
        <div className="dashboard-record-detail-team">
          <p className="dashboard-eyebrow">EQUIPE DO REGISTRO</p>
          <OfficerDetails creatorName={item.creatorName} supportName={item.supportName} supportAssigned={item.supportAssigned} />
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default function DashboardActivity({
  profileRole,
  data,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
}: {
  profileRole: string | null;
  data: DashboardData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const showTeamOverview = isManagementRole(profileRole);
  const [activeTab, setActiveTab] = useState<DashboardRecordTabId>("occurrences");
  const [selectedRecord, setSelectedRecord] = useState<SelectedRecord | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeRecordDetails = useCallback(() => setSelectedRecord(null), []);

  useEffect(() => {
    setActiveTab("occurrences");
  }, [showTeamOverview]);

  const tabs: RecordTab[] = showTeamOverview
    ? [
        {
          id: "occurrences",
          label: "Boletins",
          title: "Boletins de ocorrência",
          description: "Os seis boletins registrados mais recentemente, sem recorte por período.",
          count: data?.occurrences.length ?? null,
          emptyTitle: "Nenhum boletim para exibir",
          emptyDescription: "A consulta da equipe mostrará aqui os novos boletins assim que estiverem disponíveis.",
          destination: `${BOMOBILE_URL}#ocorrencias`,
          actionLabel: "Abrir ocorrências",
        },
        {
          id: "people",
          label: "Pessoas",
          title: "Abordagens de pessoas",
          description: "As seis abordagens registradas mais recentemente, sem recorte por período.",
          count: data?.peopleApproaches.length ?? null,
          emptyTitle: "Nenhuma abordagem de pessoa",
          emptyDescription: "As abordagens da equipe aparecerão nesta categoria.",
          destination: `${BOMOBILE_URL}#consulta`,
          actionLabel: "Abrir abordagens",
        },
        {
          id: "vehicles",
          label: "Veículos",
          title: "Abordagens de veículos",
          description: "As seis abordagens registradas mais recentemente, sem recorte por período.",
          count: data?.vehicleApproaches.length ?? null,
          emptyTitle: "Nenhuma abordagem de veículo",
          emptyDescription: "As abordagens da equipe aparecerão nesta categoria.",
          destination: `${BOMOBILE_URL}#consulta`,
          actionLabel: "Abrir abordagens",
        },
      ]
    : [
        {
          id: "occurrences",
          label: "Ocorrências",
          title: "Minhas ocorrências",
          description: "Registros criados por você ou com vínculo ativo de participação.",
          count: data?.occurrences.length ?? null,
          emptyTitle: "Nenhuma ocorrência recente",
          emptyDescription: "Quando você registrar ou participar de uma ocorrência, ela aparecerá aqui.",
          destination: `${BOMOBILE_URL}#ocorrencias`,
          actionLabel: "Abrir ocorrências",
        },
        {
          id: "approaches",
          label: "Abordagens",
          title: "Minhas abordagens recentes",
          description: "Abordagens criadas por você ou em que foi indicado como GM de apoio.",
          count: data?.approaches.length ?? null,
          emptyTitle: "Nenhuma abordagem recente",
          emptyDescription: "As abordagens em que você participou aparecerão nesta lista.",
          destination: `${BOMOBILE_URL}#consulta`,
          actionLabel: "Abrir abordagens",
        },
      ];

  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const recordCount = !data
    ? 0
    : selectedTab.id === "occurrences"
      ? data.occurrences.length
      : selectedTab.id === "people"
        ? data.peopleApproaches.length
        : selectedTab.id === "vehicles"
          ? data.vehicleApproaches.length
          : data.approaches.length;

  const recordRows = !data
    ? []
    : selectedTab.id === "occurrences"
      ? data.occurrences.map((item) => <OccurrenceCard key={item.id} item={item} onOpen={setSelectedRecord} />)
      : selectedTab.id === "people"
        ? data.peopleApproaches.map((item) => <ApproachCard key={`pessoa-${item.id}`} item={item} onOpen={setSelectedRecord} />)
        : selectedTab.id === "vehicles"
          ? data.vehicleApproaches.map((item) => <ApproachCard key={`veiculo-${item.id}`} item={item} onOpen={setSelectedRecord} />)
          : data.approaches.map((item) => <ApproachCard key={`${item.kind}-${item.id}`} item={item} onOpen={setSelectedRecord} />);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section className="dashboard-panel dashboard-records-panel" aria-label="Registros recentes">
      <div className="dashboard-records-heading">
        <div>
          <p className="dashboard-eyebrow">{showTeamOverview ? "VISÃO DA EQUIPE" : "SUA ATUAÇÃO"}</p>
          <h2 id="dashboard-records-title">{selectedTab.title}</h2>
          <p>{selectedTab.description}</p>
        </div>
        <div className="dashboard-records-tools">
          {isRefreshing && <span className="dashboard-refresh-state"><RefreshCw size={13} className="spin" aria-hidden="true" /> Atualizando</span>}
          <button
            className="dashboard-refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Atualizar registros recentes"
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className={`dashboard-record-tabs ${showTeamOverview ? "is-three" : "is-two"}`} role="tablist" aria-label={showTeamOverview ? "Categorias de registros da equipe" : "Seus registros recentes"}>
        {tabs.map((tab, index) => (
          <button
            className="dashboard-record-tab"
            id={`dashboard-record-tab-${tab.id}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selectedTab.id === tab.id}
            aria-controls="dashboard-record-tabpanel"
            tabIndex={selectedTab.id === tab.id ? 0 : -1}
            ref={(element) => { tabRefs.current[index] = element; }}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            <span>{tab.label}</span>
            <small>{tab.count === null ? "—" : tab.count}</small>
          </button>
        ))}
      </div>

      <div
        className="dashboard-record-tabpanel"
        id="dashboard-record-tabpanel"
        role="tabpanel"
        aria-labelledby={`dashboard-record-tab-${selectedTab.id}`}
        aria-busy={isLoading || isRefreshing}
        tabIndex={0}
      >
        {!data && error ? (
          <LoadFailure message={error} onRetry={onRefresh} />
        ) : !data && isLoading ? (
          <LoadingRecords />
        ) : !data ? (
          <LoadFailure message="Os dados ainda não estão disponíveis." onRetry={onRefresh} />
        ) : recordCount > 0 ? (
          <ul className="dashboard-record-list">{recordRows}</ul>
        ) : (
          <EmptyRecords
            title={selectedTab.emptyTitle}
            href={selectedTab.destination}
            actionLabel={selectedTab.actionLabel}
          >
            {selectedTab.emptyDescription}
          </EmptyRecords>
        )}
      </div>
      {selectedRecord && <RecordDetailsDialog record={selectedRecord} onClose={closeRecordDetails} />}
    </section>
  );
}
