/** Transmet le rejet d'une promesse au middleware d'erreurs Express (non automatique en Express 4). */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
