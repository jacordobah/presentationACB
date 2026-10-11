import {
  Camera,
  FileText,
  MapPin,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { reportCode } from "../../../api/codes";
import { uploadPhoto } from "../../../api/photos";
import type { Trip } from "../../../api/types";
import { useSessionUser } from "../../../auth/AuthContext";
import { Field } from "../../../components/Field";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import { errorMessage, useToast } from "../../../components/toast/ToastContext";
import { CODES } from "../../../lib/codes";
import type { Fix } from "../../../location/LocationContext";

type NoveltyCode = "512" | "520" | "537" | "550";

const NOVELTY_CODES: NoveltyCode[] = ["512", "520", "537", "550"];

const ICONS: Record<NoveltyCode, LucideIcon> = {
  "512": FileText,
  "520": MapPin,
  "537": ShieldAlert,
  "550": Siren,
};

const SUBMIT_LABELS: Record<NoveltyCode, string> = {
  "512": "Enviar informe",
  "520": "Enviar ubicación",
  "537": "Enviar alerta 537",
  "550": "Enviar alerta 550",
};

const SENT_MESSAGES: Record<NoveltyCode, string> = {
  "512": "Informe enviado.",
  "520": "Ubicación enviada.",
  "537": "Alerta 537 enviada.",
  "550": "Alerta 550 enviada.",
};

function ReportForm({
  code,
  trip,
  fix,
  onBack,
  onSent,
}: {
  code: NoveltyCode;
  trip: Trip;
  fix: Fix | null;
  onBack: () => void;
  onSent: () => void;
}) {
  const user = useSessionUser();
  const toast = useToast();
  const [detail, setDetail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const emergency = CODES[code].emergency;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code === "512" && !detail.trim()) {
      setError("Describe la novedad para enviar el informe.");
      return;
    }
    if (!fix) {
      setError(
        "Todavía no tenemos tu ubicación. Espera unos segundos y vuelve a intentarlo.",
      );
      return;
    }
    setSending(true);
    setError(null);
    try {
      const context = {
        userId: user.id,
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
        code,
      };
      const photoId = photo ? await uploadPhoto(photo, context) : undefined;
      await reportCode({
        ...context,
        label: CODES[code].label,
        location: fix,
        detail: detail.trim() || undefined,
        photoId,
      });
      toast.show(SENT_MESSAGES[code], { tone: "success" });
      onSent();
    } catch (caught) {
      setError(errorMessage(caught));
      setSending(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      {code !== "520" && (
        <Field
          label={code === "512" ? "Qué pasó" : "Qué pasó (opcional)"}
          hint={
            code === "512" ? "Cuenta la novedad en pocas palabras." : undefined
          }
        >
          {(control) => (
            <textarea
              {...control}
              className="input"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              maxLength={500}
            />
          )}
        </Field>
      )}
      {code !== "512" && (
        <div className="field">
          <span className="field__label">Foto (opcional)</span>
          {photo ? (
            <div className="cluster">
              <span className="chip chip--done">{photo.name}</span>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setPhoto(null)}
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <label className="button file-button">
              <Camera size={22} aria-hidden="true" />
              Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="visually-hidden"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button"
          onClick={onBack}
          disabled={sending}
        >
          Cambiar código
        </button>
        <button
          type="submit"
          className={`button button--large ${emergency ? "button--emergency" : "button--primary"}`}
          disabled={sending}
        >
          {sending ? "Enviando…" : SUBMIT_LABELS[code]}
        </button>
      </div>
    </form>
  );
}

export function ReportSheet({
  open,
  onClose,
  trip,
  fix,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  fix: Fix | null;
}) {
  const [code, setCode] = useState<NoveltyCode | null>(null);
  const close = () => {
    setCode(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      title={code ? `${code} ${CODES[code].label}` : "Reportar novedad"}
      onClose={close}
    >
      {code ? (
        <ReportForm
          code={code}
          trip={trip}
          fix={fix}
          onBack={() => setCode(null)}
          onSent={close}
        />
      ) : (
        <div className="report-options">
          {NOVELTY_CODES.map((option) => {
            const Icon = ICONS[option];
            const emergency = CODES[option].emergency;
            return (
              <button
                key={option}
                type="button"
                className={
                  emergency
                    ? "report-option report-option--emergency"
                    : "report-option"
                }
                onClick={() => setCode(option)}
              >
                <Icon size={28} aria-hidden="true" />
                <span className="report-option__code">{option}</span>
                <span className="report-option__label">
                  {CODES[option].label}
                </span>
                {emergency && (
                  <span className="report-option__tag">Emergencia</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
