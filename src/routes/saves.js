import { Router } from "express";
import supabase from "../lib/supabase.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

// Legacy saves are private too; never trust a user_id supplied by the caller.
router.use(async (req, res, next) => {
  try {
    const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "")?.[1];
    if (!token) throw createError(401, "Sign in to manage saves");
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email_confirmed_at) throw createError(401, "Sign in to manage saves");
    req.authUserId = data.user.id;
    if (req.body?.user_id && req.body.user_id !== req.authUserId) throw createError(403, "These saves belong to another account");
    next();
  } catch (error) { next(error); }
});

// POST /saves
router.post("/", async (req, res, next) => {
  try {
    const { spot_id } = req.body;
    const user_id = req.authUserId;

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
        return res.status(200).json({ saved: true, alreadySaved: true });
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
    const { spot_id } = req.body;
    const user_id = req.authUserId;

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
    if (req.params.user_id !== req.authUserId) throw createError(403, "These saves belong to another account");
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