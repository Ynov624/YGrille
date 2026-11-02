import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchGrid, updateGrid } from "../../../api/grids.js";
import GridForm from "../components/GridForm.jsx";
import GridShareModal from "../components/GridShareModal.jsx";
import Loading from "../../../components/Loading.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
import Icon from "../../../components/Icon.jsx";

export default function GridEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [grid, setGrid] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchGrid(id)
      .then(setGrid)
      .catch((e) => setLoadError(e.message));
  }, [id]);

  const submit = async (payload) => {
    setSaving(true);
    setErrors(null);
    try {
      await updateGrid(id, payload);
      navigate("/");
    } catch (err) {
      setErrors(err.details?.length ? err.details : [err.message]);
      setSaving(false);
    }
  };

  if (loadError)
    return (
      <main className="page">
        <p className="error-box" role="alert">
          {loadError}
        </p>
      </main>
    );
  if (!grid)
    return (
      <main className="page">
        <Loading />
      </main>
    );

  if (grid.role && grid.role !== "owner") {
    return (
      <main className="page">
        <PageHeader
          breadcrumbs={[{ label: "Mes grilles", to: "/" }, { label: grid.name }]}
          title="Modification restreinte"
          subtitle="Seul le propriétaire peut modifier la structure de cette grille."
          actions={
            <Link to="/" className="btn ghost">
              <Icon name="arrowLeft" />
              Retour
            </Link>
          }
        />
        <div className="error-box" role="alert">
          <Icon name="alert" />
          <p>
            Vous êtes éditeur sur cette grille. Seul un propriétaire peut en modifier la structure.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <GridForm
        title="Modifier la grille"
        subtitle="Ajustez les critères, leur pondération et le barème des niveaux."
        submitLabel="Enregistrer les modifications"
        saving={saving}
        errors={errors}
        onSubmit={submit}
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setShowShareModal(true)}>
              <Icon name="userPlus" />
              Partager
            </button>
            <Link to="/" className="btn ghost">
              Annuler
            </Link>
          </>
        }
        initial={{
          name: grid.name,
          levels: grid.levels.map((l) => ({ label: l.label, pct: l.pct })),
          categories: grid.categories.map((c) => ({
            id: c.id,
            name: c.name,
            deliverable: c.deliverable,
          })),
          criteria: grid.criteria.map((c) => ({
            id: c.id,
            name: c.name,
            weight: c.weight,
            categoryId: c.category_id,
          })),
        }}
      />
      {showShareModal && (
        <GridShareModal
          gridId={grid.id}
          gridName={grid.name}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          currentUserRole={grid.role}
          onLeftGrid={() => navigate("/")}
          onMembersUpdated={() => {
            fetchGrid(id)
              .then(setGrid)
              .catch((e) => setLoadError(e.message));
          }}
        />
      )}
    </>
  );
}
