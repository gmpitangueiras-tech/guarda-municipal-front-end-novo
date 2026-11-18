import { supabase } from "@/lib/supabase";
import { isManagementRole, privateImageReference, type PrivateImageReference } from "@/lib/dashboard";

export type QuickOccurrenceFilter = "all" | "mine" | "pending" | "finalized";

export type OccurrenceFilters = {
  search: string;
  status: string;
  severity: string;
  type: string;
  locality: string;
  from: string;
  to: string;
  responsibleId: string;
  rectificationsOnly: boolean;
  pendingSyncOnly: boolean;
};

export type OccurrenceSummary = {
  drafts: number;
  pending: number;
  inProgress: number;
  finalized: number;
};

export type OccurrenceListItem = {
  id: string;
  numero_ocorrencia: string | null;
  numero_temporario: string | null;
  numero_bo: string | null;
  status: string | null;
  tipo_ocorrencia: string | null;
  sub_tipo_ocorrencia: string | null;
  gravidade: string | null;
  data_hora_inicio: string | null;
  data_hora_finalizacao: string | null;
  local_ocorrencia: string | null;
  bairro_ocorrencia: string | null;
  criado_em: string | null;
  sync_attempts: number;
  hasRectification: boolean;
  photo: PrivateImageReference | null;
  creatorName: string | null;
  supportName: string | null;
  supportAssigned: boolean;
};

export type OccurrencePage = {
  items: OccurrenceListItem[];
  totalCount: number;
  summary: OccurrenceSummary;
};

export type OfficerOption = { id: string; label: string };

type RawOccurrence = {
  id: string;
  numero_ocorrencia: string | null;
  numero_temporario: string | null;
  numero_bo: string | null;
  status: string | null;
  tipo_ocorrencia: string | null;
  sub_tipo_ocorrencia: string | null;
  gravidade: string | null;
  data_hora_inicio: string | null;
  data_hora_finalizacao: string | null;
  local_ocorrencia: string | null;
  bairro_ocorrencia: string | null;
  criado_em: string | null;
  criado_por: string | null;
  sync_attempts: number | null;
  ocorrencia_original_id: string | null;
};

type TeamLink = {
  ocorrencia_id: string;
  guarda_id: string;
  papel: string;
  ordem: number | null;
};

const PAGE_SIZE = 20;
const LOOKUP_PAGE_SIZE = 500;
const SELECT_FIELDS = [
  "id",
  "numero_ocorrencia",
  "numero_temporario",
  "numero_bo",
  "status",
  "tipo_ocorrencia",
  "sub_tipo_ocorrencia",
  "gravidade",
  "data_hora_inicio",
  "data_hora_finalizacao",
  "local_ocorrencia",
  "bairro_ocorrencia",
  "criado_em",
  "criado_por",
  "sync_attempts",
  "ocorrencia_original_id",
].join(",");

const EMPTY_SUMMARY: OccurrenceSummary = {
  drafts: 0,
  pending: 0,
  inProgress: 0,
  finalized: 0,
};

function cleanFilterText(value: string) {
  return value
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N} _/-]/gu, " ")
    .replace(/\s+/g, " ");
}

async function getParticipatedOccurrenceIds(profileId: string): Promise<string[]> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const ids: string[] = [];
  for (let offset = 0; ; offset += LOOKUP_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("ocorrencia_guardas")
      .select("ocorrencia_id")
      .eq("guarda_id", profileId)
      .eq("esta_ativo", true)
      .order("ocorrencia_id", { ascending: true })
      .range(offset, offset + LOOKUP_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    ids.push(...page.map((row) => row.ocorrencia_id));
    if (page.length < LOOKUP_PAGE_SIZE) break;
  }
  return [...new Set(ids)];
}

function applyProfileScope(query: any, profileId: string, profileRole: string | null, quickFilter: QuickOccurrenceFilter, participatedIds: string[]) {
  const shouldLimitToMine = !isManagementRole(profileRole) || quickFilter === "mine";
  if (!shouldLimitToMine) return query;

  const clauses = [`criado_por.eq.${profileId}`];
  if (participatedIds.length > 0) clauses.push(`id.in.(${participatedIds.join(",")})`);
  return query.or(clauses.join(","));
}

function applyQuickFilter(query: any, quickFilter: QuickOccurrenceFilter) {
  if (quickFilter === "pending") {
    return query.in("status", ["pending_sync", "pending_rectification"]);
  }
  if (quickFilter === "finalized") {
    return query.or("data_hora_finalizacao.not.is.null,status.eq.rectified,status.eq.cancelled");
  }
  return query;
}

function applyAdvancedFilters(query: any, filters: OccurrenceFilters) {
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.severity) query = query.eq("gravidade", filters.severity);

  const search = cleanFilterText(filters.search);
  if (search) {
    const pattern = `*${search}*`;
    query = query.or([
      `numero_ocorrencia.ilike.${pattern}`,
      `numero_temporario.ilike.${pattern}`,
      `numero_bo.ilike.${pattern}`,
      `tipo_ocorrencia.ilike.${pattern}`,
      `sub_tipo_ocorrencia.ilike.${pattern}`,
      `local_ocorrencia.ilike.${pattern}`,
      `bairro_ocorrencia.ilike.${pattern}`,
    ].join(","));
  }

  const type = cleanFilterText(filters.type);
  if (type) query = query.ilike("tipo_ocorrencia", `%${type}%`);

  const locality = cleanFilterText(filters.locality);
  if (locality) {
    query = query.or([
      `local_ocorrencia.ilike.*${locality}*`,
      `bairro_ocorrencia.ilike.*${locality}*`,
      `referencia.ilike.*${locality}*`,
    ].join(","));
  }

  if (filters.from) query = query.gte("data_hora_inicio", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("data_hora_inicio", `${filters.to}T23:59:59.999`);
  if (filters.responsibleId) query = query.eq("criado_por", filters.responsibleId);
  if (filters.rectificationsOnly) {
    query = query.in("status", ["pending_rectification", "rectified", "rectification_rejected"]);
  }
  if (filters.pendingSyncOnly) query = query.eq("status", "pending_sync");
  return query;
}

async function countCategory(
  profileId: string,
  profileRole: string | null,
  quickFilter: QuickOccurrenceFilter,
  participatedIds: string[],
  category: "drafts" | "pending" | "inProgress" | "finalized",
): Promise<number> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");
  let query: any = supabase
    .from("ocorrencias")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("esta_ativa", true);
  query = applyProfileScope(query, profileId, profileRole, quickFilter, participatedIds);

  if (category === "drafts") query = query.eq("status", "draft");
  if (category === "pending") query = query.in("status", ["pending_sync", "pending_rectification"]);
  if (category === "inProgress") query = query.eq("status", "synced").is("data_hora_finalizacao", null);
  if (category === "finalized") query = query.or("data_hora_finalizacao.not.is.null,status.eq.rectified,status.eq.cancelled");

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function enrichRows(rows: RawOccurrence[]): Promise<OccurrenceListItem[]> {
  if (!supabase || rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const creatorIds = rows.map((row) => row.criado_por).filter((id): id is string => Boolean(id));

  const [teamResult, photoResult] = await Promise.all([
    supabase
      .from("ocorrencia_guardas")
      .select("ocorrencia_id,guarda_id,papel,ordem")
      .in("ocorrencia_id", ids)
      .eq("esta_ativo", true)
      .order("ordem", { ascending: true, nullsFirst: false })
      .limit(Math.max(ids.length * 8, 1)),
    supabase
      .from("anexos")
      .select("ocorrencia_id,url,url_thumb")
      .in("ocorrencia_id", ids)
      .eq("tipo_arquivo", "image")
      .is("deleted_at", null)
      .order("criado_em", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(Math.max(ids.length * 4, 1)),
  ]);

  const teamLinks = (teamResult.error ? [] : (teamResult.data ?? [])) as TeamLink[];
  const officerIds = [...new Set([...creatorIds, ...teamLinks.map((link) => link.guarda_id)])];
  const officerResult = officerIds.length > 0
    ? await supabase.from("usuarios").select("id,apelido").in("id", officerIds).limit(officerIds.length)
    : { data: [], error: null };
  const officers = new Map<string, string>();
  if (!officerResult.error) {
    for (const row of officerResult.data ?? []) {
      const alias = typeof row.apelido === "string" ? row.apelido.trim().replace(/^GM(?:\s+|$)/i, "").trim() : "";
      if (alias) officers.set(row.id, `GM ${alias}`);
    }
  }

  const photos = new Map<string, PrivateImageReference>();
  if (!photoResult.error) {
    for (const row of photoResult.data ?? []) {
      if (photos.has(row.ocorrencia_id)) continue;
      const image = privateImageReference(row.url_thumb) ?? privateImageReference(row.url);
      if (image) photos.set(row.ocorrencia_id, image);
    }
  }

  const linksByOccurrence = new Map<string, TeamLink[]>();
  for (const link of teamLinks) {
    const links = linksByOccurrence.get(link.ocorrencia_id) ?? [];
    links.push(link);
    linksByOccurrence.set(link.ocorrencia_id, links);
  }

  return rows.map((row) => {
    const links = linksByOccurrence.get(row.id) ?? [];
    const support = links.find((link) => ["acompanhante", "apoio"].includes(link.papel.trim().toLowerCase()));
    return {
      id: row.id,
      numero_ocorrencia: row.numero_ocorrencia,
      numero_temporario: row.numero_temporario,
      numero_bo: row.numero_bo,
      status: row.status,
      tipo_ocorrencia: row.tipo_ocorrencia,
      sub_tipo_ocorrencia: row.sub_tipo_ocorrencia,
      gravidade: row.gravidade,
      data_hora_inicio: row.data_hora_inicio,
      data_hora_finalizacao: row.data_hora_finalizacao,
      local_ocorrencia: row.local_ocorrencia,
      bairro_ocorrencia: row.bairro_ocorrencia,
      criado_em: row.criado_em,
      sync_attempts: row.sync_attempts ?? 0,
      hasRectification: Boolean(row.ocorrencia_original_id) || ["pending_rectification", "rectified", "rectification_rejected"].includes(row.status ?? ""),
      photo: photos.get(row.id) ?? null,
      creatorName: row.criado_por ? officers.get(row.criado_por) ?? null : null,
      supportName: support ? officers.get(support.guarda_id) ?? null : null,
      supportAssigned: Boolean(support),
    };
  });
}

export async function loadOccurrencePage({
  profileId,
  profileRole,
  quickFilter,
  filters,
  page,
  includeSummary = true,
}: {
  profileId: string;
  profileRole: string | null;
  quickFilter: QuickOccurrenceFilter;
  filters: OccurrenceFilters;
  page: number;
  includeSummary?: boolean;
}): Promise<OccurrencePage> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const isManager = isManagementRole(profileRole);
  const isMine = !isManager || quickFilter === "mine";
  const participatedIds = isMine ? await getParticipatedOccurrenceIds(profileId) : [];

  let query: any = supabase
    .from("ocorrencias")
    .select(SELECT_FIELDS, { count: "exact" })
    .is("deleted_at", null)
    .eq("esta_ativa", true);
  query = applyProfileScope(query, profileId, profileRole, quickFilter, participatedIds);
  query = applyQuickFilter(query, quickFilter);
  query = applyAdvancedFilters(query, filters);

  const { data, count, error } = await query
    .order("data_hora_inicio", { ascending: false, nullsFirst: false })
    .order("criado_em", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  const items = await enrichRows((data ?? []) as unknown as RawOccurrence[]);

  let summary = EMPTY_SUMMARY;
  if (includeSummary) {
    const [drafts, pending, inProgress, finalized] = await Promise.all([
      countCategory(profileId, profileRole, quickFilter, participatedIds, "drafts"),
      countCategory(profileId, profileRole, quickFilter, participatedIds, "pending"),
      countCategory(profileId, profileRole, quickFilter, participatedIds, "inProgress"),
      countCategory(profileId, profileRole, quickFilter, participatedIds, "finalized"),
    ]);
    summary = { drafts, pending, inProgress, finalized };
  }

  return {
    items,
    totalCount: count ?? 0,
    summary,
  };
}

export async function loadOfficerOptions(): Promise<OfficerOption[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("usuarios")
    .select("id,apelido")
    .eq("status", "ativo")
    .not("apelido", "is", null)
    .order("apelido", { ascending: true })
    .limit(100);
  if (error) return [];

  return (data ?? []).flatMap((row) => {
    const alias = typeof row.apelido === "string" ? row.apelido.trim().replace(/^GM(?:\s+|$)/i, "").trim() : "";
    return alias ? [{ id: row.id, label: `GM ${alias}` }] : [];
  });
}

export const EMPTY_OCCURRENCE_FILTERS: OccurrenceFilters = {
  search: "",
  status: "",
  severity: "",
  type: "",
  locality: "",
  from: "",
  to: "",
  responsibleId: "",
  rectificationsOnly: false,
  pendingSyncOnly: false,
};

export const EMPTY_OCCURRENCE_SUMMARY = EMPTY_SUMMARY;
