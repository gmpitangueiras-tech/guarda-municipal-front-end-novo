import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  ClipboardList,
  Clock,
  Crosshair,
  FilePlus2,
  MapPin,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Undo2,
  UserRound,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import { formatCpf, isValidCpfLength, onlyDigits } from "@/lib/cpf";
import {
  FORMAS_SOLICITACAO,
  GRAVIDADES,
  MSG,
  ORGAOS_BO,
  TIPOS_REGISTRO,
  TOM_GRAVIDADE,
  gravarAviso,
  loadOfficerOptions,
  formatarDia,
  paraCampoDataHora,
  paraHorarioServidor,
  parsearCoordenadas,
  registrarOcorrencia,
  textoDasCoordenadas,
  validarEquipeLocal,
  type DadosNovoRegistro,
  type GravidadeSlug,
  type OfficerOption,
} from "@/lib/ocorrencias";
import brasaoGuarda from "@/assets/brasao-guarda-pitangueiras.png";

/**
 * Registro nativo de BO.
 *
 * O formulário não inventa estado: ele apenas reúne o que o servidor aceita em
 * `gm_registrar_ocorrencia` e corrige com as MESMAS mensagens que a função
 * devolve (constantes `MSG`). Qualquer erro que vier do banco é mostrado cru.
 */

type EtapaId = "acionamento" | "gravidade" | "horarios" | "local" | "relato" | "equipe" | "revisao";

type Etapa = {
  id: EtapaId;
  rotulo: string;
  titulo: string;
  legenda: string;
  campos: string[];
};

const ETAPAS: Etapa[] = [
  {
    id: "acionamento",
    rotulo: "Acionamento",
    titulo: "Como a Guarda foi acionada",
    legenda: "Escolha a origem do chamado e o tipo do atendimento.",
    campos: ["forma_solicitacao", "tipo_ocorrencia"],
  },
  {
    id: "gravidade",
    rotulo: "Gravidade",
    titulo: "Gravidade do atendimento",
    legenda: "Toda ocorrência nova sai com gravidade definida — não existe “não informado”.",
    campos: ["gravidade"],
  },
  {
    id: "horarios",
    rotulo: "Horários",
    titulo: "Horário do atendimento",
    legenda: "Início e término. Se ainda estiver em andamento, marque e conclua o BO depois.",
    campos: ["inicio", "fim"],
  },
  {
    id: "local",
    rotulo: "Local",
    titulo: "Onde aconteceu",
    legenda: "Logradouro obrigatório. Bairro, referência, rodovia e coordenadas ajudam a localização.",
    campos: ["local", "coordenadas"],
  },
  {
    id: "relato",
    rotulo: "Relato",
    titulo: "Relato e solicitante",
    legenda: "Descreva o atendimento com suas palavras. Dados do solicitante são opcionais.",
    campos: ["telefone", "cpf"],
  },
  {
    id: "equipe",
    rotulo: "Equipe",
    titulo: "BO externo e equipe",
    legenda: "Nenhum atendimento é registrado sozinho: escolha o GM de apoio.",
    campos: ["responsavelId", "apoioId"],
  },
  {
    id: "revisao",
    rotulo: "Revisão",
    titulo: "Revisão antes de registrar",
    legenda: "Confira o que vai para o servidor. Depois de registrado, o BO só muda por retificação.",
    campos: [],
  },
];

type Formulario = {
  forma_solicitacao: string;
  tipo_ocorrencia: string;
  gravidade: GravidadeSlug | "";
  inicio: string;
  fim: string;
  emAndamento: boolean;
  local: string;
  bairro: string;
  referencia: string;
  rodovia: string;
  coordenadas: string;
  relato: string;
  nome: string;
  telefone: string;
  cpf: string;
  documento: string;
  numeroBo: string;
  orgaoBo: string;
  dataBo: string;
  responsavelId: string;
  apoioId: string;
};

type Erros = Record<string, string>;

const ROTULO_TIPO = new Map(TIPOS_REGISTRO.map((tipo) => [tipo.valor, tipo.rotulo]));
const ROTULO_ORGAO = new Map(ORGAOS_BO.map((orgao) => [orgao.valor, orgao.rotulo]));

function rotuloDaGravidade(valor: GravidadeSlug | ""): string {
  return GRAVIDADES.find((opcao) => opcao.valor === valor)?.rotulo ?? "";
}

/** Só quem está em campo assina o atendimento; administrador precisa escolher. */
function podeAssinarAtendimento(perfil: string | null | undefined): boolean {
  const normalizado = (perfil ?? "").trim().toLowerCase();
  return normalizado === "guarda" || normalizado === "supervisor";
}

/**
 * Validação local. As mensagens obrigatoriamenteas copiadas de
 * `gm_registrar_ocorrencia` para que a correção na tela e o erro do banco
 * digam exatamente a mesma coisa.
 */
function validar(form: Formulario, assinante: boolean): Erros {
  const erros: Erros = {};

  if (!form.forma_solicitacao) erros.forma_solicitacao = MSG.forma;
  if (!form.tipo_ocorrencia) erros.tipo_ocorrencia = MSG.tipo;
  if (!form.gravidade) erros.gravidade = MSG.gravidade;

  const inicio = paraHorarioServidor(form.inicio);
  const fim = paraHorarioServidor(form.fim);
  if (!inicio) erros.inicio = MSG.inicio;
  if (!form.emAndamento) {
    if (!fim) erros.fim = MSG.encerramentoObrigatorio;
    else if (inicio && new Date(form.fim).getTime() < new Date(form.inicio).getTime()) {
      erros.fim = MSG.encerramentoAnteriorRegistro;
    }
  }

  if (!form.local.trim()) erros.local = MSG.local;
  const coordenadaBruta = form.coordenadas.trim();
  if (coordenadaBruta && !parsearCoordenadas(coordenadaBruta)) erros.coordenadas = MSG.coordenadas;

  if (form.telefone.trim() && onlyDigits(form.telefone).length < 10) {
    erros.telefone = "Telefone incompleto: informe DDD e número, ou deixe o campo vazio.";
  }
  if (form.cpf.trim() && !isValidCpfLength(form.cpf)) {
    erros.cpf = "CPF incompleto: são 11 dígitos, ou deixe o campo vazio.";
  }

  if (!form.responsavelId) erros.responsavelId = assinante ? MSG.responsavelEscolha : MSG.responsavel;
  const erroEquipe = validarEquipeLocal(form.responsavelId, form.apoioId);
  if (erroEquipe) erros.apoioId = erroEquipe;

  return erros;
}

function montarDados(form: Formulario): DadosNovoRegistro {
  const coordenada = parsearCoordenadas(form.coordenadas);
  /** Coluna de texto único: o servidor também colapsa espaços em excesso. */
  const linha = (valor: string): string | null => {
    const limpo = valor.replace(/\s+/g, " ").trim();
    return limpo || null;
  };
  /** Relato preserva as quebras de linha digitadas pelo guarda. */
  const paragrafo = (valor: string): string | null => valor.trim() || null;

  return {
    forma_solicitacao: form.forma_solicitacao,
    tipo_ocorrencia: form.tipo_ocorrencia,
    gravidade: form.gravidade as GravidadeSlug,
    local_ocorrencia: linha(form.local) ?? "",
    bairro_ocorrencia: linha(form.bairro),
    referencia: linha(form.referencia),
    rodovia: linha(form.rodovia),
    latitude: coordenada?.latitude ?? null,
    longitude: coordenada?.longitude ?? null,
    data_hora_inicio: paraHorarioServidor(form.inicio) ?? paraCampoDataHora(new Date()),
    data_hora_encerramento: form.emAndamento ? null : paraHorarioServidor(form.fim),
    observacoes: paragrafo(form.relato),
    numero_bo: linha(form.numeroBo),
    orgao_bo: form.orgaoBo || null,
    data_bo: form.dataBo || null,
    nome_solicitante: linha(form.nome),
    telefone_solicitante: linha(form.telefone),
    cpf_solicitante: isValidCpfLength(form.cpf) ? formatCpf(form.cpf) : null,
    identificacao_adicional: linha(form.documento),
    modo_criacao: form.emAndamento ? "rapido" : "completo",
    responsavel_id: form.responsavelId || null,
    apoio_id: form.apoioId,
  };
}

function notaDeGeolocalizacao(erro: GeolocationPositionError): string {
  if (erro.code === erro.PERMISSION_DENIED) {
    return "Sem permissão de localização neste aparelho. Libere o GPS no navegador ou digite as coordenadas manualmente.";
  }
  if (erro.code === erro.POSITION_UNAVAILABLE) {
    return "O aparelho não conseguiu informar a posição agora. Tente de novo perto de uma janela ou digite as coordenadas.";
  }
  if (erro.code === erro.TIMEOUT) {
    return "A posição demorou demais para chegar. Tente novamente.";
  }
  return "Não foi possível obter a posição automática. Digite as coordenadas manualmente.";
}

function Passo({ etapa, children }: { etapa: Etapa; children: ReactNode }) {
  return (
    <section className="occurrence-new-step" aria-labelledby={`etapa-${etapa.id}`}>
      <h2 id={`etapa-${etapa.id}`}>{etapa.titulo}</h2>
      <p className="occurrence-new-legend">{etapa.legenda}</p>
      {children}
    </section>
  );
}

function Campo({
  titulo,
  dica,
  erro,
  bloco = false,
  children,
}: {
  titulo: string;
  dica?: string;
  erro?: string;
  /** `true` quando o campo tem botão dentro: <label> chamaria o botão de rótulo. */
  bloco?: boolean;
  children: ReactNode;
}) {
  const conteudo = (
    <>
      <span>{titulo}</span>
      {children}
      {erro ? (
        <span className="occurrence-new-field-error" role="alert">
          <CircleAlert size={14} aria-hidden="true" />
          <span>{erro}</span>
        </span>
      ) : dica ? (
        <span className="occurrence-new-field-hint">{dica}</span>
      ) : null}
    </>
  );
  return bloco ? (
    <div className="occurrence-new-field">{conteudo}</div>
  ) : (
    <label className="occurrence-new-field">{conteudo}</label>
  );
}

function Aviso({ children, tom = "info" }: { children: ReactNode; tom?: "info" | "alerta" }) {
  return (
    <p className={`occurrence-new-note is-${tom}`}>
      <ShieldCheck size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export default function OcorrenciaNova({ profile }: { profile: PerfilFuncional }) {
  const assinante = podeAssinarAtendimento(profile.perfil);
  const [indice, setIndice] = useState(0);
  const [maxima, setMaxima] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [posicaoNota, setPosicaoNota] = useState("");
  const [buscandoPosicao, setBuscandoPosicao] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [oficiais, setOficiais] = useState<OfficerOption[]>([]);
  const [carregandoOficiais, setCarregandoOficiais] = useState(true);
  const [form, setForm] = useState<Formulario>(() => ({
    forma_solicitacao: "",
    tipo_ocorrencia: "",
    gravidade: "",
    inicio: paraCampoDataHora(new Date()),
    fim: "",
    emAndamento: false,
    local: "",
    bairro: "",
    referencia: "",
    rodovia: "",
    coordenadas: "",
    relato: "",
    nome: "",
    telefone: "",
    cpf: "",
    documento: "",
    numeroBo: "",
    orgaoBo: "",
    dataBo: "",
    responsavelId: assinante ? profile.id : "",
    apoioId: "",
  }));

  const etapa = ETAPAS[indice];
  const ehRevisao = etapa.id === "revisao";

  /** Volta para a lista mantendo o recorte que o guarda estava vendo. */
  const enderecoDeVolta = useMemo(() => {
    const query = window.location.hash.split("?")[1] ?? "";
    return `#/ocorrencias${query ? `?${query}` : ""}`;
  }, []);

  useEffect(() => {
    const aoEntrar = () => setOnline(true);
    const aoSair = () => setOnline(false);
    window.addEventListener("online", aoEntrar);
    window.addEventListener("offline", aoSair);
    return () => {
      window.removeEventListener("online", aoEntrar);
      window.removeEventListener("offline", aoSair);
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    void loadOfficerOptions()
      .then((lista) => {
        if (ativo) setOficiais(lista);
      })
      .catch(() => {
        if (ativo) setOficiais([]);
      })
      .finally(() => {
        if (ativo) setCarregandoOficiais(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const listaResponsavel = useMemo(() => {
    if (!assinante) return oficiais;
    if (oficiais.some((oficial) => oficial.id === profile.id)) return oficiais;
    const apelido = (profile.apelido ?? "")
      .trim()
      .replace(/^GM(?:\s+|$)/i, "")
      .trim();
    return [{ id: profile.id, label: apelido ? `GM ${apelido}` : "GM sem apelido" }, ...oficiais];
  }, [assinante, oficiais, profile.apelido, profile.id]);

  /** O responsável nunca aparece na lista de apoio. */
  const listaApoio = useMemo(
    () => listaResponsavel.filter((oficial) => oficial.id !== form.responsavelId),
    [listaResponsavel, form.responsavelId],
  );

  useEffect(() => {
    setForm((atual) => (atual.apoioId && atual.apoioId === atual.responsavelId ? { ...atual, apoioId: "" } : atual));
  }, [form.responsavelId]);

  const coordenada = parsearCoordenadas(form.coordenadas);
  const coordenadaInvalida = Boolean(form.coordenadas.trim()) && !coordenada;
  const errosDaEtapa = etapa.campos.map((campo) => erros[campo]).filter((valor): valor is string => Boolean(valor));

  function setar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }) as Formulario);
    setErros((atual) => {
      if (!atual[campo as string]) return atual;
      const proximos = { ...atual };
      delete proximos[campo as string];
      return proximos;
    });
  }

  function irPara(proximo: number) {
    setIndice(proximo);
    setMaxima((atual) => Math.max(atual, proximo));
    setErroServidor(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function avancar() {
    const todos = validar(form, assinante);
    setErros(todos);
    const bloqueios = ETAPAS[indice].campos.filter((campo) => todos[campo]);
    if (bloqueios.length) return;
    irPara(Math.min(indice + 1, ETAPAS.length - 1));
  }

  function usarPosicaoAtual() {
    if (!("geolocation" in navigator)) {
      setPosicaoNota("Este aparelho não oferece posição automática. Digite as coordenadas manualmente.");
      return;
    }
    setBuscandoPosicao(true);
    setPosicaoNota("");
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setar("coordenadas", `${posicao.coords.latitude.toFixed(6)}, ${posicao.coords.longitude.toFixed(6)}`);
        setPosicaoNota("Posição do aparelho preenchida no campo. Confira antes de registrar.");
        setBuscandoPosicao(false);
      },
      (erro) => {
        setPosicaoNota(notaDeGeolocalizacao(erro));
        setBuscandoPosicao(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function registrar() {
    const todos = validar(form, assinante);
    setErros(todos);
    if (Object.keys(todos).length) {
      const alvo = ETAPAS.findIndex((item) => item.campos.some((campo) => todos[campo]));
      if (alvo >= 0) irPara(alvo);
      return;
    }
    setErroServidor(null);
    setEnviando(true);
    try {
      const resposta = await registrarOcorrencia(montarDados(form));
      setEnviado(true);
      const numero = resposta.numero_ocorrencia;
      gravarAviso(numero ? `BO registrado — Ocorrência ${numero}` : "Registro enviado. Número em geração.");
      window.location.hash = numero ? `#/ocorrencias/${encodeURIComponent(numero)}` : "#/ocorrencias";
    } catch (cause) {
      setErroServidor(
        cause instanceof Error && cause.message
          ? cause.message
          : "O servidor não devolveu o motivo da falha. Tente novamente.",
      );
      setEnviando(false);
    }
  }

  const linhasRevisao: Array<{ titulo: string; valor: string; etapa: number }> = [
    { titulo: "Como foi acionada", valor: form.forma_solicitacao, etapa: 0 },
    { titulo: "Tipo", valor: ROTULO_TIPO.get(form.tipo_ocorrencia) ?? "", etapa: 0 },
    {
      titulo: "Gravidade",
      valor: form.gravidade ? `Gravidade ${rotuloDaGravidade(form.gravidade)}` : "",
      etapa: 1,
    },
    {
      titulo: "Início do atendimento",
      valor: form.inicio ? formatarDia(form.inicio, true) : "",
      etapa: 2,
    },
    {
      titulo: "Encerramento",
      valor: form.emAndamento
        ? "Em andamento — sem horário de término"
        : form.fim
          ? formatarDia(form.fim, true)
          : "",
      etapa: 2,
    },
    { titulo: "Logradouro", valor: form.local.trim(), etapa: 3 },
    { titulo: "Bairro", valor: form.bairro.trim(), etapa: 3 },
    { titulo: "Referência", valor: form.referencia.trim(), etapa: 3 },
    { titulo: "Rodovia", valor: form.rodovia.trim(), etapa: 3 },
    { titulo: "Coordenadas", valor: textoDasCoordenadas(coordenada), etapa: 3 },
    { titulo: "Relato", valor: form.relato.trim(), etapa: 4 },
    { titulo: "Solicitante", valor: form.nome.trim(), etapa: 4 },
    { titulo: "Telefone", valor: form.telefone.trim(), etapa: 4 },
    { titulo: "CPF", valor: isValidCpfLength(form.cpf) ? formatCpf(form.cpf) : form.cpf.trim(), etapa: 4 },
    { titulo: "Documento adicional", valor: form.documento.trim(), etapa: 4 },
    { titulo: "BO externo", valor: form.numeroBo.trim(), etapa: 5 },
    { titulo: "Órgão", valor: ROTULO_ORGAO.get(form.orgaoBo) ?? "", etapa: 5 },
    { titulo: "Data do BO", valor: form.dataBo ? formatarDia(form.dataBo, false) : "", etapa: 5 },
    {
      titulo: "GM responsável",
      valor: listaResponsavel.find((oficial) => oficial.id === form.responsavelId)?.label ?? "",
      etapa: 5,
    },
    {
      titulo: "GM de apoio",
      valor: listaResponsavel.find((oficial) => oficial.id === form.apoioId)?.label ?? "",
      etapa: 5,
    },
  ];

  return (
    <main className="occurrences-shell occurrence-new">
      <header className="occurrences-topbar">
        <a className="occurrences-back" href={enderecoDeVolta}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Ocorrências</span>
        </a>
        <a className="occurrences-brand" href="#/inicio" aria-label="Guarda Municipal de Pitangueiras, início">
          <img src={brasaoGuarda} alt="" />
          <span>
            <strong>Guarda Municipal</strong>
            <small>Pitangueiras · PR</small>
          </span>
        </a>
        <div
          className={`occurrences-connectivity ${online ? "is-online" : "is-offline"}`}
          role="status"
          aria-label={online ? "Você está online" : "Você está offline"}
        >
          {online ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
          <span>{online ? "Online" : "Offline"}</span>
        </div>
      </header>

      <div className="occurrences-content">
        <section className="occurrences-hero" aria-labelledby="ocorrencia-nova-title">
          <div className="occurrences-hero-copy">
            <p className="dashboard-eyebrow">NOVO REGISTRO · BO DA GUARDA</p>
            <h1 id="ocorrencia-nova-title">Registrar ocorrência</h1>
            <p>
              Etapas curtas, uma pergunta por vez. O registro só existe depois de gravado no servidor — nada fica
              preso neste aparelho.
            </p>
          </div>
          <div className="occurrences-hero-actions">
            <span className="occurrences-total">
              <strong>
                Etapa {indice + 1} de {ETAPAS.length}
              </strong>{" "}
              · {etapa.rotulo}
            </span>
          </div>
        </section>

        {!online ? (
          <div className="occurrences-offline-banner" role="status">
            <WifiOff size={16} aria-hidden="true" />
            <span>Sem conexão agora. O registro não é gravado até o servidor responder.</span>
          </div>
        ) : null}

        <nav className="occurrence-new-steps" aria-label="Etapas do registro">
          {ETAPAS.map((item, posicao) => (
            <button
              key={item.id}
              type="button"
              className={`occurrence-new-step-button${posicao === indice ? " is-current" : ""}${
                posicao < indice ? " is-done" : ""
              }`}
              aria-current={posicao === indice ? "step" : undefined}
              disabled={posicao > maxima || enviando}
              onClick={() => irPara(posicao)}
            >
              {posicao < indice ? <Check size={13} aria-hidden="true" /> : <span>{posicao + 1}</span>}
              <span>{item.rotulo}</span>
            </button>
          ))}
        </nav>

        <div className="occurrence-new-card">
          {etapa.id === "acionamento" ? (
            <Passo etapa={etapa}>
              <div className="occurrence-choice" role="group" aria-label="Forma de solicitação">
                <span className="occurrence-choice-label">Como foi acionada</span>
                {FORMAS_SOLICITACAO.map((forma) => (
                  <button
                    key={forma}
                    type="button"
                    className={`occurrence-choice-button${form.forma_solicitacao === forma ? " is-active" : ""}`}
                    aria-pressed={form.forma_solicitacao === forma}
                    onClick={() => setar("forma_solicitacao", forma)}
                  >
                    {forma}
                  </button>
                ))}
                {erros.forma_solicitacao ? (
                  <p className="occurrence-form-error" role="alert">
                    <CircleAlert size={16} aria-hidden="true" />
                    <span>{erros.forma_solicitacao}</span>
                  </p>
                ) : null}
              </div>

              <div className="occurrence-choice" role="group" aria-label="Tipo de ocorrência">
                <span className="occurrence-choice-label">Tipo</span>
                <div className="occurrence-type-buttons">
                  {TIPOS_REGISTRO.map((tipo) => (
                    <button
                      key={tipo.valor}
                      type="button"
                      className={`occurrence-type-button${form.tipo_ocorrencia === tipo.valor ? " is-active" : ""}`}
                      aria-pressed={form.tipo_ocorrencia === tipo.valor}
                      onClick={() => setar("tipo_ocorrencia", tipo.valor)}
                    >
                      {tipo.rotulo}
                    </button>
                  ))}
                </div>
                {erros.tipo_ocorrencia ? (
                  <p className="occurrence-form-error" role="alert">
                    <CircleAlert size={16} aria-hidden="true" />
                    <span>{erros.tipo_ocorrencia}</span>
                  </p>
                ) : null}
              </div>
            </Passo>
          ) : null}

          {etapa.id === "gravidade" ? (
            <Passo etapa={etapa}>
              <div className="occurrence-severity-choice" role="group" aria-label="Gravidade">
                <div className="occurrence-severity-grid">
                  {GRAVIDADES.map((opcao) => (
                    <button
                      key={opcao.valor}
                      type="button"
                      className={`occurrence-severity-button is-${TOM_GRAVIDADE[opcao.valor]}${
                        form.gravidade === opcao.valor ? " is-active" : ""
                      }`}
                      aria-pressed={form.gravidade === opcao.valor}
                      onClick={() => setar("gravidade", opcao.valor)}
                    >
                      <strong>{opcao.rotulo}</strong>
                      <span>
                        {opcao.valor === "baixa"
                          ? "Sem risco imediato"
                          : opcao.valor === "media"
                            ? "Precisa de acompanhamento"
                            : opcao.valor === "alta"
                              ? "Risco concreto a pessoas"
                              : "Risco de vida em curso"}
                      </span>
                    </button>
                  ))}
                </div>
                {erros.gravidade ? (
                  <p className="occurrence-form-error" role="alert">
                    <CircleAlert size={16} aria-hidden="true" />
                    <span>{erros.gravidade}</span>
                  </p>
                ) : null}
              </div>
              <Aviso>A gravidade escolhida aqui é a que aparece no painel da corporação.</Aviso>
            </Passo>
          ) : null}

          {etapa.id === "horarios" ? (
            <Passo etapa={etapa}>
              <div className="occurrence-new-grid">
                <Campo titulo="Início do atendimento" erro={erros.inicio}>
                  <input
                    type="datetime-local"
                    value={form.inicio}
                    onChange={(event) => setar("inicio", event.target.value)}
                  />
                </Campo>
                <button
                  type="button"
                  className="occurrences-clear-button occurrence-new-now"
                  onClick={() => setar("inicio", paraCampoDataHora(new Date()))}
                >
                  <Clock size={14} aria-hidden="true" /> Usar agora
                </button>
                <Campo titulo="Término do atendimento" erro={erros.fim}>
                  <input
                    type="datetime-local"
                    value={form.fim}
                    disabled={form.emAndamento}
                    onChange={(event) => setar("fim", event.target.value)}
                  />
                </Campo>
              </div>
              <label className="occurrence-new-check">
                <input
                  type="checkbox"
                  checked={form.emAndamento}
                  onChange={(event) => {
                    const marcado = event.target.checked;
                    setForm((atual) => ({ ...atual, emAndamento: marcado, fim: marcado ? "" : atual.fim }));
                    setErros((atual) => {
                      const proximos = { ...atual };
                      delete proximos.fim;
                      return proximos;
                    });
                  }}
                />
                <span>Atendimento ainda em andamento</span>
              </label>
              {form.emAndamento ? (
                <p className="occurrence-new-live is-alerta" role="status">
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>
                    Este registro vai aparecer em <strong>A complementar</strong> até você concluir o BO.
                  </span>
                </p>
              ) : (
                <Aviso>Sem o horário de término o servidor não fecha o BO — por isso ele é obrigatório aqui.</Aviso>
              )}
            </Passo>
          ) : null}

          {etapa.id === "local" ? (
            <Passo etapa={etapa}>
              <div className="occurrence-new-grid">
                <Campo titulo="Logradouro" erro={erros.local}>
                  <input
                    value={form.local}
                    onChange={(event) => setar("local", event.target.value)}
                    placeholder="Rua, avenida ou estrada"
                  />
                </Campo>
                <Campo titulo="Bairro">
                  <input value={form.bairro} onChange={(event) => setar("bairro", event.target.value)} />
                </Campo>
                <Campo titulo="Ponto de referência">
                  <input
                    value={form.referencia}
                    onChange={(event) => setar("referencia", event.target.value)}
                    placeholder="Número, esquina, quadra"
                  />
                </Campo>
                <Campo titulo="Rodovia">
                  <input
                    value={form.rodovia}
                    onChange={(event) => setar("rodovia", event.target.value)}
                    placeholder="Somente se for rodovia"
                  />
                </Campo>
              </div>
              <Campo
                titulo="Coordenadas (latitude, longitude)"
                dica="Aceita -23.3,-46.3 ou -23,3;-46,3. Opcional."
                erro={erros.coordenadas}
                bloco
              >
                <span className="occurrence-new-coords">
                  <input
                    value={form.coordenadas}
                    inputMode="decimal"
                    aria-label="Coordenadas em graus decimais: latitude e longitude"
                    onChange={(event) => {
                      setar("coordenadas", event.target.value);
                      setPosicaoNota("");
                    }}
                    placeholder="-23.3,-46.3"
                  />
                  <button
                    type="button"
                    className="occurrences-advanced-toggle"
                    onClick={usarPosicaoAtual}
                    disabled={buscandoPosicao}
                  >
                    {buscandoPosicao ? (
                      <RefreshCw size={15} className="spin" aria-hidden="true" />
                    ) : (
                      <Crosshair size={15} aria-hidden="true" />
                    )}
                    <span>{buscandoPosicao ? "Localizando…" : "Usar posição atual"}</span>
                  </button>
                </span>
              </Campo>
              {coordenada && !coordenadaInvalida ? (
                <p className="occurrence-new-live" role="status">
                  <MapPin size={15} aria-hidden="true" />
                  <span>
                    Coordenadas entendidas: {textoDasCoordenadas(coordenada)}
                  </span>
                </p>
              ) : null}
              {posicaoNota ? (
                <p className={`occurrence-new-live${coordenadaInvalida ? " is-alerta" : ""}`} role="status">
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>{posicaoNota}</span>
                </p>
              ) : null}
            </Passo>
          ) : null}

          {etapa.id === "relato" ? (
            <Passo etapa={etapa}>
              <Campo titulo="O que aconteceu" dica="Conte o atendimento do começo ao fim. Sem limite de caracteres.">
                <textarea
                  rows={8}
                  value={form.relato}
                  onChange={(event) => setar("relato", event.target.value)}
                  placeholder="Acionamento, o que foi encontrado, providências tomadas e quem participou."
                />
              </Campo>
              <p className="occurrence-new-count">
                {form.relato.length.toLocaleString("pt-BR")} caracteres
              </p>

              <div className="occurrence-new-grid">
                <Campo titulo="Nome do solicitante">
                  <input value={form.nome} onChange={(event) => setar("nome", event.target.value)} />
                </Campo>
                <Campo titulo="Telefone" erro={erros.telefone}>
                  <input
                    value={form.telefone}
                    inputMode="tel"
                    onChange={(event) => setar("telefone", event.target.value)}
                    placeholder="(43) 90000-0000"
                  />
                </Campo>
                <Campo titulo="CPF do solicitante" erro={erros.cpf}>
                  <input
                    value={form.cpf}
                    inputMode="numeric"
                    onChange={(event) => setar("cpf", formatCpf(event.target.value))}
                    placeholder="000.000.000-00"
                  />
                </Campo>
                <Campo titulo="Documento adicional" dica="RG, CNH, placa do veículo ou outro dado de identificação.">
                  <input value={form.documento} onChange={(event) => setar("documento", event.target.value)} />
                </Campo>
              </div>
              <Aviso>Os dados do solicitante entram só neste BO e não aparecem na lista de ocorrências.</Aviso>
            </Passo>
          ) : null}

          {etapa.id === "equipe" ? (
            <Passo etapa={etapa}>
              <div className="occurrence-new-grid">
                <Campo titulo="Número do BO externo">
                  <input
                    value={form.numeroBo}
                    onChange={(event) => setar("numeroBo", event.target.value)}
                    placeholder="Se existir"
                  />
                </Campo>
                <Campo titulo="Órgão">
                  <select value={form.orgaoBo} onChange={(event) => setar("orgaoBo", event.target.value)}>
                    <option value="">Sem BO externo</option>
                    {ORGAOS_BO.map((orgao) => (
                      <option key={orgao.valor} value={orgao.valor}>
                        {orgao.rotulo}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo titulo="Data do BO externo">
                  <input type="date" value={form.dataBo} onChange={(event) => setar("dataBo", event.target.value)} />
                </Campo>
              </div>
              <Aviso>A informação é digitada manualmente; não há integração com o sistema da Polícia Civil.</Aviso>

              <div className="occurrence-new-grid">
                <Campo
                  titulo="GM responsável"
                  erro={erros.responsavelId}
                  dica={
                    assinante
                      ? "Já vem com você. Troque se outro guarda assumiu o caso."
                      : "O administrador do sistema não assina atendimento em campo, escolha quem assumiu o caso."
                  }
                >
                  <select
                    value={form.responsavelId}
                    disabled={carregandoOficiais}
                    onChange={(event) => setar("responsavelId", event.target.value)}
                  >
                    <option value="">{carregandoOficiais ? "Carregando guardas…" : "Escolha o GM responsável"}</option>
                    {listaResponsavel.map((oficial) => (
                      <option key={oficial.id} value={oficial.id}>
                        {oficial.label}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo titulo="GM de apoio" erro={erros.apoioId} dica="Quem estava com você no atendimento.">
                  <select
                    value={form.apoioId}
                    disabled={carregandoOficiais}
                    onChange={(event) => setar("apoioId", event.target.value)}
                  >
                    <option value="">{carregandoOficiais ? "Carregando guardas…" : "Escolha o guarda que deu apoio"}</option>
                    {listaApoio.map((oficial) => (
                      <option key={oficial.id} value={oficial.id}>
                        {oficial.label}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
              {!carregandoOficiais && listaResponsavel.length < 2 ? (
                <p className="occurrence-new-live is-alerta" role="status">
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>
                    Guardas ativos insuficientes na lista. Peça ao administrador para cadastrá-los antes de registrar.
                  </span>
                </p>
              ) : null}
              <p className="occurrence-new-team">
                <UserRound size={14} aria-hidden="true" />
                <span>Responsável</span>
                <UsersRound size={14} aria-hidden="true" />
                <span>Apoio obrigatório — o mesmo nome não pode assinar os dois papéis.</span>
              </p>
            </Passo>
          ) : null}

          {etapa.id === "revisao" ? (
            <Passo etapa={etapa}>
              <div className="occurrence-new-review">
                {linhasRevisao
                  .filter((linha) => linha.valor)
                  .map((linha) => (
                    <div className="occurrence-new-review-line" key={linha.titulo}>
                      <span>{linha.titulo}</span>
                      <strong>{linha.valor}</strong>
                      <button type="button" onClick={() => irPara(linha.etapa)} aria-label={`Alterar ${linha.titulo}`}>
                        <PencilLine size={13} aria-hidden="true" /> Alterar
                      </button>
                    </div>
                  ))}
                {linhasRevisao.every((linha) => !linha.valor) ? (
                  <p className="occurrence-new-empty">Nada preenchido ainda. Volte e complete as etapas.</p>
                ) : null}
              </div>

              <div className="occurrence-new-summary">
                <span className={`occurrence-selo is-${form.gravidade ? TOM_GRAVIDADE[form.gravidade] : "neutro"}`}>
                  {form.gravidade ? `Gravidade ${rotuloDaGravidade(form.gravidade)}` : "Sem gravidade"}
                </span>
                <span className="occurrence-selo is-neutro">
                  {form.emAndamento ? "Vai para A complementar" : "Registro completo"}
                </span>
              </div>

              {errosDaEtapa.length || Object.keys(erros).length ? (
                <ul className="occurrence-new-missing">
                  {ETAPAS.map((item, posicao) => {
                    const bloqueios = item.campos.map((campo) => erros[campo]).filter((valor): valor is string => Boolean(valor));
                    if (!bloqueios.length) return null;
                    return (
                      <li key={item.id}>
                        <button type="button" onClick={() => irPara(posicao)}>
                          <CircleAlert size={14} aria-hidden="true" />
                          <span>{bloqueios[0]}</span>
                          <em>{item.rotulo}</em>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <p className="occurrence-new-privacy">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  Ao registrar, o BO é gravado no servidor com o seu nome como autor. Nada é salvo apenas neste
                  aparelho.
                </span>
              </p>
            </Passo>
          ) : null}

          {erroServidor ? (
            <div className="occurrences-error" role="alert">
              <CircleAlert size={17} aria-hidden="true" />
              <span>{erroServidor}</span>
            </div>
          ) : null}

          {errosDaEtapa.length && !erroServidor ? (
            <div className="occurrences-error" role="alert">
              <CircleAlert size={17} aria-hidden="true" />
              <span>{errosDaEtapa[0]}</span>
            </div>
          ) : null}

          <div className="occurrence-new-actions">
            {indice > 0 ? (
              <button type="button" className="occurrences-clear-button" onClick={() => irPara(indice - 1)} disabled={enviando}>
                <Undo2 size={15} aria-hidden="true" /> Voltar
              </button>
            ) : (
              <a className="occurrences-clear-button" href={enderecoDeVolta}>
                <ArrowLeft size={15} aria-hidden="true" /> Cancelar
              </a>
            )}
            {ehRevisao ? (
              <button
                type="button"
                className="occurrences-apply-button"
                onClick={registrar}
                disabled={enviando || enviado || !online}
              >
                {enviando ? <RefreshCw size={15} className="spin" aria-hidden="true" /> : <FilePlus2 size={15} aria-hidden="true" />}
                <span>{enviando ? "Registrando no servidor…" : "Registrar BO no servidor"}</span>
              </button>
            ) : (
              <button type="button" className="occurrences-apply-button" onClick={avancar}>
                <span>Continuar</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <p className="occurrence-new-legacy">
          O aplicativo antigo continua no ar só para consulta e será desativado quando este registro cobrir todos os
          casos.
        </p>

        <footer className="occurrences-footer">
          <ClipboardList size={16} aria-hidden="true" />
          <span>Registro nativo · Os dados vão direto para a base da corporação pelo Supabase.</span>
        </footer>
      </div>
    </main>
  );
}
