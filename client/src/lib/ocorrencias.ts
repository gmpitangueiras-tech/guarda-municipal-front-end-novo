import { supabase } from "@/lib/supabase";

/**
 * Camada de dados de ocorrências.
 *
 * Regra de ouro: o único estado da tela vem das RPCs `gm_ocorrencias_itens` e
 * `gm_ocorrencias_totais`. Nada aqui deriva situação, documento, sincronia ou
 * contagens a partir de colunas soltas — o servidor (definição
 * `ocorrencias-3eixos-v1`) devolve rótulos prontos para exibição.
 */

const SEM_SERVICOS = "O serviço de dados não está disponível. Avise o administrador do sistema.";
const TAMANHO_PAGINA = 20;

export type AbaOcorrencia =
  | "todas"
  | "minhas"
  | "corporacao"
  | "atendimento"
  | "complementar"
  | "encerradas"
  | "inconsistente";

export type OrdenacaoOcorrencia = "recentes" | "antigas" | "sem_fechar" | "tipo";

export type JanelaTemporal = "inicio" | "encerramento";

export type SituacaoOcorrencia =
  | "em_atendimento"
  | "encerrada"
  | "encerrada_sem_horario"
  | "cancelada"
  | "inconsistente";

export type DocumentoOcorrencia = "em_redacao" | "incompleto" | "concluido" | "retificando" | "retificado";

export type SincroniaOcorrencia =
  | "no_aparelho"
  | "aguardando_reconhecimento"
  | "reconhecido"
  | "falha_sincronia";

export type ConfiancaEncerramento = "registrado" | "coletavel" | "nao_registrado";

export type GravidadeSlug = "baixa" | "media" | "alta" | "critica";

type EscalarRpc = string | number | boolean | string[] | null;
type ArgsRpc = Record<string, unknown>;

/** Filtro canônico enviado como `p_filtro` nas duas RPCs de leitura. */
export type FiltroOcorrencias = {
  aba: AbaOcorrencia;
  busca: string;
  janela: JanelaTemporal;
  de: string;
  ate: string;
  tipo: string[];
  origem: string[];
  gravidade: string[];
  qualidade: string[];
  situacao: string[];
  gmId: string;
  local: string;
  somenteComBo: boolean;
  somenteSemBo: boolean;
};

export const FILTRO_VAZIO: FiltroOcorrencias = {
  aba: "todas",
  busca: "",
  janela: "inicio",
  de: "",
  ate: "",
  tipo: [],
  origem: [],
  gravidade: [],
  qualidade: [],
  situacao: [],
  gmId: "",
  local: "",
  somenteComBo: false,
  somenteSemBo: false,
};

export type OcorrenciaItem = {
  id: string;
  numero_ocorrencia: string | null;
  numero_bo: string | null;
  orgao_bo: string | null;
  identidade: string;
  tipo: string;
  tipo_rotulo: string;
  sub_tipo: string | null;
  gravidade: string;
  gravidade_rotulo: string;
  origem: string | null;
  situacao: SituacaoOcorrencia;
  situacao_rotulo: string;
  documento: DocumentoOcorrencia;
  documento_rotulo: string;
  sincronia: SincroniaOcorrencia;
  sincronia_rotulo: string;
  sincronia_alarme: boolean;
  encerramento_confianca: ConfiancaEncerramento;
  inconsistente: boolean;
  duracao_min: number | null;
  data_hora_inicio: string | null;
  data_hora_encerramento: string | null;
  completado_em: string | null;
  criado_em: string | null;
  sincronizado_em: string | null;
  origem_criacao: string | null;
  local: string | null;
  bairro: string | null;
  referencia: string | null;
  rodovia: string | null;
  tem_coordenada: boolean;
  latitude: number | null;
  longitude: number | null;
  relato: string | null;
  responsavel: string | null;
  responsavel_sem_apelido: boolean;
  apoio: string[];
  equipe_registrada: boolean;
  tem_retificacao: boolean;
  fotos_total: number;
  anexos_total: number;
  envolvidos_total: number;
  foto_url: string | null;
  foto_thumb: string | null;
};

export type AgrupamentoOcorrencia = { chave: string; titulo: string; quantidade: number };

export type PaginaOcorrencias = {
  itens: OcorrenciaItem[];
  total: number;
  pagina: number;
  tamanho: number;
  temMais: boolean;
  agrupamentos: AgrupamentoOcorrencia[];
  hashFiltro: string;
  versaoDefinicao: string;
  geradoEm: string;
};

export type FacetaValor = { valor: string; rotulo: string; quantidade: number };
export type FacetaSimples = { valor: string; quantidade: number };
export type FacetaGm = { id: string; rotulo: string; quantidade: number };

export type TotaisOcorrencias = {
  funil: Record<string, number>;
  abas: {
    todas: number;
    atendimento: number;
    complementar: number;
    encerradas: number;
    inconsistente: number;
  };
  facetas: {
    tipos: FacetaValor[];
    origens: FacetaSimples[];
    gravidades: FacetaValor[];
    bairros: FacetaSimples[];
    gms: FacetaGm[];
    qualidade: Record<string, number>;
  };
  metricas: {
    total: number;
    duracao_media_min: number | null;
    taxa_encerramento_pct: number | null;
    inconsistentes: number;
    heranca_sem_equipe: number;
    novos_sem_equipe: number;
    novos_sem_gravidade: number;
  };
  escopo: string;
  hashFiltro: string;
  versaoDefinicao: string;
  geradoEm: string;
};

type ObjetoBruto = Record<string, unknown>;

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo ? limpo : null;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function numeroOpcional(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function logico(valor: unknown): boolean {
  return valor === true;
}

function objetoBruto(valor: unknown): ObjetoBruto {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as ObjetoBruto) : {};
}

function listaBruta(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function mapaNumerico(valor: unknown): Record<string, number> {
  return Object.fromEntries(
    Object.entries(objetoBruto(valor)).map(([chave, conteudo]) => [chave, numero(conteudo)]),
  );
}

async function rpcJson<T>(nome: string, args: ArgsRpc): Promise<T> {
  if (!supabase) throw new Error(SEM_SERVICOS);
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw new Error(texto(error.message) || SEM_SERVICOS);
  return data as unknown as T;
}

function montarPFiltro(filtro: FiltroOcorrencias): Record<string, EscalarRpc> {
  const payload: Record<string, EscalarRpc> = { aba: filtro.aba };
  const busca = filtro.busca.trim().slice(0, 80);
  if (busca) payload.busca = busca;
  payload.janela = filtro.janela;
  if (filtro.de) payload.de = filtro.de;
  if (filtro.ate) payload.ate = filtro.ate;
  if (filtro.tipo.length) payload.tipo = filtro.tipo;
  if (filtro.origem.length) payload.origem = filtro.origem;
  if (filtro.gravidade.length) payload.gravidade = filtro.gravidade;
  if (filtro.qualidade.length) payload.qualidade = filtro.qualidade;
  if (filtro.situacao.length) payload.situacao = filtro.situacao;
  if (filtro.gmId) payload.gm_id = filtro.gmId;
  const local = filtro.local.trim().slice(0, 80);
  if (local) payload.local = local;
  if (filtro.somenteComBo) payload.somente_com_bo = true;
  if (filtro.somenteSemBo) payload.somente_sem_bo = true;
  return payload;
}

function normalizarItem(bruto: ObjetoBruto): OcorrenciaItem {
  return {
    id: texto(bruto.id),
    numero_ocorrencia: textoOpcional(bruto.numero_ocorrencia),
    numero_bo: textoOpcional(bruto.numero_bo),
    orgao_bo: textoOpcional(bruto.orgao_bo),
    identidade: texto(bruto.identidade) || "Número em geração",
    tipo: texto(bruto.tipo) || "outro",
    tipo_rotulo: texto(bruto.tipo_rotulo) || "Outro (não classificado)",
    sub_tipo: textoOpcional(bruto.sub_tipo),
    gravidade: texto(bruto.gravidade) || "nao_informado",
    gravidade_rotulo: texto(bruto.gravidade_rotulo) || "Não informada",
    origem: textoOpcional(bruto.origem),
    situacao: (texto(bruto.situacao) || "em_atendimento") as SituacaoOcorrencia,
    situacao_rotulo: texto(bruto.situacao_rotulo) || "Em atendimento",
    documento: (texto(bruto.documento) || "em_redacao") as DocumentoOcorrencia,
    documento_rotulo: texto(bruto.documento_rotulo) || "Em redação",
    sincronia: (texto(bruto.sincronia) || "aguardando_reconhecimento") as SincroniaOcorrencia,
    sincronia_rotulo: texto(bruto.sincronia_rotulo) || "Aguardando reconhecimento",
    sincronia_alarme: logico(bruto.sincronia_alarme),
    encerramento_confianca: (texto(bruto.encerramento_confianca) || "nao_registrado") as ConfiancaEncerramento,
    inconsistente: logico(bruto.inconsistente),
    duracao_min: numeroOpcional(bruto.duracao_min),
    data_hora_inicio: textoOpcional(bruto.data_hora_inicio),
    data_hora_encerramento: textoOpcional(bruto.data_hora_encerramento),
    completado_em: textoOpcional(bruto.completado_em),
    criado_em: textoOpcional(bruto.criado_em),
    sincronizado_em: textoOpcional(bruto.sincronizado_em),
    origem_criacao: textoOpcional(bruto.origem_criacao),
    local: textoOpcional(bruto.local),
    bairro: textoOpcional(bruto.bairro),
    referencia: textoOpcional(bruto.referencia),
    rodovia: textoOpcional(bruto.rodovia),
    tem_coordenada: logico(bruto.tem_coordenada),
    latitude: numeroOpcional(bruto.latitude),
    longitude: numeroOpcional(bruto.longitude),
    relato: textoOpcional(bruto.relato),
    responsavel: textoOpcional(bruto.responsavel),
    responsavel_sem_apelido: logico(bruto.responsavel_sem_apelido),
    apoio: listaBruta(bruto.apoio).map(texto).filter(Boolean),
    equipe_registrada: logico(bruto.equipe_registrada),
    tem_retificacao: logico(bruto.tem_retificacao),
    fotos_total: numero(bruto.fotos_total),
    anexos_total: numero(bruto.anexos_total),
    envolvidos_total: numero(bruto.envolvidos_total),
    foto_url: textoOpcional(bruto.foto_url),
    foto_thumb: textoOpcional(bruto.foto_thumb),
  };
}

export async function carregarPaginaOcorrencias(
  filtro: FiltroOcorrencias,
  pagina: number,
  ordenacao: OrdenacaoOcorrencia,
): Promise<PaginaOcorrencias> {
  const resposta = objetoBruto(
    await rpcJson<unknown>("gm_ocorrencias_itens", {
      p_filtro: montarPFiltro(filtro),
      p_pagina: Math.max(pagina, 0),
      p_tamanho: TAMANHO_PAGINA,
      p_ordenacao: ordenacao,
    }),
  );
  return {
    itens: listaBruta(resposta.itens).map((linha) => normalizarItem(objetoBruto(linha))),
    total: numero(resposta.total),
    pagina: numero(resposta.pagina),
    tamanho: numero(resposta.tamanho) || TAMANHO_PAGINA,
    temMais: logico(resposta.tem_mais),
    agrupamentos: listaBruta(resposta.agrupamentos).map((linha) => {
      const grupo = objetoBruto(linha);
      return { chave: texto(grupo.chave), titulo: texto(grupo.titulo), quantidade: numero(grupo.quantidade) };
    }),
    hashFiltro: texto(resposta.hash_filtro),
    versaoDefinicao: texto(resposta.versao_definicao),
    geradoEm: texto(resposta.gerado_em),
  };
}

export async function carregarTotaisOcorrencias(filtro: FiltroOcorrencias): Promise<TotaisOcorrencias> {
  const resposta = objetoBruto(
    await rpcJson<unknown>("gm_ocorrencias_totais", { p_filtro: montarPFiltro(filtro) }),
  );
  const abas = objetoBruto(resposta.abas);
  const facetas = objetoBruto(resposta.facetas);
  const metricas = objetoBruto(resposta.metricas);
  return {
    funil: mapaNumerico(resposta.funil),
    abas: {
      todas: numero(abas.todas),
      atendimento: numero(abas.atendimento),
      complementar: numero(abas.complementar),
      encerradas: numero(abas.encerradas),
      inconsistente: numero(abas.inconsistente),
    },
    facetas: {
      tipos: listaBruta(facetas.tipos).map((linha) => {
        const f = objetoBruto(linha);
        return { valor: texto(f.valor), rotulo: texto(f.rotulo), quantidade: numero(f.quantidade) };
      }),
      origens: listaBruta(facetas.origens).map((linha) => {
        const f = objetoBruto(linha);
        return { valor: texto(f.valor), quantidade: numero(f.quantidade) };
      }),
      gravidades: listaBruta(facetas.gravidades).map((linha) => {
        const f = objetoBruto(linha);
        return { valor: texto(f.valor), rotulo: texto(f.rotulo), quantidade: numero(f.quantidade) };
      }),
      bairros: listaBruta(facetas.bairros).map((linha) => {
        const f = objetoBruto(linha);
        return { valor: texto(f.valor), quantidade: numero(f.quantidade) };
      }),
      gms: listaBruta(facetas.gms).map((linha) => {
        const f = objetoBruto(linha);
        return { id: texto(f.id), rotulo: texto(f.rotulo), quantidade: numero(f.quantidade) };
      }),
      qualidade: mapaNumerico(facetas.qualidade),
    },
    metricas: {
      total: numero(metricas.total),
      duracao_media_min: numeroOpcional(metricas.duracao_media_min),
      taxa_encerramento_pct: numeroOpcional(metricas.taxa_encerramento_pct),
      inconsistentes: numero(metricas.inconsistentes),
      heranca_sem_equipe: numero(metricas.heranca_sem_equipe),
      novos_sem_equipe: numero(metricas.novos_sem_equipe),
      novos_sem_gravidade: numero(metricas.novos_sem_gravidade),
    },
    escopo: texto(resposta.escopo),
    hashFiltro: texto(resposta.hash_filtro),
    versaoDefinicao: texto(resposta.versao_definicao),
    geradoEm: texto(resposta.gerado_em),
  };
}

/** Aba de escopo: mantém período, busca e facetas; remove apenas o recorte de estado. */
export function abaDeEscopo(aba: AbaOcorrencia): AbaOcorrencia {
  if (aba === "minhas" || aba === "corporacao") return aba;
  return "todas";
}

/**
 * Os contadores de aba e os KPIs clicáveis precisam ser estáveis enquanto o
 * usuário troca de aba. `gm_ocorrencias_totais` calcula `abas` dentro do recorte
 * recebido, então a passada também pede os totais do escopo (mesmo filtro, sem o
 * recorte de estado). A coerência lista × totais continua sendo conferida com o
 * filtro exato da lista.
 */
export type PassadaOcorrencias = {
  pagina: PaginaOcorrencias;
  totais: TotaisOcorrencias;
  totaisEscopo: TotaisOcorrencias;
  avisoCoerencia: boolean;
};

function coerente(pagina: PaginaOcorrencias, totais: TotaisOcorrencias): boolean {
  return Boolean(pagina.hashFiltro) && pagina.hashFiltro === totais.hashFiltro;
}

export async function carregarPainelOcorrencias(
  filtro: FiltroOcorrencias,
  pagina: number,
  ordenacao: OrdenacaoOcorrencia,
): Promise<PassadaOcorrencias> {
  const executar = () =>
    Promise.all([
      carregarPaginaOcorrencias(filtro, pagina, ordenacao),
      carregarTotaisOcorrencias(filtro),
      carregarTotaisOcorrencias({ ...filtro, aba: abaDeEscopo(filtro.aba) }),
    ]);

  const [primeiraPagina, primeiraTotais, primeiraEscopo] = await executar();
  if (coerente(primeiraPagina, primeiraTotais)) {
    return { pagina: primeiraPagina, totais: primeiraTotais, totaisEscopo: primeiraEscopo, avisoCoerencia: false };
  }

  const [segundaPagina, segundaTotais, segundaEscopo] = await executar();
  return {
    pagina: segundaPagina,
    totais: segundaTotais,
    totaisEscopo: segundaEscopo,
    avisoCoerencia: !coerente(segundaPagina, segundaTotais),
  };
}

/** Busca pontual pelo número da ocorrência, usada pelo deep link de detalhe. */
export async function buscarOcorrenciaPorNumero(numero: string): Promise<OcorrenciaItem | null> {
  const alvo = numero.trim().toUpperCase();
  if (!alvo) return null;
  const pagina = await carregarPaginaOcorrencias({ ...FILTRO_VAZIO, busca: alvo }, 0, "recentes");
  return pagina.itens.find((item) => (item.numero_ocorrencia ?? item.numero_bo ?? "").toUpperCase() === alvo) ?? null;
}

/* ------------------------------------------------------------------ *
 * Dicionários conhecidos do servidor (gm_rotulo / colunas do banco).
 * Alimentam selects; o rótulo exibido em lista e detalhe vem sempre da RPC.
 * ------------------------------------------------------------------ */

export const TIPOS_CONHECIDOS: Array<{ valor: string; rotulo: string }> = [
  { valor: "furto", rotulo: "Furto" },
  { valor: "roubo", rotulo: "Roubo" },
  { valor: "perturbacao", rotulo: "Perturbação do sossego" },
  { valor: "ameaca", rotulo: "Ameaça" },
  { valor: "lesao_corporal", rotulo: "Lesão corporal" },
  { valor: "violencia_domestica", rotulo: "Violência doméstica" },
  { valor: "acidente", rotulo: "Acidente de trânsito" },
  { valor: "vandalismo", rotulo: "Vandalismo" },
  { valor: "dano_ao_patrimonio", rotulo: "Dano ao patrimônio" },
  { valor: "incendio", rotulo: "Incêndio" },
  { valor: "desaparecimento", rotulo: "Pessoa desaparecida" },
  { valor: "atendimento_social", rotulo: "Atendimento social" },
  { valor: "abandono_de_animal", rotulo: "Abandono de animal" },
  { valor: "outro", rotulo: "Outro (não classificado)" },
];

export const FORMAS_SOLICITACAO = [
  "Via CCO",
  "Diretamente com a Guarda Municipal",
  "Diretamente com a ocorrência",
] as const;

/**
 * Tipos oferecidos no formulário de registro.
 *
 * Cada rótulo foi conferido contra `gm_rotulo('tipo', slug)` no servidor: um
 * slug fora do dicionário volta em caixa-alta sem acento ("Atencao Local"),
 * então o formulário repete exatamente essa string — lista e detalhe nunca
 * podem mostrar nome diferente do que o guarda escolheu aqui. `acidente_transito`
 * ficou de fora de propósito: é sinônimo de `acidente`, que o servidor já
 * traduz como "Acidente de trânsito".
 */
export const TIPOS_REGISTRO: Array<{ valor: string; rotulo: string }> = [
  { valor: "furto", rotulo: "Furto" },
  { valor: "roubo", rotulo: "Roubo" },
  { valor: "perturbacao", rotulo: "Perturbação do sossego" },
  { valor: "ameaca", rotulo: "Ameaça" },
  { valor: "lesao_corporal", rotulo: "Lesão corporal" },
  { valor: "violencia_domestica", rotulo: "Violência doméstica" },
  { valor: "acidente", rotulo: "Acidente de trânsito" },
  { valor: "vandalismo", rotulo: "Vandalismo" },
  { valor: "dano_ao_patrimonio", rotulo: "Dano ao patrimônio" },
  { valor: "incendio", rotulo: "Incêndio" },
  { valor: "desaparecimento", rotulo: "Pessoa desaparecida" },
  { valor: "atendimento_social", rotulo: "Atendimento social" },
  { valor: "abandono_de_animal", rotulo: "Abandono de animal" },
  { valor: "morte", rotulo: "Morte" },
  { valor: "atencao_local", rotulo: "Atencao Local" },
  { valor: "vigilancia_local", rotulo: "Vigilancia Local" },
  { valor: "apoio_a_autoridade", rotulo: "Apoio A Autoridade" },
  { valor: "autoridade_presente", rotulo: "Autoridade Presente" },
  { valor: "aparecimento_objeto", rotulo: "Aparecimento Objeto" },
  { valor: "outro", rotulo: "Outro (não classificado)" },
];

/** Órgão do BO externo: grava só o código. Não existe integração com a PC. */
export const ORGAOS_BO: Array<{ valor: string; rotulo: string }> = [
  { valor: "PC", rotulo: "PC · Polícia Civil" },
  { valor: "PM", rotulo: "PM · Polícia Militar" },
  { valor: "PRF", rotulo: "PRF · Polícia Rodoviária Federal" },
  { valor: "GCM", rotulo: "GCM · Guarda Municipal" },
];

export const GRAVIDADES: Array<{ valor: GravidadeSlug; rotulo: string }> = [
  { valor: "baixa", rotulo: "Baixa" },
  { valor: "media", rotulo: "Média" },
  { valor: "alta", rotulo: "Alta" },
  { valor: "critica", rotulo: "Crítica" },
];

/** Tom de cada gravidade no formulário: slate · âmbar · laranja · vermelho. */
export const TOM_GRAVIDADE: Record<GravidadeSlug, string> = {
  baixa: "slate",
  media: "ambar",
  alta: "laranja",
  critica: "vermelho",
};

/* ------------------------------------------------------------------ *
 * Coordenadas: texto livre do guarda -> par numérico aceito pelo banco.
 * ------------------------------------------------------------------ */

export type Coordenadas = { latitude: number; longitude: number };

function comoNumero(valor: string): number | null {
  const limpo = valor.trim().replace(/,/g, ".");
  if (!limpo) return null;
  const numeroLocal = Number(limpo);
  return Number.isFinite(numeroLocal) ? numeroLocal : null;
}

function seisCasas(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

/**
 * Leitura tolerante: aceita `-23.3,-46.3`, `-23.3 -46.3`, `-23,3;-46,3`, ponto
 * ou vírgula decimal e longitude oeste com sinal. Devolve `null` quando o texto
 * não forma um par dentro das faixas válidas.
 */
export function parsearCoordenadas(valor: string | null | undefined): Coordenadas | null {
  const bruto = texto(valor).replace(/[°º]/g, " ").trim();
  if (!bruto) return null;
  let partes = bruto.split(/[,;/\s]+/).filter(Boolean);
  if (partes.length === 4) partes = [`${partes[0]}.${partes[1]}`, `${partes[2]}.${partes[3]}`];
  if (partes.length !== 2) return null;
  const latitude = comoNumero(partes[0]);
  const longitude = comoNumero(partes[1]);
  if (latitude === null || longitude === null) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude: seisCasas(latitude), longitude: seisCasas(longitude) };
}

/** Coordenada no formato do campo de texto e da tela de revisão. */
export function textoDasCoordenadas(valor: Coordenadas | null): string {
  if (!valor) return "";
  return `${valor.latitude.toFixed(6)}, ${valor.longitude.toFixed(6)}`;
}

/* ------------------------------------------------------------------ *
 * Mensagens do servidor (`gm_registrar_ocorrencia` / `gm_completar_bo`),
 * copiadas ao pé da letra: o formulário corrige com as mesmas palavras que o
 * banco usaria, então o guarda nunca lê dois textos para o mesmo problema.
 * ------------------------------------------------------------------ */

export const MSG = {
  sessaoPerdida: "Sessão não identificada. Faça login novamente para registrar a ocorrência.",
  gravidade: "Gravidade inválida. Escolha Baixa, Média, Alta ou Crítica.",
  tipo: "Informe o tipo da ocorrência.",
  forma: "Informe como o acionamento chegou até a Guarda.",
  local: "Informe o local da ocorrência.",
  inicio: "Informe o horário em que o atendimento começou.",
  encerramentoAnteriorRegistro: "O horário de encerramento não pode ser anterior ao início do atendimento.",
  responsavel: "Escolha o GM responsável: o administrador do sistema não assina atendimento em campo.",
  responsavelEscolha: "Escolha o GM responsável pelo atendimento.",
  responsavelInativo: "O GM responsável precisa estar cadastrado e ativo no sistema.",
  apoio: "Escolha o GM que deu apoio. Nenhum atendimento é registrado sozinho.",
  apoioIgualResponsavel: "O GM de apoio deve ser diferente do GM responsável pela ocorrência.",
  apoioInativo: "O GM de apoio precisa estar cadastrado e ativo no sistema.",
  coordenadas: "Coordenadas no formato -23.3,-46.3 (latitude e longitude em graus decimais).",
  encerramentoObrigatorio: "Informe o horário em que o atendimento terminou.",
  encerramentoAnterior: "O encerramento não pode ser anterior ao início do atendimento.",
  gravidadeParaConcluir: "Este BO está sem gravidade. Escolha Baixa, Média, Alta ou Crítica para concluir.",
  apoioParaConcluir: "Esta ocorrência não tem GM de apoio registrado. Informe o apoio para concluir.",
  apoioExigeGestao: "Registrar apoio em um BO já sincronizado exige supervisão ou administração.",
  semPermissao: "Você não tem permissão para concluir esta ocorrência.",
  jaConcluido: "Este BO já foi concluído.",
} as const;

export const ROTULO_QUALIDADE: Record<string, string> = {
  sem_coordenada: "Sem coordenada",
  sem_bairro: "Sem bairro",
  sem_foto: "Sem foto",
  sem_equipe: "Sem equipe",
  incompleto: "BO incompleto",
  inconsistente: "Datas inconsistentes",
};

export const ROTULO_SITUACAO: Record<string, string> = {
  em_atendimento: "Em atendimento",
  encerrada: "Encerrada",
  encerrada_sem_horario: "Encerrada sem horário registrado",
  cancelada: "Cancelada",
  inconsistente: "Datas inconsistentes",
};

export const ROTULO_ORDENACAO: Record<OrdenacaoOcorrencia, string> = {
  recentes: "Mais recentes primeiro",
  antigas: "Mais antigas primeiro",
  sem_fechar: "Sem encerramento, da mais antiga",
  tipo: "Agrupadas por tipo",
};

/* ------------------------------------------------------------------ *
 * Escrita — criação de BO e conclusão de BO.
 * ------------------------------------------------------------------ */

export type DadosNovoRegistro = {
  tipo_ocorrencia: string;
  sub_tipo_ocorrencia?: string | null;
  gravidade: GravidadeSlug;
  forma_solicitacao: string;
  local_ocorrencia: string;
  bairro_ocorrencia?: string | null;
  referencia?: string | null;
  rodovia?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  data_hora_inicio: string;
  data_hora_encerramento?: string | null;
  observacoes?: string | null;
  numero_bo?: string | null;
  orgao_bo?: string | null;
  data_bo?: string | null;
  nome_solicitante?: string | null;
  telefone_solicitante?: string | null;
  cpf_solicitante?: string | null;
  identificacao_adicional?: string | null;
  codigo_operacional?: string | null;
  modo_criacao: "completo" | "rapido";
  responsavel_id?: string | null;
  apoio_id: string;
};

export type ResultadoRegistro = {
  id: string;
  numero_ocorrencia: string | null;
  modo_criacao: string;
  gravidade: string;
  status: string;
};

export type ResultadoConclusao = {
  id: string;
  numero_ocorrencia: string | null;
  completado_em: string | null;
  situacao: string;
  documento: string;
};

export async function registrarOcorrencia(dados: DadosNovoRegistro): Promise<ResultadoRegistro> {
  const resposta = objetoBruto(
    await rpcJson<unknown>("gm_registrar_ocorrencia", { p_dados: dados, p_equipe: [] }),
  );
  return {
    id: texto(resposta.id),
    numero_ocorrencia: textoOpcional(resposta.numero_ocorrencia),
    modo_criacao: texto(resposta.modo_criacao),
    gravidade: texto(resposta.gravidade),
    status: texto(resposta.status),
  };
}

export async function concluirBO(parametros: {
  ocorrenciaId: string;
  encerramento: string;
  gravidade?: GravidadeSlug | null;
  observacoes?: string | null;
  apoioId?: string | null;
}): Promise<ResultadoConclusao> {
  const resposta = objetoBruto(
    await rpcJson<unknown>("gm_completar_bo", {
      p_ocorrencia_id: parametros.ocorrenciaId,
      p_encerramento: parametros.encerramento,
      p_gravidade: parametros.gravidade ?? null,
      p_observacoes: parametros.observacoes?.trim() ? parametros.observacoes.trim() : null,
      p_apoio_id: parametros.apoioId ?? null,
    }),
  );
  return {
    id: texto(resposta.id),
    numero_ocorrencia: textoOpcional(resposta.numero_ocorrencia),
    completado_em: textoOpcional(resposta.completado_em),
    situacao: texto(resposta.situacao),
    documento: texto(resposta.documento),
  };
}

/**
 * Validação local que reproduz as mensagens do servidor. A autoridade continua
 * sendo o banco: estas checagens apenas evitam uma ida inútil.
 */
export function validarEquipeLocal(responsavelId: string | null | undefined, apoioId: string): string | null {
  if (!apoioId) return "Escolha o GM que deu apoio. Nenhum atendimento é registrado sozinho.";
  if (responsavelId && apoioId === responsavelId) {
    return "O GM de apoio deve ser diferente do GM responsável pela ocorrência.";
  }
  return null;
}

export type OfficerOption = { id: string; label: string };

export async function loadOfficerOptions(): Promise<OfficerOption[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("usuarios")
    .select("id,apelido,perfil")
    .eq("status", "ativo")
    .in("perfil", ["guarda", "supervisor"])
    .order("apelido");
  if (error) return [];
  return listaBruta(data).flatMap((linha) => {
    const registro = objetoBruto(linha);
    const id = texto(registro.id);
    const apelido = texto(registro.apelido)
      .trim()
      .replace(/^GM(?:\s+|$)/i, "")
      .trim();
    return id && apelido ? [{ id, label: `GM ${apelido}` }] : [];
  });
}

/* ------------------------------------------------------------------ *
 * URL (#/ocorrencias?aba=...&busca=...) e ordenação persistente.
 * ------------------------------------------------------------------ */

const ABAS_VALIDAS: AbaOcorrencia[] = [
  "todas",
  "minhas",
  "corporacao",
  "atendimento",
  "complementar",
  "encerradas",
  "inconsistente",
];
const ORDENACOES_VALIDAS: OrdenacaoOcorrencia[] = ["recentes", "antigas", "sem_fechar", "tipo"];
const CHAVE_ORDENACAO = "gm.occurrences.ordenacao";

export const CHAVE_AVISO_REGISTRO = "gm.occurrences.aviso";

export function lerOrdenacaoPersistida(): OrdenacaoOcorrencia {
  try {
    const salvo = window.localStorage.getItem(CHAVE_ORDENACAO);
    if (salvo && ORDENACOES_VALIDAS.includes(salvo as OrdenacaoOcorrencia)) return salvo as OrdenacaoOcorrencia;
  } catch {
    // Sem armazenamento local: segue o padrão da sessão.
  }
  return "recentes";
}

export function gravarOrdenacao(ordenacao: OrdenacaoOcorrencia) {
  try {
    window.localStorage.setItem(CHAVE_ORDENACAO, ordenacao);
  } catch {
    // Armazenamento indisponível: a ordenação continua viva apenas na URL.
  }
}

export function gravarAviso(mensagem: string) {
  try {
    window.sessionStorage.setItem(CHAVE_AVISO_REGISTRO, mensagem);
  } catch {
    // Sem armazenamento de sessão: o aviso apenas não é exibido.
  }
}

export function lerEliminarAviso(): string | null {
  try {
    const valor = window.sessionStorage.getItem(CHAVE_AVISO_REGISTRO);
    if (valor) window.sessionStorage.removeItem(CHAVE_AVISO_REGISTRO);
    return valor;
  } catch {
    return null;
  }
}

export type LeituraUrl = {
  filtro: FiltroOcorrencias;
  ordenacao: OrdenacaoOcorrencia;
  detalhe: string | null;
};

export function lerFiltroDaUrl(): LeituraUrl {
  const raw = window.location.hash.replace(/^#/, "");
  const [caminho, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const lista = (chave: string): string[] => {
    const valor = params.get(chave);
    return valor ? valor.split(",").filter(Boolean) : [];
  };
  const abaParam = params.get("aba");
  const ordemParam = params.get("ordem");
  const detalhe =
    caminho.startsWith("/ocorrencias/") && !caminho.startsWith("/ocorrencias/nova")
      ? decodeURIComponent(caminho.slice("/ocorrencias/".length)).trim()
      : null;

  const filtro: FiltroOcorrencias = {
    ...FILTRO_VAZIO,
    aba: abaParam && ABAS_VALIDAS.includes(abaParam as AbaOcorrencia) ? (abaParam as AbaOcorrencia) : "todas",
    busca: params.get("busca") ?? "",
    janela: params.get("janela") === "encerramento" ? "encerramento" : "inicio",
    de: params.get("de") ?? "",
    ate: params.get("ate") ?? "",
    tipo: lista("tipo"),
    origem: lista("origem"),
    gravidade: lista("gravidade"),
    qualidade: lista("qual"),
    situacao: lista("situacao"),
    gmId: params.get("gm") ?? "",
    local: params.get("local") ?? "",
    somenteComBo: params.get("bo") === "somente",
    somenteSemBo: params.get("bo") === "ausente",
  };
  return {
    filtro,
    ordenacao:
      ordemParam && ORDENACOES_VALIDAS.includes(ordemParam as OrdenacaoOcorrencia)
        ? (ordemParam as OrdenacaoOcorrencia)
        : lerOrdenacaoPersistida(),
    detalhe,
  };
}

/** Consulta (`aba=...&busca=...`) que representa o recorte atual da lista. */
export function construirQuery(filtro: FiltroOcorrencias, ordenacao: OrdenacaoOcorrencia): string {
  const params = new URLSearchParams();
  if (filtro.aba !== "todas") params.set("aba", filtro.aba);
  if (filtro.busca.trim()) params.set("busca", filtro.busca.trim());
  if (filtro.janela !== "inicio") params.set("janela", filtro.janela);
  if (filtro.de) params.set("de", filtro.de);
  if (filtro.ate) params.set("ate", filtro.ate);
  if (filtro.tipo.length) params.set("tipo", filtro.tipo.join(","));
  if (filtro.origem.length) params.set("origem", filtro.origem.join(","));
  if (filtro.gravidade.length) params.set("gravidade", filtro.gravidade.join(","));
  if (filtro.qualidade.length) params.set("qual", filtro.qualidade.join(","));
  if (filtro.situacao.length) params.set("situacao", filtro.situacao.join(","));
  if (filtro.gmId) params.set("gm", filtro.gmId);
  if (filtro.local.trim()) params.set("local", filtro.local.trim());
  if (filtro.somenteComBo) params.set("bo", "somente");
  else if (filtro.somenteSemBo) params.set("bo", "ausente");
  if (ordenacao !== "recentes") params.set("ordem", ordenacao);
  return params.toString();
}

export function escreverUrl(filtro: FiltroOcorrencias, ordenacao: OrdenacaoOcorrencia, detalhe: string | null, push = false) {
  const query = construirQuery(filtro, ordenacao);
  const caminho = detalhe ? `/ocorrencias/${encodeURIComponent(detalhe)}` : "/ocorrencias";
  const hash = `#${caminho}${query ? `?${query}` : ""}`;
  if (hash === window.location.hash) return;
  if (push) {
    window.location.hash = hash;
    return;
  }
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
}

export function contarFiltrosAtivos(filtro: FiltroOcorrencias): number {
  return (
    (filtro.busca.trim() ? 1 : 0) +
    (filtro.de ? 1 : 0) +
    (filtro.ate ? 1 : 0) +
    (filtro.janela !== "inicio" ? 1 : 0) +
    filtro.tipo.length +
    filtro.origem.length +
    filtro.gravidade.length +
    filtro.qualidade.length +
    filtro.situacao.length +
    (filtro.gmId ? 1 : 0) +
    (filtro.local.trim() ? 1 : 0) +
    (filtro.somenteComBo || filtro.somenteSemBo ? 1 : 0)
  );
}

export type ChipFiltro = {
  chave: string;
  rotulo: string;
  remover: (filtro: FiltroOcorrencias) => FiltroOcorrencias;
};

export function chipsAtivos(filtro: FiltroOcorrencias, totais: TotaisOcorrencias | null): ChipFiltro[] {
  const chips: ChipFiltro[] = [];
  if (filtro.busca.trim()) {
    chips.push({ chave: "busca", rotulo: `Busca: ${filtro.busca.trim()}`, remover: (f) => ({ ...f, busca: "" }) });
  }
  if (filtro.de || filtro.ate) {
    const intervalo = `${formatarDia(filtro.de, false)} até ${formatarDia(filtro.ate, false)}`.replace(/^ até $/, "todo o período");
    chips.push({
      chave: "periodo",
      rotulo: `Período (${filtro.janela === "encerramento" ? "encerramento" : "início"}): ${intervalo}`,
      remover: (f) => ({ ...f, de: "", ate: "", janela: "inicio" }),
    });
  } else if (filtro.janela !== "inicio") {
    chips.push({
      chave: "janela",
      rotulo: "Período medido pelo encerramento",
      remover: (f) => ({ ...f, janela: "inicio" }),
    });
  }
  for (const valor of filtro.tipo) {
    const rotulo = totais?.facetas.tipos.find((item) => item.valor === valor)?.rotulo ?? valor;
    chips.push({
      chave: `tipo:${valor}`,
      rotulo: `Tipo: ${rotulo}`,
      remover: (f) => ({ ...f, tipo: f.tipo.filter((atual) => atual !== valor) }),
    });
  }
  for (const valor of filtro.gravidade) {
    const rotulo = totais?.facetas.gravidades.find((item) => item.valor === valor)?.rotulo ?? valor;
    chips.push({
      chave: `gravidade:${valor}`,
      rotulo: `Gravidade: ${rotulo}`,
      remover: (f) => ({ ...f, gravidade: f.gravidade.filter((atual) => atual !== valor) }),
    });
  }
  for (const valor of filtro.origem) {
    chips.push({
      chave: `origem:${valor}`,
      rotulo: `Acionamento: ${valor}`,
      remover: (f) => ({ ...f, origem: f.origem.filter((atual) => atual !== valor) }),
    });
  }
  for (const valor of filtro.situacao) {
    chips.push({
      chave: `situacao:${valor}`,
      rotulo: `Situação: ${ROTULO_SITUACAO[valor] ?? valor}`,
      remover: (f) => ({ ...f, situacao: f.situacao.filter((atual) => atual !== valor) }),
    });
  }
  for (const valor of filtro.qualidade) {
    chips.push({
      chave: `qualidade:${valor}`,
      rotulo: ROTULO_QUALIDADE[valor] ?? valor,
      remover: (f) => ({ ...f, qualidade: f.qualidade.filter((atual) => atual !== valor) }),
    });
  }
  if (filtro.gmId) {
    const rotulo = totais?.facetas.gms.find((item) => item.id === filtro.gmId)?.rotulo ?? "GM responsável";
    chips.push({ chave: "gm", rotulo: `Responsável: ${rotulo}`, remover: (f) => ({ ...f, gmId: "" }) });
  }
  if (filtro.local.trim()) {
    chips.push({
      chave: "local",
      rotulo: `Local: ${filtro.local.trim()}`,
      remover: (f) => ({ ...f, local: "" }),
    });
  }
  if (filtro.somenteComBo) {
    chips.push({
      chave: "bo",
      rotulo: "Só com BO externo",
      remover: (f) => ({ ...f, somenteComBo: false, somenteSemBo: false }),
    });
  }
  if (filtro.somenteSemBo) {
    chips.push({
      chave: "bo-ausente",
      rotulo: "Só sem BO externo",
      remover: (f) => ({ ...f, somenteComBo: false, somenteSemBo: false }),
    });
  }
  return chips;
}

/* ------------------------------------------------------------------ *
 * Formatação — apresentação. Nenhum estado é derivado aqui.
 * ------------------------------------------------------------------ */

/**
 * Horários de atendimento são guardados como timestamp sem fuso (hora local de
 * Pitangueiras). Sem offset na string lemos como hora local do aparelho; quando
 * o offset vem explícito (por exemplo `gerado_em`), o Date respeita o fuso.
 */
/** Lê horário do banco ou do campo `datetime-local` como hora local do aparelho. */
export function parsearData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const normalizado = valor.trim().replace(" ", "T");
  if (!normalizado) return null;
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(normalizado)) {
    const comFuso = new Date(normalizado);
    return Number.isNaN(comFuso.getTime()) ? null : comFuso;
  }
  const partes = normalizado.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!partes) return null;
  const local = new Date(
    Number(partes[1]),
    Number(partes[2]) - 1,
    Number(partes[3]),
    Number(partes[4] ?? 0),
    Number(partes[5] ?? 0),
    Number(partes[6] ?? 0),
  );
  return Number.isNaN(local.getTime()) ? null : local;
}

export function formatarDia(valor: string | null | undefined, comHora: boolean): string {
  const date = parsearData(valor);
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

/** Data/hora relativa: hoje e ontem por nome; ano explícito a partir de janeiro. */
export function formatarRelativo(valor: string | null | undefined): string {
  const date = parsearData(valor);
  if (!date) return "";
  const agora = new Date();
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (date.toDateString() === agora.toDateString()) return `Hoje às ${hora}`;
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (date.toDateString() === ontem.toDateString()) return `Ontem às ${hora}`;
  const mesmoAno = date.getFullYear() === agora.getFullYear();
  const curto = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  const longo = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  return `${mesmoAno ? curto : longo} · ${hora}`;
}

export function formatarDuracao(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || !Number.isFinite(minutos)) return "";
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total}min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

export function formatarHorarioGerado(valor: string): string {
  const date = parsearData(valor);
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Valor aceito por <input type="datetime-local"> a partir de um Date. */
export function paraCampoDataHora(date: Date): string {
  const dois = (valor: number) => String(valor).padStart(2, "0");
  return `${date.getFullYear()}-${dois(date.getMonth() + 1)}-${dois(date.getDate())}T${dois(date.getHours())}:${dois(date.getMinutes())}`;
}

/**
 * Horário enviado ao servidor: hora local sem offset, como os registros já
 * existentes na base.
 */
export function paraHorarioServidor(valor: string): string | null {
  if (!valor) return null;
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return null;
  return paraCampoDataHora(date);
}

/** Chave de apresentação do agrupamento devolvido pelo servidor (hoje/ontem/semana/AAAA-MM). */
export function chaveDeAgrupamento(valor: string | null | undefined): string {
  const date = parsearData(valor);
  if (!date) return "sem-data";
  const agora = new Date();
  if (date.toDateString() === agora.toDateString()) return "hoje";
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (date.toDateString() === ontem.toDateString()) return "ontem";
  const inicioSemana = new Date(agora);
  inicioSemana.setDate(agora.getDate() - ((agora.getDay() + 6) % 7));
  inicioSemana.setHours(0, 0, 0, 0);
  if (date >= inicioSemana) return "semana";
  const dois = (numeroLocal: number) => String(numeroLocal).padStart(2, "0");
  return `${date.getFullYear()}-${dois(date.getMonth() + 1)}`;
}
