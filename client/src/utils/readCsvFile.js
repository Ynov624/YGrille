/**
 * Lit un fichier CSV en détectant son encodage : Excel FR enregistre par défaut un CSV en
 * Windows-1252 (ANSI), pas en UTF-8 — décoder en UTF-8 systématiquement (`file.text()`)
 * corrompt alors les caractères accentués ("Prénom" → colonne introuvable). On repère un
 * BOM UTF-8 explicite, sinon on tente un décodage UTF-8 strict, et on retombe sur
 * Windows-1252 s'il échoue.
 */
export async function readCsvFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
