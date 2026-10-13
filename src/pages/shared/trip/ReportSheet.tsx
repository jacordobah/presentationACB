import {
  FileText,
  MapPin,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { reportCode } from "../../../api/codes";
import type { Trip } from "../../../api/types";
import { useSessionUser } from "../../../auth/AuthContext";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import { errorMessage, useToast } from "../../../components/toast/ToastContext";
import { CODES } from "../../../lib/codes";

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
  onBack,
  onSent,
}: {
  code: NoveltyCode;
  trip: Trip;
  onBack: () => void;
  onSent: () => void;
}) {
  const user = useSessionUser();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const emergency = CODES[code].emergency;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await reportCode({
        code,
        label: CODES[code].label,
        routeCode: trip.routeCode,
        userId: user.id,
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
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
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
