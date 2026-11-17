import { supabase } from "@/lib/supabase";

export type OccurrencePreview = {
  id: string;
  numero_ocorrencia: string | null;
  numero_temporario: string | null;
  status: string | null;
  tipo_ocorrencia: string | null;
  sub_tipo_ocorrencia: string | null;
  gravidade: string | null;
  data_hora_inicio: string | null;
  local_ocorrencia: string;
  bairro_ocorrencia: string | null;
  cancelado_em: string | null;
};

export type ApproachPreview = {
  id: string;
  kind: "pessoa" | "veiculo";
  criado_em: string | null;
  data_hora_inicio: string | null;
  local_abordagem: string | null;
  tipo_abordagem: string | null;
  tipo_atendimento: string | null;
  fase: string | null;
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
  pendingSyncCount: number;
  approaches: ApproachPreview[];
  notifications: DashboardNotification[];
  unreadCount: number;
};

const OCCURRENCE_FIELDS =
  "id,numero_ocorrencia,numero_temporario,status,tipo_ocorrencia,sub_tipo_ocorrencia,gravidade,data_hora_inicio,local_ocorrencia,bairro_ocorrencia,cancelado_em";
const PAGE_SIZE = 500;

async function getParticipatedOccurrenceIds(profileId: string): Promise<string[]> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const ids: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("ocorrencia_guardas")
      .select("ocorrencia_id")
      .eq("guarda_id", profileId)
      .order("criado_em", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    ids.push(...page.map((row) => row.ocorrencia_id));
    if (page.length < PAGE_SIZE) break;
  }
  return [...new Set(ids)];
}

async function getPendingSyncRows(): Promise<Array<{ id: string; criado_por: string }>> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const rows: Array<{ id: string; criado_por: string }> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("ocorrencias")
      .select("id,criado_por")
      .eq("status", "pending_sync")
      .is("deleted_at", null)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function getParticipatedOccurrences(ids: string[]): Promise<OccurrencePreview[]> {
  if (!supabase || ids.length === 0) return [];

  const results: OccurrencePreview[] = [];
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
        .order("data_hora_inicio", { ascending: false })
        .limit(6),
    ),
  );
  for (const { data, error } of pages) {
    if (error) throw error;
    results.push(...((data ?? []) as OccurrencePreview[]));
  }
  return results;
}

function sortByRecent<T extends { data_hora_inicio?: string | null; criado_em?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dateA = a.data_hora_inicio ?? a.criado_em ?? "";
    const dateB = b.data_hora_inicio ?? b.criado_em ?? "";
    return dateB.localeCompare(dateA);
  });
}

export async function loadDashboardData(profileId: string): Promise<DashboardData> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");

  const [participatedIds, pendingRows, ownOccurrencesResult, peopleResult, vehiclesResult, notificationResult, unreadResult] =
    await Promise.all([
      getParticipatedOccurrenceIds(profileId),
      getPendingSyncRows(),
      supabase
        .from("ocorrencias")
        .select(OCCURRENCE_FIELDS)
        .eq("criado_por", profileId)
        .is("deleted_at", null)
        .order("data_hora_inicio", { ascending: false })
        .limit(6),
      supabase
        .from("abordagens_pessoas")
        .select("id,criado_em,data_hora_inicio,local_abordagem,tipo_abordagem,tipo_atendimento,fase")
        .or(`criado_por.eq.${profileId},guarda_apoio_id.eq.${profileId}`)
        .order("criado_em", { ascending: false })
        .limit(4),
      supabase
        .from("abordagens_veiculos")
        .select("id,criado_em,data_hora_inicio,local_abordagem,tipo_abordagem,tipo_atendimento,fase")
        .or(`criado_por.eq.${profileId},guarda_apoio_id.eq.${profileId}`)
        .order("criado_em", { ascending: false })
        .limit(4),
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

  for (const result of [ownOccurrencesResult, peopleResult, vehiclesResult, notificationResult, unreadResult]) {
    if (result.error) throw result.error;
  }

  const participatedOccurrences = await getParticipatedOccurrences(participatedIds);
  const occurrencesById = new Map<string, OccurrencePreview>();
  for (const occurrence of [
    ...((ownOccurrencesResult.data ?? []) as OccurrencePreview[]),
    ...participatedOccurrences,
  ]) {
    occurrencesById.set(occurrence.id, occurrence);
  }
  const occurrences = sortByRecent([...occurrencesById.values()]).slice(0, 5);
  const participatedSet = new Set(participatedIds);
  const pendingSyncCount = pendingRows.filter(
    (row) => row.criado_por === profileId || participatedSet.has(row.id),
  ).length;

  const people: ApproachPreview[] = (peopleResult.data ?? []).map((row) => ({
    ...row,
    kind: "pessoa",
  }));
  const vehicles: ApproachPreview[] = (vehiclesResult.data ?? []).map((row) => ({
    ...row,
    kind: "veiculo",
  }));

  return {
    occurrences,
    pendingSyncCount,
    approaches: sortByRecent([...people, ...vehicles]).slice(0, 4),
    notifications: (notificationResult.data ?? []) as DashboardNotification[],
    unreadCount: unreadResult.count ?? 0,
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
