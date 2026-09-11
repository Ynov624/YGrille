import { api } from "./client.js";

/** Liste en lecture seule (nom + effectif), pour le sélecteur d'import dans une grille. */
export const fetchPromos = () => api("/api/promos");
