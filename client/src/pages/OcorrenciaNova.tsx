import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bolt,
  Check,
  CheckCircle2,
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
  WifiOff,
} from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import { formatCpf, isValidCpfLength } from "@/lib/cpf";
import OccurrenceAttachments from "@/components/occurrences/OccurrenceAttachments";
import type { AnexoRascunho, EnvolvidoNovo, GravidadeSlug, OfficerOption } from "@/lib/ocorrencias";
import OccurrencePersonEditor from "@/components/occurrences/OccurrencePersonEditor";
import {
  FORMAS_SOLICITACAO,
  GRAVIDADES,
  MSG,
  TIPOS_REGISTRO,
  TOM_GRAVIDADE,
  enviarAnexosOcorrencia,
  formatarDia,
  gravarAviso,
  loadOfficerOptions,
  paraCampoDataHora,
  paraHorarioServidor,
  parsearCoordenadas,
  registrarOcorrencia,
  textoDasCoordenadas,
  validarEquipeLocal,
} from "@/lib/ocorrencias";

type ModoRegistro = "rapido" | "completo" | null;
type EtapaId = "solicitacao" | "ocorrencia" | "equipe" | "envolvidos" | "relato" | "anexos" | "revisao";
type Etapa = { id: EtapaId; rotulo: string; titulo: string; legenda: string; campos: string[] };
type Erros = Record<string, string>;

type Formulario = {
  forma_solicitacao: string;
  tipo_ocorrencia: string;
  gravidade: GravidadeSlug | "";
  inicio: string;
  fim: string;
  local: string;
  bairro: string;
  referencia: string;
  rodovia: string;
  coordenadas: string;
  codigoOperacional: string;
  relato: string;
  nome: string;
  telefone: string;
  cpf: string;
  rg: string;
  enderecoSolicitante: string;
  bairroSolicitante: string;
  codigoMunicipal: string;
  complemento: string;
  identificacaoAdicional: string;
  numeroBo: string;
  responsavelId: string;
  apoioId: string;
};

const ETAPAS: Etapa[] = [
  {
    id: "solicitacao",
    rotulo: "Solicitação",
    titulo: "Origem da solicitação",
    legenda: "Registre como o chamado chegou à Guarda e os dados opcionais do solicitante.",
    campos: ["forma_solicitacao"],
  },
  {
    id: "ocorrencia",
    rotulo: "Ocorrência",
    titulo: "Dados do fato",
    legenda: "Tipo, gravidade, local e início do atendimento. O encerramento fica na revisão final.",
    campos: ["tipo_ocorrencia", "gravidade", "inicio", "local", "coordenadas"],
  },
  {
    id: "equipe",
    rotulo: "Equipe",
    titulo: "Equipe operacional",
    legenda: "Todo atendimento tem um GM responsável e pelo menos um GM de apoio cadastrado.",
    campos: ["responsavelId", "apoioId"],
  },
  {
    id: "envolvidos",
    rotulo: "Envolvidos",
    titulo: "Pessoas relacionadas ao fato",
    legenda: "Cadastre zero ou mais pessoas. A equipe da Guarda permanece em seção separada.",
    campos: [],
  },
  {
    id: "relato",
    rotulo: "Relato",
    titulo: "Relato dos fatos",
    legenda: "Descreva o que foi informado, constatado e realizado, sem incluir suposições.",
    campos: ["relato"],
  },
  {
    id: "anexos",
    rotulo: "Anexos",
    titulo: "Anexos e evidências",
    legenda: "Fotos, vídeos e PDFs podem complementar o BO, mas não são obrigatórios.",
    campos: [],
  },
  {
    id: "revisao",
    rotulo: "Revisão",
    titulo: "Revisão e encerramento",
    legenda: "Confira o registro e informe o horário de término antes de concluir o BO.",
    campos: ["fim"],
  },
];

const ROTULO_TIPO = new Map(TIPOS_REGISTRO.map((tipo) => [tipo.valor, tipo.rotulo]));
const ORIGEM_RAPIDA = "Diretamente com a ocorrência";

function novoFormulario(profile: PerfilFuncional, forma: string): Formulario {
  return {
    forma_solicitacao: forma,
    tipo_ocorrencia: "",
    gravidade: "",
    inicio: paraCampoDataHora(new Date()),
    fim: "",
    local: "",
    bairro: "",
    referencia: "",
    rodovia: "",
    coordenadas: "",
    codigoOperacional: "",
    relato: "",
    nome: "",
    telefone: "",
    cpf: "",
    rg: "",
    enderecoSolicitante: "",
    bairroSolicitante: "",
    codigoMunicipal: "",
    complemento: "",
    identificacaoAdicional: "",
    numeroBo: "",
    responsavelId: podeAssinarAtendimento(profile.perfil) ? profile.id : "",
    apoioId: "",
  };
}

function podeAssinarAtendimento(perfil: string | null | undefined): boolean {
  const normalizado = (perfil ?? "").trim().toLowerCase();
  return normalizado === "guarda" || normalizado === "supervisor";
}

function idLabel(profile: PerfilFuncional): string {
  const apelido = (profile.apelido ?? "").trim().replace(/^GM(?:\s+|$)/i, "").trim();
  const nome = apelido || (profile.nome_completo ?? "").trim() || "GM autenticado";
  return `GM ${nome}${profile.matricula ? ` · Mat. ${profile.matricula}` : ""}`;
}

function rotuloDaGravidade(valor: GravidadeSlug | ""): string {
  return GRAVIDADES.find((opcao) => opcao.valor === valor)?.rotulo ?? "";
}

function validar(form: Formulario, modo: Exclude<ModoRegistro, null>, assinante: boolean): Erros {
  const erros: Erros = {};
  const inicio = paraHorarioServidor(form.inicio);
  const fim = paraHorarioServidor(form.fim);

  if (modo === "completo" && !form.forma_solicitacao) erros.forma_solicitacao = MSG.forma;
  if (!form.tipo_ocorrencia) erros.tipo_ocorrencia = MSG.tipo;
  if (!form.gravidade) erros.gravidade = MSG.gravidade;
  if (!inicio) erros.inicio = MSG.inicio;
  if (!form.local.trim()) erros.local = MSG.local;
  if (form.coordenadas.trim() && !parsearCoordenadas(form.coordenadas)) erros.coordenadas = MSG.coordenadas;

  if (modo === "completo") {
    if (!fim) erros.fim = MSG.encerramentoObrigatorio;
    else if (inicio && new Date(form.fim).getTime() < new Date(form.inicio).getTime()) {
      erros.fim = MSG.encerramentoAnteriorRegistro;
    }
    if (form.relato.trim().length < 10) erros.relato = "Descreva o ocorrido com pelo menos 10 caracteres.";
    if (form.telefone.trim() && form.telefone.replace(/\D/g, "").length < 10) {
      erros.telefone = "Telefone incompleto: informe DDD e número, ou deixe o campo vazio.";
    }
    if (form.cpf.trim() && !isValidCpfLength(form.cpf)) {
      erros.cpf = "CPF incompleto: informe 11 dígitos ou deixe o campo vazio.";
    }
  } else if (!form.relato.trim()) {
    erros.relato = "Descreva resumidamente o que aconteceu.";
  }

  if (!form.responsavelId) erros.responsavelId = assinante ? MSG.responsavelEscolha : MSG.responsavel;
  const erroEquipe = validarEquipeLocal(form.responsavelId, form.apoioId);
  if (erroEquipe) erros.apoioId = erroEquipe;
  return erros;
}

function montarDados(form: Formulario, modo: Exclude<ModoRegistro, null>): import("@/lib/ocorrencias").DadosNovoRegistro {
  const coordenada = parsearCoordenadas(form.coordenadas);
  const linha = (valor: string): string | null => valor.replace(/\s+/g, " ").trim() || null;
  const numeroBo = linha(form.numeroBo);

  return {
    forma_solicitacao: modo === "rapido" ? ORIGEM_RAPIDA : form.forma_solicitacao,
    tipo_ocorrencia: form.tipo_ocorrencia,
    gravidade: form.gravidade as GravidadeSlug,
    local_ocorrencia: linha(form.local) ?? "",
    bairro_ocorrencia: linha(form.bairro),
    referencia: linha(form.referencia),
    rodovia: linha(form.rodovia),
    latitude: coordenada?.latitude ?? null,
    longitude: coordenada?.longitude ?? null,
    data_hora_inicio: paraHorarioServidor(form.inicio) ?? paraCampoDataHora(new Date()),
    data_hora_encerramento: modo === "rapido" ? null : paraHorarioServidor(form.fim),
    observacoes: form.relato.trim() || null,
    numero_bo: numeroBo,
    nome_solicitante: linha(form.nome),
    telefone_solicitante: linha(form.telefone),
    cpf_solicitante: isValidCpfLength(form.cpf) ? formatCpf(form.cpf) : null,
    rg_solicitante: linha(form.rg),
    endereco_solicitante: linha(form.enderecoSolicitante),
    bairro_solicitante: linha(form.bairroSolicitante),
    codigo_municipal: linha(form.codigoMunicipal),
    complemento: linha(form.complemento),
    identificacao_adicional: linha(form.identificacaoAdicional),
    codigo_operacional: linha(form.codigoOperacional),
    modo_criacao: modo,
    responsavel_id: form.responsavelId || null,
    apoio_id: form.apoioId,
  };
}

function notaDeGeolocalizacao(erro: GeolocationPositionError): string {
  if (erro.code === erro.PERMISSION_DENIED) return "Sem permissão de localização. Libere o GPS no navegador ou digite as coordenadas.";
  if (erro.code === erro.POSITION_UNAVAILABLE) return "O aparelho não conseguiu informar a posição agora. Tente novamente ou digite as coordenadas.";
  if (erro.code === erro.TIMEOUT) return "A posição demorou demais para chegar. Tente novamente.";
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
  bloco?: boolean;
  children: ReactNode;
}) {
  const conteudo = (
    <>
      <span>{titulo}</span>
      {children}
      {erro ? (
        <span className="occurrence-new-field-error" role="alert"><CircleAlert size={14} aria-hidden="true" />{erro}</span>
      ) : dica ? <span className="occurrence-new-field-hint">{dica}</span> : null}
    </>
  );
  return bloco ? <div className="occurrence-new-field">{conteudo}</div> : <label className="occurrence-new-field">{conteudo}</label>;
}

function Aviso({ children, tom = "info" }: { children: ReactNode; tom?: "info" | "alerta" }) {
  return <p className={`occurrence-new-note is-${tom}`}><ShieldCheck size={15} aria-hidden="true" /><span>{children}</span></p>;
}

function EscolhaGravidade({
  valor,
  erro,
  onChange,
  disabled = false,
}: {
  valor: GravidadeSlug | "";
  erro?: string;
  onChange: (valor: GravidadeSlug) => void;
  disabled?: boolean;
}) {
  return (
    <div className="occurrence-severity-choice" role="group" aria-label="Gravidade obrigatória">
      <span className="occurrence-choice-label">Gravidade <b aria-hidden="true">*</b></span>
      <div className="occurrence-severity-grid">
        {GRAVIDADES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={`occurrence-severity-button is-${TOM_GRAVIDADE[opcao.valor]}${valor === opcao.valor ? " is-active" : ""}`}
            aria-pressed={valor === opcao.valor}
            disabled={disabled}
            onClick={() => onChange(opcao.valor)}
          >
            <strong>{opcao.rotulo}</strong>
            <span>{opcao.valor === "baixa" ? "Sem risco imediato" : opcao.valor === "media" ? "Precisa de acompanhamento" : opcao.valor === "alta" ? "Risco concreto a pessoas" : "Risco de vida em curso"}</span>
          </button>
        ))}
      </div>
      {erro ? <p className="occurrence-form-error" role="alert"><CircleAlert size={16} aria-hidden="true" />{erro}</p> : null}
    </div>
  );
}

function EquipeCampos({
  profile,
  oficiais,
  responsavelId,
  apoioId,
  carregando,
  erros,
  onResponsavel,
  onApoio,
  disabled = false,
}: {
  profile: PerfilFuncional;
  oficiais: OfficerOption[];
  responsavelId: string;
  apoioId: string;
  carregando: boolean;
  erros: Erros;
  onResponsavel: (id: string) => void;
  onApoio: (id: string) => void;
  disabled?: boolean;
}) {
  const assinante = podeAssinarAtendimento(profile.perfil);
  const responsaveis = useMemo(() => {
    if (!assinante || oficiais.some((oficial) => oficial.id === profile.id)) return oficiais;
    return [{ id: profile.id, label: idLabel(profile) }, ...oficiais];
  }, [assinante, oficiais, profile]);
  const apoios = responsaveis.filter((oficial) => oficial.id !== responsavelId);

  return (
    <>
      <div className="occurrence-new-grid">
        <Campo
          titulo="GM responsável"
          erro={erros.responsavelId}
          dica={assinante ? "O GM autenticado vem selecionado; confirme quem assumiu o atendimento." : "O administrador seleciona um GM ativo para responder pelo atendimento."}
        >
          <select value={responsavelId} onChange={(event) => onResponsavel(event.target.value)} disabled={disabled || carregando}>
            <option value="">{carregando ? "Carregando GMs…" : "Escolha o GM responsável"}</option>
            {responsaveis.map((oficial) => <option key={oficial.id} value={oficial.id}>{oficial.label}</option>)}
          </select>
        </Campo>
        <Campo titulo="GM de apoio" erro={erros.apoioId} dica="Obrigatório: selecione outro GM ativo que participou do atendimento.">
          <select value={apoioId} onChange={(event) => onApoio(event.target.value)} disabled={disabled || carregando}>
            <option value="">{carregando ? "Carregando GMs…" : "Escolha o GM de apoio"}</option>
            {apoios.map((oficial) => <option key={oficial.id} value={oficial.id}>{oficial.label}</option>)}
          </select>
        </Campo>
      </div>
      {!carregando && responsaveis.length < 2 ? (
        <p className="occurrence-new-live is-alerta" role="status"><CircleAlert size={15} aria-hidden="true" /><span>São necessários pelo menos dois GMs ativos cadastrados. Peça ao administrador para revisar os usuários.</span></p>
      ) : null}
      <p className="occurrence-new-team"><UserRound size={15} aria-hidden="true" /><span>Responsável</span><UsersRound size={15} aria-hidden="true" /><span>Apoio obrigatório — o mesmo GM não pode ocupar os dois papéis.</span></p>
    </>
  );
}

export default function OcorrenciaNova({ profile }: { profile: PerfilFuncional }) {
  const assinante = podeAssinarAtendimento(profile.perfil);
  const [modo, setModo] = useState<ModoRegistro>(null);
  const [indice, setIndice] = useState(0);
  const [maxima, setMaxima] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [posicaoNota, setPosicaoNota] = useState("");
  const [buscandoPosicao, setBuscandoPosicao] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [oficiais, setOficiais] = useState<OfficerOption[]>([]);
  const [carregandoOficiais, setCarregandoOficiais] = useState(true);
  const [form, setForm] = useState<Formulario>(() => novoFormulario(profile, ""));
  const [envolvidos, setEnvolvidos] = useState<EnvolvidoNovo[]>([]);
  const [anexos, setAnexos] = useState<AnexoRascunho[]>([]);
  const [registroCriado, setRegistroCriado] = useState<{ id: string; numero: string | null } | null>(null);
  const [anexosEnviados, setAnexosEnviados] = useState<Set<string>>(() => new Set());
  const [errosAnexos, setErrosAnexos] = useState<Record<string, string>>({});

  const etapa = ETAPAS[indice];
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
      .then((lista) => { if (ativo) setOficiais(lista); })
      .catch(() => { if (ativo) setOficiais([]); })
      .finally(() => { if (ativo) setCarregandoOficiais(false); });
    return () => { ativo = false; };
  }, []);

  function alterar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => {
      if (!atual[campo as string]) return atual;
      const proximos = { ...atual };
      delete proximos[campo as string];
      return proximos;
    });
  }

  const coordenada = parsearCoordenadas(form.coordenadas);
  const coordenadaInvalida = Boolean(form.coordenadas.trim()) && !coordenada;

  function conteudoPreenchido(): boolean {
    return Boolean(
      form.forma_solicitacao || form.tipo_ocorrencia || form.gravidade || form.local.trim() || form.relato.trim() ||
      form.nome.trim() || form.telefone.trim() || form.numeroBo.trim() || envolvidos.length || anexos.length ||
      form.apoioId || form.coordenadas.trim(),
    );
  }

  function selecionarModo(novoModo: Exclude<ModoRegistro, null>) {
    if (modo && modo !== novoModo && conteudoPreenchido() && !window.confirm("Trocar o modo e descartar os dados digitados nesta tela?")) return;
    setModo(novoModo);
    setForm(novoFormulario(profile, novoModo === "rapido" ? ORIGEM_RAPIDA : ""));
    setEnvolvidos([]);
    setAnexos([]);
    setIndice(0);
    setMaxima(0);
    setErros({});
    setErroServidor(null);
    setRegistroCriado(null);
    setAnexosEnviados(new Set());
    setErrosAnexos({});
  }

  function voltarAosModos() {
    if (conteudoPreenchido() && !registroCriado && !window.confirm("Voltar à escolha do modo e descartar o que ainda não foi registrado?")) return;
    if (registroCriado) return;
    setModo(null);
    setIndice(0);
    setMaxima(0);
    setErros({});
    setErroServidor(null);
  }

  function irPara(proximo: number) {
    const destino = Math.min(Math.max(proximo, 0), ETAPAS.length - 1);
    if (destino === ETAPAS.length - 1 && !form.fim) {
      setForm((atual) => ({ ...atual, fim: paraCampoDataHora(new Date()) }));
    }
    setIndice(destino);
    setMaxima((atual) => Math.max(atual, destino));
    setErroServidor(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validarEtapaAtual(): boolean {
    if (!modo) return false;
    const todos = validar(form, modo, assinante);
    setErros(todos);
    const campos = ETAPAS[indice].campos;
    const temErro = campos.some((campo) => Boolean(todos[campo]));
    if (temErro) return false;
    if (modo === "completo" && etapa.id === "envolvidos" && envolvidos.some((envolvido) => !envolvido.nome_completo.trim())) {
      setErroServidor("Confira o tipo e o nome de cada envolvido antes de continuar.");
      return false;
    }
    return true;
  }

  function avancar() {
    if (!validarEtapaAtual()) return;
    irPara(indice + 1);
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
        alterar("coordenadas", `${posicao.coords.latitude.toFixed(6)}, ${posicao.coords.longitude.toFixed(6)}`);
        setPosicaoNota("Posição preenchida. Confira o ponto antes de registrar.");
        setBuscandoPosicao(false);
      },
      (erro) => { setPosicaoNota(notaDeGeolocalizacao(erro)); setBuscandoPosicao(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  function concluirRegistro(numero: string | null, foiRapido: boolean) {
    gravarAviso(numero ? `BO registrado — Ocorrência ${numero}` : "Registro enviado ao servidor.");
    window.location.hash = foiRapido ? "#/ocorrencias?aba=complementar" : "#/ocorrencias";
  }

  async function registrar() {
    if (!modo) return;
    if (!online) {
      setErroServidor("Sem conexão: o registro não foi enviado. Conecte-se e tente novamente.");
      return;
    }
    const todos = validar(form, modo, assinante);
    setErros(todos);
    if (Object.keys(todos).length) {
      if (modo === "completo") {
        const alvo = ETAPAS.findIndex((item) => item.campos.some((campo) => todos[campo]));
        if (alvo >= 0) irPara(alvo);
      }
      return;
    }

    setEnviando(true);
    setErroServidor(null);
    try {
      let occurrenceId = registroCriado?.id;
      let numero = registroCriado?.numero ?? null;
      if (!occurrenceId) {
        const resultado = await registrarOcorrencia(
          montarDados(form, modo),
          modo === "completo" ? envolvidos : [],
        );
        occurrenceId = resultado.id;
        numero = resultado.numero_ocorrencia;
        setRegistroCriado({ id: occurrenceId, numero });
      }

      const pendentes = anexos.filter((anexo) => !anexosEnviados.has(anexo.id));
      if (pendentes.length) {
        setErroServidor("BO gravado no servidor. Enviando anexos privados…");
        const resultadoUpload = await enviarAnexosOcorrencia({
          ocorrenciaId: occurrenceId,
          perfilId: profile.id,
          modo,
          anexos: pendentes,
        });
        setAnexosEnviados((atuais) => new Set([...atuais, ...resultadoUpload.enviados]));
        setErrosAnexos(Object.fromEntries(resultadoUpload.falhas.map((falha) => [falha.id, falha.mensagem])));
        if (resultadoUpload.falhas.length) {
          setErroServidor("O BO já foi gravado, mas alguns anexos não foram enviados. Tente novamente; o aplicativo não criará outro BO.");
          return;
        }
      }
      concluirRegistro(numero, modo === "rapido");
    } catch (cause) {
      setErroServidor(
        cause instanceof Error && cause.message
          ? cause.message
          : "O servidor não devolveu o motivo da falha. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function linhasRevisao() {
    return [
      { titulo: "Forma de solicitação", valor: form.forma_solicitacao, etapa: 0 },
      { titulo: "Tipo", valor: ROTULO_TIPO.get(form.tipo_ocorrencia) ?? "", etapa: 1 },
      { titulo: "Gravidade", valor: form.gravidade ? rotuloDaGravidade(form.gravidade) : "", etapa: 1 },
      { titulo: "Início", valor: form.inicio ? formatarDia(form.inicio, true) : "", etapa: 1 },
      { titulo: "Local", valor: form.local.trim(), etapa: 1 },
      { titulo: "Bairro", valor: form.bairro.trim(), etapa: 1 },
      { titulo: "Referência", valor: form.referencia.trim(), etapa: 1 },
      { titulo: "Rodovia", valor: form.rodovia.trim(), etapa: 1 },
      { titulo: "Coordenadas", valor: textoDasCoordenadas(coordenada), etapa: 1 },
      { titulo: "Relato", valor: form.relato.trim(), etapa: 4 },
      { titulo: "Solicitante", valor: form.nome.trim(), etapa: 0 },
      { titulo: "Contato do solicitante", valor: form.telefone.trim(), etapa: 0 },
      { titulo: "BO externo", valor: form.numeroBo.trim(), etapa: 2 },
      { titulo: "GM responsável", valor: oficiais.find((oficial) => oficial.id === form.responsavelId)?.label ?? (form.responsavelId === profile.id ? idLabel(profile) : ""), etapa: 2 },
      { titulo: "GM de apoio", valor: oficiais.find((oficial) => oficial.id === form.apoioId)?.label ?? "", etapa: 2 },
      { titulo: "Envolvidos", valor: envolvidos.length ? `${envolvidos.length} pessoa(s)` : "Nenhum cadastrado", etapa: 3 },
      { titulo: "Anexos", valor: anexos.length ? `${anexos.length} arquivo(s)` : "Nenhum anexo (opcional)", etapa: 5 },
    ].filter((linha) => linha.valor);
  }

  const etapaAtualErros = etapa.campos.map((campo) => erros[campo]).filter(Boolean);

  if (!modo) {
    return (
      <main className="occurrences-shell occurrence-new occurrence-mode-select">
        <div className="occurrences-content">
          <section className="occurrences-hero" aria-labelledby="ocorrencia-nova-title">
            <div className="occurrences-hero-copy">
              <h1 id="ocorrencia-nova-title">Registrar ocorrência</h1>
              <p>Escolha o fluxo adequado ao atendimento.</p>
            </div>
            <div className="occurrences-hero-actions"><a className="occurrences-clear-button" href={enderecoDeVolta}><ArrowLeft size={15} aria-hidden="true" /> Voltar</a></div>
          </section>
          <div className="occurrence-mode-grid" role="group" aria-label="Escolha o modo do BO">
            <button type="button" className="occurrence-mode-card is-quick" onClick={() => selecionarModo("rapido")}>
              <span className="occurrence-mode-icon"><Bolt size={23} aria-hidden="true" /></span>
              <strong>BO Rápido</strong>
              <span>Registre o essencial agora. O documento fica “A complementar” até a conclusão.</span>
              <small>Tipo · gravidade · local · início · equipe · relato</small>
            </button>
            <button type="button" className="occurrence-mode-card" onClick={() => selecionarModo("completo")}>
              <span className="occurrence-mode-icon"><ClipboardList size={23} aria-hidden="true" /></span>
              <strong>BO Completo</strong>
              <span>Fluxo guiado em sete etapas, com envolvidos, relato detalhado e anexos opcionais.</span>
              <small>Revisão e encerramento obrigatórios</small>
            </button>
          </div>
          {!online ? <div className="occurrences-offline-banner" role="status"><WifiOff size={16} aria-hidden="true" /><span>Sem conexão. O registro só será salvo quando o servidor confirmar.</span></div> : null}
          <p className="occurrence-mode-note"><ShieldCheck size={16} aria-hidden="true" /> Ambos os modos exigem gravidade e GM de apoio cadastrado. Anexos são opcionais.</p>
        </div>
      </main>
    );
  }

  const quick = modo === "rapido";
  const desabilitado = enviando || Boolean(registroCriado);
  const listaRevisao = linhasRevisao();

  return (
    <main className="occurrences-shell occurrence-new">
      <div className="occurrences-content">
        <section className="occurrences-hero" aria-labelledby="ocorrencia-nova-title">
          <div className="occurrences-hero-copy">
            <h1 id="ocorrencia-nova-title">{quick ? "BO Rápido" : "BO Completo"}</h1>
            <p>{quick ? "Registre o essencial; o documento poderá ser complementado depois." : "Siga as sete etapas e revise os dados antes de concluir."}</p>
          </div>
          <div className="occurrences-hero-actions">
            {quick ? <span className="occurrence-mode-pill is-quick"><Bolt size={14} aria-hidden="true" /> Registro essencial</span> : <span className="occurrences-total"><strong>Etapa {indice + 1} de 7</strong> · {etapa.rotulo}</span>}
            {!registroCriado ? <button type="button" className="occurrences-clear-button" onClick={voltarAosModos}><ArrowLeft size={15} aria-hidden="true" /> Trocar modo</button> : null}
          </div>
        </section>

        {!online ? <div className="occurrences-offline-banner" role="status"><WifiOff size={16} aria-hidden="true" /><span>Sem conexão agora. O registro não é gravado até o servidor responder.</span></div> : null}

        {quick ? (
          <div className="occurrence-new-card occurrence-quick-card">
            <section className="occurrence-new-step" aria-labelledby="quick-fact-title">
              <h2 id="quick-fact-title">Dados do fato</h2>
              <p className="occurrence-new-legend">O essencial para identificar o que aconteceu, onde e quando.</p>
              <div className="occurrence-new-grid">
                <Campo titulo="Tipo de ocorrência" erro={erros.tipo_ocorrencia}>
                  <select value={form.tipo_ocorrencia} disabled={desabilitado} onChange={(event) => alterar("tipo_ocorrencia", event.target.value)}>
                    <option value="">Selecione o tipo…</option>
                    {TIPOS_REGISTRO.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
                  </select>
                </Campo>
                <Campo titulo="Local da ocorrência" erro={erros.local}>
                  <input value={form.local} disabled={desabilitado} autoComplete="street-address" onChange={(event) => alterar("local", event.target.value)} placeholder="Rua, número e bairro, se souber" />
                </Campo>
                <Campo titulo="Data e hora do fato" erro={erros.inicio}>
                  <input type="datetime-local" value={form.inicio} disabled={desabilitado} onChange={(event) => alterar("inicio", event.target.value)} />
                </Campo>
                <div className="occurrence-quick-now-wrap"><button type="button" className="occurrences-clear-button occurrence-new-now" onClick={() => alterar("inicio", paraCampoDataHora(new Date()))} disabled={desabilitado}><Clock size={15} aria-hidden="true" /> Agora</button></div>
              </div>
              <EscolhaGravidade valor={form.gravidade} erro={erros.gravidade} disabled={desabilitado} onChange={(valor) => alterar("gravidade", valor)} />
              <p className="occurrence-quick-origin"><span>Forma de solicitação</span><strong>{ORIGEM_RAPIDA}</strong></p>
            </section>

            <section className="occurrence-new-step" aria-labelledby="quick-team-title">
              <h2 id="quick-team-title">Equipe operacional</h2>
              <p className="occurrence-new-legend">O responsável e o GM de apoio devem ser usuários ativos do sistema.</p>
              <EquipeCampos profile={profile} oficiais={oficiais} responsavelId={form.responsavelId} apoioId={form.apoioId} carregando={carregandoOficiais} erros={erros} disabled={desabilitado} onResponsavel={(id) => { alterar("responsavelId", id); if (form.apoioId === id) alterar("apoioId", ""); }} onApoio={(id) => alterar("apoioId", id)} />
            </section>

            <section className="occurrence-new-step" aria-labelledby="quick-report-title">
              <h2 id="quick-report-title">Relato objetivo</h2>
              <p className="occurrence-new-legend">Registre o que foi informado, observado e realizado, sem suposições.</p>
              <Campo titulo="O que aconteceu?" erro={erros.relato} dica="O BO poderá ser complementado depois.">
                <textarea rows={5} value={form.relato} disabled={desabilitado} onChange={(event) => alterar("relato", event.target.value)} placeholder="Resuma o fato, o que a equipe constatou e as providências adotadas." />
              </Campo>
              <Campo titulo="Nome do solicitante" dica="Opcional — deixe em branco se não foi informado ou se preferiu não se identificar.">
                <input value={form.nome} disabled={desabilitado} onChange={(event) => alterar("nome", event.target.value)} placeholder="Nome completo, se informado" />
              </Campo>
            </section>

            <OccurrenceAttachments
              modo="rapido"
              anexos={anexos}
              onAdicionar={(novos) => setAnexos((atuais) => [...atuais, ...novos])}
              onRemover={(id) => setAnexos((atuais) => atuais.filter((anexo) => anexo.id !== id))}
              bloqueado={Boolean(registroCriado)}
              enviadoIds={anexosEnviados}
              erroPorId={errosAnexos}
            />

            {registroCriado ? <p className="occurrence-saved-status" role="status"><CheckCircle2 size={17} aria-hidden="true" /> BO registrado{registroCriado.numero ? ` — Ocorrência ${registroCriado.numero}` : " no servidor"}. Nenhum novo BO será criado ao tentar novamente.</p> : null}
            {erroServidor ? <div className={`occurrences-error${registroCriado ? " is-upload-error" : ""}`} role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{erroServidor}</span></div> : null}
            {!registroCriado ? <p className="occurrence-new-privacy"><ShieldCheck size={16} aria-hidden="true" /><span>O BO é gravado diretamente no servidor. Se o atendimento continuar, ele permanecerá “A complementar” para ser concluído depois.</span></p> : null}

            <div className="occurrence-new-actions">
              <a className="occurrences-clear-button" href={enderecoDeVolta}><ArrowLeft size={15} aria-hidden="true" /> Cancelar</a>
              <button type="button" className="occurrences-apply-button" onClick={() => void registrar()} disabled={enviando || !online}>
                {enviando ? <RefreshCw size={15} className="spin" aria-hidden="true" /> : registroCriado ? <RefreshCw size={15} aria-hidden="true" /> : <FilePlus2 size={15} aria-hidden="true" />}
                <span>{enviando ? (registroCriado ? "Enviando anexos…" : "Registrando no servidor…") : registroCriado ? "Tentar anexos pendentes" : "Registrar BO Rápido"}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <nav className="occurrence-new-steps" aria-label="Etapas do BO Completo">
              {ETAPAS.map((item, posicao) => (
                <button
                  key={item.id}
                  type="button"
                  className={`occurrence-new-step-button${posicao === indice ? " is-current" : ""}${posicao < indice ? " is-done" : ""}`}
                  aria-current={posicao === indice ? "step" : undefined}
                  disabled={posicao > maxima || desabilitado}
                  onClick={() => irPara(posicao)}
                >
                  {posicao < indice ? <Check size={14} aria-hidden="true" /> : <span>{posicao + 1}</span>}
                  <span>{item.rotulo}</span>
                </button>
              ))}
            </nav>

            <div className="occurrence-new-card">
              {etapa.id === "solicitacao" ? (
                <Passo etapa={etapa}>
                  <Campo titulo="Forma de solicitação" erro={erros.forma_solicitacao}>
                    <select value={form.forma_solicitacao} disabled={desabilitado} onChange={(event) => alterar("forma_solicitacao", event.target.value)}>
                      <option value="">Selecione...</option>
                      {FORMAS_SOLICITACAO.map((forma) => <option key={forma} value={forma}>{forma}</option>)}
                    </select>
                  </Campo>
                  <div className="occurrence-new-grid">
                    <Campo titulo="Nome do solicitante" dica="Opcional — deixe em branco para solicitação anônima.">
                      <input value={form.nome} disabled={desabilitado} onChange={(event) => alterar("nome", event.target.value)} placeholder="Nome completo" />
                    </Campo>
                    <Campo titulo="Telefone" erro={erros.telefone} dica="Opcional — informe DDD e número.">
                      <input value={form.telefone} disabled={desabilitado} inputMode="tel" maxLength={20} onChange={(event) => alterar("telefone", event.target.value)} placeholder="(43) 90000-0000" />
                    </Campo>
                  </div>
                  <details className="occurrence-optional-details">
                    <summary>Dados complementares do solicitante <small>Opcionais</small></summary>
                    <div className="occurrence-new-grid">
                      <Campo titulo="CPF" erro={erros.cpf}><input value={form.cpf} disabled={desabilitado} maxLength={14} inputMode="numeric" onChange={(event) => alterar("cpf", formatCpf(event.target.value))} placeholder="000.000.000-00" /></Campo>
                      <Campo titulo="RG"><input value={form.rg} disabled={desabilitado} onChange={(event) => alterar("rg", event.target.value)} /></Campo>
                      <Campo titulo="Endereço informado"><input value={form.enderecoSolicitante} disabled={desabilitado} onChange={(event) => alterar("enderecoSolicitante", event.target.value)} placeholder="Rua e número" /></Campo>
                      <Campo titulo="Bairro do solicitante"><input value={form.bairroSolicitante} disabled={desabilitado} onChange={(event) => alterar("bairroSolicitante", event.target.value)} /></Campo>
                      <Campo titulo="Código do próprio municipal"><input value={form.codigoMunicipal} disabled={desabilitado} onChange={(event) => alterar("codigoMunicipal", event.target.value)} /></Campo>
                      <Campo titulo="Complemento"><input value={form.complemento} disabled={desabilitado} onChange={(event) => alterar("complemento", event.target.value)} placeholder="Apto, bloco ou referência" /></Campo>
                      <Campo titulo="Identificação adicional"><input value={form.identificacaoAdicional} disabled={desabilitado} onChange={(event) => alterar("identificacaoAdicional", event.target.value)} /></Campo>
                    </div>
                  </details>
                </Passo>
              ) : null}

              {etapa.id === "ocorrencia" ? (
                <Passo etapa={etapa}>
                  <div className="occurrence-new-grid">
                    <Campo titulo="Tipo de ocorrência" erro={erros.tipo_ocorrencia}>
                      <select value={form.tipo_ocorrencia} disabled={desabilitado} onChange={(event) => alterar("tipo_ocorrencia", event.target.value)}>
                        <option value="">Selecione o tipo...</option>
                        {TIPOS_REGISTRO.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
                      </select>
                    </Campo>
                    <Campo titulo="Código operacional" dica="Opcional."><input value={form.codigoOperacional} disabled={desabilitado} onChange={(event) => alterar("codigoOperacional", event.target.value)} placeholder="Código da ocorrência" /></Campo>
                    <Campo titulo="Local da ocorrência" erro={erros.local}>
                      <input value={form.local} disabled={desabilitado} autoComplete="street-address" onChange={(event) => alterar("local", event.target.value)} placeholder="Rua, avenida ou estrada" />
                    </Campo>
                    <Campo titulo="Bairro"><input value={form.bairro} disabled={desabilitado} onChange={(event) => alterar("bairro", event.target.value)} /></Campo>
                    <Campo titulo="Referência"><input value={form.referencia} disabled={desabilitado} onChange={(event) => alterar("referencia", event.target.value)} placeholder="Número, esquina ou ponto próximo" /></Campo>
                    <Campo titulo="Rodovia"><input value={form.rodovia} disabled={desabilitado} onChange={(event) => alterar("rodovia", event.target.value)} placeholder="Se aplicável" /></Campo>
                    <Campo titulo="Data e hora do início" erro={erros.inicio}>
                      <input type="datetime-local" value={form.inicio} disabled={desabilitado} onChange={(event) => alterar("inicio", event.target.value)} />
                    </Campo>
                    <div className="occurrence-quick-now-wrap"><button type="button" className="occurrences-clear-button occurrence-new-now" disabled={desabilitado} onClick={() => alterar("inicio", paraCampoDataHora(new Date()))}><Clock size={15} aria-hidden="true" /> Agora</button></div>
                  </div>
                  <Campo titulo="Coordenadas (latitude, longitude)" dica="Opcional — exemplo: -23.3,-46.3." erro={erros.coordenadas} bloco>
                    <span className="occurrence-new-coords">
                      <input value={form.coordenadas} inputMode="decimal" disabled={desabilitado} onChange={(event) => { alterar("coordenadas", event.target.value); setPosicaoNota(""); }} placeholder="-23.3,-46.3" />
                      <button type="button" className="occurrences-advanced-toggle" disabled={desabilitado || buscandoPosicao} onClick={usarPosicaoAtual}>
                        {buscandoPosicao ? <RefreshCw size={15} className="spin" aria-hidden="true" /> : <Crosshair size={15} aria-hidden="true" />}
                        <span>{buscandoPosicao ? "Localizando…" : "Usar posição atual"}</span>
                      </button>
                    </span>
                  </Campo>
                  {coordenada && !coordenadaInvalida ? <p className="occurrence-new-live" role="status"><MapPin size={15} aria-hidden="true" /><span>Coordenadas: {textoDasCoordenadas(coordenada)}</span></p> : null}
                  {posicaoNota ? <p className="occurrence-new-live" role="status"><CircleAlert size={15} aria-hidden="true" /><span>{posicaoNota}</span></p> : null}
                  <EscolhaGravidade valor={form.gravidade} erro={erros.gravidade} disabled={desabilitado} onChange={(valor) => alterar("gravidade", valor)} />
                </Passo>
              ) : null}

              {etapa.id === "equipe" ? (
                <Passo etapa={etapa}>
                  <div className="occurrence-new-grid">
                    <Campo titulo="Identificação do BO externo" dica="Opcional — digite apenas a identificação se existir; não há integração externa.">
                      <input value={form.numeroBo} disabled={desabilitado} maxLength={50} onChange={(event) => alterar("numeroBo", event.target.value)} placeholder="Número ou identificação" />
                    </Campo>
                  </div>
                  <Aviso>A identificação do BO externo é digitada manualmente; o app não consulta nem integra outro sistema.</Aviso>
                  <EquipeCampos profile={profile} oficiais={oficiais} responsavelId={form.responsavelId} apoioId={form.apoioId} carregando={carregandoOficiais} erros={erros} disabled={desabilitado} onResponsavel={(id) => { alterar("responsavelId", id); if (form.apoioId === id) alterar("apoioId", ""); }} onApoio={(id) => alterar("apoioId", id)} />
                </Passo>
              ) : null}

              {etapa.id === "envolvidos" ? (
                <Passo etapa={etapa}>
                  <OccurrencePersonEditor envolvidos={envolvidos} onChange={setEnvolvidos} disabled={desabilitado} />
                  <Aviso>A assinatura é opcional e fica vinculada à pessoa. Ela não representa, por si só, concordância com o relato integral do BO.</Aviso>
                </Passo>
              ) : null}

              {etapa.id === "relato" ? (
                <Passo etapa={etapa}>
                  <Campo titulo="Observações e relato dos fatos" erro={erros.relato} dica="Mínimo de 10 caracteres. Registre fatos, providências e encaminhamentos.">
                    <textarea rows={8} value={form.relato} disabled={desabilitado} onChange={(event) => alterar("relato", event.target.value)} placeholder="Acionamento, o que foi encontrado, providências tomadas e desfecho." />
                  </Campo>
                  <p className="occurrence-new-count">{form.relato.length.toLocaleString("pt-BR")} caracteres</p>
                  <Aviso>Outra autoridade atuou junto? Registre no relato o órgão, a providência e o encaminhamento; não a inclua como GM na equipe.</Aviso>
                </Passo>
              ) : null}

              {etapa.id === "anexos" ? (
                <Passo etapa={etapa}>
                  <OccurrenceAttachments
                    modo="completo"
                    anexos={anexos}
                    onAdicionar={(novos) => setAnexos((atuais) => [...atuais, ...novos])}
                    onRemover={(id) => setAnexos((atuais) => atuais.filter((anexo) => anexo.id !== id))}
                    bloqueado={Boolean(registroCriado)}
                    enviadoIds={anexosEnviados}
                    erroPorId={errosAnexos}
                  />
                </Passo>
              ) : null}

              {etapa.id === "revisao" ? (
                <Passo etapa={etapa}>
                  <div className="occurrence-new-grid">
                    <Campo titulo="Data e hora do encerramento" erro={erros.fim} dica="Obrigatória para concluir o BO completo.">
                      <input type="datetime-local" value={form.fim} disabled={desabilitado} onChange={(event) => alterar("fim", event.target.value)} />
                    </Campo>
                    <div className="occurrence-quick-now-wrap"><button type="button" className="occurrences-clear-button occurrence-new-now" disabled={desabilitado} onClick={() => alterar("fim", paraCampoDataHora(new Date()))}><Clock size={15} aria-hidden="true" /> Agora</button></div>
                  </div>
                  <div className="occurrence-new-review">
                    {listaRevisao.map((linha) => (
                      <div className="occurrence-new-review-line" key={linha.titulo}>
                        <span>{linha.titulo}</span><strong>{linha.valor}</strong>
                        <button type="button" disabled={desabilitado} onClick={() => irPara(linha.etapa)} aria-label={`Alterar ${linha.titulo}`}><PencilLine size={13} aria-hidden="true" /> Alterar</button>
                      </div>
                    ))}
                    <div className="occurrence-new-review-line">
                      <span>Encerramento</span><strong>{form.fim ? formatarDia(form.fim, true) : "Informe o horário acima"}</strong>
                      <button type="button" disabled={desabilitado} onClick={() => document.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.focus()} aria-label="Alterar horário de encerramento"><PencilLine size={13} aria-hidden="true" /> Alterar</button>
                    </div>
                  </div>
                  <div className="occurrence-new-summary">
                    <span className={`occurrence-selo is-${form.gravidade ? TOM_GRAVIDADE[form.gravidade] : "neutro"}`}>{form.gravidade ? `Gravidade ${rotuloDaGravidade(form.gravidade)}` : "Sem gravidade"}</span>
                    <span className="occurrence-selo is-neutro">BO Completo · Atendimento encerrado</span>
                    <span className="occurrence-selo is-neutro">{envolvidos.length} envolvido(s) · {anexos.length} anexo(s)</span>
                  </div>
                  <p className="occurrence-new-privacy"><ShieldCheck size={16} aria-hidden="true" /><span>Ao concluir, o BO é gravado no servidor com equipe, envolvidos e assinaturas opcionais. Arquivos ficam no bucket privado; nada é salvo apenas neste aparelho.</span></p>
                </Passo>
              ) : null}

              {registroCriado ? <p className="occurrence-saved-status" role="status"><CheckCircle2 size={17} aria-hidden="true" /> BO registrado{registroCriado.numero ? ` — Ocorrência ${registroCriado.numero}` : " no servidor"}. Nenhum novo BO será criado ao tentar novamente.</p> : null}
              {erroServidor ? <div className={`occurrences-error${registroCriado ? " is-upload-error" : ""}`} role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{erroServidor}</span></div> : null}
              {etapaAtualErros.length && !erroServidor ? <div className="occurrences-error" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>Verifique os campos destacados antes de continuar.</span></div> : null}

              <div className="occurrence-new-actions">
                {indice > 0 ? (
                  <button type="button" className="occurrences-clear-button" onClick={() => irPara(indice - 1)} disabled={desabilitado}><Undo2 size={15} aria-hidden="true" /> Voltar</button>
                ) : (
                  <button type="button" className="occurrences-clear-button" onClick={voltarAosModos} disabled={desabilitado}><ArrowLeft size={15} aria-hidden="true" /> Trocar modo</button>
                )}
                {indice === ETAPAS.length - 1 ? (
                  <button type="button" className="occurrences-apply-button" onClick={() => void registrar()} disabled={enviando || !online}>
                    {enviando ? <RefreshCw size={15} className="spin" aria-hidden="true" /> : registroCriado ? <RefreshCw size={15} aria-hidden="true" /> : <FilePlus2 size={15} aria-hidden="true" />}
                    <span>{enviando ? (registroCriado ? "Enviando anexos…" : "Concluindo no servidor…") : registroCriado ? "Tentar anexos pendentes" : "Concluir BO Completo"}</span>
                  </button>
                ) : (
                  <button type="button" className="occurrences-apply-button" onClick={avancar} disabled={desabilitado}><span>Continuar</span><ArrowRight size={15} aria-hidden="true" /></button>
                )}
              </div>
            </div>
          </>
        )}

        <footer className="occurrences-footer"><ClipboardList size={16} aria-hidden="true" /><span>Registro nativo · Persistência direta no Supabase com sessão autenticada.</span></footer>
      </div>
    </main>
  );
}
