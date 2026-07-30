import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchGrid, updateGrid } from "../../../api/grids.js";
import GridForm from "../components/GridForm.jsx";
import Loading from "../../../components/Loading.jsx";

export default function GridEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [grid, setGrid] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(null);

  useEffect(() => {
    fetchGrid(id).then(setGrid).catch((e) => setLoadError(e.message));
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

  if (loadError) return <main className="page"><p className="error-box">{loadError}</p></main>;
  if (!grid) return <main className="page"><Loading /></main>;

  return (
    <GridForm
      title="Modifier la grille"
      subtitle="Ajustez les critères, leur pondération et le barème des niveaux."
      submitLabel="Enregistrer les modifications"
      saving={saving}
      errors={errors}
      onSubmit={submit}
      initial={{
        name: grid.name,
        levels: grid.levels.map((l) => ({ label: l.label, pct: l.pct })),
        categories: grid.categories.map((c) => ({ id: c.id, name: c.name })),
        criteria: grid.criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight, categoryId: c.category_id })),
      }}
    />
  );
}
