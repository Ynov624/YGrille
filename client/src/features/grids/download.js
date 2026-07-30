/** Déclenche le téléchargement d'un Blob (PDF, ZIP, CSV…) depuis le navigateur. */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nettoie un nom (grille, élève) pour en faire un nom de fichier valide. */
export function sanitizeFileName(name) {
  return name.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "");
}
