import { useCallback, useEffect, useMemo, useState } from "react";
import { CarFront, CalendarDays, ChevronDown, ClipboardCheck, MapPin, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import PrivateRecordThumbnail from "@/components/PrivateRecordThumbnail";
import type { PerfilFuncional } from "@/lib/auth";
import { APPROACH_FILTERS_EMPTY, loadApproaches, type ApproachFilters, type ApproachItem, type ApproachKind } from "@/lib/abordagens";

const PAGE_SIZE = 18;
const roleLabel = (role: string | null) => role === "administrador" || role === "admin" ? "Administrador" : role === "supervisor" ? "Supervisor" : "Guarda Municipal";
const label = (value: string | null | undefined, fallback = "Não informado") => value?.trim() || fallback;
const date = (value: string | null | undefined, withTime = true) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...(withTime ? { timeStyle: "short" as const } : {}) }).format(new Date(value.replace(" ", "T"))) : "Não informado";
const titleFor = (item: ApproachItem) => item.kind === "pessoas" ? label(item.pessoa?.nome, "Pessoa não identificada") : label(item.veiculo?.placa, "Veículo sem placa");
const subtitleFor = (item: ApproachItem) => item.kind === "pessoas" ? item.pessoa?.alcunha || item.pessoa?.rg || "Abordagem de pessoa" : [item.veiculo?.marca_modelo, item.veiculo?.cor].filter(Boolean).join(" · ") || "Abordagem de veículo";
const statusText = (value: string | null) => ({ ativa: "Em atendimento", encerrada: "Encerrada", finalizada: "Finalizada", cancelada: "Cancelada" }[value ?? ""] ?? label(value));
const regularizationText = (value: string | null) => ({ pendente: "Regularização pendente", regularizado: "Regularizada", concluido: "Concluída" }[value ?? ""] ?? label(value));

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`approach-badge is-${tone}`}>{children}</span>; }

function Detail({ item, onClose }: { item: ApproachItem; onClose: () => void }) {
  const isPerson = item.kind === "pessoas";
  return <div className="approach-backdrop" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="approach-detail" role="dialog" aria-modal="true" aria-labelledby="approach-detail-title">
      <header className="approach-detail-head"><div><p className="dashboard-eyebrow">CONSULTA OPERACIONAL · {isPerson ? "PESSOA" : "VEÍCULO"}</p><h2 id="approach-detail-title">{titleFor(item)}</h2><p>{subtitleFor(item)}</p></div><button className="approach-close" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={19} /></button></header>
      <div className="approach-detail-badges"><Badge tone={item.status_abordagem === "ativa" ? "active" : "neutral"}>{statusText(item.status_abordagem)}</Badge><Badge tone={item.status_regularizacao === "pendente" ? "warning" : "success"}>{regularizationText(item.status_regularizacao)}</Badge>{item.status_retificacao !== "normal" ? <Badge tone="warning">{label(item.status_retificacao)}</Badge> : null}</div>
      <div className="approach-detail-grid">
        <section><h3>Identificação</h3>{isPerson ? <><Line title="Nome" value={item.pessoa?.nome} /><Line title="Alcunha" value={item.pessoa?.alcunha} /><Line title="CPF" value={item.pessoa?.cpf} /><Line title="RG" value={item.pessoa?.rg} /><Line title="Características físicas" value={item.pessoa?.caracteristicas_fisicas} /><Line title="Vestimentas" value={item.pessoa?.vestimentas} /></> : <><Line title="Placa" value={item.veiculo?.placa} /><Line title="Marca e modelo" value={item.veiculo?.marca_modelo} /><Line title="Cor" value={item.veiculo?.cor} /><Line title="Condutor" value={item.veiculo?.condutor_nome} /><Line title="CPF do condutor" value={item.veiculo?.condutor_cpf} /><Line title="Identificação" value={item.identificacao_status} /></>}</section>
        <section><h3>Atendimento</h3><Line title="Início" value={date(item.data_hora_inicio)} /><Line title="Encerramento" value={date(item.data_hora_encerramento)} /><Line title="Tipo" value={item.tipo_abordagem} /><Line title="Atendimento" value={item.tipo_atendimento} /><Line title="Fase" value={item.fase} /><Line title="Motivo" value={item.motivo} /><Line title="Providência" value={item.providencia} /></section>
        <section><h3>Local e equipe</h3><Line title="Local" value={item.local_abordagem} /><Line title="Coordenadas" value={item.local_abordagem && item.id ? "Registradas no atendimento" : null} /><Line title="GM responsável" value={item.creatorName} /><Line title="GM de apoio" value={item.supportName} /><Line title="Registrado em" value={date(item.criado_em)} /></section>
        <section><h3>Regularização</h3><Line title="Prazo" value={item.tem_prazo ? date(item.prazo_data, false) : "Sem prazo"} /><Line title="Situação do prazo" value={item.prazo_vencido ? "Vencido" : item.tem_prazo ? "Dentro do prazo" : null} /><Line title="Reincidências" value={item.reincidencia_count === null ? null : String(item.reincidencia_count)} /><Line title="Versão" value={item.numero_versao === null ? null : String(item.numero_versao)} /></section>
      </div>
      {item.descricao_identificacao || item.observacoes ? <section className="approach-detail-note"><h3>Observações</h3><p>{item.descricao_identificacao || item.observacoes}</p></section> : null}
      <p className="approach-privacy"><ShieldCheck size={16} /> Consulta protegida pelo perfil ativo. Dados pessoais e anexos não são expostos em URL pública.</p>
    </section>
  </div>;
}
function Line({ title, value }: { title: string; value: string | null | undefined }) { return value ? <div className="approach-line"><span>{title}</span><strong>{value}</strong></div> : null; }

function Card({ item, onOpen }: { item: ApproachItem; onOpen: () => void }) {
  const isPerson = item.kind === "pessoas";
  return <li><button className="approach-card" type="button" onClick={onOpen}><span className="approach-art"><PrivateRecordThumbnail photo={item.photo} fallback={isPerson ? <UserRound size={21} /> : <CarFront size={21} />} /></span><span className="approach-card-copy"><span className="approach-card-title"><strong>{titleFor(item)}</strong><small>{subtitleFor(item)}</small></span><span className="approach-card-badges"><Badge tone={item.status_abordagem === "ativa" ? "active" : "neutral"}>{statusText(item.status_abordagem)}</Badge>{item.status_regularizacao === "pendente" ? <Badge tone="warning">Pendente</Badge> : null}</span><span className="approach-card-meta"><CalendarDays size={14} />{date(item.data_hora_inicio)}<MapPin size={14} />{label(item.local_abordagem, "Local não informado")}</span><span className="approach-card-team"><UserRound size={13} />{label(item.creatorName)}{item.supportName ? <><UsersRound size={13} />Apoio: {item.supportName}</> : null}</span></span><ChevronDown className="approach-card-arrow" size={18} /></button></li>;
}

export default function Approaches({ profile }: { profile: PerfilFuncional }) {
  const [kind, setKind] = useState<ApproachKind>(() => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("tipo") === "veiculos" ? "veiculos" : "pessoas");
  const [filters, setFilters] = useState<ApproachFilters>(APPROACH_FILTERS_EMPTY);
  const [items, setItems] = useState<ApproachItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApproachItem | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");

  const load = useCallback(async (nextPage = 0, append = false) => { setLoading(true); setError(null); try { const result = await loadApproaches(filters, nextPage); setItems((current) => append ? [...current, ...result.items] : result.items); setTotal(result.total); setPage(nextPage); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar as abordagens."); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  const visibleItems = useMemo(() => items.filter((item) => item.kind === kind), [items, kind]);
  const peopleCount = items.filter((item) => item.kind === "pessoas").length;
  const vehicleCount = items.filter((item) => item.kind === "veiculos").length;
  function changeFilter(patch: Partial<ApproachFilters>) { setFilters((current) => ({ ...current, ...patch })); }
  function submitSearch(event: React.FormEvent) { event.preventDefault(); changeFilter({ busca: searchDraft }); }
  return <main className="approaches-page"><section className="approaches-hero"><div><p className="dashboard-eyebrow">CENTRAL OPERACIONAL</p><h1>Pessoas e veículos</h1><p>Consulte abordagens com segurança, por tipo, situação e período. A visualização respeita as permissões do seu perfil.</p></div><div className="approaches-hero-actions"><div className="approaches-hero-role"><ShieldCheck size={17} /><span>{roleLabel(profile.perfil)}<small>acesso protegido</small></span></div><a className="approaches-new-link" href={`#/abordagens/nova?tipo=${kind}`}>+ Nova abordagem</a></div></section>
    <section className="approaches-toolbar"><form className="approaches-search" onSubmit={submitSearch}><Search size={17} /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={kind === "pessoas" ? "Nome, CPF, RG ou local" : "Placa, modelo, condutor ou local"} /><button type="submit">Buscar</button></form><button className={`approaches-filter-trigger${filterOpen ? " is-active" : ""}`} type="button" onClick={() => setFilterOpen((current) => !current)}><ClipboardCheck size={16} /> Filtros</button></section>
    {filterOpen ? <section className="approaches-filter-panel"><label>Status<select value={filters.status} onChange={(event) => changeFilter({ status: event.target.value })}><option value="">Todos</option><option value="ativa">Em atendimento</option><option value="encerrada">Encerrada</option><option value="finalizada">Finalizada</option><option value="cancelada">Cancelada</option></select></label><label>Regularização<select value={filters.regularizacao} onChange={(event) => changeFilter({ regularizacao: event.target.value })}><option value="">Todas</option><option value="pendente">Pendente</option><option value="regularizado">Regularizada</option><option value="concluido">Concluída</option></select></label><label>De<input type="date" value={filters.de} onChange={(event) => changeFilter({ de: event.target.value })} /></label><label>Até<input type="date" value={filters.ate} onChange={(event) => changeFilter({ ate: event.target.value })} /></label><label className="approach-check"><input type="checkbox" checked={filters.somenteAtivas} onChange={(event) => changeFilter({ somenteAtivas: event.target.checked })} /> Apenas registros ativos</label><button className="approach-clear" type="button" onClick={() => { setFilters(APPROACH_FILTERS_EMPTY); setSearchDraft(""); }}>Limpar filtros</button></section> : null}
    <div className="approach-tabs" role="tablist"><button className={kind === "pessoas" ? "is-active" : ""} type="button" role="tab" aria-selected={kind === "pessoas"} onClick={() => setKind("pessoas")}><UserRound size={17} /> Pessoas <b>{peopleCount || (kind === "pessoas" ? total : 0)}</b></button><button className={kind === "veiculos" ? "is-active" : ""} type="button" role="tab" aria-selected={kind === "veiculos"} onClick={() => setKind("veiculos")}><CarFront size={17} /> Veículos <b>{vehicleCount || (kind === "veiculos" ? total : 0)}</b></button></div>
    {error ? <section className="approaches-state is-error"><p>{error}</p><button type="button" onClick={() => void load(page)}>Tentar novamente</button></section> : loading && !items.length ? <section className="approaches-state"><RefreshCw className="spin" size={22} /><p>Carregando registros protegidos…</p></section> : visibleItems.length ? <><ul className="approach-list">{visibleItems.map((item) => <Card key={`${item.kind}-${item.id}`} item={item} onOpen={() => setDetail(item)} />)}</ul>{page === 0 && total > PAGE_SIZE ? <button className="approach-more" type="button" onClick={() => void load(page + 1, true)} disabled={loading}>{loading ? "Carregando…" : "Carregar mais registros"}</button> : null}</> : <section className="approaches-state"><span className="approaches-state-icon">{kind === "pessoas" ? <UserRound size={21} /> : <CarFront size={21} />}</span><h2>Nenhum registro encontrado</h2><p>Ajuste a busca ou os filtros para consultar outra abordagem.</p></section>}
    {detail ? <Detail item={detail} onClose={() => setDetail(null)} /> : null}
  </main>;
}
