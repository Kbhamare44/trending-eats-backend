import { Router } from "express";
import supabase from "../lib/supabase.js";

const router = Router();

// GET /categories
// Returns all categories sorted alphabetically
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;