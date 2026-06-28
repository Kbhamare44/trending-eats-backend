import { Router } from "express";
import axios from "axios";
import supabase from "../lib/supabase.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

/* ───────────────────────────────
   GET /spots
─────────────────────────────── */
router.get("/", async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius_km = 10,
      category,
      sort = "trending",
      limit = 20,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("spots")
      .select(`
        *,
        categories ( name, icon ),
        profiles ( username, avatar_url )
      `)
      .range(offset, offset + limit - 1);

    if (category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("name", category)
        .single();

      if (cat) query = query.eq("category_id", cat.id);
    }

    if (sort === "trending") {
      query = query.order("saves_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius_km);

      const nearby = data.filter((spot) => {
        const dist = getDistanceKm(
          userLat,
          userLng,
          spot.latitude,
          spot.longitude
        );

        spot.distance_km = Math.round(dist * 10) / 10;
        return dist <= radiusKm;
      });

      return res.json(nearby);
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* ───────────────────────────────
   GET /spots/:id
─────────────────────────────── */
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("spots")
      .select(`
        *,
        categories ( name, icon ),
        profiles ( username, avatar_url )
      `)
      .eq("id", req.params.id)
      .single();

    if (error || !data) throw createError(404, "Spot not found");

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* ───────────────────────────────
   POST /spots
─────────────────────────────── */
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      tiktok_url,
      category_id,
      submitted_by,
    } = req.body;

    if (!name || !latitude || !longitude || !tiktok_url) {
      throw createError(
        400,
        "name, latitude, longitude, and tiktok_url are required"
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw createError(400, "Invalid latitude or longitude");
    }

    if (!tiktok_url.includes("tiktok.com")) {
      throw createError(400, "tiktok_url must be a TikTok link");
    }

    let tiktok_embed = null;
    let thumbnail = null;

    try {
      const oembed = await axios.get(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktok_url)}`,
        { timeout: 8000 }
      );

      tiktok_embed = oembed.data.html;
      thumbnail = oembed.data.thumbnail_url;
    } catch (err) {
      console.warn("TikTok oEmbed failed:", err.message);
    }

    const { data, error } = await supabase
      .from("spots")
      .insert([
        {
          name,
          description,
          address,
          latitude: lat,
          longitude: lng,
          tiktok_url,
          tiktok_embed,
          thumbnail,
          category_id: category_id || null,
          submitted_by: submitted_by || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/* ───────────────────────────────
   DELETE /spots/:id
─────────────────────────────── */
router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("spots")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/* ───────────────────────────────
   GEOCODE
─────────────────────────────── */
router.get("/geocode", async (req, res, next) => {
  try {
    const { address } = req.query;

    if (!address) {
      throw createError(400, "address query param required");
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "TrendingEatsApp/1.0",
        },
        timeout: 10000,
      }
    );

    if (!response.data.length) {
      throw createError(404, "Address not found");
    }

    const result = response.data[0];

    res.json({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name,
    });
  } catch (err) {
    next(err);
  }
});

/* ───────────────────────────────
   Helpers
─────────────────────────────── */
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export default router;