import multer from "multer";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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
    res.status(404).json(toBody("El recurso solicitado no existe."));
  };
}

export function errorHandler(toBody) {
  // Express only treats a middleware as an error handler when it declares four
  // parameters.
  return (error, req, res, _next) => {
    if (error instanceof HttpError) {
      res.status(error.status).json(toBody(error.message));
      return;
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "El archivo supera el tamaño máximo de 25 MB."
          : "No se pudo leer el archivo enviado.";
      res.status(422).json(toBody(message));
      return;
    }
    if (error.type === "entity.parse.failed") {
      res
        .status(400)
        .json(toBody("El cuerpo de la solicitud no es JSON válido."));
      return;
    }
    console.error(error);
    res.status(500).json(toBody("Error interno del servidor."));
  };
}
