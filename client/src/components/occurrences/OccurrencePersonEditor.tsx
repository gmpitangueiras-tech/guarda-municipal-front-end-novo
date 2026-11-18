import { useState } from "react";
import { CheckCircle2, Trash2, UserPlus, UsersRound } from "lucide-react";
import { formatCpf, isValidCpfLength } from "@/lib/cpf";
import type { EnvolvidoNovo } from "@/lib/ocorrencias";
import SignaturePad from "@/components/occurrences/SignaturePad";

type TipoEnvolvido = EnvolvidoNovo["tipo"];

type RascunhoEnvolvido = {
  tipo: TipoEnvolvido | "";
  nome: string;
  cpf: string;
  telefone: string;
  observacoes: string;
};

const TIPOS: Array<{ valor: TipoEnvolvido; rotulo: string }> = [
  { valor: "autor", rotulo: "Autor" },
  { valor: "vitima", rotulo: "Vítima" },
  { valor: "testemunha", rotulo: "Testemunha" },
  { valor: "solicitante", rotulo: "Solicitante" },
  { valor: "outro", rotulo: "Outro" },
];

const NOVO_ENVOLVIDO: RascunhoEnvolvido = {
  tipo: "",
  nome: "",
  cpf: "",
  telefone: "",
  observacoes: "",
};

function idEnvolvido(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `person-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function rotuloTipo(tipo: TipoEnvolvido): string {
  return TIPOS.find((opcao) => opcao.valor === tipo)?.rotulo ?? "Outro";
}

export default function OccurrencePersonEditor({
  envolvidos,
  onChange,
  disabled = false,
}: {
  envolvidos: EnvolvidoNovo[];
  onChange: (envolvidos: EnvolvidoNovo[]) => void;
  disabled?: boolean;
}) {
  const [rascunho, setRascunho] = useState<RascunhoEnvolvido>(NOVO_ENVOLVIDO);
  const [coletarAssinatura, setColetarAssinatura] = useState(false);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function atualizar<K extends keyof RascunhoEnvolvido>(campo: K, valor: RascunhoEnvolvido[K]) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }));
    setErro(null);
  }

  function adicionar() {
    const nome = rascunho.nome.trim();
    if (!rascunho.tipo || !nome) {
      setErro("Informe o tipo e o nome completo do envolvido.");
      return;
    }
    if (rascunho.cpf.trim() && !isValidCpfLength(rascunho.cpf)) {
      setErro("O CPF precisa ter 11 dígitos ou ficar em branco.");
      return;
    }
    if (coletarAssinatura && !assinatura) {
      setErro("Desenhe a assinatura ou desative a coleta opcional.");
      return;
    }

    const envolvido: EnvolvidoNovo = {
      id: idEnvolvido(),
      tipo: rascunho.tipo,
      nome_completo: nome,
      cpf: rascunho.cpf.trim() ? formatCpf(rascunho.cpf) : null,
      telefone: rascunho.telefone.trim() || null,
      observacoes: rascunho.observacoes.trim() || null,
      assinatura_data_url: coletarAssinatura ? assinatura : null,
    };
    onChange([...envolvidos, envolvido]);
    setRascunho(NOVO_ENVOLVIDO);
    setColetarAssinatura(false);
    setAssinatura(null);
    setErro(null);
  }

  return (
    <section className="occurrence-people" aria-label="Pessoas envolvidas no fato">
      <div className="occurrence-people-heading">
        <span className="occurrence-people-icon"><UsersRound size={19} aria-hidden="true" /></span>
        <div>
          <h3>Pessoas relacionadas à ocorrência</h3>
        </div>
        <span className="occurrence-people-count" aria-label={`${envolvidos.length} envolvidos`}>
          {envolvidos.length}
        </span>
      </div>

      {envolvidos.length ? (
        <ul className="occurrence-people-list">
          {envolvidos.map((envolvido) => (
            <li className="occurrence-person-card" key={envolvido.id}>
              <div className="occurrence-person-title">
                <span className="occurrence-person-role">{rotuloTipo(envolvido.tipo)}</span>
                <strong>{envolvido.nome_completo}</strong>
                {envolvido.assinatura_data_url ? (
                  <span className="occurrence-person-signature is-signed"><CheckCircle2 size={14} aria-hidden="true" /> Assinatura coletada</span>
                ) : (
                  <span className="occurrence-person-signature">Assinatura não coletada</span>
                )}
                <button
                  type="button"
                  className="occurrence-person-remove"
                  aria-label={`Remover ${envolvido.nome_completo}`}
                  disabled={disabled}
                  onClick={() => onChange(envolvidos.filter((item) => item.id !== envolvido.id))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="occurrence-person-details">
                {envolvido.cpf ? <span>CPF: {envolvido.cpf}</span> : null}
                {envolvido.telefone ? <span>Telefone: {envolvido.telefone}</span> : null}
                {envolvido.observacoes ? <p>{envolvido.observacoes}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="occurrence-people-empty">Nenhum envolvido adicionado.</p>
      )}

      <div className="occurrence-person-form">
        <div className="occurrence-person-form-heading">
          <UserPlus size={18} aria-hidden="true" />
          <strong>Adicionar envolvido</strong>
        </div>
        <div className="occurrence-new-grid">
          <label className="occurrence-new-field">
            <span>Tipo <b aria-hidden="true">*</b></span>
            <select value={rascunho.tipo} disabled={disabled} onChange={(event) => atualizar("tipo", event.target.value as TipoEnvolvido | "")}>
              <option value="">Selecione...</option>
              {TIPOS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
            </select>
          </label>
          <label className="occurrence-new-field">
            <span>Nome completo <b aria-hidden="true">*</b></span>
            <input maxLength={255} autoComplete="off" value={rascunho.nome} disabled={disabled} onChange={(event) => atualizar("nome", event.target.value)} placeholder="Nome completo" />
          </label>
          <label className="occurrence-new-field">
            <span>CPF <small>Opcional</small></span>
            <input maxLength={14} inputMode="numeric" value={rascunho.cpf} disabled={disabled} onChange={(event) => atualizar("cpf", formatCpf(event.target.value))} placeholder="000.000.000-00" />
          </label>
          <label className="occurrence-new-field">
            <span>Telefone <small>Opcional</small></span>
            <input maxLength={20} inputMode="tel" value={rascunho.telefone} disabled={disabled} onChange={(event) => atualizar("telefone", event.target.value)} placeholder="(43) 90000-0000" />
          </label>
          <label className="occurrence-new-field occurrence-person-observations">
            <span>Observações <small>Opcionais</small></span>
            <textarea rows={3} maxLength={5000} value={rascunho.observacoes} disabled={disabled} onChange={(event) => atualizar("observacoes", event.target.value)} placeholder="Informações adicionais sobre esta pessoa" />
          </label>
        </div>

        <div className="occurrence-signature-toggle-wrap">
          <label className="occurrence-signature-toggle">
            <input
              type="checkbox"
              checked={coletarAssinatura}
              disabled={disabled}
              onChange={(event) => {
                setColetarAssinatura(event.target.checked);
                if (!event.target.checked) setAssinatura(null);
                setErro(null);
              }}
            />
            <span><strong>Coletar assinatura agora</strong><small>Opcional — o envolvido pode ser salvo sem assinar.</small></span>
          </label>
          {coletarAssinatura ? (
            <div className="occurrence-signature-panel">
              <p>A imagem será vinculada somente a este cadastro e não indica, por si só, concordância com o relato integral do BO.</p>
              <SignaturePad value={assinatura} onChange={setAssinatura} disabled={disabled} />
            </div>
          ) : null}
        </div>

        {erro ? <p className="occurrence-form-error" role="alert">{erro}</p> : null}
        <button type="button" className="occurrence-person-add" onClick={adicionar} disabled={disabled}>
          <UserPlus size={17} aria-hidden="true" /> Adicionar envolvido
        </button>
      </div>
    </section>
  );
}
