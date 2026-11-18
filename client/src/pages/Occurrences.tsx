import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Clock,
  FilePlus2,
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
import { isManagementRole, privateImageReference } from "@/lib/dashboard";
import {
  buscarOcorrenciaPorNumero,
  carregarPainelOcorrencias,
  chaveDeAgrupamento,
  chipsAtivos,
  concluirBO,
  contarFiltrosAtivos,
  construirQuery,
  escreverUrl,
  FILTRO_VAZIO,
  formatarDia,
  formatarDuracao,
  formatarHorarioGerado,
  formatarRelativo,
  GRAVIDADES,
  gravarOrdenacao,
  lerEliminarAviso,
  lerFiltroDaUrl,
  loadOfficerOptions,
  MSG,
  paraCampoDataHora,
  paraHorarioServidor,
  parsearData,
  ROTULO_ORDENACAO,
  ROTULO_QUALIDADE,
  type AbaOcorrencia,
  type DocumentoOcorrencia,
  type FiltroOcorrencias,
  type GravidadeSlug,
  type JanelaTemporal,
  type OcorrenciaItem,
  type OrdenacaoOcorrencia,
  type SituacaoOcorrencia,
  type TotaisOcorrencias,
} from "@/lib/ocorrencias";

const PAGINA_INICIAL = 0;
const ESQUELETO = [0, 1, 2, 3];
const ORDENACOES: OrdenacaoOcorrencia[] = ["recentes", "antigas", "sem_fechar", "tipo"];

const SITUACAO_TOM: Record<SituacaoOcorrencia, string> = {
  em_atendimento: "ativo",
  encerrada: "concluido",
  encerrada_sem_horario: "sem-horario",
  cancelada: "cancelado",
  inconsistente: "inconsistente",
};

const DOCUMENTO_TOM: Record<DocumentoOcorrencia, string> = {
  em_redacao: "redacao",
  incompleto: "incompleto",
  concluido: "doc-concluido",
  retificando: "retificando",
  retificado: "retificado",
};

const tomSituacao = (valor: SituacaoOcorrencia): string => SITUACAO_TOM[valor] ?? "neutro";
const tomDocumento = (valor: DocumentoOcorrencia): string => DOCUMENTO_TOM[valor] ?? "neutro";

function linhaLocal(item: OcorrenciaItem): string {
  const partes = [item.local ?? item.rodovia, item.bairro].filter((valor): valor is string => Boolean(valor));
  if (!partes.length) return item.referencia ?? "";
  return item.referencia ? `${partes.join(" · ")} · ${item.referencia}` : partes.join(" · ");
}

function linhaEquipe(item: OcorrenciaItem) {
  const responsavel = item.responsavel
    ? `GM ${item.responsavel}`
    : item.responsavel_sem_apelido
      ? "GM sem apelido"
      : "";
  const apoio = item.apoio.length ? `Apoio: ${item.apoio.map((nome) => `GM ${nome}`).join(", ")}` : "";
  const nota = !item.equipe_registrada
    ? item.origem_criacao === "legado"
      ? "apoio não registrado (anterior à regra)"
      : "apoio não registrado"
    : "";
  return { responsavel, apoio, nota };
}

function Selos({ item, compacto = false }: { item: OcorrenciaItem; compacto?: boolean }) {
  return (
    <span className={`occurrence-selos${compacto ? " is-compacto" : ""}`}>
      <span className={`occurrence-selo is-${tomSituacao(item.situacao)}`}>{item.situacao_rotulo}</span>
      <span className={`occurrence-selo is-${tomDocumento(item.documento)}`}>{item.documento_rotulo}</span>
      {item.numero_bo ? <span className="occurrence-selo is-externo">BO externo</span> : null}
    </span>
  );
}

function MiniaturaOcorrencia({ item }: { item: OcorrenciaItem }) {
  const referencia = privateImageReference(item.foto_thumb) ?? privateImageReference(item.foto_url);
  return (
    <span className="occurrence-card-art">
      <PrivateRecordThumbnail photo={referencia} fallback={<ClipboardList size={22} aria-hidden="true" />} />
      {item.fotos_total > 1 ? (
        <span className="occurrence-photo-count" aria-hidden="true">
          +{item.fotos_total - 1}
        </span>
      ) : null}
    </span>
  );
}

function CartaoOcorrencia({ item, onAbrir }: { item: OcorrenciaItem; onAbrir: (item: OcorrenciaItem) => void }) {
  const local = linhaLocal(item);
  const equipe = linhaEquipe(item);
  const data = item.data_hora_inicio || item.criado_em;
  const duracao = formatarDuracao(item.duracao_min);
  // Mesma condiçao do painel do detalhe: BO incompleto oferece conclusao.
  const concluivel = item.documento === "incompleto";
  return (
    <li className="occurrence-list-item">
      <button
        className="occurrence-card"
        type="button"
        onClick={() => onAbrir(item)}
        aria-label={`${concluivel ? "Concluir" : "Abrir"} ${item.tipo_rotulo}, ${item.identidade}`}
      >
        <MiniaturaOcorrencia item={item} />
        <span className="occurrence-card-copy">
          <span className="occurrence-card-heading">
            <strong>{item.identidade}</strong>
            <span className="occurrence-card-type">{item.tipo_rotulo}</span>
          </span>
          <Selos item={item} />
          <span className="occurrence-card-meta">
            {data ? (
              <time dateTime={data}>
                <CalendarDays size={14} aria-hidden="true" />
                {formatarRelativo(data)}
              </time>
            ) : null}
            {item.origem ? <span className="occurrence-card-origin">{item.origem}</span> : null}
            {item.gravidade !== "nao_informado" ? (
              <span className="occurrence-severity">Gravidade {item.gravidade_rotulo}</span>
            ) : null}
            {duracao ? (
              <span className="occurrence-duration">
                <Clock size={13} aria-hidden="true" />
                {duracao}
              </span>
            ) : null}
          </span>
          {local ? (
            <span className="occurrence-card-location" title={local}>
              <MapPin size={14} aria-hidden="true" />
              {local}
            </span>
          ) : null}
          {equipe.responsavel || equipe.apoio || equipe.nota ? (
            <span className="occurrence-card-team">
              {equipe.responsavel ? (
                <span>
                  <UserRound size={13} aria-hidden="true" />
                  {equipe.responsavel}
                </span>
              ) : null}
              {equipe.apoio ? (
                <span>
                  <UsersRound size={13} aria-hidden="true" />
                  {equipe.apoio}
                </span>
              ) : null}
              {equipe.nota ? <span className="occurrence-team-note">{equipe.nota}</span> : null}
            </span>
          ) : null}
          <span className={`occurrence-sync${item.sincronia_alarme ? " is-alarme" : ""}`}>
            <RefreshCw size={13} aria-hidden="true" />
            {item.sincronia_rotulo}
            {item.tem_retificacao ? <em> · registro com retificação</em> : null}
          </span>
        </span>
        <span className={`occurrence-card-open${concluivel ? " is-acao" : ""}`}>
          {concluivel ? "Concluir BO" : "Ver detalhes"} <ArrowRight size={16} aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}

function SkeletonCard() {
  return (
    <li className="occurrence-list-item" aria-hidden="true">
      <div className="occurrence-card is-skeleton">
        <span className="occurrence-card-art" />
        <span className="occurrence-card-copy">
          <span className="occurrence-skeleton-line is-title" />
          <span className="occurrence-skeleton-line is-badges" />
          <span className="occurrence-skeleton-line" />
          <span className="occurrence-skeleton-line is-short" />
        </span>
      </div>
    </li>
  );
}

type CartaoIndicador = {
  rotulo: string;
  valor: string;
  nota?: string;
  tom: string;
};

function KpiCard({
  cartao,
  ativo,
  onClick,
}: {
  cartao: CartaoIndicador & { aba: AbaOcorrencia };
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`occurrence-stat is-${cartao.tom}${ativo ? " is-active" : ""}`}
      onClick={onClick}
      aria-pressed={ativo}
    >
      <span className="occurrence-stat-head">
        <span className="occurrence-stat-label">{cartao.rotulo}</span>
        <span className="occurrence-stat-icon" aria-hidden="true">
          {cartao.tom === "incompleto" ? <CircleAlert size={18} /> : cartao.tom === "concluido" ? <Check size={18} /> : <Clock size={18} />}
        </span>
      </span>
      <span className="occurrence-stat-value">{cartao.valor}</span>
      {cartao.nota ? <span className="occurrence-stat-note">{cartao.nota}</span> : null}
      <span className="occurrence-stat-go">
        Ver registros <ArrowRight size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

function KpiEstatico({ cartao }: { cartao: CartaoIndicador }) {
  return (
    <div className={`occurrence-stat is-${cartao.tom} is-static`}>
      <span className="occurrence-stat-head">
        <span className="occurrence-stat-label">{cartao.rotulo}</span>
        <span className="occurrence-stat-icon" aria-hidden="true"><Clock size={18} /></span>
      </span>
      <span className="occurrence-stat-value">{cartao.valor}</span>
      {cartao.nota ? <span className="occurrence-stat-note">{cartao.nota}</span> : null}
    </div>
  );
}

type PropsPainel = {
  filtro: FiltroOcorrencias;
  totais: TotaisOcorrencias | null;
  onMudar: (mudar: (atual: FiltroOcorrencias) => FiltroOcorrencias) => void;
  onFechar: () => void;
};

function PainelFiltros({ filtro, totais, onMudar, onFechar }: PropsPainel) {
  const [busca, setBusca] = useState(filtro.busca);
  const [local, setLocal] = useState(filtro.local);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    setBusca(filtro.busca);
  }, [filtro.busca]);
  useEffect(() => {
    setLocal(filtro.local);
  }, [filtro.local]);
  useEffect(
    () => () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    },
    [],
  );

  function adiar(mudar: (atual: FiltroOcorrencias, valor: string) => FiltroOcorrencias, valor: string) {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => onMudar((atual) => mudar(atual, valor)), 400);
  }

  const facetas = totais?.facetas;
  const qualidade = facetas?.qualidade ?? {};
  const bairros = facetas?.bairros ?? [];
  const tipos = facetas?.tipos ?? [];
  const gravidades = facetas?.gravidades ?? [];
  const origens = facetas?.origens ?? [];
  const gms = facetas?.gms ?? [];

  return (
    <div id="occurrences-advanced-panel" className="occurrences-advanced-panel">
      <div className="occurrences-filter-grid">
        <label className="occurrences-search-field">
          <span>Buscar</span>
          <span className="occurrences-input-wrap">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(event) => {
                const valor = event.target.value;
                setBusca(valor);
                adiar((atual, novo) => ({ ...atual, busca: novo.slice(0, 80) }), valor);
              }}
              placeholder="Número, tipo, local ou GM"
            />
          </span>
        </label>

        <label>
          <span>Tipo</span>
          <select
            value={filtro.tipo[0] ?? ""}
            onChange={(event) =>
              onMudar((atual) => ({ ...atual, tipo: event.target.value ? [event.target.value] : [] }))
            }
          >
            <option value="">Todos os tipos</option>
            {tipos.map((facet) => (
              <option key={facet.valor} value={facet.valor}>
                {facet.rotulo} ({facet.quantidade})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Gravidade</span>
          <select
            value={filtro.gravidade[0] ?? ""}
            onChange={(event) =>
              onMudar((atual) => ({ ...atual, gravidade: event.target.value ? [event.target.value] : [] }))
            }
          >
            <option value="">Todas as gravidades</option>
            {gravidades.map((facet) => (
              <option key={facet.valor} value={facet.valor}>
                {facet.rotulo} ({facet.quantidade})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Como foi acionada</span>
          <select
            value={filtro.origem[0] ?? ""}
            onChange={(event) =>
              onMudar((atual) => ({ ...atual, origem: event.target.value ? [event.target.value] : [] }))
            }
          >
            <option value="">Todos os acionamentos</option>
            {origens.map((facet) => (
              <option key={facet.valor} value={facet.valor}>
                {facet.valor} ({facet.quantidade})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Período medido por</span>
          <select
            value={filtro.janela}
            onChange={(event) => onMudar((atual) => ({ ...atual, janela: event.target.value as JanelaTemporal }))}
          >
            <option value="inicio">Início do atendimento</option>
            <option value="encerramento">Encerramento</option>
          </select>
        </label>

        <label>
          <span>De</span>
          <input type="date" value={filtro.de} onChange={(event) => onMudar((atual) => ({ ...atual, de: event.target.value }))} />
        </label>

        <label>
          <span>Até</span>
          <input type="date" value={filtro.ate} onChange={(event) => onMudar((atual) => ({ ...atual, ate: event.target.value }))} />
        </label>

        <label className="occurrences-local-field">
          <span>Local, bairro ou referência</span>
          <input
            value={local}
            onChange={(event) => {
              const valor = event.target.value;
              setLocal(valor);
              adiar((atual, novo) => ({ ...atual, local: novo.slice(0, 80) }), valor);
            }}
            placeholder="Rua, avenida ou ponto de referência"
          />
        </label>

        <label>
          <span>GM responsável</span>
          <select value={filtro.gmId} onChange={(event) => onMudar((atual) => ({ ...atual, gmId: event.target.value }))}>
            <option value="">Todos os GMs</option>
            {gms.map((facet) => (
              <option key={facet.id} value={facet.id}>
                {facet.rotulo} ({facet.quantidade})
              </option>
            ))}
          </select>
        </label>
      </div>

      {bairros.length ? (
        <div className="occurrences-facet-row" role="group" aria-label="Bairros mais registrados">
          <span className="occurrences-facet-title">Bairros</span>
          {bairros.slice(0, 8).map((bairro) => (
            <button
              key={bairro.valor}
              type="button"
              className={`occurrences-quick-chip${filtro.local === bairro.valor ? " is-active" : ""}`}
              aria-pressed={filtro.local === bairro.valor}
              onClick={() => {
                if (temporizador.current) window.clearTimeout(temporizador.current);
                setLocal(bairro.valor);
                onMudar((atual) => ({ ...atual, local: bairro.valor }));
              }}
            >
              {bairro.valor} <small>{bairro.quantidade}</small>
            </button>
          ))}
        </div>
      ) : null}

      <div className="occurrences-facet-row" role="group" aria-label="Qualidade do registro">
        <span className="occurrences-facet-title">Qualidade</span>
        {Object.keys(ROTULO_QUALIDADE)
          .filter((chaveQualidade) => chaveQualidade in qualidade)
          .map((chaveQualidade) => (
            <button
              key={chaveQualidade}
              type="button"
              className={`occurrences-quick-chip${filtro.qualidade.includes(chaveQualidade) ? " is-active" : ""}`}
              aria-pressed={filtro.qualidade.includes(chaveQualidade)}
              onClick={() =>
                onMudar((atual) => ({
                  ...atual,
                  qualidade: atual.qualidade.includes(chaveQualidade)
                    ? atual.qualidade.filter((valor) => valor !== chaveQualidade)
                    : [...atual.qualidade, chaveQualidade],
                }))
              }
            >
              {ROTULO_QUALIDADE[chaveQualidade]} <small>{qualidade[chaveQualidade] ?? 0}</small>
            </button>
          ))}
      </div>

      <div className="occurrences-facet-row" role="group" aria-label="Vínculo com BO externo">
        <span className="occurrences-facet-title">BO externo</span>
        <button
          type="button"
          className={`occurrences-quick-chip${filtro.somenteComBo ? " is-active" : ""}`}
          aria-pressed={filtro.somenteComBo}
          onClick={() => onMudar((atual) => ({ ...atual, somenteComBo: !atual.somenteComBo, somenteSemBo: false }))}
        >
          Só com BO externo <small>{qualidade.com_bo ?? 0}</small>
        </button>
        <button
          type="button"
          className={`occurrences-quick-chip${filtro.somenteSemBo ? " is-active" : ""}`}
          aria-pressed={filtro.somenteSemBo}
          onClick={() => onMudar((atual) => ({ ...atual, somenteSemBo: !atual.somenteSemBo, somenteComBo: false }))}
        >
          Só sem BO externo
        </button>
      </div>

      <div className="occurrences-panel-footer">
        <p className="occurrences-panel-hint">Cada escolha aplica na hora, sem botão separado.</p>
        <button type="button" className="occurrences-clear-button" onClick={onFechar}>
          <X size={15} aria-hidden="true" /> Fechar filtros
        </button>
      </div>
    </div>
  );
}

function FormularioConcluirBo({
  item,
  oficiais,
  onConcluido,
}: {
  item: OcorrenciaItem;
  oficiais: Array<{ id: string; label: string }>;
  onConcluido: (mensagem: string) => void;
}) {
  const [encerramento, setEncerramento] = useState(paraCampoDataHora(new Date()));
  const [gravidade, setGravidade] = useState<GravidadeSlug | "">("");
  const [apoioId, setApoioId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pedeGravidade = item.gravidade === "nao_informado";
  const pedeApoio = !item.equipe_registrada;

  async function enviar() {
    const horario = paraHorarioServidor(encerramento);
    if (item.completado_em) {
      setErro(MSG.jaConcluido);
      return;
    }
    if (!horario) {
      setErro(MSG.encerramentoObrigatorio);
      return;
    }
    // O servidor compara o término com o início gravado; a tela avisa antes.
    const inicio = parsearData(item.data_hora_inicio);
    const termino = parsearData(encerramento);
    if (inicio && termino && termino.getTime() < inicio.getTime()) {
      setErro(MSG.encerramentoAnterior);
      return;
    }
    if (pedeGravidade && !gravidade) {
      setErro(MSG.gravidadeParaConcluir);
      return;
    }
    if (pedeApoio && !apoioId) {
      setErro(MSG.apoioParaConcluir);
      return;
    }
    if (pedeApoio && apoioId) {
      const apoioRepetido = oficiais.find((oficial) => oficial.id === apoioId && item.responsavel && oficial.label === `GM ${item.responsavel}`);
      if (apoioRepetido) {
        setErro(MSG.apoioIgualResponsavel);
        return;
      }
    }
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await concluirBO({
        ocorrenciaId: item.id,
        encerramento: horario,
        gravidade: pedeGravidade ? (gravidade as GravidadeSlug) : null,
        observacoes: observacoes.trim() || null,
        apoioId: pedeApoio ? apoioId : null,
      });
      onConcluido(
        resposta.numero_ocorrencia
          ? `BO concluído — Ocorrência ${resposta.numero_ocorrencia}`
          : "BO concluído.",
      );
    } catch (cause) {
      // Erro do servidor aparece cru: a autoridade é o banco, a tela só traduz
      // quando não há mensagem nenhuma.
      setErro(cause instanceof Error && cause.message ? cause.message : "Não foi possível concluir o BO.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="occurrence-complete-form" aria-label="Concluir BO">
      <h3>Concluir BO</h3>
      <p className="occurrence-complete-help">
        Este BO da Guarda está incompleto. O horário de término do atendimento é obrigatório para fechar.
      </p>
      <label>
        <span>Horário de término do atendimento</span>
        <input type="datetime-local" value={encerramento} onChange={(event) => setEncerramento(event.target.value)} />
      </label>

      {pedeGravidade ? (
        <div className="occurrence-severity-choice" role="group" aria-label="Gravidade">
          <span className="occurrence-choice-label">Gravidade</span>
          <div className="occurrence-severity-buttons">
            {GRAVIDADES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={`occurrence-severity-button${gravidade === opcao.valor ? " is-active" : ""}`}
                aria-pressed={gravidade === opcao.valor}
                onClick={() => setGravidade(opcao.valor)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {pedeApoio ? (
        <div className="occurrences-field-wide">
          <label>
            <span>GM de apoio</span>
            <select value={apoioId} onChange={(event) => setApoioId(event.target.value)}>
              <option value="">Escolha o guarda que deu apoio</option>
              {oficiais.map((oficial) => (
                <option key={oficial.id} value={oficial.id}>
                  {oficial.label}
                </option>
              ))}
            </select>
          </label>
          <p className="occurrences-field-note">
            {MSG.apoioExigeGestao} Esse guarda ainda não está no sistema? Peça o cadastro ao administrador.
          </p>
        </div>
      ) : null}

      <label>
        <span>Complemento do relato (opcional)</span>
        <textarea rows={3} value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
      </label>

      {erro ? (
        <p className="occurrence-form-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" /> <span>{erro}</span>
        </p>
      ) : null}

      <button type="button" className="occurrences-apply-button" onClick={enviar} disabled={enviando}>
        {enviando ? <RefreshCw size={15} className="spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
        <span>{enviando ? "Concluindo no servidor…" : "Concluir BO no servidor"}</span>
      </button>
    </section>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="occurrence-detail-block">
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

function Linha({ titulo, valor, tom }: { titulo: string; valor: string; tom?: string }) {
  if (!valor) return null;
  return (
    <div className={`occurrence-detail-line${tom ? ` is-${tom}` : ""}`}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function DetalheOcorrencia({
  item,
  oficiais,
  onClose,
  onConcluido,
}: {
  item: OcorrenciaItem;
  oficiais: Array<{ id: string; label: string }>;
  onClose: () => void;
  onConcluido: (mensagem: string) => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const [relatoAberto, setRelatoAberto] = useState(false);
  const local = linhaLocal(item);
  const equipe = linhaEquipe(item);
  const duracao = formatarDuracao(item.duracao_min);
  const temDadosLocal = Boolean(local || item.tem_coordenada || item.rodovia);

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
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
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

  return (
    <div
      className="occurrence-detail-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="occurrence-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="occurrence-detail-title"
        tabIndex={-1}
      >
        <div className="occurrence-detail-topline">
          <span className="occurrence-detail-mark">
            <ClipboardList size={20} aria-hidden="true" />
          </span>
          <button
            ref={closeButton}
            type="button"
            className="occurrence-detail-close"
            onClick={onClose}
            aria-label="Fechar detalhes"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="dashboard-eyebrow">BO DA GUARDA · PITANGUEIRAS</p>
        <h2 id="occurrence-detail-title">{item.identidade}</h2>
        <p className="occurrence-detail-type">{item.tipo_rotulo}</p>
        <Selos item={item} compacto />

        {item.relato ? (
          <Bloco titulo="O que aconteceu">
            <p className={`occurrence-detail-relato${relatoAberto ? " is-open" : ""}`}>{item.relato}</p>
            {item.relato.length > 220 ? (
              <button
                type="button"
                className="occurrence-detail-expand"
                onClick={() => setRelatoAberto((valor) => !valor)}
                aria-expanded={relatoAberto}
              >
                {relatoAberto ? "Mostrar menos" : "Mostrar todo o relato"}
              </button>
            ) : null}
          </Bloco>
        ) : null}

        <Bloco titulo="Situação">
          <div className="occurrence-detail-axes">
            <span className="occurrence-axis">
              <small>Situação</small>
              <strong className={`occurrence-selo is-${tomSituacao(item.situacao)}`}>{item.situacao_rotulo}</strong>
            </span>
            <span className="occurrence-axis">
              <small>Documento</small>
              <strong className={`occurrence-selo is-${tomDocumento(item.documento)}`}>{item.documento_rotulo}</strong>
            </span>
            <span className="occurrence-axis">
              <small>Sincronia</small>
              <strong className={`occurrence-selo${item.sincronia_alarme ? " is-inconsistente" : " is-neutro"}`}>
                {item.sincronia_rotulo}
              </strong>
            </span>
          </div>
          <div className="occurrence-detail-lines">
            <Linha titulo="Início do atendimento" valor={formatarDia(item.data_hora_inicio, true)} />
            <Linha titulo="Encerramento do atendimento" valor={formatarDia(item.data_hora_encerramento, true)} />
            <Linha titulo="Duração" valor={duracao} />
            <Linha titulo="BO concluído em" valor={formatarDia(item.completado_em, true)} />
            <Linha titulo="Gravidade" valor={item.gravidade === "nao_informado" ? "" : item.gravidade_rotulo} />
            <Linha titulo="Registrado em" valor={formatarDia(item.criado_em, true)} />
          </div>
          {item.encerramento_confianca === "coletavel" ? (
            <p className="occurrence-detail-note">O horário de encerramento ainda pode ser registrado ao concluir o BO.</p>
          ) : null}
        </Bloco>

        {temDadosLocal ? (
          <Bloco titulo="Local">
            <div className="occurrence-detail-lines">
              <Linha titulo="Endereço" valor={item.local ?? item.rodovia ?? ""} />
              <Linha titulo="Bairro" valor={item.bairro ?? ""} />
              <Linha titulo="Referência" valor={item.referencia ?? ""} />
              <Linha titulo="Rodovia" valor={item.rodovia ?? ""} />
              <Linha
                titulo="Coordenadas"
                valor={
                  item.tem_coordenada && item.latitude !== null && item.longitude !== null
                    ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
                    : ""
                }
              />
            </div>
          </Bloco>
        ) : null}

        <Bloco titulo="Equipe">
          <div className="occurrence-detail-lines">
            <Linha titulo="Responsável" valor={equipe.responsavel} />
            <Linha titulo="Apoio" valor={item.apoio.map((nome) => `GM ${nome}`).join(", ")} />
          </div>
          {equipe.nota ? <p className="occurrence-detail-note">{equipe.nota}</p> : null}
        </Bloco>

        <Bloco titulo="Documentos e evidências">
          <ul className="occurrence-detail-counts">
            {item.fotos_total > 0 ? <li>{item.fotos_total} foto{item.fotos_total === 1 ? "" : "s"}</li> : null}
            {item.anexos_total > 0 ? (
              <li>
                {item.anexos_total} arquivo{item.anexos_total === 1 ? "" : "s"} anexado{item.anexos_total === 1 ? "" : "s"}
              </li>
            ) : null}
            {item.tem_retificacao ? <li>Registro com retificação</li> : null}
            {item.fotos_total === 0 && item.anexos_total === 0 ? <li>Nenhuma evidência anexada.</li> : null}
          </ul>
        </Bloco>

        {item.envolvidos_total > 0 ? (
          <Bloco titulo="Envolvidos">
            <p className="occurrence-detail-note">
              {item.envolvidos_total} pessoa{item.envolvidos_total === 1 ? "" : "s"} registrada
              {item.envolvidos_total === 1 ? "" : "s"} neste BO. Os dados pessoais ficam apenas no registro completo.
            </p>
          </Bloco>
        ) : null}

        {item.numero_bo || item.orgao_bo || item.sincronizado_em || item.origem_criacao ? (
          <Bloco titulo="Vínculo externo">
            <div className="occurrence-detail-lines">
              <Linha titulo="BO externo" valor={item.numero_bo ?? ""} />
              <Linha titulo="Órgão" valor={item.orgao_bo ?? ""} />
              <Linha titulo="Sincronizado em" valor={formatarDia(item.sincronizado_em, true)} />
              <Linha
                titulo="Origem do registro"
                valor={
                  item.origem_criacao === "app"
                    ? "Criado neste app"
                    : item.origem_criacao === "legado"
                      ? "Importado do sistema anterior"
                      : ""
                }
              />
            </div>
          </Bloco>
        ) : null}

        {item.documento === "incompleto" ? (
          <FormularioConcluirBo item={item} oficiais={oficiais} onConcluido={onConcluido} />
        ) : null}

        <p className="occurrence-detail-privacy">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            Consulta protegida. Situação, documento e sincronia vêm do servidor — nada é calculado no aparelho.
          </span>
        </p>
      </section>
    </div>
  );
}

export default function Occurrences({ profile }: { profile: PerfilFuncional }) {
  const manager = isManagementRole(profile.perfil);
  const inicial = useRef(lerFiltroDaUrl());
  const [filtro, setFiltro] = useState<FiltroOcorrencias>(() =>
    manager || inicial.current.filtro.aba === "atendimento" || inicial.current.filtro.aba === "todas"
      ? inicial.current.filtro
      : { ...inicial.current.filtro, aba: "todas" },
  );
  const [ordenacao, setOrdenacao] = useState<OrdenacaoOcorrencia>(inicial.current.ordenacao);
  const [totais, setTotais] = useState<TotaisOcorrencias | null>(null);
  const [totaisEscopo, setTotaisEscopo] = useState<TotaisOcorrencias | null>(null);
  const [itens, setItens] = useState<OcorrenciaItem[]>([]);
  const [agrupamentos, setAgrupamentos] = useState<
    Array<{ chave: string; titulo: string; quantidade: number }>
  >([]);
  const [total, setTotal] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [pagina, setPagina] = useState(PAGINA_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoCoerencia, setAvisoCoerencia] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [aberto, setAberto] = useState<OcorrenciaItem | null>(null);
  const [oficiais, setOficiais] = useState<Array<{ id: string; label: string }>>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(() => lerEliminarAviso());
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [detalheCarregando, setDetalheCarregando] = useState<string | null>(inicial.current.detalhe);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);
  const solicitacao = useRef(0);
  const itensRef = useRef<OcorrenciaItem[]>([]);
  const numeroAberto = useRef<string | null>(inicial.current.detalhe);

  const consolidarItens = useCallback((proximos: OcorrenciaItem[], append: boolean) => {
    const base = append ? itensRef.current : [];
    const novos = proximos.filter((item) => !base.some((atual) => atual.id === item.id));
    const consolidados = append ? [...base, ...novos] : proximos;
    itensRef.current = consolidados;
    setItens(consolidados);
  }, []);

  const carregar = useCallback(
    async (destino: number, append: boolean, manterLista = false) => {
      const id = ++solicitacao.current;
      if (append) setCarregandoMais(true);
      else if (manterLista) setAtualizando(true);
      else {
        setCarregando(true);
        setAtualizando(false);
      }
      setErro(null);
      try {
        const passada = await carregarPainelOcorrencias(filtro, destino, ordenacao);
        if (id !== solicitacao.current) return;
        consolidarItens(passada.pagina.itens, append);
        setTotais(passada.totais);
        setTotaisEscopo(passada.totaisEscopo);
        setAgrupamentos(passada.pagina.agrupamentos);
        setTotal(passada.pagina.total);
        setTemMais(passada.pagina.temMais);
        setPagina(destino);
        setAvisoCoerencia(passada.avisoCoerencia);
      } catch (cause) {
        if (id !== solicitacao.current) return;
        setErro(cause instanceof Error ? cause.message : "Não foi possível carregar as ocorrências.");
      } finally {
        if (id === solicitacao.current) {
          setCarregando(false);
          setAtualizando(false);
          setCarregandoMais(false);
        }
      }
    },
    [consolidarItens, filtro, ordenacao],
  );

  useEffect(() => {
    itensRef.current = [];
    setItens([]);
    void carregar(PAGINA_INICIAL, false);
    return () => {
      solicitacao.current += 1;
    };
  }, [carregar]);

  useEffect(() => {
    void loadOfficerOptions()
      .then((lista) => lista.filter((oficial) => oficial.id !== profile.id))
      .then(setOficiais)
      .catch(() => setOficiais([]));
  }, [profile.id]);

  useEffect(() => {
    escreverUrl(filtro, ordenacao, aberto ? numeroAberto.current : null, false);
  }, [filtro, ordenacao, aberto]);

  useEffect(() => {
    const aoEntrar = () => setIsOnline(true);
    const aoSair = () => setIsOnline(false);
    window.addEventListener("online", aoEntrar);
    window.addEventListener("offline", aoSair);
    return () => {
      window.removeEventListener("online", aoEntrar);
      window.removeEventListener("offline", aoSair);
    };
  }, []);

  useEffect(() => {
    const numero = inicial.current.detalhe;
    if (!numero) return;
    void buscarOcorrenciaPorNumero(numero)
      .then((item) => {
        if (item) {
          numeroAberto.current = item.numero_ocorrencia ?? item.id;
          setAberto(item);
          return;
        }
        setDetalheErro(`Não encontramos a ocorrência ${numero} nesta conta. Mostrando a lista.`);
      })
      .catch((cause: unknown) => {
        setDetalheErro(cause instanceof Error ? cause.message : "Não foi possível abrir a ocorrência.");
      })
      .finally(() => setDetalheCarregando(null));
  }, []);

  function mudarFiltro(mudar: (atual: FiltroOcorrencias) => FiltroOcorrencias) {
    setFiltro((atual) => mudar(atual));
    setMensagemSucesso(null);
  }

  const mudarAba = (aba: AbaOcorrencia) => mudarFiltro((atual) => ({ ...atual, aba }));

  function abrir(item: OcorrenciaItem) {
    numeroAberto.current = item.numero_ocorrencia ?? item.id;
    setDetalheErro(null);
    setAberto(item);
    escreverUrl(filtro, ordenacao, numeroAberto.current, true);
  }

  function fechar() {
    setAberto(null);
    numeroAberto.current = null;
  }

  function tentarNovamente() {
    void carregar(PAGINA_INICIAL, false, itensRef.current.length > 0);
  }

  function limparFiltros() {
    mudarFiltro((atual) => ({ ...FILTRO_VAZIO, aba: atual.aba }));
  }

  const baseTotais = totaisEscopo ?? totais;
  const chips = chipsAtivos(filtro, baseTotais);
  const filtrosAtivos = contarFiltrosAtivos(filtro);
  /** O formulário novo abre com o recorte atual embutido para o botão voltar. */
  const consultaAtual = construirQuery(filtro, ordenacao);
  const enderecoNova = `#/ocorrencias/nova${consultaAtual ? `?${consultaAtual}` : ""}`;

  const abas: Array<{ id: AbaOcorrencia; rotulo: string; contador: number | null }> = [
    { id: "todas", rotulo: "Todas", contador: baseTotais?.abas.todas ?? null },
    ...(manager ? [{ id: "minhas" as const, rotulo: "Minhas", contador: null }] : []),
    ...(manager ? [{ id: "corporacao" as const, rotulo: "Corporação", contador: null }] : []),
    { id: "atendimento", rotulo: "Em atendimento", contador: baseTotais?.abas.atendimento ?? null },
    { id: "complementar", rotulo: "A complementar", contador: baseTotais?.abas.complementar ?? null },
    { id: "encerradas", rotulo: "Encerradas", contador: baseTotais?.abas.encerradas ?? null },
    { id: "inconsistente", rotulo: "Inconsistências", contador: baseTotais?.abas.inconsistente ?? null },
  ];

  const grupos: Array<{ chave: string; titulo: string; quantidade: number; itens: OcorrenciaItem[] }> = useMemo(() => {
    if (!agrupamentos.length) return [];
    const usados = new Set<string>();
    const lista = agrupamentos.map((grupo) => {
      const mesAno = grupo.chave.match(/^(\d{4})-(\d{2})$/);
      const nomeMes = mesAno
        ? new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
            new Date(Date.UTC(Number(mesAno[1]), Number(mesAno[2]) - 1, 1)),
          )
        : null;
      const titulo = nomeMes ? `${nomeMes[0].toLocaleUpperCase("pt-BR")}${nomeMes.slice(1)} de ${mesAno![1]}` : grupo.titulo;
      const itensGrupo = itens.filter((item) => {
        if (usados.has(item.id)) return false;
        return chaveDeAgrupamento(item.data_hora_inicio || item.criado_em) === grupo.chave;
      });
      itensGrupo.forEach((item) => usados.add(item.id));
      return { chave: grupo.chave, titulo, quantidade: grupo.quantidade, itens: itensGrupo };
    });
    const restante = itens.filter((item) => !usados.has(item.id));
    if (restante.length) lista.push({ chave: "demais", titulo: "Demais registros", quantidade: restante.length, itens: restante });
    return lista;
  }, [agrupamentos, itens]);

  const kpisAba: Array<CartaoIndicador & { aba: AbaOcorrencia }> = [];
  const kpisEstaticos: CartaoIndicador[] = [];
  if (baseTotais) {
    const construir = (aba: AbaOcorrencia, rotulo: string, valor: number, tom: string) => {
      if (valor > 0) kpisAba.push({ aba, rotulo, valor: valor.toLocaleString("pt-BR"), tom });
    };
    if (manager) {
      construir("complementar", "A complementar", baseTotais.abas.complementar, "incompleto");
      construir("atendimento", "Em atendimento", baseTotais.abas.atendimento, "ativo");
      const duracaoMedia = formatarDuracao(baseTotais.metricas.duracao_media_min);
      if (duracaoMedia) {
        kpisEstaticos.push({
          rotulo: "Duração média",
          valor: duracaoMedia,
          tom: "duracao",
          nota:
            baseTotais.metricas.taxa_encerramento_pct !== null
              ? `Encerramento ${baseTotais.metricas.taxa_encerramento_pct}%`
              : undefined,
        });
      }
      construir("encerradas", "Encerradas", baseTotais.abas.encerradas, "concluido");
    } else {
      construir("atendimento", "Em atendimento", baseTotais.abas.atendimento, "ativo");
      construir("complementar", "A complementar", baseTotais.abas.complementar, "incompleto");
      construir("encerradas", "Encerradas no período", baseTotais.abas.encerradas, "concluido");
    }
  }

  function conteudoVazio(): { titulo: string; texto: string } {
    if (filtrosAtivos > 0) {
      return {
        titulo: "Nenhum registro com esses filtros",
        texto: "Ajuste ou limpe os filtros para ver mais ocorrências.",
      };
    }
    if (filtro.aba === "atendimento")
      return { titulo: "Nenhum atendimento em aberto", texto: "Todos os registros deste recorte já foram encerrados." };
    if (filtro.aba === "complementar")
      return { titulo: "Nada a complementar", texto: "Todos os BOs da Guarda deste recorte estão concluídos." };
    if (filtro.aba === "encerradas")
      return { titulo: "Nenhuma ocorrência encerrada", texto: "Ainda não há encerramentos neste período." };
    if (filtro.aba === "inconsistente")
      return { titulo: "Nenhuma inconsistência de datas", texto: "Nenhum registro com término antes do início." };
    return {
      titulo: "Nenhuma ocorrência encontrada",
      texto: "Quando um BO for registrado nesta conta, ele aparece aqui.",
    };
  }

  const vazio = conteudoVazio();
  const mostrarGrupos = agrupamentos.length > 1 && grupos.some((grupo) => grupo.itens.length > 0);

  return (
    <main className="occurrences-shell">
      <div className="occurrences-content">
        <section className="occurrences-hero" aria-labelledby="occurrences-title">
          <div className="occurrences-hero-copy">
            <p className="dashboard-eyebrow">
              {manager ? "CENTRAL DA CORPORAÇÃO" : "SUA ATUAÇÃO"} · REGISTROS OPERACIONAIS
            </p>
            <h1 id="occurrences-title">Ocorrências</h1>
            <p>
              {manager
                ? "Situação, documento e sincronia de cada BO vêm do servidor."
                : "Consulte os atendimentos em que você entrou e o que ainda precisa ser fechado."}
            </p>
          </div>
          <div className="occurrences-hero-actions">
            <span className="occurrences-total">
              <strong>{total.toLocaleString("pt-BR")}</strong>{" "}
              {total === 1 ? "registro neste filtro" : "registros neste filtro"}
              {totais ? <em>Atualizado às {formatarHorarioGerado(totais.geradoEm)}</em> : null}
            </span>
            <button className="occurrences-refresh" type="button" onClick={tentarNovamente} disabled={carregando || atualizando}>
              <RefreshCw size={16} className={atualizando ? "spin" : ""} aria-hidden="true" />
              <span>{atualizando ? "Atualizando…" : "Atualizar"}</span>
            </button>
            <a className="occurrences-create" href={enderecoNova}>
              <FilePlus2 size={17} aria-hidden="true" />
              <span>Nova ocorrência</span>
            </a>
          </div>
        </section>

        {!isOnline ? (
          <div className="occurrences-offline-banner" role="status">
            <WifiOff size={16} aria-hidden="true" />
            <span>Sem conexão. Os registros já carregados continuam visíveis.</span>
          </div>
        ) : null}

        {aviso || mensagemSucesso ? (
          <div className="occurrences-flash" role="status">
            <Check size={16} aria-hidden="true" />
            <span>{aviso ?? mensagemSucesso}</span>
            <button
              type="button"
              onClick={() => {
                setAviso(null);
                setMensagemSucesso(null);
              }}
              aria-label="Fechar aviso"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {detalheErro ? (
          <div className="occurrences-offline-banner is-alert" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{detalheErro}</span>
          </div>
        ) : null}

        {avisoCoerencia ? (
          <p className="occurrences-coherence" role="status">
            <CircleAlert size={16} aria-hidden="true" />
            <span>Os totais não bateram com a lista. Atualize para conferir os números.</span>
          </p>
        ) : null}

        {baseTotais && !avisoCoerencia && (kpisAba.length > 0 || kpisEstaticos.length > 0) ? (
          <section className="occurrences-summary" aria-label="Indicadores do período">
            {kpisAba.map((cartao) => (
              <KpiCard
                key={cartao.rotulo}
                cartao={cartao}
                ativo={filtro.aba === cartao.aba}
                onClick={() => mudarAba(cartao.aba)}
              />
            ))}
            {kpisEstaticos.map((cartao) => (
              <KpiEstatico key={cartao.rotulo} cartao={cartao} />
            ))}
          </section>
        ) : null}

        <section className="occurrences-workspace" aria-label="Lista e filtros de ocorrências">
          <div className="occurrences-toolbar">
            <div className="occurrences-filter-tabs" role="group" aria-label="Abas de ocorrências">
              {abas.map((aba) => (
                <button
                  key={aba.id}
                  type="button"
                  aria-pressed={filtro.aba === aba.id}
                  className={filtro.aba === aba.id ? "is-active" : ""}
                  onClick={() => mudarAba(aba.id)}
                >
                  <span>{aba.rotulo}</span>
                  {aba.contador !== null && !avisoCoerencia ? <small>{aba.contador.toLocaleString("pt-BR")}</small> : null}
                </button>
              ))}
            </div>
            <div className="occurrences-toolbar-actions">
              <label className="occurrences-sort-field">
                <span>Ordenar</span>
                <select
                  value={ordenacao}
                  onChange={(event) => {
                    const valor = event.target.value as OrdenacaoOcorrencia;
                    setOrdenacao(valor);
                    gravarOrdenacao(valor);
                  }}
                >
                  {ORDENACOES.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {ROTULO_ORDENACAO[opcao]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={`occurrences-advanced-toggle${painelAberto ? " is-open" : ""}`}
                type="button"
                onClick={() => setPainelAberto((valor) => !valor)}
                aria-expanded={painelAberto}
                aria-controls="occurrences-advanced-panel"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                <span>Filtros{filtrosAtivos ? ` · ${filtrosAtivos}` : ""}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {painelAberto ? (
            <PainelFiltros
              filtro={filtro}
              totais={baseTotais}
              onMudar={mudarFiltro}
              onFechar={() => setPainelAberto(false)}
            />
          ) : null}

          {chips.length ? (
            <div className="occurrences-active-chips" aria-label="Filtros ativos">
              {chips.map((chip) => (
                <button
                  key={chip.chave}
                  type="button"
                  className="occurrences-chip"
                  onClick={() => mudarFiltro(chip.remover)}
                >
                  <span>{chip.rotulo}</span>
                  <X size={14} aria-hidden="true" />
                </button>
              ))}
              <button type="button" className="occurrences-chip is-clear" onClick={limparFiltros}>
                <X size={14} aria-hidden="true" /> Limpar tudo
              </button>
            </div>
          ) : null}

          <div className="occurrences-list-heading">
            <div>
              <p className="dashboard-eyebrow">{manager ? "DADOS DO SERVIDOR" : "REGISTROS EM QUE VOCÊ ENTROU"}</p>
              <h2>{abas.find((aba) => aba.id === filtro.aba)?.rotulo ?? "Ocorrências"}</h2>
            </div>
            {atualizando ? (
              <span className="occurrences-refreshing">
                <RefreshCw size={14} className="spin" aria-hidden="true" /> Atualizando lista
              </span>
            ) : null}
          </div>

          {erro && itens.length > 0 ? (
            <div className="occurrences-error" role="alert">
              <CircleAlert size={17} aria-hidden="true" />
              <span>{erro}</span>
              <button type="button" onClick={tentarNovamente}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          {carregando && itens.length === 0 ? (
            <ul className="occurrence-list">
              {ESQUELETO.map((linha) => (
                <SkeletonCard key={linha} />
              ))}
            </ul>
          ) : erro && itens.length === 0 ? (
            <div className="occurrences-empty-state is-error">
              <CircleAlert size={26} aria-hidden="true" />
              <strong>Não foi possível carregar a lista</strong>
              <p>{erro}</p>
              <button type="button" onClick={tentarNovamente}>
                <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
              </button>
            </div>
          ) : !carregando && itens.length === 0 ? (
            <div className="occurrences-empty-state">
              <span>
                <ClipboardList size={26} aria-hidden="true" />
              </span>
              <strong>{vazio.titulo}</strong>
              <p>{vazio.texto}</p>
              <button type="button" onClick={limparFiltros}>
                <X size={15} aria-hidden="true" /> Limpar filtros
              </button>
            </div>
          ) : mostrarGrupos ? (
            <div className="occurrence-groups">
              {grupos
                .filter((grupo) => grupo.itens.length > 0)
                .map((grupo) => (
                  <section key={grupo.chave} className="occurrence-group">
                    <h3 className="occurrence-group-title">
                      <span>{grupo.titulo}</span>
                      <small>{grupo.quantidade.toLocaleString("pt-BR")}</small>
                    </h3>
                    <ul className="occurrence-list">
                      {grupo.itens.map((item) => (
                        <CartaoOcorrencia key={item.id} item={item} onAbrir={abrir} />
                      ))}
                    </ul>
                  </section>
                ))}
            </div>
          ) : (
            <>
              <ul className="occurrence-list">
                {itens.map((item) => (
                  <CartaoOcorrencia key={item.id} item={item} onAbrir={abrir} />
                ))}
              </ul>
              {temMais ? (
                <div className="occurrences-load-more">
                  <button type="button" onClick={() => void carregar(pagina + 1, true)} disabled={carregandoMais}>
                    {carregandoMais ? (
                      <>
                        <RefreshCw size={15} className="spin" aria-hidden="true" /> Carregando…
                      </>
                    ) : (
                      <>
                        Carregar mais <ArrowRight size={15} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <small>
                    {itens.length.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} registros
                  </small>
                </div>
              ) : total > 0 ? (
                <p className="occurrences-list-end">
                  <Check size={15} aria-hidden="true" /> Você está vendo todas as {total.toLocaleString("pt-BR")} ocorrências
                  deste filtro.
                </p>
              ) : null}
            </>
          )}
        </section>

        <footer className="occurrences-footer">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Consulta protegida · Os resultados obedecem à sessão e às permissões do Supabase.</span>
          <span className="occurrences-footer-role">{manager ? "Visão da corporação" : "Visão individual"}</span>
        </footer>
      </div>

      {detalheCarregando ? (
        <div className="occurrences-loading-deep" role="status">
          <RefreshCw size={16} className="spin" aria-hidden="true" /> Abrindo a ocorrência {detalheCarregando}…
        </div>
      ) : null}

      {aberto ? (
        <DetalheOcorrencia
          item={aberto}
          oficiais={oficiais}
          onClose={fechar}
          onConcluido={(mensagem) => {
            setMensagemSucesso(mensagem);
            fechar();
            void carregar(PAGINA_INICIAL, false, true);
          }}
        />
      ) : null}
    </main>
  );
}
