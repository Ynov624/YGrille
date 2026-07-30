import express from "express";
import path from "node:path";
import { requireAuth } from "./middleware/requireAuth.js";
import authRouter from "./routes/auth.routes.js";
import gridsRouter from "./routes/grids.routes.js";
import studentsRouter from "./routes/students.routes.js";
import marksRouter from "./routes/marks.routes.js";
import groupsRouter from "./routes/groups.routes.js";
import { AppError } from "./utils/errors.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  // `CLIENT_DIST` sert le build statique du client (SPA) sur le même port que l'API :
  // utilisé par le build desktop (Electron) et pour un déploiement mono-serveur, pas en
  // dev (Vite sert le client séparément et proxie /api).
  const clientDist = process.env.CLIENT_DIST;
  if (clientDist) {
    app.use(express.static(clientDist));
  }

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);

  app.use("/api", requireAuth);
  app.use("/api/grids/:gridId/students", studentsRouter);
  app.use("/api/grids/:gridId/marks", marksRouter);
  app.use("/api/grids/:gridId/groups", groupsRouter);
  app.use("/api/grids", gridsRouter);

  // 404 API
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ressource introuvable." });
  });

  // SPA : toute autre route (ex. /grilles/:id/evaluer) est gérée par React Router côté
  // client, donc on renvoie toujours index.html en dehors de /api.
  if (clientDist) {
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  // Gestion centralisée des erreurs
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message, details: err.details, code: err.code });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  });

  return app;
}
