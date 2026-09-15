export class AppError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export const badRequest = (message, details, code) => new AppError(400, message, details, code);
export const forbidden = (message = "Accès refusé.") => new AppError(403, message);
export const notFound =(message = "Ressource introuvable.") => new AppError(404, message);
