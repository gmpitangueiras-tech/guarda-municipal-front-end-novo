import { supabase, supabaseUrl } from "@/lib/supabase";

export type PrivateImageReference = {
  bucket: "anexos";
  path: string;
};

export type OccurrencePreview = {
  id: string;
  numero_ocorrencia: string | null;
  numero_temporario: string | null;
  criado_em: string | null;
  status: string | null;
  tipo_ocorrencia: string | null;
  sub_tipo_ocorrencia: string | null;
  gravidade: string | null;
  data_hora_inicio: string | null;
  local_ocorrencia: string | null;
  bairro_ocorrencia: string | null;
  cancelado_em: string | null;
  photo: PrivateImageReference | null;
  creatorName: string | null;
  supportName: string | null;
  supportAssigned: boolean;
  situation: string | null;
  situationLabel: string | null;
  document: string | null;
  documentLabel: string | null;
  sync: string | null;
  syncLabel: string | null;
};

export type OccurrenceDetailPayload = {
  ocorrencia: {
    id: string;
    numero_ocorrencia: string | null;
    numero_temporario: string | null;
    status: string | null;
    forma_solicitacao: string | null;
    nome_solicitante: string | null;
    telefone_solicitante: string | null;
    endereco_solicitante: string | null;
    codigo_municipal: string | null;
    complemento: string | null;
    bairro_solicitante: string | null;
    identificacao_adicional: string | null;
    codigo_operacional: string | null;
    local_ocorrencia: string;
    rodovia: string | null;
    bairro_ocorrencia: string | null;
    referencia: string | null;
    data_hora_inicio: string;
    data_hora_encerramento: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    observacoes: string | null;
    criado_por: string;
    criado_em: string | null;
    cancelado_em: string | null;
    motivo_cancelamento: string | null;
    ocorrencia_original_id: string | null;
    justificativa_retificacao: string | null;
    retificado_em: string | null;
    numero_versao: number | null;
    campos_alterados: unknown;
    solicitacao_retificacao_justificativa: string | null;
    solicitada_em: string | null;
    aprovada_em: string | null;
    rejeitada_em: string | null;
    motivo_rejeicao: string | null;
    tipo_ocorrencia: string | null;
    sub_tipo_ocorrencia: string | null;
    gravidade: string | null;
    numero_bo: string | null;
    orgao_bo: string | null;
    data_bo: string | null;
    cpf_solicitante: string | null;
    rg_solicitante: string | null;
    hash_pericial: string | null;
    data_hora_finalizacao: string | null;
    completado_em: string | null;
    completado_por: string | null;
    modo_criacao: string | null;
    origem_criacao: string;
  };
  criador: { nome_completo: string | null; matricula: string | null; perfil: string | null } | null;
  equipe: Array<{ papel: string; nome_completo: string; matricula: string | null; perfil: string | null }>;
  envolvidos: Array<{
    id: string;
    tipo: string;
    nome_completo: string;
    data_nascimento: string | null;
    rg: string | null;
    cpf: string | null;
    telefone: string | null;
    nome_pai: string | null;
    nome_mae: string | null;
    endereco: string | null;
    bairro: string | null;
    cidade: string | null;
    observacoes: string | null;
  }>;
  assinaturas: Array<{
    id: string | null;
    envolvido_id: string | null;
    tipo: string | null;
    nome: string | null;
    cpf: string | null;
    assinatura_data_url: string | null;
    assinado_em: string | null;
    assinado_por: string | null;
    nome_guarda: string | null;
    metodo: string | null;
  }>;
  anexos: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    mime_type: string | null;
    tamanho: number | null;
    url: string;
    url_thumb: string | null;
    criado_em: string | null;
    reference: PrivateImageReference | null;
    previewReference: PrivateImageReference | null;
  }>;
  historico: Array<{
    id: string;
    is_original: boolean;
    numero_versao: number | null;
    criado_em: string | null;
    retificado_em: string | null;
    status: string | null;
    campos_alterados: unknown;
  }>;
};

type RawOccurrenceRow = Omit<
  OccurrencePreview,
  "photo" | "creatorName" | "supportName" | "supportAssigned" | "situation" | "situationLabel" | "document" | "documentLabel" | "sync" | "syncLabel"
> & {
  criado_por: string | null;
};

export type ApproachPreview = {
  id: string;
  kind: "pessoa" | "veiculo";
  criado_em: string | null;
  data_hora_inicio: string | null;
  status_abordagem: string | null;
  status_regularizacao: string | null;
  local_abordagem: string | null;
  tipo_abordagem: string | null;
  tipo_atendimento: string | null;
  fase: string | null;
  photo: PrivateImageReference | null;
  creatorName: string | null;
  supportName: string | null;
  supportAssigned: boolean;
};

type RawApproachRow = {
  id: string;
  criado_em: string | null;
  data_hora_inicio: string | null;
  status_abordagem: string | null;
  status_regularizacao: string | null;
  local_abordagem: string | null;
  tipo_abordagem: string | null;
  tipo_atendimento: string | null;
  fase: string | null;
  criado_por: string | null;
  guarda_apoio_id: string | null;
  anexos: unknown;
};

type ApproachRecord = ApproachPreview & {
  creatorId: string | null;
  supportId: string | null;
};

type OccurrenceTeamRow = {
  ocorrencia_id: string;
  guarda_id: string;
  papel: string;
  ordem: number | null;
};

type OfficerNameRow = {
  id: string;
  displayName: string | null;
};

export type DashboardNotification = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string | null;
  lida: boolean | null;
  link: string | null;
  criado_em: string | null;
};

export type DashboardData = {
  occurrences: OccurrencePreview[];
  peopleApproaches: ApproachPreview[];
  vehicleApproaches: ApproachPreview[];
  approaches: ApproachPreview[];
  notifications: DashboardNotification[];
  unreadCount: number;
};

const PHOTO_BUCKET = "anexos" as const;
const OCCURRENCE_FIELDS =
  "id,criado_por,criado_em,numero_ocorrencia,numero_temporario,status,tipo_ocorrencia,sub_tipo_ocorrencia,gravidade,data_hora_inicio,local_ocorrencia,bairro_ocorrencia,cancelado_em";
const PAGE_SIZE = 500;
const UUID_FOLDER = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RELATIVE_RECORD_PATH = new RegExp(`^${UUID_FOLDER}/${UUID_FOLDER}/.+$`, "i");

export function isManagementRole(profileRole: string | null | undefined): boolean {
  const normalized = (profileRole ?? "").trim().toLowerCase();
  return ["admin", "administrador", "supervisor"].includes(normalized);
}

/**
 * Convert only known Supabase Storage object references into a private bucket/path pair.
 * We never pass a stored /object/public URL to an <img>; the component downloads the object
 * with the authenticated Supabase session and creates a temporary, local blob URL instead.
 */
export function privateImageReference(value: unknown): PrivateImageReference | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate) return null;

  let encodedPath: string | null = null;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const storedUrl = new URL(candidate);
      const configuredOrigin = new URL(supabaseUrl).origin;
      if (storedUrl.origin !== configuredOrigin) return null;
      const match = storedUrl.pathname.match(
        /\/storage\/v1\/object\/(?:public|authenticated|sign)\/anexos\/(.+)$/i,
      );
      if (!match) return null;
      encodedPath = match[1];
    } catch {
      return null;
    }
  } else {
    const relative = candidate.replace(/^\/+/, "");
    const routeMatch = relative.match(
      /^(?:storage\/v1\/object\/(?:public|authenticated|sign)\/)?(?:anexos\/)?(.+)$/i,
    );
    if (!routeMatch) return null;
    encodedPath = routeMatch[1];
    if (!relative.startsWith("storage/v1/object/") && !relative.startsWith("anexos/") && !RELATIVE_RECORD_PATH.test(encodedPath)) {
      return null;
    }
  }

  if (!encodedPath) return null;
  try {
    const segments = encodedPath.split("/").map((segment) => decodeURIComponent(segment));
    // Approach uploads can use a folder/file key with only two path segments.
    if (segments.length < 2 || segments.some((segment) =>
      !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("\0")
    )) return null;
    return { bucket: PHOTO_BUCKET, path: segments.join("/") };
  } catch {
    return null;
  }
}

function firstApproachImage(attachments: unknown): PrivateImageReference | null {
  if (!Array.isArray(attachments)) return null;
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== "object") continue;
    const item = attachment as Record<string, unknown>;
    const type = typeof item.tipo === "string" ? item.tipo.trim().toLowerCase() : "";
    const name = typeof item.nome === "string" ? item.nome.trim() : "";
    const isImage = type === "image" || type.startsWith("image/") || /\.(?:avif|gif|jpe?g|png|webp)$/i.test(name);
    if (!isImage) continue;
    const reference = privateImageReference(item.url);
    if (reference) return reference;
  }
  return null;
}

function toApproachRecord(row: RawApproachRow, kind: "pessoa" | "veiculo"): ApproachRecord {
  return {
    id: row.id,
    kind,
    criado_em: row.criado_em,
    data_hora_inicio: row.data_hora_inicio,
    status_abordagem: row.status_abordagem,
    status_regularizacao: row.status_regularizacao,
    local_abordagem: row.local_abordagem,
    tipo_abordagem: row.tipo_abordagem,
    tipo_atendimento: row.tipo_atendimento,
    fase: row.fase,
    photo: firstApproachImage(row.anexos),
    creatorName: null,
    supportName: null,
    supportAssigned: Boolean(row.guarda_apoio_id),
    creatorId: row.criado_por,
    supportId: row.guarda_apoio_id,
  };
}

async function getFirstOccurrenceImage(occurrenceId: string): Promise<PrivateImageReference | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("anexos")
    .select("url,url_thumb")
    .eq("ocorrencia_id", occurrenceId)
    .eq("tipo_arquivo", "image")
    .is("deleted_at", null)
    .order("criado_em", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return privateImageReference(data.url_thumb) ?? privateImageReference(data.url);
}

async function getOccurrenceImageMap(ids: string[]): Promise<Map<string, PrivateImageReference | null>> {
  const pairs = await Promise.all(ids.map(async (id) => [id, await getFirstOccurrenceImage(id)] as const));
  return new Map(pairs);
}

async function getOccurrenceStateMap(): Promise<Map<string, {
  situation: string | null; situationLabel: string | null;
  document: string | null; documentLabel: string | null;
  sync: string | null; syncLabel: string | null;
}>> {
  if (!supabase) return new Map();
  const { data, error } = await supabase.rpc("gm_ocorrencias_itens", {
    p_filtro: { aba: "todas" }, p_pagina: 0, p_tamanho: 50, p_ordenacao: "recentes",
  });
  if (error || !data || typeof data !== "object") return new Map();
  const rows = (data as { itens?: unknown }).itens;
  if (!Array.isArray(rows)) return new Map();
  const value = (row: Record<string, unknown>, key: string): string | null =>
    typeof row[key] === "string" && (row[key] as string).trim() ? (row[key] as string).trim() : null;
  return new Map(rows.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = value(row, "id");
    if (!id) return [];
    return [[id, {
      situation: value(row, "situacao"), situationLabel: value(row, "situacao_rotulo"),
      document: value(row, "documento"), documentLabel: value(row, "documento_rotulo"),
      sync: value(row, "sincronia"), syncLabel: value(row, "sincronia_rotulo"),
    }] as const];
  }));
}

async function getOccurrenceTeamLinks(ids: string[]): Promise<OccurrenceTeamRow[]> {
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("ocorrencia_guardas")
    .select("ocorrencia_id,guarda_id,papel,ordem")
    .in("ocorrencia_id", ids)
    .eq("esta_ativo", true)
    .order("ordem", { ascending: true, nullsFirst: false })
    .limit(Math.max(ids.length * 10, 1));
  if (error) return [];
  return (data ?? []) as OccurrenceTeamRow[];
}

function formatOfficerCallsign(value: string | null | undefined): string | null {
  const nickname = value?.trim().replace(/\s+/g, " ").replace(/^GM(?:\s+|$)/i, "").trim();
  return nickname ? `GM ${nickname}` : null;
}

async function getOfficerDirectory(ids: Array<string | null | undefined>): Promise<Map<string, OfficerNameRow>> {
  if (!supabase) return new Map();
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("usuarios")
    .select("id,apelido")
    .in("id", uniqueIds)
    .limit(uniqueIds.length);
  if (error) return new Map();

  return new Map((data ?? []).map((row) => [row.id, {
    id: row.id,
    displayName: formatOfficerCallsign(row.apelido),
  }]));
}

function sortByRecent<T extends { data_hora_inicio?: string | null; criado_em?: string | null }>(items: T[]): T[] {
  const timestamp = (value: string | null | undefined) => {
    if (!value) return 0;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return [...items].sort((a, b) => {
    const dateA = timestamp(a.criado_em) || timestamp(a.data_hora_inicio);
    const dateB = timestamp(b.criado_em) || timestamp(b.data_hora_inicio);
    return dateB - dateA;
  });
}

async function getParticipatedOccurrenceIds(profileId: string): Promise<string[]> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const ids: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("ocorrencia_guardas")
      .select("ocorrencia_id")
      .eq("guarda_id", profileId)
      .eq("esta_ativo", true)
      .order("criado_em", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    ids.push(...page.map((row) => row.ocorrencia_id));
    if (page.length < PAGE_SIZE) break;
  }
  return [...new Set(ids)];
}

async function getParticipatedOccurrences(ids: string[]): Promise<RawOccurrenceRow[]> {
  if (!supabase || ids.length === 0) return [];

  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += 75) {
    batches.push(ids.slice(index, index + 75));
  }

  const pages = await Promise.all(
    batches.map((batch) =>
      supabase!
        .from("ocorrencias")
        .select(OCCURRENCE_FIELDS)
        .in("id", batch)
        .is("deleted_at", null)
        .order("criado_em", { ascending: false, nullsFirst: false })
        .limit(6),
    ),
  );
  const results: RawOccurrenceRow[] = [];
  for (const { data, error } of pages) {
    if (error) throw error;
    results.push(...((data ?? []) as unknown as RawOccurrenceRow[]));
  }
  return results;
}

export async function loadDashboardData(profileId: string, profileRole: string | null): Promise<DashboardData> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const isTeamOverview = isManagementRole(profileRole);
  const occurrenceBaseQuery = supabase.from("ocorrencias").select(OCCURRENCE_FIELDS);
  const occurrenceQuery = isTeamOverview
    ? occurrenceBaseQuery
    : occurrenceBaseQuery.eq("criado_por", profileId);
  const peopleBaseQuery = supabase
    .from("abordagens_pessoas")
    .select("id,criado_em,data_hora_inicio,status_abordagem,status_regularizacao,local_abordagem,tipo_abordagem,tipo_atendimento,fase,criado_por,guarda_apoio_id,anexos");
  const peopleQuery = isTeamOverview
    ? peopleBaseQuery
    : peopleBaseQuery.or(`criado_por.eq.${profileId},guarda_apoio_id.eq.${profileId}`);
  const vehiclesBaseQuery = supabase
    .from("abordagens_veiculos")
    .select("id,criado_em,data_hora_inicio,status_abordagem,status_regularizacao,local_abordagem,tipo_abordagem,tipo_atendimento,fase,criado_por,guarda_apoio_id,anexos");
  const vehiclesQuery = isTeamOverview
    ? vehiclesBaseQuery
    : vehiclesBaseQuery.or(`criado_por.eq.${profileId},guarda_apoio_id.eq.${profileId}`);

  const [participatedIds, occurrencesResult, peopleResult, vehiclesResult, notificationResult, unreadResult] =
    await Promise.all([
      isTeamOverview ? Promise.resolve([] as string[]) : getParticipatedOccurrenceIds(profileId),
      occurrenceQuery
        .is("deleted_at", null)
        .order("criado_em", { ascending: false, nullsFirst: false })
        .limit(6),
      peopleQuery
        .order("criado_em", { ascending: false, nullsFirst: false })
        .limit(6),
      vehiclesQuery
        .order("criado_em", { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from("notificacoes")
        .select("id,titulo,mensagem,tipo,lida,link,criado_em")
        .eq("usuario_id", profileId)
        .order("criado_em", { ascending: false })
        .limit(6),
      supabase
        .from("notificacoes")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", profileId)
        .or("lida.is.null,lida.eq.false"),
    ]);

  for (const result of [occurrencesResult, peopleResult, vehiclesResult, notificationResult, unreadResult]) {
    if (result.error) throw result.error;
  }

  const participatedOccurrences = isTeamOverview ? [] : await getParticipatedOccurrences(participatedIds);
  const occurrencesById = new Map<string, RawOccurrenceRow>();
  for (const occurrence of [
    ...((occurrencesResult.data ?? []) as unknown as RawOccurrenceRow[]),
    ...participatedOccurrences,
  ]) {
    occurrencesById.set(occurrence.id, occurrence);
  }
  const rawOccurrences = sortByRecent([...occurrencesById.values()]).slice(0, 6);

  const rawPeople = (peopleResult.data ?? []) as unknown as RawApproachRow[];
  const rawVehicles = (vehiclesResult.data ?? []) as unknown as RawApproachRow[];
  const people = sortByRecent(rawPeople.map((row) => toApproachRecord(row, "pessoa"))).slice(0, 6);
  const vehicles = sortByRecent(rawVehicles.map((row) => toApproachRecord(row, "veiculo"))).slice(0, 6);
  const approaches = sortByRecent([...people, ...vehicles]).slice(0, 6);
  const visibleApproaches = isTeamOverview ? [...people, ...vehicles] : approaches;
  const occurrenceIds = rawOccurrences.map((row) => row.id);
  const [occurrencePhotos, occurrenceTeamLinks, occurrenceStates] = await Promise.all([
    getOccurrenceImageMap(occurrenceIds),
    getOccurrenceTeamLinks(occurrenceIds),
    getOccurrenceStateMap(),
  ]);

  const teamByOccurrence = new Map<string, OccurrenceTeamRow[]>();
  for (const link of occurrenceTeamLinks) {
    const current = teamByOccurrence.get(link.ocorrencia_id) ?? [];
    current.push(link);
    teamByOccurrence.set(link.ocorrencia_id, current);
  }

  const officerIds: Array<string | null> = [
    ...rawOccurrences.map((row) => row.criado_por),
    ...occurrenceTeamLinks.map((row) => row.guarda_id),
    ...visibleApproaches.flatMap((row) => [row.creatorId, row.supportId]),
  ];
  const officerDirectory = await getOfficerDirectory(officerIds);
  const displayOfficer = (id: string | null) => (id ? officerDirectory.get(id)?.displayName ?? null : null);

  const occurrences: OccurrencePreview[] = rawOccurrences.map((row) => {
    const team = teamByOccurrence.get(row.id) ?? [];
    const support = team.find((link) => link.papel.trim().toLowerCase() === "acompanhante");
    return {
      id: row.id,
      numero_ocorrencia: row.numero_ocorrencia,
      numero_temporario: row.numero_temporario,
      criado_em: row.criado_em,
      status: row.status,
      tipo_ocorrencia: row.tipo_ocorrencia,
      sub_tipo_ocorrencia: row.sub_tipo_ocorrencia,
      gravidade: row.gravidade,
      data_hora_inicio: row.data_hora_inicio,
      local_ocorrencia: row.local_ocorrencia,
      bairro_ocorrencia: row.bairro_ocorrencia,
      cancelado_em: row.cancelado_em,
      photo: occurrencePhotos.get(row.id) ?? null,
      creatorName: displayOfficer(row.criado_por),
      supportName: support ? displayOfficer(support.guarda_id) : null,
      supportAssigned: Boolean(support),
      situation: occurrenceStates.get(row.id)?.situation ?? null,
      situationLabel: occurrenceStates.get(row.id)?.situationLabel ?? null,
      document: occurrenceStates.get(row.id)?.document ?? null,
      documentLabel: occurrenceStates.get(row.id)?.documentLabel ?? null,
      sync: occurrenceStates.get(row.id)?.sync ?? null,
      syncLabel: occurrenceStates.get(row.id)?.syncLabel ?? null,
    };
  });

  const enrichApproach = (row: ApproachRecord): ApproachPreview => ({
    id: row.id,
    kind: row.kind,
    criado_em: row.criado_em,
    data_hora_inicio: row.data_hora_inicio,
    status_abordagem: row.status_abordagem,
    status_regularizacao: row.status_regularizacao,
    local_abordagem: row.local_abordagem,
    tipo_abordagem: row.tipo_abordagem,
    tipo_atendimento: row.tipo_atendimento,
    fase: row.fase,
    photo: row.photo,
    creatorName: displayOfficer(row.creatorId),
    supportName: row.supportId ? displayOfficer(row.supportId) : null,
    supportAssigned: Boolean(row.supportId),
  });

  return {
    occurrences,
    peopleApproaches: people.map(enrichApproach),
    vehicleApproaches: vehicles.map(enrichApproach),
    approaches: approaches.map(enrichApproach),
    notifications: (notificationResult.data ?? []) as DashboardNotification[],
    unreadCount: unreadResult.count ?? 0,
  };
}

export async function loadOccurrenceDetail(occurrenceId: string): Promise<OccurrenceDetailPayload> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");
  if (!occurrenceId.trim()) throw new Error("Registro não encontrado ou sem acesso.");

  const { data, error } = await supabase.rpc("gm_dashboard_ocorrencia_detalhe", {
    p_ocorrencia_id: occurrenceId,
  });
  if (error || !data || typeof data !== "object") {
    throw new Error("Não foi possível carregar o boletim completo. Verifique seu acesso e tente novamente.");
  }

  const payload = data as unknown as OccurrenceDetailPayload;
  if (!payload.ocorrencia?.id) {
    throw new Error("Registro não encontrado ou sem acesso.");
  }

  return {
    ...payload,
    equipe: Array.isArray(payload.equipe) ? payload.equipe : [],
    envolvidos: Array.isArray(payload.envolvidos) ? payload.envolvidos : [],
    assinaturas: Array.isArray(payload.assinaturas) ? payload.assinaturas : [],
    historico: Array.isArray(payload.historico) ? payload.historico : [],
    anexos: Array.isArray(payload.anexos)
      ? payload.anexos.map((attachment) => ({
          ...attachment,
          reference: privateImageReference(attachment.url),
          previewReference: privateImageReference(attachment.url_thumb) ?? privateImageReference(attachment.url),
        }))
      : [],
  };
}

export async function setNotificationReadState(
  profileId: string,
  notificationId: string,
  isRead: boolean,
): Promise<void> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: isRead, lida_em: isRead ? new Date().toISOString() : null })
    .eq("id", notificationId)
    .eq("usuario_id", profileId);
  if (error) throw error;
}

export async function setAllNotificationReadState(profileId: string, isRead: boolean): Promise<void> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");
  const update = supabase
    .from("notificacoes")
    .update({ lida: isRead, lida_em: isRead ? new Date().toISOString() : null })
    .eq("usuario_id", profileId);
  const { error } = isRead
    ? await update.or("lida.is.null,lida.eq.false")
    : await update.eq("lida", true);
  if (error) throw error;
}
