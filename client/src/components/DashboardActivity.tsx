import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Activity,
  ArrowRight,
  CarFront,
  CircleAlert,
  ClipboardList,
  MapPin,
  RefreshCw,
  UserRound,
  UsersRound,
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

function formatDate(value: string | null | undefined) {
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
  return item.numero_ocorrencia || item.numero_temporario || "Número não informado";
}

function occurrenceStatus(item: OccurrencePreview) {
  if (item.cancelado_em) return "Cancelada";
  return humanizeStatus(item.status, "Em acompanhamento");
}

function readableRecordType(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().replaceAll("_", " ").replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.toLocaleLowerCase("pt-BR").replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase("pt-BR")}`,
  );
}

function officerSupportLabel(supportName: string | null, supportAssigned: boolean) {
  return supportName?.trim() || (supportAssigned ? "GM indisponível" : "Apoio não informado");
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

function RecordArtwork({ photo, kind }: { photo: PrivateImageReference | null; kind: "occurrence" | "person" | "vehicle" }) {
  const fallback = kind === "occurrence"
    ? <ClipboardList size={21} aria-hidden="true" />
    : kind === "person"
      ? <UserRound size={21} aria-hidden="true" />
      : <CarFront size={21} aria-hidden="true" />;
  return <PrivateRecordThumbnail photo={photo} fallback={fallback} />;
}

function occurrenceLocation(item: OccurrencePreview) {
  const parts = [item.local_ocorrencia?.trim(), item.bairro_ocorrencia?.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Local não informado";
}

function OccurrenceCard({ item }: { item: OccurrencePreview }) {
  const status = occurrenceStatus(item);
  const dateValue = item.data_hora_inicio || item.criado_em;
  const type = readableRecordType(item.tipo_ocorrencia || item.sub_tipo_ocorrencia, "Ocorrência registrada");
  return (
    <li className="dashboard-record-row dashboard-record-rich">
      <RecordArtwork photo={item.photo} kind="occurrence" />
      <div className="dashboard-record-main dashboard-record-rich-main">
        <div className="dashboard-record-titleline">
          <strong>{type}</strong>
          <span className="dashboard-severity-chip">Gravidade · {readableRecordType(item.gravidade, "Não informada")}</span>
        </div>
        <div className="dashboard-record-summary-line">
          <span className="dashboard-record-number">{occurrenceNumber(item)}</span>
          <time dateTime={dateValue || undefined}>{formatDate(dateValue)}</time>
        </div>
        <div className="dashboard-record-location"><MapPin size={13} aria-hidden="true" /><span>{occurrenceLocation(item)}</span></div>
        <div className="dashboard-record-state-line">
          <span className={`dashboard-status ${statusTone(item.cancelado_em ? "cancelled" : item.status)}`}>{status}</span>
        </div>
        <OfficerDetails creatorName={item.creatorName} supportName={item.supportName} supportAssigned={item.supportAssigned} />
      </div>
    </li>
  );
}

function ApproachCard({ item }: { item: ApproachPreview }) {
  const person = item.kind === "pessoa";
  const kindLabel = `Abordagem de ${person ? "pessoa" : "veículo"}`;
  const title = readableRecordType(item.tipo_atendimento || item.tipo_abordagem, kindLabel);
  const situation = item.fase || item.status_abordagem || item.status_regularizacao;
  const dateValue = item.data_hora_inicio || item.criado_em;
  return (
    <li className="dashboard-record-row dashboard-record-rich">
      <RecordArtwork photo={item.photo} kind={person ? "person" : "vehicle"} />
      <div className="dashboard-record-main dashboard-record-rich-main">
        <div className="dashboard-record-titleline">
          <strong>{title}</strong>
          <span className="dashboard-record-kind-chip">{kindLabel}</span>
        </div>
        <div className="dashboard-record-summary-line">
          <span className={`dashboard-status ${statusTone(situation)}`}>{humanizeStatus(situation, "Situação não informada")}</span>
          <time dateTime={dateValue || undefined}>{formatDate(dateValue)}</time>
        </div>
        <div className="dashboard-record-location"><MapPin size={13} aria-hidden="true" /><span>{item.local_abordagem?.trim() || "Local não informado"}</span></div>
        <OfficerDetails creatorName={item.creatorName} supportName={item.supportName} supportAssigned={item.supportAssigned} />
      </div>
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
      ? data.occurrences.map((item) => <OccurrenceCard key={item.id} item={item} />)
      : selectedTab.id === "people"
        ? data.peopleApproaches.map((item) => <ApproachCard key={`pessoa-${item.id}`} item={item} />)
        : selectedTab.id === "vehicles"
          ? data.vehicleApproaches.map((item) => <ApproachCard key={`veiculo-${item.id}`} item={item} />)
          : data.approaches.map((item) => <ApproachCard key={`${item.kind}-${item.id}`} item={item} />);

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
    </section>
  );
}
