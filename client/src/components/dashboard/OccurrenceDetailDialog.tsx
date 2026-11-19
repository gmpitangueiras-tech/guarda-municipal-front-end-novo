import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  RotateCw,
  X,
} from "lucide-react";
import { loadOccurrenceDetail, type OccurrenceDetailPayload, type OccurrencePreview } from "@/lib/dashboard";
import { supabase } from "@/lib/supabase";

type Props = {
  occurrence: OccurrencePreview;
  onClose: () => void;
};

type GalleryState = {
  status: "idle" | "loading" | "ready" | "error";
  url: string | null;
  objectUrl: boolean;
};

type Field = { label: string; value: unknown };

function text(value: unknown, fallback = "Não informado"): string {
  if (value === null || value === undefined) return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatDate(value: string | null | undefined, dateOnly = false): string {
  if (!value) return "Não informado";
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matched) return `${matched[3]}/${matched[2]}/${matched[1]}`;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", dateOnly
    ? { day: "2-digit", month: "2-digit", year: "numeric" }
    : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  ).format(date);
}

function formatBytes(value: number | null): string {
  if (!value || value < 1) return "Tamanho não informado";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
  return `${(value / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function readable(value: string | null | undefined): string {
  const normalized = value?.trim().replaceAll("_", " ").replace(/\s+/g, " ");
  if (!normalized) return "Não informado";
  const lower = normalized.toLocaleLowerCase("pt-BR");
  if (normalized !== lower && normalized !== normalized.toLocaleUpperCase("pt-BR")) return normalized;
  return lower.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function involvedRole(value: string): string {
  const roles: Record<string, string> = {
    autor: "Autor",
    vitima: "Vítima",
    testemunha: "Testemunha",
    solicitante: "Solicitante",
    outro: "Outro",
  };
  return roles[value.trim().toLowerCase()] ?? readable(value);
}

function syncLabel(value: string | null): string {
  const labels: Record<string, string> = {
    pending_sync: "Pendente de sincronização",
    draft: "Rascunho",
    synced: "Sincronizada",
    cancelled: "Cancelada",
  };
  return value ? labels[value.trim().toLowerCase()] ?? readable(value) : "Não informado";
}

const OCCURRENCE_LABELS: Record<string, string> = {
  furto: "Furto",
  roubo: "Roubo",
  vandalismo: "Vandalismo",
  dano_ao_patrimonio: "Dano ao patrimônio",
  ameaca: "Ameaça",
  lesao_corporal: "Lesão corporal",
  perturbacao: "Perturbação",
  acidente: "Acidente",
  incendio: "Incêndio",
  desaparecimento: "Desaparecimento",
  atendimento_social: "Atendimento social",
  outro: "Outro",
};

const GRAVITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
  nao_informado: "Não informado",
};

function domainLabel(value: string | null | undefined, labels: Record<string, string>): string {
  const key = value?.trim().toLowerCase();
  return key ? labels[key] ?? readable(key) : "Não informado";
}

function documentLabel(detail: OccurrenceDetailPayload): string {
  const item = detail.ocorrencia;
  if (item.completado_em || item.data_hora_finalizacao) return "BO completo";
  if (item.modo_criacao?.toLowerCase() === "rapido") return "BO incompleto · A complementar";
  return item.modo_criacao ? readable(item.modo_criacao) : "Documento legado";
}

function attendanceLabel(detail: OccurrenceDetailPayload): string {
  const item = detail.ocorrencia;
  if (item.cancelado_em) return "Cancelada";
  return item.data_hora_encerramento ? "Encerrada" : "Em atendimento";
}

function safeSignatureImage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const source = input.trim();
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(source) ? source : null;
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`gm-occurrence-detail-section ${className}`.trim()}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function FieldGrid({ fields, className = "" }: { fields: Field[]; className?: string }) {
  const visible = fields.filter((field) => hasValue(field.value));
  if (visible.length === 0) return <p className="gm-occurrence-detail-empty">Nenhuma informação cadastrada.</p>;
  return (
    <dl className={`gm-occurrence-detail-grid ${className}`.trim()}>
      {visible.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{text(field.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function signedAt(detail: OccurrenceDetailPayload, involvedId: string) {
  return detail.assinaturas.find((signature) => signature.envolvido_id === involvedId) ?? null;
}

function signatureSource(signature: ReturnType<typeof signedAt>): string | null {
  if (!signature) return null;
  const direct = safeSignatureImage(signature.assinatura_data_url);
  if (direct) return direct;
  const legacy = signature as unknown as Record<string, unknown>;
  return safeSignatureImage(legacy.assinatura) ?? safeSignatureImage(legacy.imagem);
}

function CarouselMedia({
  detail,
  attachmentIndex,
  onPrevious,
  onNext,
}: {
  detail: OccurrenceDetailPayload;
  attachmentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const attachment = detail.anexos[attachmentIndex];
  const [media, setMedia] = useState<GalleryState>({ status: "idle", url: null, objectUrl: false });
  const mime = (attachment?.mime_type ?? "").toLowerCase();
  const name = attachment?.nome_arquivo ?? "Anexo";
  const isImage = attachment?.tipo_arquivo === "image" || mime.startsWith("image/") || /\.(?:avif|gif|jpe?g|png|webp)$/i.test(name);
  const isVideo = attachment?.tipo_arquivo === "video" || mime.startsWith("video/");
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(name);

  useEffect(() => {
    if (!attachment) {
      setMedia({ status: "idle", url: null, objectUrl: false });
      return;
    }
    let cancelled = false;
    let localUrl: string | null = null;
    setMedia({ status: "loading", url: null, objectUrl: false });

    void (async () => {
      if (!supabase || !attachment.reference) throw new Error("Arquivo privado indisponível.");
      if (isImage) {
        const { data, error } = await supabase.storage.from(attachment.reference.bucket).download(attachment.reference.path);
        if (error || !data) throw error ?? new Error("Não foi possível carregar a imagem.");
        localUrl = URL.createObjectURL(data);
        if (cancelled) {
          URL.revokeObjectURL(localUrl);
          return;
        }
        setMedia({ status: "ready", url: localUrl, objectUrl: true });
        return;
      }
      const { data, error } = await supabase.storage.from(attachment.reference.bucket).createSignedUrl(attachment.reference.path, 300);
      if (error || !data?.signedUrl) throw error ?? new Error("Não foi possível abrir o arquivo.");
      if (!cancelled) setMedia({ status: "ready", url: data.signedUrl, objectUrl: false });
    })().catch(() => {
      if (!cancelled) setMedia({ status: "error", url: null, objectUrl: false });
    });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [attachment?.id, attachment?.reference?.bucket, attachment?.reference?.path, isImage]);

  if (!attachment) return null;
  const total = detail.anexos.length;
  return (
    <div className="gm-occurrence-gallery">
      <div className="gm-occurrence-gallery-toolbar">
        <span className="gm-occurrence-gallery-count">{attachmentIndex + 1} de {total}</span>
        <span className="gm-occurrence-gallery-name" title={name}>{name}</span>
        <span className="gm-occurrence-gallery-meta">{text(attachment.mime_type, readable(attachment.tipo_arquivo))} · {formatBytes(attachment.tamanho)}</span>
      </div>
      <div className={`gm-occurrence-gallery-stage${isImage ? " is-image" : ""}`}>
        {media.status === "loading" && <span className="gm-occurrence-gallery-state"><LoaderCircle size={20} className="spin" aria-hidden="true" />Carregando anexo…</span>}
        {media.status === "error" && <span className="gm-occurrence-gallery-state is-error"><AlertCircle size={20} aria-hidden="true" />Não foi possível abrir este anexo privado.</span>}
        {media.status === "ready" && media.url && isImage && <img src={media.url} alt={name} className="gm-occurrence-gallery-image" />}
        {media.status === "ready" && media.url && isVideo && <video className="gm-occurrence-gallery-video" src={media.url} controls playsInline preload="metadata">Seu navegador não pode reproduzir este vídeo.</video>}
        {media.status === "ready" && media.url && isPdf && <iframe className="gm-occurrence-gallery-pdf" src={media.url} title={`Visualização de ${name}`} />}
        {media.status === "ready" && media.url && !isImage && !isVideo && !isPdf && (
          <div className="gm-occurrence-gallery-file"><FileText size={36} aria-hidden="true" /><p>Pré-visualização indisponível para este formato.</p></div>
        )}
      </div>
      <div className="gm-occurrence-gallery-actions">
        <button type="button" className="gm-occurrence-secondary-button" onClick={onPrevious} disabled={total < 2} aria-label="Anexo anterior"><ChevronLeft size={18} aria-hidden="true" /><span>Anterior</span></button>
        {media.status === "ready" && media.url && (
          <a className="gm-occurrence-secondary-button" href={media.url} download={name} target="_blank" rel="noreferrer">
            <Download size={16} aria-hidden="true" /><span>Baixar anexo</span>
          </a>
        )}
        <button type="button" className="gm-occurrence-secondary-button" onClick={onNext} disabled={total < 2} aria-label="Próximo anexo"><span>Próximo</span><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

export default function OccurrenceDetailDialog({ occurrence, onClose }: Props) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [detail, setDetail] = useState<OccurrenceDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentIndex, setAttachmentIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadOccurrenceDetail(occurrence.id);
      setDetail(result);
      setAttachmentIndex(0);
    } catch {
      setError("Não foi possível carregar o boletim completo. Verifique seu acesso e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [occurrence.id]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, video[controls], [tabindex]:not([tabindex="-1"])'))
        : [];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !dialog?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose]);

  const signatureByPerson = useMemo(() => {
    const map = new Map<string, OccurrenceDetailPayload["assinaturas"][number]>();
    for (const signature of detail?.assinaturas ?? []) {
      if (signature.envolvido_id) map.set(signature.envolvido_id, signature);
    }
    return map;
  }, [detail?.assinaturas]);

  const item = detail?.ocorrencia;
  const number = item?.numero_ocorrencia?.trim() || item?.numero_temporario?.trim() || "Sem número";
  const nature = item?.tipo_ocorrencia || occurrence.tipo_ocorrencia;
  const subtype = item?.sub_tipo_ocorrencia || occurrence.sub_tipo_ocorrencia;
  const title = domainLabel(nature || subtype, OCCURRENCE_LABELS);
  const previousAttachment = () => setAttachmentIndex((index) => Math.max(0, index - 1));
  const nextAttachment = () => setAttachmentIndex((index) => Math.min((detail?.anexos.length ?? 1) - 1, index + 1));

  return createPortal(
    <div className="gm-occurrence-detail-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        className="gm-occurrence-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gm-occurrence-detail-title"
        aria-describedby="gm-occurrence-detail-description"
        tabIndex={-1}
      >
        <header className="gm-occurrence-detail-header">
          <div>
            <p className="gm-occurrence-detail-eyebrow">BOLETIM DE OCORRÊNCIA</p>
            <h2 id="gm-occurrence-detail-title">{title}</h2>
            <p id="gm-occurrence-detail-description">BO nº {number} · Dados completos e anexos do registro</p>
          </div>
          <button ref={closeButtonRef} className="gm-occurrence-detail-close" type="button" onClick={onClose} aria-label="Fechar boletim completo"><X size={20} aria-hidden="true" /></button>
        </header>

        {loading && (
          <div className="gm-occurrence-detail-loading" role="status" aria-live="polite"><LoaderCircle size={23} className="spin" aria-hidden="true" />Carregando o boletim completo…</div>
        )}
        {!loading && error && (
          <div className="gm-occurrence-detail-error" role="alert"><AlertCircle size={20} aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)}><RotateCw size={15} aria-hidden="true" />Tentar novamente</button></div>
        )}

        {!loading && !error && detail && item && (
          <div className="gm-occurrence-detail-body">
            <Section title="Resumo do registro">
              <FieldGrid fields={[
                { label: "Número", value: item.numero_ocorrencia || item.numero_temporario },
                { label: "Natureza", value: domainLabel(item.tipo_ocorrencia, OCCURRENCE_LABELS) },
                { label: "Subtipo", value: domainLabel(item.sub_tipo_ocorrencia, OCCURRENCE_LABELS) },
                { label: "Gravidade", value: domainLabel(item.gravidade, GRAVITY_LABELS) },
                { label: "Documento", value: documentLabel(detail) },
                { label: "Situação do atendimento", value: attendanceLabel(detail) },
                { label: "Sincronização", value: syncLabel(item.status) },
                { label: "Registrado em", value: formatDate(item.criado_em) },
                { label: "Origem da comunicação", value: domainLabel(item.forma_solicitacao, { diretamente_com_a_ocorrencia: "Diretamente com a ocorrência", diretamente: "Diretamente com a ocorrência", telefone: "Telefone", presencial: "Presencial", central: "Central", radio: "Rádio" }) },
              ]} />
            </Section>

            <Section title="Dados da ocorrência">
              <FieldGrid fields={[
                { label: "Início", value: formatDate(item.data_hora_inicio) },
                { label: "Encerramento", value: formatDate(item.data_hora_encerramento) },
                { label: "Finalização registrada", value: formatDate(item.data_hora_finalizacao) },
                { label: "BO concluído em", value: formatDate(item.completado_em) },
                { label: "Modo de criação", value: item.modo_criacao?.toLowerCase() === "rapido" ? "BO Rápido" : item.modo_criacao?.toLowerCase() === "completo" ? "BO Completo" : readable(item.modo_criacao) },
                { label: "Código operacional", value: item.codigo_operacional },
                { label: "Código municipal", value: item.codigo_municipal },
              ]} />
            </Section>

            <Section title="Local do fato">
              <FieldGrid fields={[
                { label: "Endereço / local", value: item.local_ocorrencia },
                { label: "Bairro", value: item.bairro_ocorrencia },
                { label: "Rodovia", value: item.rodovia },
                { label: "Referência", value: item.referencia },
                { label: "Latitude", value: item.latitude },
                { label: "Longitude", value: item.longitude },
              ]} />
              {(item.local_ocorrencia || item.bairro_ocorrencia) && <p className="gm-occurrence-detail-location"><MapPin size={15} aria-hidden="true" />{[item.local_ocorrencia, item.bairro_ocorrencia].filter(Boolean).join(" · ")}</p>}
            </Section>

            <Section title="Solicitante">
              <FieldGrid fields={[
                { label: "Nome", value: item.nome_solicitante || "Anônimo" },
                { label: "CPF", value: item.cpf_solicitante },
                { label: "RG", value: item.rg_solicitante },
                { label: "Telefone", value: item.telefone_solicitante },
                { label: "Endereço", value: item.endereco_solicitante },
                { label: "Bairro", value: item.bairro_solicitante },
                { label: "Complemento", value: item.complemento },
                { label: "Identificação adicional", value: item.identificacao_adicional },
              ]} />
            </Section>

            <Section title="Equipe operacional">
              {detail.equipe.length ? (
                <div className="gm-occurrence-detail-team-list">
                  {detail.equipe.map((member, index) => (
                    <div className="gm-occurrence-detail-team-card" key={`${member.papel}-${member.matricula ?? index}`}>
                      <span className="gm-occurrence-detail-role">{member.papel.toLowerCase() === "responsavel" ? "Responsável" : member.papel.toLowerCase() === "acompanhante" ? "GM de apoio" : readable(member.papel)}</span>
                      <strong>{text(member.nome_completo)}</strong>
                      <small>{[member.matricula ? `Matrícula ${member.matricula}` : null, member.perfil ? readable(member.perfil) : null].filter(Boolean).join(" · ") || "Guarda Municipal"}</small>
                    </div>
                  ))}
                </div>
              ) : <p className="gm-occurrence-detail-empty">Equipe não informada.</p>}
              {detail.criador && <p className="gm-occurrence-detail-created-by">Registrado por {text(detail.criador.nome_completo)}{detail.criador.matricula ? ` · Matrícula ${detail.criador.matricula}` : ""}</p>}
            </Section>

            <Section title="Descrição do fato">
              {hasValue(item.observacoes) ? <p className="gm-occurrence-detail-narrative">{item.observacoes}</p> : <p className="gm-occurrence-detail-empty">Relato não informado.</p>}
            </Section>

            {(hasValue(item.numero_bo) || hasValue(item.orgao_bo) || hasValue(item.data_bo)) && (
              <Section title="Referência de BO de outro órgão">
                <FieldGrid fields={[
                  { label: "Identificação", value: item.numero_bo },
                  { label: "Órgão", value: item.orgao_bo },
                  { label: "Data", value: formatDate(item.data_bo, true) },
                ]} />
              </Section>
            )}

            <Section title={`Envolvidos (${detail.envolvidos.length})`}>
              {detail.envolvidos.length ? (
                <div className="gm-occurrence-detail-involved-list">
                  {detail.envolvidos.map((person) => {
                    const signature = signatureByPerson.get(person.id) ?? null;
                    const image = signatureSource(signature);
                    return (
                      <article className="gm-occurrence-detail-involved-card" key={person.id}>
                        <div className="gm-occurrence-detail-involved-heading">
                          <span className="gm-occurrence-detail-role">{involvedRole(person.tipo)}</span>
                          <h4>{person.nome_completo}</h4>
                        </div>
                        <FieldGrid fields={[
                          { label: "CPF", value: person.cpf },
                          { label: "RG", value: person.rg },
                          { label: "Telefone", value: person.telefone },
                          { label: "Nascimento", value: formatDate(person.data_nascimento, true) },
                          { label: "Nome do pai", value: person.nome_pai },
                          { label: "Nome da mãe", value: person.nome_mae },
                          { label: "Endereço", value: person.endereco },
                          { label: "Bairro", value: person.bairro },
                          { label: "Cidade", value: person.cidade },
                        ]} />
                        {hasValue(person.observacoes) && <p className="gm-occurrence-detail-involved-notes">{person.observacoes}</p>}
                        {image && (
                          <div className="gm-occurrence-detail-signature">
                            <span>Assinatura do envolvido</span>
                            <img src={image} alt={`Assinatura manuscrita de ${person.nome_completo}`} />
                            <small>{signature?.nome_guarda ? `Coletada por ${signature.nome_guarda}` : "Assinatura registrada"}{signature?.assinado_em ? ` · ${formatDate(signature.assinado_em)}` : ""}</small>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : <p className="gm-occurrence-detail-empty">Nenhum envolvido cadastrado.</p>}
            </Section>

            {detail.assinaturas.length > 0 && (
              <Section title={`Assinaturas registradas (${detail.assinaturas.length})`}>
                <div className="gm-occurrence-detail-signature-list">
                  {detail.assinaturas.map((signature, index) => (
                    <div className="gm-occurrence-detail-signature-row" key={`${signature.envolvido_id ?? "assinatura"}-${index}`}>
                      <span>{involvedRole(signature.tipo ?? "outro")}</span>
                      <strong>{text(signature.nome)}</strong>
                      <small>{signature.nome_guarda ? `Coleta: ${signature.nome_guarda}` : "Coleta não identificada"}{signature.assinado_em ? ` · ${formatDate(signature.assinado_em)}` : ""}</small>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title={`Anexos (${detail.anexos.length})`} className="gm-occurrence-detail-attachments">
              {detail.anexos.length ? (
                <CarouselMedia
                  detail={detail}
                  attachmentIndex={attachmentIndex}
                  onPrevious={previousAttachment}
                  onNext={nextAttachment}
                />
              ) : <p className="gm-occurrence-detail-empty">Nenhum anexo cadastrado.</p>}
            </Section>

            {(detail.historico.length > 1 || hasValue(item.justificativa_retificacao) || hasValue(item.solicitacao_retificacao_justificativa)) && (
              <Section title="Retificações e versões">
                {detail.historico.length > 1 && (
                  <ol className="gm-occurrence-detail-history">
                    {detail.historico.map((version) => (
                      <li key={version.id}>
                        <strong>{version.is_original ? "Registro original" : `Versão ${version.numero_versao ?? "atualizada"}`}</strong>
                        <span>{version.status ? readable(version.status) : "Status não informado"} · {formatDate(version.criado_em)}</span>
                        {hasValue(version.campos_alterados) && <small>Campos alterados: {typeof version.campos_alterados === "string" ? version.campos_alterados : JSON.stringify(version.campos_alterados)}</small>}
                      </li>
                    ))}
                  </ol>
                )}
                <FieldGrid fields={[
                  { label: "Versão", value: item.numero_versao },
                  { label: "Retificado em", value: formatDate(item.retificado_em) },
                  { label: "Justificativa", value: item.justificativa_retificacao || item.solicitacao_retificacao_justificativa },
                  { label: "Motivo da rejeição", value: item.motivo_rejeicao },
                ]} />
              </Section>
            )}

            {hasValue(item.motivo_cancelamento) && (
              <Section title="Cancelamento">
                <FieldGrid fields={[
                  { label: "Cancelado em", value: formatDate(item.cancelado_em) },
                  { label: "Motivo", value: item.motivo_cancelamento },
                ]} />
              </Section>
            )}

            {hasValue(item.hash_pericial) && (
              <Section title="Integridade do registro">
                <FieldGrid fields={[{ label: "Hash registrado", value: item.hash_pericial }]} />
              </Section>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
