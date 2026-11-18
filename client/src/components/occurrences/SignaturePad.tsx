import { useEffect, useRef, type PointerEvent } from "react";
import { RotateCcw } from "lucide-react";

type SignaturePadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export default function SignaturePad({ value, onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = Boolean(value);
    if (!value) return;

    const image = new Image();
    image.onload = () => {
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    };
    image.src = value;
  }, [value]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function begin(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const current = point(event);
    if (!canvas || !context || !current) return;

    canvas.setPointerCapture(event.pointerId);
    context.strokeStyle = "#163f68";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(current.x, current.y);
    drawing.current = true;
    hasInk.current = true;
    lastPoint.current = current;
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    event.preventDefault();
    const context = canvasRef.current?.getContext("2d");
    const current = point(event);
    if (!context || !current || !lastPoint.current) return;
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPoint.current = current;
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasInk.current) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    drawing.current = false;
    hasInk.current = false;
    lastPoint.current = null;
    onChange(null);
  }

  return (
    <div className="occurrence-signature">
      <canvas
        ref={canvasRef}
        className="occurrence-signature-canvas"
        width={640}
        height={190}
        aria-label="Área para assinatura manuscrita opcional do envolvido"
        aria-describedby="occurrence-signature-hint"
        aria-disabled={disabled}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
      <div className="occurrence-signature-footer">
        <span id="occurrence-signature-hint">Assine com o dedo ou com o mouse. A coleta é opcional.</span>
        <button type="button" className="occurrence-link-button" onClick={clear} disabled={disabled || !value}>
          <RotateCcw size={14} aria-hidden="true" /> Limpar
        </button>
      </div>
    </div>
  );
}
