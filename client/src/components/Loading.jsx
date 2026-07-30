/** Indicateur de chargement (spinner + libellé), utilisé partout où l'app attend une réponse API. */
export default function Loading({ label = "Chargement…" }) {
  return (
    <p className="loading">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
