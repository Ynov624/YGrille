import "dotenv/config";
import { createApp } from "./app.js";
import { initDatabase } from "./db/connection.js";

const PORT = process.env.PORT || 3001;

await initDatabase();

createApp().listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
});
