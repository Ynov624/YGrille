// Point d'entrée Vercel : l'API Express tourne comme une fonction serverless.
// vercel.json redirige toutes les requêtes /api/* ici, en conservant leur chemin complet
// (/api/grids…), attendu tel quel par les routes Express. Le client (client/dist) est
// servi en statique par Vercel, d'où l'absence de CLIENT_DIST.
import { createApp } from "../server/src/app.js";

export default createApp();
