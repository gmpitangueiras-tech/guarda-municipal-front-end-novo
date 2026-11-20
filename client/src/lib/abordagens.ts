import { supabase } from "@/lib/supabase";
import { privateImageReference, type PrivateImageReference } from "@/lib/dashboard";

export type ApproachKind = "pessoas" | "veiculos";

export type ApproachItem = {
  id: string;
  kind: ApproachKind;
  criado_em: string | null;
  data_hora_inicio: string | null;
  data_hora_encerramento: string | null;
  data_hora_finalizacao: string | null;
  status_abordagem: string | null;
  status_regularizacao: string | null;
  status_retificacao: string | null;
  local_abordagem: string | null;
  tipo_abordagem: string | null;
  tipo_atendimento: string | null;
  fase: string | null;
  motivo: string | null;
  observacoes: string | null;
  providencia: string | null;
  identificacao_status: string | null;
  descricao_identificacao: string | null;
  tem_prazo: boolean | null;
  prazo_data: string | null;
  prazo_vencido: boolean | null;
  reincidencia_count: number | null;
  criado_por: string | null;
  guarda_apoio_id: string | null;
  numero_versao: number | null;
  esta_ativa: boolean | null;
  solicitada_em: string | null;
  aprovada_em: string | null;
  rejeitada_em: string | null;
  motivo_rejeicao: string | null;
  photo: PrivateImageReference | null;
  creatorName: string | null;
  supportName: string | null;
  pessoa: {
    nome: string | null;
    alcunha: string | null;
    cpf: string | null;
    rg: string | null;
    caracteristicas_fisicas: string | null;
    vestimentas: string | null;
  } | null;
  veiculo: {
    placa: string | null;
    marca_modelo: string | null;
    cor: string | null;
    condutor_nome: string | null;
    condutor_cpf: string | null;
  } | null;
};

export type ApproachFilters = {
  busca: string;
  status: string;
  regularizacao: string;
  de: string;
  ate: string;
  somenteAtivas: boolean;
};

export type NewApproachInput = {
  kind: ApproachKind;
  profileId: string;
  supportId: string;
  dataHoraInicio: string;
  local: string;
  tipoAbordagem: string;
  tipoAtendimento: string;
  fase: string;
  motivo: string;
  providencia: string;
  temPrazo: boolean;
  prazoData: string;
  pessoa?: { nome: string; alcunha: string; cpf: string; rg: string; caracteristicasFisicas: string; vestimentas: string };
  veiculo?: { placa: string; marcaModelo: string; cor: string; condutorNome: string; condutorCpf: string; identificacaoStatus: string; descricaoIdentificacao: string };
};

export const APPROACH_FILTERS_EMPTY: ApproachFilters = {
  busca: "",
  status: "",
  regularizacao: "",
  de: "",
  ate: "",
  somenteAtivas: true,
};

export async function createApproach(input: NewApproachInput): Promise<{ id: string }> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");
  if (!input.supportId) throw new Error("Selecione um GM de apoio.");
  if (input.supportId === input.profileId) throw new Error("O GM de apoio deve ser diferente do responsável.");
  const table = input.kind === "pessoas" ? "abordagens_pessoas" : "abordagens_veiculos";
  const common = {
    criado_por: input.profileId,
    guarda_apoio_id: input.supportId,
    data_hora_inicio: input.dataHoraInicio,
    local_abordagem: input.local.trim(),
    tipo_abordagem: input.tipoAbordagem,
    tipo_atendimento: input.tipoAtendimento,
    fase: input.fase,
    motivo: input.motivo.trim(),
    providencia: input.providencia.trim() || null,
    tem_prazo: input.temPrazo,
    prazo_data: input.temPrazo && input.prazoData ? input.prazoData : null,
    status_abordagem: "ativa",
    status_regularizacao: "pendente",
    status_retificacao: "normal",
    esta_ativa: true,
    anexos: [],
  };
  const record = input.kind === "pessoas"
    ? { ...common, nome: input.pessoa?.nome.trim(), alcunha: input.pessoa?.alcunha.trim() || null, cpf: input.pessoa?.cpf.trim() || null, rg: input.pessoa?.rg.trim() || null, caracteristicas_fisicas: input.pessoa?.caracteristicasFisicas.trim() || null, vestimentas: input.pessoa?.vestimentas.trim() || null }
    : { ...common, placa: input.veiculo?.placa.trim().toUpperCase() || null, marca_modelo: input.veiculo?.marcaModelo.trim() || null, cor: input.veiculo?.cor.trim() || null, condutor_nome: input.veiculo?.condutorNome.trim() || null, condutor_cpf: input.veiculo?.condutorCpf.trim() || null, identificacao_status: input.veiculo?.identificacaoStatus, descricao_identificacao: input.veiculo?.descricaoIdentificacao.trim() || null };
  const { data, error } = await supabase.from(table).insert(record as never).select("id").single();
  if (error || !data?.id) {
    const message = error?.message ?? "Não foi possível registrar a abordagem.";
    if (/GM de apoio|apoio/i.test(message)) throw new Error("Selecione um GM de apoio cadastrado e ativo, diferente do responsável.");
    throw new Error(message);
  }
  return { id: data.id as string };
}

const COMMON_FIELDS = "id,criado_em,data_hora_inicio,data_hora_encerramento,data_hora_finalizacao,status_abordagem,status_regularizacao,status_retificacao,local_abordagem,tipo_abordagem,tipo_atendimento,fase,motivo,observacoes,providencia,identificacao_status,descricao_identificacao,tem_prazo,prazo_data,prazo_vencido,reincidencia_count,criado_por,guarda_apoio_id,numero_versao,esta_ativa,solicitada_em,aprovada_em,rejeitada_em,motivo_rejeicao,anexos";
const PAGE_SIZE = 18;

type RawRow = Record<string, unknown>;

function cleanSearch(value: string): string {
  return value.replace(/[(),]/g, " ").replace(/[*]/g, "").trim().slice(0, 80);
}

function text(row: RawRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function privatePhoto(value: unknown): PrivateImageReference | null {
  if (!Array.isArray(value)) return null;
  for (const attachment of value) {
    if (!attachment || typeof attachment !== "object") continue;
    const item = attachment as RawRow;
    const name = text(item, "nome");
    const type = text(item, "tipo")?.toLowerCase() ?? "";
    if (type.startsWith("image") || /\.(?:jpe?g|png|webp|gif|avif)$/i.test(name ?? "")) {
      const reference = privateImageReference(item.url);
      if (reference) return reference;
    }
  }
  return null;
}

function toItem(row: RawRow, kind: ApproachKind, directory: Map<string, string>): ApproachItem {
  const createdBy = text(row, "criado_por");
  const supportId = text(row, "guarda_apoio_id");
  return {
    id: String(row.id), kind,
    criado_em: text(row, "criado_em"), data_hora_inicio: text(row, "data_hora_inicio"),
    data_hora_encerramento: text(row, "data_hora_encerramento"), data_hora_finalizacao: text(row, "data_hora_finalizacao"),
    status_abordagem: text(row, "status_abordagem"), status_regularizacao: text(row, "status_regularizacao"),
    status_retificacao: text(row, "status_retificacao"), local_abordagem: text(row, "local_abordagem"),
    tipo_abordagem: text(row, "tipo_abordagem"), tipo_atendimento: text(row, "tipo_atendimento"), fase: text(row, "fase"),
    motivo: text(row, "motivo"), observacoes: text(row, "observacoes"), providencia: text(row, "providencia"),
    identificacao_status: text(row, "identificacao_status"), descricao_identificacao: text(row, "descricao_identificacao"),
    tem_prazo: typeof row.tem_prazo === "boolean" ? row.tem_prazo : null, prazo_data: text(row, "prazo_data"),
    prazo_vencido: typeof row.prazo_vencido === "boolean" ? row.prazo_vencido : null,
    reincidencia_count: typeof row.reincidencia_count === "number" ? row.reincidencia_count : null,
    criado_por: createdBy, guarda_apoio_id: supportId, numero_versao: typeof row.numero_versao === "number" ? row.numero_versao : null,
    esta_ativa: typeof row.esta_ativa === "boolean" ? row.esta_ativa : null, solicitada_em: text(row, "solicitada_em"),
    aprovada_em: text(row, "aprovada_em"), rejeitada_em: text(row, "rejeitada_em"), motivo_rejeicao: text(row, "motivo_rejeicao"),
    photo: privatePhoto(row.anexos), creatorName: createdBy ? directory.get(createdBy) ?? null : null,
    supportName: supportId ? directory.get(supportId) ?? null : null,
    pessoa: kind === "pessoas" ? { nome: text(row, "nome"), alcunha: text(row, "alcunha"), cpf: text(row, "cpf"), rg: text(row, "rg"), caracteristicas_fisicas: text(row, "caracteristicas_fisicas"), vestimentas: text(row, "vestimentas") } : null,
    veiculo: kind === "veiculos" ? { placa: text(row, "placa"), marca_modelo: text(row, "marca_modelo"), cor: text(row, "cor"), condutor_nome: text(row, "condutor_nome"), condutor_cpf: text(row, "condutor_cpf") } : null,
  };
}

async function loadKind(kind: ApproachKind, filters: ApproachFilters, page: number): Promise<{ items: ApproachItem[]; total: number }> {
  if (!supabase) throw new Error("Serviço de dados indisponível.");
  const table = kind === "pessoas" ? "abordagens_pessoas" : "abordagens_veiculos";
  const fields = kind === "pessoas"
    ? `${COMMON_FIELDS},nome,alcunha,cpf,rg,caracteristicas_fisicas,vestimentas`
    : `${COMMON_FIELDS},placa,marca_modelo,cor,condutor_nome,condutor_cpf`;
  let query = supabase.from(table).select(fields, { count: "exact" }).order("data_hora_inicio", { ascending: false, nullsFirst: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (filters.somenteAtivas) query = query.eq("esta_ativa", true);
  if (filters.status) query = query.eq("status_abordagem", filters.status);
  if (filters.regularizacao) query = query.eq("status_regularizacao", filters.regularizacao);
  if (filters.de) query = query.gte("data_hora_inicio", `${filters.de}T00:00:00`);
  if (filters.ate) query = query.lte("data_hora_inicio", `${filters.ate}T23:59:59`);
  const search = cleanSearch(filters.busca);
  if (search) {
    const fieldsForSearch = kind === "pessoas" ? ["nome", "alcunha", "cpf", "rg", "local_abordagem", "motivo"] : ["placa", "marca_modelo", "condutor_nome", "local_abordagem", "motivo"];
    query = query.or(fieldsForSearch.map((field) => `${field}.ilike.%${search}%`).join(","));
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: ((data ?? []) as unknown as RawRow[]).map((row) => toItem(row, kind, new Map())), total: count ?? 0 };
}

export async function loadApproaches(filters: ApproachFilters, page: number): Promise<{ items: ApproachItem[]; total: number; hasMore: boolean }> {
  const [people, vehicles] = await Promise.all([loadKind("pessoas", filters, page), loadKind("veiculos", filters, page)]);
  const ids = [...new Set([...people.items, ...vehicles.items].flatMap((item) => [item.criado_por, item.guarda_apoio_id]).filter((id): id is string => Boolean(id)))];
  let directory = new Map<string, string>();
  if (supabase && ids.length) {
    const { data } = await supabase.from("usuarios").select("id,apelido").in("id", ids).limit(ids.length);
    directory = new Map((data ?? []).map((row) => [row.id, row.apelido?.trim() ? `GM ${row.apelido.trim().replace(/^GM\s+/i, "")}` : "GM sem apelido"]));
  }
  const items = [...people.items, ...vehicles.items].map((item) => ({ ...item, creatorName: item.criado_por ? directory.get(item.criado_por) ?? null : null, supportName: item.guarda_apoio_id ? directory.get(item.guarda_apoio_id) ?? null : null })).sort((a, b) => Date.parse(b.data_hora_inicio ?? b.criado_em ?? "") - Date.parse(a.data_hora_inicio ?? a.criado_em ?? ""));
  return { items, total: people.total + vehicles.total, hasMore: people.items.length === PAGE_SIZE || vehicles.items.length === PAGE_SIZE };
}
