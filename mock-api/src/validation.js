import { unprocessable } from "./http.js";

export function requiredText(body, field, label) {
  const value = optionalText(body, field);
  if (!value) throw unprocessable(`Ingresa ${label}.`);
  return value;
}

export function optionalText(body, field) {
  const value = body?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function requiredOneOf(body, field, options, label) {
  const value = body?.[field];
  if (!options.includes(value)) throw unprocessable(`Selecciona ${label}.`);
  return value;
}

export function requiredNumber(body, field, label) {
  const value = body?.[field];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw unprocessable(`Ingresa ${label}.`);
  return value;
}

export function requiredPhone(body, field) {
  const value = requiredText(body, field, "el teléfono");
  if (!/^\d{10}$/.test(value))
    throw unprocessable("El teléfono debe tener 10 dígitos.");
  return value;
}

export function requiredDocumentNumber(body, field) {
  const value = requiredText(body, field, "el número de documento");
  if (!/^[A-Za-z0-9]{4,15}$/.test(value)) {
    throw unprocessable(
      "El número de documento debe tener entre 4 y 15 letras o dígitos.",
    );
  }
  return value;
}

export function requiredEmail(body, field) {
  const value = requiredText(body, field, "el correo");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw unprocessable("El correo no es válido.");
  return value;
}
