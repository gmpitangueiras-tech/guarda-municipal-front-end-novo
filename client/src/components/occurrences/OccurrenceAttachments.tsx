import { useEffect, useMemo, useState } from "react";
import { Camera, FileText, FileVideo, Image as ImageIcon, LoaderCircle, Paperclip, Trash2, Upload } from "lucide-react";
import {
  ACCEPT_ANEXOS_COMPLETO,
  ACCEPT_ANEXOS_RAPIDO,
  classificarAnexo,
  MAX_ANEXO_BYTES,
  type TipoAnexoOcorrencia,
} from "@/lib/attachmentPolicy";

export { MAX_ANEXO_BYTES };
export type { TipoAnexoOcorrencia };

export type AnexoRascunho = {
  id: string;
  file: File;
  tipo: TipoAnexoOcorrencia;
};

type OccurrenceAttachmentsProps = {
  modo: "rapido" | "completo";
  anexos: AnexoRascunho[];
  onAdicionar: (anexos: AnexoRascunho[]) => void;
  onRemover: (id: string) => void;
  bloqueado?: boolean;
  enviadoIds?: ReadonlySet<string>;
  erroPorId?: Readonly<Record<string, string>>;
};

function idAleatorio(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blobJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function reduzirImagem(file: File): Promise<File | null> {
  if (file.size <= MAX_ANEXO_BYTES) return file;
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    const escalaInicial = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const escalas = [escalaInicial, escalaInicial * 0.82, escalaInicial * 0.66, escalaInicial * 0.5];
    const qualidades = [0.84, 0.74, 0.64, 0.54, 0.44];

    for (const escala of escalas) {
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const qualidade of qualidades) {
        const blob = await blobJpeg(canvas, qualidade);
        if (blob && blob.size <= MAX_ANEXO_BYTES) {
          const base = file.name.replace(/\.[^.]+$/, "") || "imagem";
          return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
        }
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
}

function PreviewAnexo({ anexo }: { anexo: AnexoRascunho }) {
  const previewUrl = useMemo(
    () => (anexo.tipo === "image" ? URL.createObjectURL(anexo.file) : null),
    [anexo.file, anexo.tipo],
  );
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (previewUrl) return <img className="occurrence-attachment-thumb" src={previewUrl} alt={`Prévia de ${anexo.file.name}`} />;
  if (anexo.tipo === "video") return <FileVideo size={20} aria-hidden="true" />;
  if (anexo.tipo === "document") return <FileText size={20} aria-hidden="true" />;
  return <ImageIcon size={20} aria-hidden="true" />;
}

export default function OccurrenceAttachments({
  modo,
  anexos,
  onAdicionar,
  onRemover,
  bloqueado = false,
  enviadoIds,
  erroPorId,
}: OccurrenceAttachmentsProps) {
  const [processando, setProcessando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const accepts = modo === "rapido" ? ACCEPT_ANEXOS_RAPIDO : ACCEPT_ANEXOS_COMPLETO;

  async function selecionar(files: FileList | null) {
    if (!files?.length || bloqueado) return;
    setProcessando(true);
    setErroLocal(null);
    const novos: AnexoRascunho[] = [];
    const rejeitados: string[] = [];

    for (const original of Array.from(files)) {
      const tipo = classificarAnexo(original);
      if (!tipo || (modo === "rapido" && tipo !== "image")) {
        rejeitados.push(`${original.name}: ${modo === "rapido" ? "o BO Rápido aceita fotos;" : "use imagem, vídeo ou PDF;"} formato não aceito.`);
        continue;
      }

      let file = original;
      if (tipo === "image" && file.size > MAX_ANEXO_BYTES) {
        const reduzido = await reduzirImagem(file);
        if (!reduzido) {
          rejeitados.push(`${original.name}: não foi possível reduzir a imagem para menos de 1 MiB.`);
          continue;
        }
        file = reduzido;
      }
      if (file.size > MAX_ANEXO_BYTES) {
        rejeitados.push(`${original.name}: excede o limite de 1 MiB por arquivo.`);
        continue;
      }
      novos.push({ id: idAleatorio(), file, tipo });
    }

    if (novos.length) onAdicionar(novos);
    if (rejeitados.length) setErroLocal(rejeitados.join(" "));
    setProcessando(false);
  }

  return (
    <section className="occurrence-attachments" aria-label="Anexos opcionais">
      <div className="occurrence-attachments-heading">
        <span className="occurrence-attachments-icon"><Paperclip size={18} aria-hidden="true" /></span>
        <div>
          <h3>Anexos <span>Opcional</span></h3>
          <p>{modo === "rapido" ? "Fotos · até 1 MiB por arquivo." : "Fotos, vídeos ou PDFs · até 1 MiB por arquivo."}</p>
        </div>
      </div>

      <label className={`occurrence-attachment-picker${bloqueado || processando ? " is-disabled" : ""}`}>
        <input
          type="file"
          accept={accepts}
          multiple
          disabled={bloqueado || processando}
          onChange={(event) => {
            void selecionar(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        {processando ? <LoaderCircle size={19} className="spin" aria-hidden="true" /> : modo === "rapido" ? <Camera size={19} aria-hidden="true" /> : <Upload size={19} aria-hidden="true" />}
        <span>{processando ? "Preparando arquivos…" : modo === "rapido" ? "Adicionar fotos" : "Adicionar arquivos"}</span>
      </label>

      <p className="occurrence-attachment-note">Nenhum anexo é obrigatório para registrar a ocorrência. Arquivos permanecem privados.</p>
      {erroLocal ? <p className="occurrence-attachment-error" role="alert">{erroLocal}</p> : null}

      {anexos.length ? (
        <ul className="occurrence-attachment-list">
          {anexos.map((anexo) => {
            const enviado = enviadoIds?.has(anexo.id) ?? false;
            const erro = erroPorId?.[anexo.id];
            return (
              <li className="occurrence-attachment-item" key={anexo.id}>
                <span className="occurrence-attachment-preview"><PreviewAnexo anexo={anexo} /></span>
                <span className="occurrence-attachment-copy">
                  <strong title={anexo.file.name}>{anexo.file.name}</strong>
                  <small>{formatarTamanho(anexo.file.size)}{enviado ? " · Enviado" : bloqueado ? " · Aguardando envio" : " · Pronto para enviar"}</small>
                  {erro ? <em role="alert">{erro}</em> : null}
                </span>
                <button
                  type="button"
                  className="occurrence-attachment-remove"
                  aria-label={`Remover ${anexo.file.name}`}
                  disabled={bloqueado || enviado}
                  onClick={() => onRemover(anexo.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
