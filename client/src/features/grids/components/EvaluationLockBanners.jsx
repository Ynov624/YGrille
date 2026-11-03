import Icon from "../../../components/Icon.jsx";

/**
 * Affiche les alertes de conflit de structure ou de perte de battement de cœur.
 */
export default function EvaluationLockBanners({ structureConflict, heartbeatFailed }) {
  if (!structureConflict && !heartbeatFailed) return null;

  return (
    <>
      {structureConflict && (
        <div className="eval-lock-banner warning" role="alert">
          <Icon name="alert" />
          <span>
            La structure de la grille est en cours de modification par {structureConflict.user_name}
            . Les évaluations sont temporairement désactivées.
          </span>
        </div>
      )}
      {heartbeatFailed && (
        <div className="eval-lock-banner warning" role="alert">
          <Icon name="alert" />
          <span>
            Connexion interrompue : impossible de renouveler les verrous. Vos modifications risquent
            de ne pas être enregistrées.
          </span>
        </div>
      )}
    </>
  );
}
