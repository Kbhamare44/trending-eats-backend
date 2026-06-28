import { Router } from "express";
import supabase from "../lib/supabase.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

// POST /saves
router.post("/", async (req, res, next) => {
  try {
    const { user_id, spot_id } = req.body;

    if (!user_id || !spot_id) {
      throw createError(400, "user_id and spot_id are required");
    }

    const { data, error } = await supabase
      .from("saves")
      .insert([{ user_id, spot_id }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw createError(409, "Already saved");
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /saves
router.delete("/", async (req, res, next) => {
  try {
    const { user_id, spot_id } = req.body;

    if (!user_id || !spot_id) {
      throw createError(400, "user_id and spot_id are required");
    }

    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", user_id)
      .eq("spot_id", spot_id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /saves/user/:user_id
router.get("/user/:user_id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("saves")
      .select("spot_id")
      .eq("user_id", req.params.user_id);

    if (error) throw error;

    res.json(data.map((s) => s.spot_id));
  } catch (err) {
    next(err);
  }
});

export default router;