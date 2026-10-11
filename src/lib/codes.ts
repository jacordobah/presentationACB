import type { OperationalCode } from "../api/types";

export interface CodeInfo {
  code: OperationalCode;
  label: string;
  emergency: boolean;
}

export const CODES: Record<OperationalCode, CodeInfo> = {
  "523": { code: "523", label: "He llegado al sitio", emergency: false },
  "541": {
    code: "541",
    label: "Ruta de confianza hacia el colegio",
    emergency: false,
  },
  "542": {
    code: "542",
    label: "Ruta de confianza salida del colegio",
    emergency: false,
  },
  "520": { code: "520", label: "Ubicación actual", emergency: false },
  "512": { code: "512", label: "Informe de novedades", emergency: false },
  "537": { code: "537", label: "Apoye policía", emergency: true },
  "550": { code: "550", label: "Accidente guía en bicicleta", emergency: true },
  "524": { code: "524", label: "Misión cumplida", emergency: false },
  "58": { code: "58", label: "Disponible para servicio", emergency: false },
};

export const ALL_CODES = Object.values(CODES);

export const NOTIFIED_CODES: OperationalCode[] = ["512", "537", "550"];

export const isEmergency = (code: OperationalCode) => CODES[code].emergency;
