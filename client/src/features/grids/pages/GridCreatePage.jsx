import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGrid } from "../../../api/grids.js";
import { DEFAULT_LEVELS } from "../defaults.js";
import GridForm from "../components/GridForm.jsx";

const initialCategoryId = crypto.randomUUID();

const initial = {
  name: "",
  levels: DEFAULT_LEVELS.map((l) => ({ ...l })),
  categories: [{ id: initialCategoryId, name: "", deliverable: "" }],
  criteria: [
    { id: crypto.randomUUID(), name: "", weight: 1, categoryId: initialCategoryId },
    { id: crypto.randomUUID(), name: "", weight: 1, categoryId: initialCategoryId },
  ],
};

export default function GridCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(null);

  const submit = async (payload) => {
    setSaving(true);
    setErrors(null);
    try {
      await createGrid(payload);
      navigate("/");
    } catch (err) {
      setErrors(err.details?.length ? err.details : [err.message]);
      setSaving(false);
    }
  };

  return (
    <GridForm
      title="Nouvelle grille"
      subtitle="Définissez les critères, leur pondération et le barème des niveaux."
      submitLabel="Créer la grille"
      initial={initial}
      saving={saving}
      errors={errors}
      onSubmit={submit}
    />
  );
}
