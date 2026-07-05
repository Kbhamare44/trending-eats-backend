# Trending Eats 🍜

A community-curated map of food spots going viral on TikTok. Every pin is backed by a real TikTok video — not padded Google reviews, but actual social proof. Find what's trending near you, watch the video, and go eat.

---

## What it does

**Trending Eats** solves a real problem: when you want to try somewhere new, Google reviews can be faked and star ratings are gamed. TikTok is where real people actually share food they love. This app pins those spots on a map so you can discover them without scrolling through hundreds of videos.

- 🗺️ **Map view** — pins across your city, each one a viral food spot
- 🔥 **Feed view** — scrollable cards sorted by trending score
- 🎵 **TikTok embeds** — watch the viral video right inside the app
- 📍 **Submit a spot** — paste a TikTok link + address, it goes live instantly
- 🔖 **Save spots** — bookmark places you want to visit
- 🔍 **Search & filter** — by name, category, or distance
- 📈 **Trending algorithm** — recency + saves combined so new spots can rise

---

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Mobile app | React Native (Expo) | One codebase → iOS + Android |
| Navigation | Expo Router | File-system based routing |
| Backend API | Node.js + Express | Simple, fast, free to host |
| Database | PostgreSQL via Supabase | Hosted, real SQL, free tier |
| Auth | Supabase Auth | Email/password, session persistence |
| Maps | React Native Maps | OpenStreetMap tiles, no API key |
| Geocoding | Nominatim (OpenStreetMap) | Free address → lat/lng |
| TikTok embeds | TikTok oEmbed API | Official embed API, no scraping |
| Backend hosting | Railway | Free tier, auto-deploy from GitHub |
| App builds | EAS (Expo Application Services) | Cloud builds for iOS + Android |

---

## Project structure

```
trending-eats/
├── backend/                    ← Node.js + Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── spots.js        ← CRUD + geocoding + oEmbed fetch
│   │   │   ├── saves.js        ← Save/unsave spots
│   │   │   └── categories.js   ← Food categories
│   │   ├── middleware/
│   │   │   └── errorHandler.js ← Centralised error handling
│   │   └── lib/
│   │       └── supabase.js     ← Supabase client (service key)
│   ├── server.js               ← Express app + trending score interval
│   ├── package.json
│   └── .env                    ← Never commit this
│
└── mobile/                     ← Expo React Native app
    ├── app/
    │   ├── _layout.jsx         ← Root layout + AuthProvider
    │   ├── auth.jsx            ← Sign in / sign up screen
    │   ├── submit.jsx          ← Add a spot form
    │   ├── (tabs)/
    │   │   ├── _layout.jsx     ← Tab bar config
    │   │   ├── index.jsx       ← Map screen
    │   │   ├── feed.jsx        ← Feed + search + filters
    │   │   └── profile.jsx     ← Saved spots + submitted spots
    │   └── spot/
    │       └── [id].jsx        ← Spot detail + TikTok embed
    ├── components/
    │   ├── SpotCard.jsx        ← Reusable spot card
    │   └── SkeletonCard.jsx    ← Loading skeleton
    ├── hooks/
    │   └── useSpots.js         ← Data fetching hook
    ├── lib/
    │   ├── api.js              ← API client (wraps fetch)
    │   ├── auth.jsx            ← Auth context + useAuth hook
    │   └── supabase.js         ← Supabase client (anon key)
    ├── constants/
    │   └── theme.js            ← Colors, typography, spacing
    ├── app.json                ← Expo config
    └── .env                    ← Never commit this
```

---

## Prerequisites

- **Node.js 20** (via nvm — Node 24 breaks Expo packages)
- **npm**
- **Expo Go** app on your iPhone or Android for testing
- **Supabase account** — free at supabase.com
- **Railway account** — free at railway.app

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/krishbhamare/trending-eats
cd trending-eats
```

### 2. Set up Supabase

1. Create a new project at **supabase.com**
2. Go to **SQL Editor** and run the schema (see [Database setup](#database-setup) below)
3. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key

### 3. Set up the backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=3001
```

Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

Verify it's running:
```bash
curl http://localhost:3001/
# {"name":"Trending Eats API","version":"1.0.0","status":"running"}
```

### 4. Set up the mobile app

```bash
cd mobile
nvm use 20
npm install --legacy-peer-deps
```

Create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> ⚠️ `EXPO_PUBLIC_API_URL` must be your **Railway URL**, not your Supabase URL.

Start the app:

```bash
npx expo start --clear
```

Scan the QR code with Expo Go on your phone.

---

## Database setup

Run these SQL blocks in **Supabase → SQL Editor** in order.

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
```

### Categories table

```sql
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL
);

INSERT INTO categories (name, icon) VALUES
  ('coffee', '☕'), ('ramen', '🍜'), ('pizza', '🍕'),
  ('tacos', '🌮'), ('dessert', '🍰'), ('burgers', '🍔'),
  ('sushi', '🍱'), ('brunch', '🥑'), ('bbq', '🔥'), ('vegan', '🌱');
```

### Profiles table

```sql
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Spots table

```sql
CREATE TABLE spots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  description    TEXT,
  address        TEXT,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  tiktok_url     TEXT NOT NULL,
  tiktok_embed   TEXT,
  thumbnail      TEXT,
  category_id    INTEGER REFERENCES categories(id),
  submitted_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  saves_count    INTEGER DEFAULT 0,
  trending_score DOUBLE PRECISION DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX spots_saves_idx ON spots (saves_count DESC);
CREATE INDEX spots_category_idx ON spots (category_id);
```

### Saves table

```sql
CREATE TABLE saves (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id    UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spot_id)
);

CREATE OR REPLACE FUNCTION increment_saves()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE spots SET saves_count = saves_count + 1 WHERE id = NEW.spot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_save_insert
  AFTER INSERT ON saves
  FOR EACH ROW EXECUTE FUNCTION increment_saves();

CREATE OR REPLACE FUNCTION decrement_saves()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE spots SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.spot_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_save_delete
  AFTER DELETE ON saves
  FOR EACH ROW EXECUTE FUNCTION decrement_saves();
```

### Row Level Security

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Spots are publicly readable" ON spots FOR SELECT USING (true);
CREATE POLICY "Signed-in users can submit spots" ON spots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Submitters can delete their own spots" ON spots FOR DELETE USING (auth.uid() = submitted_by);
CREATE POLICY "Users can see their own saves" ON saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save spots" ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave spots" ON saves FOR DELETE USING (auth.uid() = user_id);
```

### Trending score function

```sql
CREATE OR REPLACE FUNCTION recalculate_all_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE spots SET trending_score = saves_count::float /
    POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 + 2, 1.5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## API endpoints

All endpoints except `GET /` are served from your Railway deployment.

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/` | API health check |

### Spots

| Method | Path | Description |
|---|---|---|
| GET | `/spots` | List spots (supports `?sort=trending\|recent`, `?category=coffee`, `?lat=&lng=&radius_km=`) |
| GET | `/spots/:id` | Get a single spot |
| POST | `/spots` | Create a spot (fetches TikTok oEmbed automatically) |
| DELETE | `/spots/:id` | Delete a spot |
| GET | `/spots/geocode?address=` | Convert address to lat/lng via Nominatim |

### Saves

| Method | Path | Description |
|---|---|---|
| POST | `/saves` | Save a spot `{ user_id, spot_id }` |
| DELETE | `/saves` | Unsave a spot `{ user_id, spot_id }` |
| GET | `/saves/user/:user_id` | Get all spot IDs saved by a user |

### Categories

| Method | Path | Description |
|---|---|---|
| GET | `/categories` | List all categories |

---

## Trending algorithm

Spots are ranked using a time-decay formula inspired by Hacker News:

```
score = saves / (hours_since_posted + 2) ^ 1.5
```

- **saves** — how many people bookmarked this spot
- **hours_since_posted** — how old the spot is
- **+2** — prevents division by zero for brand new spots
- **^1.5** — controls decay rate (older = lower score, even with many saves)

Scores are recalculated automatically whenever a spot's save count changes (via database trigger), and every hour via a `setInterval` in the backend server so scores decay continuously even without new saves.

---

## Deployment

### Backend (Railway)

1. Push `backend/` to a private GitHub repo
2. Connect repo to Railway at **railway.app**
3. Add environment variables in Railway → Variables tab:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `NODE_ENV=production`
   - `PORT=3001`
4. Generate a domain in Settings → Networking → Generate Domain
5. Auto-deploys on every push to `main`

### Mobile (EAS)

```bash
npm install -g eas-cli
eas login
eas init

# Preview build (internal testing)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production build (App Store / Play Store)
eas build --profile production --platform all
eas submit --platform all
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS — backend only) |
| `PORT` | Server port (default 3001) |

### Mobile (`mobile/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Your Railway backend URL |
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key (safe to ship in app) |

> Never use the `service_role` key in the mobile app. Use the `anon` key only.

---

## Known gotchas

These are real issues discovered during development — save yourself the debugging time.

- **Node version** — must use Node 20 via nvm. Node 24 breaks Expo packages with ESM errors.
- **`--legacy-peer-deps`** — always required when installing in the mobile folder. Expo's dependency tree conflicts with npm's strict peer resolution.
- **`expo-status-bar` in plugins** — do not add it to the `plugins` array in `app.json`. It crashes the config plugin loader.
- **`@gorhom/bottom-sheet`** — both v4 and v5 crash with `useWorkletCallback is not a function` on the current Expo SDK. Use React Native's built-in `Modal` instead.
- **`expo-image`** — broken on current SDK versions. Use React Native's built-in `Image` component instead.
- **Theme imports in layout files** — `app/_layout.jsx` and `app/(tabs)/_layout.jsx` must not import from `constants/theme`. Metro's module resolver fails on these files specifically. Hardcode colors directly.
- **Screen file naming** — never prefix screen files with underscore (e.g. `_profile.jsx`). Expo Router treats underscore-prefixed files as hidden routes and won't render them.
- **`.env` URL mixup** — `EXPO_PUBLIC_API_URL` must be your Railway URL. Not your Supabase URL. Both look similar (`https://xxx.supabase.co` vs `https://xxx.up.railway.app`).

---

## Cost breakdown

| Item | Cost | Frequency |
|---|---|---|
| Supabase | Free | Monthly (up to 500MB, 50k MAU) |
| Railway backend | Free | Monthly (500 execution hours) |
| EAS builds | Free | Monthly (30 builds) |
| Apple Developer Program | $99 | Per year |
| Google Play Developer | $25 | One-time |
| Domain (optional) | ~$12 | Per year |
| **Total to launch** | **~$124** | One-time |
| **Monthly ongoing** | **$0** | Until real scale |

---

## License

MIT — do whatever you want with it.

---

Built by Krish Bhamare
