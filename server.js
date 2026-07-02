import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import spotsRouter from "./src/routes/spots.js";
import savesRouter from "./src/routes/saves.js";
import categoriesRouter from "./src/routes/categories.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

dotenv.config();
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Log every incoming request in development
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Trending Eats API",
    version: "1.0.0",
    status: "running",
  });
});

app.use("/spots", spotsRouter);
app.use("/saves", savesRouter);
app.use("/categories", categoriesRouter);

// 404 handler — catches any route not defined above
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// Error handler — must be last
app.use(errorHandler);

// Recalculate trending scores every hour while the server is running
import { createClient } from "@supabase/supabase-js";

setInterval(async () => {
  try {
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const { error } = await client.rpc("recalculate_all_trending_scores");
    if (error) console.warn("Trending score update failed:", error.message);
    else console.log(`[${new Date().toISOString()}] Trending scores updated`);
  } catch (err) {
    console.warn("Trending score interval error:", err.message);
  }
}, 60 * 60 * 1000);
// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍜 Trending Eats API running on http://localhost:${PORT}\n`);
});