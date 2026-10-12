import multer from "multer";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const unauthorized = (message) => new HttpError(401, message);
export const forbidden = (message = "No tienes permiso para esta acción.") =>
  new HttpError(403, message);
export const notFound = (message) => new HttpError(404, message);
export const unprocessable = (message) => new HttpError(422, message);

export function requestLogger(service) {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.log(
        `${new Date().toISOString()} ${service} ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`,
      );
    });
    next();
  };
}

export function notFoundHandler(toBody) {
  return (req, res) => {
    res.status(404).json(toBody("El recurso solicitado no existe.", 404));
  };
}

export function errorHandler(toBody) {
  // Express only treats a middleware as an error handler when it declares four
  // parameters.
  return (error, req, res, _next) => {
    const send = (status, message) =>
      res.status(status).json(toBody(message, status));
    if (error instanceof HttpError) {
      send(error.status, error.message);
      return;
    }
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        send(413, "El archivo supera el tamaño máximo de 20 MB.");
      } else {
        send(422, "No se pudo leer el archivo enviado.");
      }
      return;
    }
    if (error.type === "entity.parse.failed") {
      send(400, "El cuerpo de la solicitud no es JSON válido.");
      return;
    }
    console.error(error);
    send(500, "Error interno del servidor.");
  };
}
