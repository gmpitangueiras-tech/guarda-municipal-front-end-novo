import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { OccurrenceDetailPayload, PrivateImageReference } from "@/lib/dashboard";
import { supabase } from "@/lib/supabase";

const MARGIN = 14;
const INK: [number, number, number] = [0, 0, 0];
const RULE: [number, number, number] = [45, 45, 45];
const SOFT: [number, number, number] = [125, 125, 125];

type Field = [string, unknown];
type PdfImage = { data: string; format: "PNG" | "JPEG" | "WEBP" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_sync: "Pendente",
  synced: "Sincronizada",
  sync_error: "Erro de sincronização",
  cancelled: "Cancelada",
  rectified: "Retificada",
  pending_rectification: "Retificação Pendente",
  rectification_rejected: "Retificação Rejeitada",
};
const OCCURRENCE_TYPES: Record<string, string> = {
  furto: "Furto", roubo: "Roubo", vandalismo: "Vandalismo",
  dano_ao_patrimonio: "Dano ao patrimônio", ameaca: "Ameaça",
  lesao_corporal: "Lesão corporal", perturbacao: "Perturbação",
  acidente: "Acidente", incendio: "Incêndio", desaparecimento: "Desaparecimento",
  atendimento_social: "Atendimento social", outro: "Outro",
};
const PERSON_TYPES: Record<string, string> = {
  autor: "Autor", vitima: "Vítima", testemunha: "Testemunha",
  solicitante: "Solicitante", outro: "Outro",
};

function value(input: unknown, fallback = "Não informado"): string {
  if (input === null || input === undefined || String(input).trim() === "") return fallback;
  if (Array.isArray(input)) return input.map(String).join(", ") || fallback;
  if (typeof input === "object") {
    try { return JSON.stringify(input) || fallback; }
    catch { return fallback; }
  }
  return String(input);
}
function present(input: unknown): boolean {
  return input !== null && input !== undefined && String(input).trim() !== "";
}
function formatDate(input: unknown, dateOnly = false): string {
  if (!present(input)) return "Não informado";
  const text = String(input);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return text;
  return dateOnly ? parsed.toLocaleDateString("pt-BR") : parsed.toLocaleString("pt-BR");
}
function label(map: Record<string, string>, input: unknown): string {
  const key = value(input, "").trim().toLowerCase();
  return map[key] ?? (key ? key.replaceAll("_", " ") : "Não informado");
}
function documentLabel(detail: OccurrenceDetailPayload): string {
  const occurrence = detail.ocorrencia;
  if (present(occurrence.completado_em) || present(occurrence.data_hora_finalizacao)) return "BO completo";
  if (occurrence.modo_criacao?.toLowerCase() === "rapido") return "BO incompleto / A complementar";
  if (occurrence.modo_criacao?.toLowerCase() === "completo") return "BO completo";
  return "Não identificado";
}
function attendanceLabel(occurrence: OccurrenceDetailPayload["ocorrencia"]): string {
  if (present(occurrence.cancelado_em)) return "Cancelada";
  return present(occurrence.data_hora_encerramento) ? "Encerrada" : "Em atendimento";
}
function teamRole(value: string): string {
  const role = value.trim().toLowerCase();
  if (role === "responsavel") return "RESPONSÁVEL";
  if (role === "acompanhante") return "GM DE APOIO";
  return role ? role.replaceAll("_", " ").toUpperCase() : "PARTICIPANTE";
}
function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? input as Record<string, unknown> : {};
}
function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler imagem"));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Imagem inválida"));
    reader.readAsDataURL(blob);
  });
}
async function loadPrivateImage(reference: PrivateImageReference | null): Promise<PdfImage | null> {
  if (!reference || !supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(reference.bucket).download(reference.path);
    if (error || !data) return null;
    const dataUrl = await blobDataUrl(data);
    const mime = (data.type || dataUrl.slice(5).split(";")[0]).toLowerCase();
    const format = mime.includes("png") ? "PNG" : mime.includes("webp") ? "WEBP" : "JPEG";
    return { data: dataUrl, format };
  } catch {
    return null;
  }
}
async function loadLogo(): Promise<PdfImage | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/logo-guarda-pdf.png`);
    if (!response.ok) return null;
    const data = await blobDataUrl(await response.blob());
    return { data, format: "PNG" };
  } catch {
    return null;
  }
}

export async function exportOccurrencePdf(detail: OccurrenceDetailPayload): Promise<string> {
  const occurrence = asRecord(detail.ocorrencia);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - 2 * MARGIN;
  const footerLimit = pageHeight - 19;
  const number = value(occurrence.numero_ocorrencia || occurrence.numero_temporario, "Rascunho");
  const emittedAt = new Date();
  const emittedText = emittedAt.toLocaleString("pt-BR");
  const emittedDate = emittedAt.toLocaleDateString("pt-BR");
  const nature = label(OCCURRENCE_TYPES, occurrence.tipo_ocorrencia);
  const logo = await loadLogo();

  doc.setProperties({
    title: `BO ${number} — ${nature}`,
    author: value(detail.criador?.nome_completo, "Guarda Municipal de Pitangueiras/PR"),
    subject: "Registro de ocorrência — Guarda Municipal de Pitangueiras/PR",
    keywords: `Guarda Municipal, BO, ${value(occurrence.tipo_ocorrencia, "")}`,
    creator: "Sistema de Registro de Ocorrências — Guarda Municipal de Pitangueiras/PR",
  });

  let y = 39;
  let currentPage = 1;
  const header = (pageNumber: number) => {
    doc.setPage(pageNumber);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.55);
    doc.line(MARGIN, 4, pageWidth - MARGIN, 4);
    if (logo) {
      try { doc.addImage(logo.data, logo.format, MARGIN + 1, 6, 21, 21, undefined, "FAST"); }
      catch { doc.setLineWidth(0.35); doc.rect(MARGIN + 1, 6, 21, 21); }
    } else {
      doc.setLineWidth(0.35);
      doc.rect(MARGIN + 1, 6, 21, 21);
    }
    doc.setTextColor(...INK);
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.text("GUARDA MUNICIPAL DE PITANGUEIRAS/PR", pageWidth / 2, 9, { align: "center" });
    doc.setFontSize(7.2);
    doc.text("REGISTRO OPERACIONAL", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(9);
    doc.text("BOLETIM DE OCORRÊNCIA", pageWidth / 2, 21, { align: "center" });
    doc.setFontSize(6.2);
    doc.text("COMUNICAÇÃO DA OCORRÊNCIA", pageWidth / 2, 26, { align: "center" });
    const rightX = pageWidth - MARGIN - 35;
    doc.setDrawColor(...SOFT);
    doc.setLineWidth(0.25);
    doc.line(rightX - 3, 6, rightX - 3, 27);
    doc.setFont("courier", "bold");
    doc.setFontSize(6.2);
    doc.text("NÚMERO DO BO", rightX, 9);
    doc.setFontSize(8.2);
    doc.text(doc.splitTextToSize(number, 34).slice(0, 2), rightX, 14);
    doc.setFont("courier", "normal");
    doc.setFontSize(5.8);
    doc.text(`EMISSÃO ${emittedDate}`, rightX, 24);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.55);
    doc.line(MARGIN, 31, pageWidth - MARGIN, 31);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, 32.2, pageWidth - MARGIN, 32.2);
  };
  const footer = (pageNumber: number, total: number) => {
    doc.setPage(pageNumber);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.45);
    doc.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);
    doc.setTextColor(...INK);
    doc.setFont("courier", "normal");
    doc.setFontSize(5.8);
    doc.text("GUARDA MUNICIPAL DE PITANGUEIRAS/PR  |  SISTEMA DE REGISTRO DE OCORRÊNCIAS", MARGIN, pageHeight - 10);
    doc.text(`EMITIDO EM ${emittedText}`, pageWidth - MARGIN, pageHeight - 10, { align: "right" });
    doc.setFont("courier", "bold");
    doc.text(`PÁGINA ${pageNumber} DE ${total}`, pageWidth / 2, pageHeight - 5, { align: "center" });
  };
  const nextPage = () => {
    doc.addPage();
    currentPage = doc.getCurrentPageInfo().pageNumber;
    header(currentPage);
    y = 39;
  };
  const ensure = (height: number) => { if (y + height > footerLimit) nextPage(); };
  const section = (title: string) => {
    ensure(11);
    doc.setTextColor(...INK);
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.text(title.toUpperCase(), pageWidth / 2, y + 4, { align: "center" });
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 6.2, pageWidth - MARGIN, y + 6.2);
    y += 9;
  };
  const drawRows = (fields: Field[]) => {
    for (let index = 0; index < fields.length; index += 2) {
      const row = fields.slice(index, index + 2);
      const gap = row.length === 1 ? 0 : 4;
      const cellWidth = (width - gap * (row.length - 1)) / row.length;
      const prepared = row.map(([name, raw]) => {
        const labelText = `${name.toUpperCase()}: `;
        const labelWidth = (() => { doc.setFont("courier", "bold"); doc.setFontSize(6.4); return doc.getTextWidth(labelText); })();
        const stacked = labelWidth > cellWidth * 0.46;
        const text = value(raw);
        doc.setFont("courier", "normal");
        doc.setFontSize(7.2);
        const lines = doc.splitTextToSize(text, Math.max(12, cellWidth - (stacked ? 0 : labelWidth + 1.2)));
        return { labelText, labelWidth, stacked, lines, height: Math.max(4, (stacked ? 3.1 : 0) + lines.length * 3.2) };
      });
      const rowHeight = Math.max(...prepared.map((item) => item.height));
      ensure(rowHeight + 3);
      prepared.forEach((item, i) => {
        const x = MARGIN + i * (cellWidth + gap);
        doc.setTextColor(...INK);
        doc.setFont("courier", "bold");
        doc.setFontSize(6.4);
        if (item.stacked) {
          doc.text(item.labelText.trim(), x, y + 2.5);
          doc.setFont("courier", "normal");
          doc.setFontSize(7.2);
          doc.text(item.lines, x, y + 5.7, { lineHeightFactor: 1.05 });
        } else {
          doc.text(item.labelText, x, y + 2.7);
          doc.setFont("courier", "normal");
          doc.setFontSize(7.2);
          doc.text(item.lines, x + item.labelWidth + 1.2, y + 2.7, { lineHeightFactor: 1.05 });
        }
        doc.setDrawColor(...SOFT);
        doc.setLineWidth(0.15);
        doc.line(x, y + rowHeight + 1, x + cellWidth, y + rowHeight + 1);
      });
      y += rowHeight + 4;
    }
  };
  const paragraph = (title: string, raw: unknown) => {
    const text = value(raw, "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
    if (!text) return;
    section(title);
    const paragraphs = text.split(/\n\s*\n/).map((part) => part.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
    const drawAligned = (line: string, baseline: number, justify: boolean) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (!justify || words.length < 2) { doc.text(line, MARGIN, baseline); return; }
      const widths = words.map((word) => doc.getTextWidth(word));
      const gap = (width - widths.reduce((sum, item) => sum + item, 0)) / (words.length - 1);
      const normalGap = doc.getTextWidth(" ");
      if (!Number.isFinite(gap) || gap < normalGap * 0.6 || gap > normalGap * 4) { doc.text(line, MARGIN, baseline); return; }
      let x = MARGIN;
      words.forEach((word, index) => { doc.text(word, x, baseline); x += widths[index] + (index < words.length - 1 ? gap : 0); });
    };
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    for (const part of paragraphs) {
      const lines = doc.splitTextToSize(part, width);
      let offset = 0;
      while (offset < lines.length) {
        const lineHeight = 4.2;
        const count = Math.max(1, Math.floor((footerLimit - y - 5) / lineHeight));
        const chunk = lines.slice(offset, offset + count);
        chunk.forEach((line: string, index: number) => { drawAligned(line, y + 3, offset + index < lines.length - 1); y += lineHeight; });
        y += 2;
        offset += chunk.length;
        if (offset < lines.length) { nextPage(); section(`${title} — continuação`); doc.setFont("times", "normal"); doc.setFontSize(9); }
      }
    }
  };
  const table = (title: string, headers: string[], rows: unknown[][], widths: number[]) => {
    if (!rows.length) return;
    section(title);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: 38, bottom: 18 },
      theme: "grid",
      head: [headers],
      body: rows.map((row) => row.map((cell) => value(cell))),
      styles: { font: "courier", fontSize: 6.8, textColor: INK, cellPadding: 1.6, lineColor: RULE, lineWidth: 0.18, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [255, 255, 255], textColor: INK, font: "courier", fontStyle: "bold", fontSize: 6.6, lineColor: RULE, lineWidth: 0.3 },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth }])),
      didDrawPage: (data) => header(data.pageNumber),
    });
    currentPage = doc.getNumberOfPages();
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 4;
  };

  header(1);
  section("Identificação do registro");
  drawRows(([
    ["Número do BO", number], ["Natureza", nature], ["Documento", documentLabel(detail)],
    ["Situação do atendimento", attendanceLabel(detail.ocorrencia)], ["Sincronização", label(STATUS_LABELS, occurrence.status)],
    ["Data e hora do registro", formatDate(occurrence.criado_em)], ["Origem da comunicação", occurrence.forma_solicitacao],
    ["Início da ocorrência", formatDate(occurrence.data_hora_inicio)], ["Encerramento", formatDate(occurrence.data_hora_encerramento)],
    ["Código operacional", occurrence.codigo_operacional], ["Finalização", formatDate(occurrence.data_hora_finalizacao)],
    ["Conclusão", formatDate(occurrence.completado_em)], ["Modo de criação", occurrence.modo_criacao],
    ["Registrado por", detail.criador?.nome_completo], ["Matrícula do criador", detail.criador?.matricula],
  ].filter(([, raw]) => present(raw))) as Field[]);

  table("Equipe operacional", ["PAPEL", "NOME", "MATRÍCULA", "PERFIL"],
    detail.equipe.length ? detail.equipe.map((member) => [
      teamRole(member.papel), member.nome_completo, member.matricula, member.perfil,
    ]) : [["—", "Equipe não informada", "—", "—"]], [28, 68, 40, 46]);

  section("Dados do local da ocorrência");
  const location = ([
    ["Local/endereço", occurrence.local_ocorrencia], ["Bairro da ocorrência", occurrence.bairro_ocorrencia],
    ["Rodovia", occurrence.rodovia], ["Referência", occurrence.referencia],
    ["Latitude", occurrence.latitude], ["Longitude", occurrence.longitude],
  ].filter(([, raw]) => present(raw))) as Field[];
  drawRows(location.length ? location : [["Local/endereço", "Não informado"]]);

  section("Identificação do solicitante");
  drawRows(([
    ["Nome", present(occurrence.nome_solicitante) ? occurrence.nome_solicitante : "Anônimo"],
    ["CPF", occurrence.cpf_solicitante], ["RG", occurrence.rg_solicitante], ["Telefone", occurrence.telefone_solicitante],
    ["Endereço", occurrence.endereco_solicitante], ["Bairro", occurrence.bairro_solicitante],
    ["Complemento", occurrence.complemento], ["Código municipal", occurrence.codigo_municipal],
    ["Identificação adicional", occurrence.identificacao_adicional],
  ].filter(([, raw]) => present(raw))) as Field[]);

  paragraph("Descrição do fato", occurrence.observacoes);
  section("Classificação da ocorrência");
  drawRows([["Natureza constatada", nature], ["Subtipo", occurrence.sub_tipo_ocorrencia], ["Gravidade", occurrence.gravidade]]);

  if ([occurrence.numero_bo, occurrence.orgao_bo, occurrence.data_bo].some(present)) {
    section("Referência de BO de outro órgão");
    drawRows([["Número do BO", occurrence.numero_bo], ["Órgão registrador", occurrence.orgao_bo], ["Data do BO", formatDate(occurrence.data_bo, true)]]);
  }

  if (detail.envolvidos.length) {
    table(`Envolvidos (${detail.envolvidos.length})`, ["PAPEL", "NOME", "RG", "CPF", "TELEFONE"],
      detail.envolvidos.map((person) => [label(PERSON_TYPES, person.tipo), person.nome_completo, person.rg, person.cpf, person.telefone]),
      [30, 52, 30, 39, 31]);
    for (const person of detail.envolvidos) {
      const fields = ([
        ["Nascimento", present(person.data_nascimento) ? formatDate(person.data_nascimento, true) : null],
        ["Nome do pai", person.nome_pai], ["Nome da mãe", person.nome_mae], ["Endereço", person.endereco],
        ["Bairro", person.bairro], ["Cidade", person.cidade],
      ].filter(([, raw]) => present(raw))) as Field[];
      if (fields.length) { section("Dados complementares do envolvido"); drawRows([["Nome", person.nome_completo], ...fields]); }
      if (present(person.observacoes)) { section("Observações do envolvido"); drawRows([["Nome", person.nome_completo]]); paragraph("Relato complementar", person.observacoes); }
    }
  }

  if (detail.assinaturas.length) {
    table(`Assinaturas (${detail.assinaturas.length})`, ["TIPO", "ASSINANTE", "CPF", "RESPONSÁVEL PELA COLETA / DATA"],
      detail.assinaturas.map((signature) => [
        value(signature.tipo).toUpperCase(), signature.nome, signature.cpf,
        `${value(signature.nome_guarda)} / ${formatDate(signature.assinado_em)}`,
      ]), [28, 51, 35, 68]);
  }

  if (detail.historico.length > 1) {
    const versions = [...detail.historico].sort((a, b) => Date.parse(b.criado_em ?? "") - Date.parse(a.criado_em ?? "")).slice(0, 8);
    section("Controle de versões");
    drawRows([["Versões registradas", versions.map((item) => item.is_original ? "Original" : `v${item.numero_versao || 1}`).join(" / ")]]);
    table("Histórico de versões", ["VERSÃO", "STATUS", "REGISTRADO EM", "RETIFICADO EM", "ALTERAÇÕES"],
      versions.map((item) => [item.is_original ? "Original" : `v${item.numero_versao || 1}`, label(STATUS_LABELS, item.status), formatDate(item.criado_em), formatDate(item.retificado_em), value(item.campos_alterados, "—")]),
      [27, 37, 42, 42, 42]);
  }

  const justification = occurrence.justificativa_retificacao || occurrence.solicitacao_retificacao_justificativa;
  const isRectified = present(occurrence.ocorrencia_original_id) || Number(occurrence.numero_versao || 1) > 1;
  if (isRectified || present(justification)) {
    section("Controle de retificação");
    drawRows(([
      ["Tipo de registro", isRectified ? "Retificação vinculada" : "Registro original"],
      ["Versão", occurrence.numero_versao || "1"],
      [present(occurrence.retificado_em) ? "Retificado em" : "Solicitado em", formatDate(occurrence.retificado_em || occurrence.solicitada_em)],
      ["Campos alterados", occurrence.campos_alterados],
    ].filter(([, raw]) => present(raw))) as Field[]);
    paragraph("Justificativa da retificação", justification);
  }
  if (present(occurrence.motivo_cancelamento)) {
    section("Cancelamento do registro");
    drawRows([["Cancelado em", formatDate(occurrence.cancelado_em)]]);
    paragraph("Motivo do cancelamento", occurrence.motivo_cancelamento);
  }

  const images = detail.anexos.filter((item) => {
    const type = `${item.tipo_arquivo ?? ""} ${item.mime_type ?? ""}`.toLowerCase();
    return type.includes("image") || /\.(?:avif|gif|jpe?g|png|webp)$/i.test(item.nome_arquivo ?? "");
  });
  const otherAttachments = detail.anexos.filter((item) => !images.includes(item));
  if (images.length) {
    nextPage();
    section("Anexos fotográficos");
    const columns = images.length === 1 ? 1 : images.length >= 6 ? 3 : 2;
    const gapX = 5;
    const cellWidth = (width - gapX * (columns - 1)) / columns;
    const maxImageWidth = cellWidth - 8;
    const maxImageHeight = columns === 1 ? 150 : columns === 2 ? 64 : 46;
    for (let offset = 0; offset < images.length; offset += columns) {
      const row = images.slice(offset, offset + columns);
      const cards = await Promise.all(row.map(async (attachment) => {
        const loaded = await loadPrivateImage(attachment.reference);
        const caption = value(attachment.nome_arquivo, "Anexo fotográfico");
        let imageWidth = cellWidth - 8;
        let imageHeight = 24;
        if (loaded) {
          try {
            const props = doc.getImageProperties(loaded.data);
            const ratio = props.width / props.height;
            imageWidth = maxImageWidth;
            imageHeight = imageWidth / ratio;
            if (imageHeight > maxImageHeight) { imageHeight = maxImageHeight; imageWidth = imageHeight * ratio; }
          } catch { return { loaded: null, caption, imageWidth, imageHeight }; }
        }
        return { loaded, caption, imageWidth, imageHeight };
      }));
      const imageRowHeight = Math.max(...cards.map((item) => item.imageHeight));
      doc.setFont("courier", "normal");
      doc.setFontSize(6.4);
      const captions = cards.map((item) => doc.splitTextToSize(item.caption, cellWidth - 8).slice(0, 2));
      const captionLines = Math.max(...captions.map((lines) => Math.max(lines.length, 1)));
      const cardHeight = imageRowHeight + captionLines * 3.1 + 10;
      if (y + cardHeight > footerLimit) { nextPage(); section("Anexos fotográficos — continuação"); }
      cards.forEach((item, index) => {
        const x = MARGIN + index * (cellWidth + gapX);
        doc.setDrawColor(...SOFT);
        doc.setLineWidth(0.2);
        doc.rect(x, y, cellWidth, cardHeight);
        const imageX = x + (cellWidth - item.imageWidth) / 2;
        const imageY = y + 3 + (imageRowHeight - item.imageHeight) / 2;
        if (item.loaded) {
          try {
            doc.setDrawColor(...RULE);
            doc.rect(imageX - 0.5, imageY - 0.5, item.imageWidth + 1, item.imageHeight + 1);
            doc.addImage(item.loaded.data, item.loaded.format, imageX, imageY, item.imageWidth, item.imageHeight);
          } catch {
            doc.setFont("times", "italic"); doc.setFontSize(8); doc.setTextColor(...SOFT);
            doc.text("Imagem não disponível", x + cellWidth / 2, y + 3 + imageRowHeight / 2, { align: "center" });
          }
        } else {
          doc.setFont("times", "italic"); doc.setFontSize(8); doc.setTextColor(...SOFT);
          doc.text("Imagem não disponível", x + cellWidth / 2, y + 3 + imageRowHeight / 2, { align: "center" });
        }
        doc.setFont("courier", "normal"); doc.setFontSize(6.4); doc.setTextColor(...INK);
        doc.text(captions[index], x + cellWidth / 2, y + 3 + imageRowHeight + 3, { align: "center", maxWidth: cellWidth - 8, lineHeightFactor: 1.05 });
      });
      y += cardHeight + 5;
    }
  }
  if (otherAttachments.length) {
    table(`Anexos não-imagem (${otherAttachments.length})`, ["ARQUIVO", "TIPO", "TAMANHO", "ADICIONADO EM"],
      otherAttachments.map((item) => [item.nome_arquivo, item.mime_type || item.tipo_arquivo, item.tamanho ? `${item.tamanho} bytes` : "—", formatDate(item.criado_em)]),
      [70, 42, 30, 40]);
  }
  if (present(occurrence.hash_pericial)) {
    section("Integridade do registro");
    drawRows([["Hash registrado no sistema", occurrence.hash_pericial]]);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) footer(page, totalPages);
  const officialNumber = String(occurrence.numero_ocorrencia ?? "").trim() || "Rascunho";
  const safeNumber = officialNumber.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const dateParts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(emittedAt)) {
    if (part.type !== "literal") dateParts[part.type] = part.value;
  }
  const brazilDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const filename = `Ocorrencia_${safeNumber}_${brazilDate}.pdf`;
  doc.save(filename);
  return filename;
}
