import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CarFront, CheckCircle2, MapPin, Shield, UserRound } from "lucide-react";
import type { PerfilFuncional } from "@/lib/auth";
import { loadOfficerOptions, type OfficerOption } from "@/lib/ocorrencias";
import { createApproach, type ApproachKind } from "@/lib/abordagens";

const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
type Props = { profile: PerfilFuncional };

export default function ApproachNew({ profile }: Props) {
  const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const [kind, setKind] = useState<ApproachKind>(params.get("tipo") === "veiculos" ? "veiculos" : "pessoas");
  const [officers, setOfficers] = useState<OfficerOption[]>([]);
  const [supportId, setSupportId] = useState("");
  const [start, setStart] = useState(nowLocal());
  const [local, setLocal] = useState("");
  const [tipoAbordagem, setTipoAbordagem] = useState("preventiva");
  const [tipoAtendimento, setTipoAtendimento] = useState("rotina");
  const [fase, setFase] = useState("abordagem");
  const [motivo, setMotivo] = useState("");
  const [providencia, setProvidencia] = useState("");
  const [temPrazo, setTemPrazo] = useState(false);
  const [prazoData, setPrazoData] = useState("");
  const [fields, setFields] = useState({ nome: "", alcunha: "", cpf: "", rg: "", caracteristicasFisicas: "", vestimentas: "", placa: "", marcaModelo: "", cor: "", condutorNome: "", condutorCpf: "", identificacaoStatus: "identificado", descricaoIdentificacao: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => { void loadOfficerOptions().then(setOfficers); }, []);
  const supportOptions = useMemo(() => officers.filter((item) => item.id !== profile.id), [officers, profile.id]);
  const update = (key: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [key]: value }));
  function setKindAndUrl(next: ApproachKind) { setKind(next); window.history.replaceState(null, "", `${window.location.pathname}#/abordagens/nova?tipo=${next}`); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setSuccess(null);
    if (!local.trim() || !motivo.trim()) { setError("Informe o local e o motivo da abordagem."); return; }
    if (kind === "pessoas" && !fields.nome.trim()) { setError("Informe o nome da pessoa ou use uma identificação mínima no campo nome."); return; }
    if (kind === "veiculos" && !fields.placa.trim() && !fields.marcaModelo.trim()) { setError("Informe a placa ou a marca/modelo do veículo."); return; }
    setSaving(true);
    try {
      const result = await createApproach({ kind, profileId: profile.id, supportId, dataHoraInicio: new Date(start).toISOString(), local, tipoAbordagem, tipoAtendimento, fase, motivo, providencia, temPrazo, prazoData, pessoa: kind === "pessoas" ? { nome: fields.nome, alcunha: fields.alcunha, cpf: fields.cpf, rg: fields.rg, caracteristicasFisicas: fields.caracteristicasFisicas, vestimentas: fields.vestimentas } : undefined, veiculo: kind === "veiculos" ? { placa: fields.placa, marcaModelo: fields.marcaModelo, cor: fields.cor, condutorNome: fields.condutorNome, condutorCpf: fields.condutorCpf, identificacaoStatus: fields.identificacaoStatus, descricaoIdentificacao: fields.descricaoIdentificacao } : undefined });
      setSuccess(`Abordagem registrada com sucesso. Código: ${result.id.slice(0, 8)}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a abordagem."); } finally { setSaving(false); }
  }
  return <main className="approach-new-page">
    <header className="approach-new-header"><a href={`#/abordagens?tipo=${kind}`} className="approach-back-link"><ArrowLeft size={18} /> Voltar para abordagens</a><p className="dashboard-eyebrow">NOVO REGISTRO · EQUIPE OPERACIONAL</p><h1>Nova abordagem</h1><p>Registre o atendimento diretamente no sistema protegido da Guarda Municipal.</p></header>
    <div className="approach-kind-switch" role="tablist"><button type="button" className={kind === "pessoas" ? "is-active" : ""} onClick={() => setKindAndUrl("pessoas")}><UserRound size={17} /> Pessoa</button><button type="button" className={kind === "veiculos" ? "is-active" : ""} onClick={() => setKindAndUrl("veiculos")}><CarFront size={17} /> Veículo</button></div>
    {success ? <section className="approach-form-success" role="status"><CheckCircle2 size={22} /><div><strong>{success}</strong><p>O registro já está disponível na Central de Abordagens.</p><a href={`#/abordagens?tipo=${kind}`}>Consultar registros</a></div></section> : null}
    <form className="approach-form" onSubmit={submit}>
      <section className="approach-form-section"><div className="approach-form-section-title"><span>01</span><div><h2>Equipe e atendimento</h2><p>O GM de apoio é obrigatório e deve ser diferente de você.</p></div></div><label>GM de apoio<select value={supportId} onChange={(e) => setSupportId(e.target.value)} required><option value="">Selecione um GM ativo</option>{supportOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="approach-form-grid"><label>Data e hora<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></label><label>Local da abordagem<input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Rua, número ou referência" required /></label><label>Tipo<select value={tipoAbordagem} onChange={(e) => setTipoAbordagem(e.target.value)}><option value="preventiva">Preventiva</option><option value="averiguacao">Averiguação</option><option value="apoio">Apoio</option><option value="outra">Outra</option></select></label><label>Atendimento<select value={tipoAtendimento} onChange={(e) => setTipoAtendimento(e.target.value)}><option value="rotina">Rotina</option><option value="solicitacao">Solicitação</option><option value="ocorrencia">Ocorrência</option></select></label><label>Fase<select value={fase} onChange={(e) => setFase(e.target.value)}><option value="abordagem">Abordagem</option><option value="averiguacao">Averiguação</option><option value="encaminhamento">Encaminhamento</option><option value="finalizacao">Finalização</option></select></label></div></section>
      <section className="approach-form-section"><div className="approach-form-section-title"><span>02</span><div><h2>Identificação</h2><p>Preencha somente os dados necessários para a consulta operacional.</p></div></div>{kind === "pessoas" ? <div className="approach-form-grid"><label className="is-wide">Nome completo<input value={fields.nome} onChange={(e) => update("nome", e.target.value)} required /></label><label>Alcunha<input value={fields.alcunha} onChange={(e) => update("alcunha", e.target.value)} /></label><label>CPF<input value={fields.cpf} onChange={(e) => update("cpf", e.target.value)} /></label><label>RG<input value={fields.rg} onChange={(e) => update("rg", e.target.value)} /></label><label className="is-wide">Características físicas<textarea value={fields.caracteristicasFisicas} onChange={(e) => update("caracteristicasFisicas", e.target.value)} rows={2} /></label><label className="is-wide">Vestimentas<textarea value={fields.vestimentas} onChange={(e) => update("vestimentas", e.target.value)} rows={2} /></label></div> : <div className="approach-form-grid"><label>Placa<input value={fields.placa} onChange={(e) => update("placa", e.target.value)} placeholder="ABC1D23" /></label><label>Marca e modelo<input value={fields.marcaModelo} onChange={(e) => update("marcaModelo", e.target.value)} /></label><label>Cor<input value={fields.cor} onChange={(e) => update("cor", e.target.value)} /></label><label>Condutor<input value={fields.condutorNome} onChange={(e) => update("condutorNome", e.target.value)} /></label><label>CPF do condutor<input value={fields.condutorCpf} onChange={(e) => update("condutorCpf", e.target.value)} /></label><label>Identificação<select value={fields.identificacaoStatus} onChange={(e) => update("identificacaoStatus", e.target.value)}><option value="identificado">Identificado</option><option value="nao_identificado">Não identificado</option><option value="irregular">Irregular</option></select></label><label className="is-wide">Descrição da identificação<textarea value={fields.descricaoIdentificacao} onChange={(e) => update("descricaoIdentificacao", e.target.value)} rows={2} /></label></div>}</section>
      <section className="approach-form-section"><div className="approach-form-section-title"><span>03</span><div><h2>Motivo e providência</h2><p>Descreva de forma objetiva o atendimento realizado.</p></div></div><label>Motivo<textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} required /></label><label>Providência<textarea value={providencia} onChange={(e) => setProvidencia(e.target.value)} rows={3} /></label><label className="approach-deadline"><input type="checkbox" checked={temPrazo} onChange={(e) => setTemPrazo(e.target.checked)} /> Este atendimento possui prazo</label>{temPrazo ? <label>Prazo<input type="date" value={prazoData} onChange={(e) => setPrazoData(e.target.value)} required /></label> : null}</section>
      <div className="approach-form-footer"><p><Shield size={16} /> Registro autenticado em nome de {profile.apelido || profile.nome_completo}.</p>{error ? <div className="approach-form-error" role="alert">{error}</div> : null}<button className="approach-submit" type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar abordagem"}</button></div>
    </form>
  </main>;
}
