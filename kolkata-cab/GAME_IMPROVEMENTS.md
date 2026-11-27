# Kolkata Cab — Game Audit & Improvement Guide

> A comprehensive review of **Kolkata Cab** (`kolkata-cab/`) covering rendering bugs, gameplay gaps, visual polish, performance bottlenecks, and code architecture, along with concrete ways to make the game better.

---

## 1. Immediate Bugs & Visual Issues Observed

### A. GLB Model Artifacts (`pCube` / Deprecated Material Extensions)
- **What happens:** Inspecting `models/taxi.glb` reveals leftover stage/backdrop nodes (`pCube1` at `y = 47.61`, `pCube3` at origin `[0, 0, 0]` using `lambert1`, and `pPlane1` scaled `227 × 82 × 153`).
- **Why it matters:** `normalizeLoadedModel` in `src/vehicles.js` strips `pplane`/`plane`/`floor`/`ground`, but does **not** strip `pCube1`/`pCube3`. A leftover opaque cube at the vehicle's origin or shifted bounding box can block the chase camera (producing a blurry brown/amber wall).
- **Also:** Several `.glb` files emit `THREE.GLTFLoader: Unknown extension "KHR_materials_pbrSpecularGlossiness"`, which Three.js r0.160 no longer supports natively. Converting those models to standard PBR metallic-roughness (`gltf-transform metalrough`) fixes dull or flat materials.
- **How to fix:** Clean the `.glb` source files directly in Blender or via `gltf-transform` (remove `pCube*`/`pPlane*` nodes and convert `KHR_materials_pbrSpecularGlossiness` to metallic-roughness) rather than relying solely on runtime name filtering.

### B. Dark Startup / Delayed World Visibility
- **What happens:** `src/world.js` initializes in `night` mode (`let mode = 'night'`) with dark fog (`FogExp2(0x0c121b, 0.0052)`), low ambient/hemisphere lighting (`0.28` / `0.65`), and `buildings.js` hides building slots (`holder.visible = false`) until their `.glb` files finish downloading.
- **Why it matters:** For the first few seconds after opening the game, the player sees a nearly pitch-black screen with only the UI HUD and faint road lines.
- **How to fix:**
  - Start in **`day` mode** (or dusk/golden hour) by default so the world is immediately legible, or add an atmospheric **loading overlay** that waits for `taxi.glb` + core building/tree templates before fading in.
  - Place subtle emissive window panels or warm light pools along the avenue so night mode remains readable even before/between streetlamps.

### C. First-Frame Camera Swoop
- **What happens:** In `main.js` (`setCamera()`), `camera.position` starts at `(0, 0, 0)` and smoothly `lerp`s toward `desired` (`localToWorld(0, CONFIG.cameraHeight, CONFIG.cameraDistance)`).
- **How to fix:** Snap `camera.position.copy(desired)` on the very first frame (or when switching back to `chase` mode) so the camera never starts inside `(0, 0, 0)` or clips through objects during startup.

---

## 2. Gameplay & Mechanics Improvements

### A. Real Vehicle, Pedestrian & Prop Collisions
- **Current state:** `openworld.js` (`resolveMovement`) only checks road boundaries (`isDrivable`) and the center median (`hitsCenterCurb`). The player's taxi passes straight through autorickshaws (`src/autorickshaw.js`), Jettas (`src/jetta.js`), pedestrians (`src/pedestrians.js`), and street props (`src/street.js`).
- **How to make it better:**
  - Add lightweight 2D AABB / circle-vs-OBB collision checks between the taxi and active traffic vehicles, causing speed loss, bounce/scrape feedback, screen shake, and a wanted-star penalty on heavy crashes.
  - Add horn reactions (`traffic.honk()` in `src/traffic.js`): nearby autorickshaws/pedestrians can swerve or step aside when you honk (`H`).

### B. Synchronized Traffic Signals & Smarter Traffic AI
- **Current state:**
  - There are **two separate traffic signal systems** that are out of sync: `src/traffic.js` (`createSignal`, 3 gantry lights with a constable) and `src/openworld.js` (`signalGroup`, 9 intersection posts with an `index * 5.5` offset).
  - Traffic vehicles (`autorickshaw.js`, `jetta.js`) **hide completely** (`u.group.visible = Math.abs(taxiLateral) <= 13`) whenever the player turns onto a side street or alley, and they do not obey red lights.
- **How to make it better:**
  - Unify the signal timing into one shared source of truth (`roadLayout.js`) so visual lights, constable animations, AI braking, and wanted-level checks all match.
  - Make same-direction and oncoming Jettas/autorickshaws decelerate and queue behind red lights.
  - Spawn dedicated cross-street traffic (e.g., 2–3 parked or slow-moving autos/cycles) on the wider cross streets so turning off the main avenue feels alive.

### C. Open-World Passengers & Heading-Aware Minimap
- **Current state:**
  - `src/passengers.js` only spawns pickup and drop-off points along the main avenue (`x = side * (roadHalfWidth + footpathWidth * 0.58)`).
  - `src/ui.js` (`drawMap`) draws a static vertical road strip and ignores `state.heading` and cross streets/alleys.
- **How to make it better:**
  - Allow passengers and destinations to spawn on **cross streets and alleyways** (e.g., College Street bookstalls, Park Street side lanes) to reward exploring the open-world grid.
  - Render cross streets and alleys on the `minimap` canvas in `src/ui.js`, and rotate the map (or the player arrow) using `state.heading` so navigation makes intuitive sense after turning 90°.
  - Add a subtle 3D directional arrow or distance indicator above the taxi/HUD when the destination is on a side street.

### D. Meaningful Wanted System & Shift Progression
- **Current state:** `src/traffic.js` increments `wanted` (0–3 stars) when running a red light or ignoring the constable, then silently resets it after `wantedEscapeSeconds` (`20` seconds).
- **How to make it better:**
  - Deduct a traffic fine (e.g., `₹50–₹150`) from `wallet` if caught, or spawn a chasing police Ambassador/jeep at 2–3 stars.
  - Add shift goals / fare streaks (e.g., "Complete 5 fares without a wanted star for a ₹200 bonus") and show a trip summary card.

---

## 3. Visuals, Audio & Immersion

### A. Sound Design (Beyond the Horn)
- **Current state:** Only the Web Audio horn (`createAudioHorn` in `src/traffic.js`) exists. There is no engine sound, braking/tyre screech, rain ambience, or fare meter chime.
- **How to make it better:**
  - Synthesize a subtle procedural **Ambassador engine idle/rev hum** tied to the `rpm` value already calculated in `main.js`.
  - Add a short mechanical **fare meter click/bell** on pickup/dropoff (`onEvent` in `main.js`) and soft **rain/city ambience** in night mode.

### B. Day/Night & Kolkata Atmosphere
- **Current state:** Night mode uses a single `SpotLight` + 2 moving `PointLight`s (`streetWarmLeft`/`Right` in `src/world.js`), while day mode is bright and clear.
- **How to make it better:**
  - Add a **Sunset / Golden Hour** mode alongside Day (`N`) and Night, with warm amber directional light and long shadows.
  - Add **overhead tram wires** above the existing tram rails (`rails`/`sleepers` in `src/world.js`) and occasional iconic **Kolkata tramcars** on the left track (`x = -6.85`).
  - Make `interior.js` dashboard gauges (speedometer needle / fare meter text) dynamically reflect live `state.speed` and active `trip.fare` when in `driver` or `passengerFront` camera modes.

---

## 4. Performance & Asset Optimization

### A. Reduce Hero & Traffic GLB Triangle Budgets
- **Current state:** Even after initial simplification, several `.glb` models are heavy for real-time browser WebGL:
  - `volk_jetta.glb`: ~168k triangles (instanced/cloned 5 times = ~840k tris just for Jettas!)
  - `taxi.glb`: ~122k triangles
  - `tree4.glb`: ~107k triangles
  - `indian_style_building.glb`: ~12.7 MB (mostly oversized textures)
- **How to make it better:**
  - Target **15k–30k triangles** for the hero taxi, **5k–15k triangles** for traffic cars (`volk_jetta.glb`) and trees (`tree4.glb`).
  - Resize embedded GLB textures to max **1024×1024** (hero) and **512×512** (buildings/props/traffic) and compress with **WebP** or **KTX2/Basis** (`KHR_texture_basisu` + Three.js `KTX2Loader`) to cut download size and GPU VRAM by 60–80%.

### B. Share Materials & Use `InstancedMesh` Where Possible
- **Current state:**
  - `src/buildings.js` (`createBuildingInstance`) clones every material (`orig.clone()`) for all 20 building slots, creating dozens of duplicate materials and forcing Three.js to compile/bind extra uniforms.
  - `src/trees.js` and `src/openworld.js` clone full GLB scene graphs per slot.
- **How to make it better:**
  - Share base materials across building/tree templates and use `onBeforeCompile` or `InstancedMesh` with per-instance color (`setColorAt`) instead of cloning materials for tinting.
  - Only run `emissiveIntensity` pulsing in `buildings.js` when in `night` mode and on materials that actually emit light.

### C. Rendering Pipeline & Startup Loading
- **Current state:** `main.js` always renders through `EffectComposer` (`RenderPass` → `UnrealBloomPass` → `ShaderPass` vignette → `OutputPass`), which adds full-screen render-target passes every frame.
- **How to make it better:**
  - Bypass `EffectComposer` completely on `low` (and optionally `medium`) quality presets by calling `renderer.render(scene, camera)` directly when `bloomPass.enabled` is `false`.
  - Add a **loading screen with progress** driven by `THREE.DefaultLoadingManager` / `gltfCache.js` so the player enters the street once the taxi and immediate surroundings are ready, avoiding frame hitches during the first 5 seconds of driving.

---

## 5. Code Architecture & Maintainability

### A. Remove Massive Commented-Out Legacy Blocks
- **Current state:**
  - `src/openworld.js` contains ~370 lines of commented-out legacy code at the top (lines 1–371).
  - `src/vehicles.js` contains ~1,860 lines of commented-out legacy code at the top (lines 1–1863).
- **Why it matters:** Dead commented blocks inflate file sizes, slow down searches, and caused a `ReferenceError` earlier when an edit landed inside the commented section.
- **How to make it better:** Delete the commented-out history (Git already preserves it!) so every file contains only active, readable code.

### B. Extract Shared Utilities
- **Current state:** `makeGlowTexture`, `makeRoadPoolTexture`, and GLB ground-plane stripping (`normalize*`) are duplicated across `src/vehicles.js`, `src/autorickshaw.js`, `src/jetta.js`, `src/buildings.js`, `src/trees.js`, `src/pedestrians.js`, and `src/openworld.js`.
- **How to make it better:** Create a small `src/modelUtils.js` module with shared `normalizeGLB(root, options)` and `makeGlowTexture()` / `makeRoadPoolTexture()` helpers so fixes (like stripping stray `pCube` / `pPlane` meshes) apply everywhere in one place.

### C. Local Development & Offline Resilience
- **Current state:** `index.html` imports Three.js from `https://cdn.jsdelivr.net/npm/three@0.160.0/...` and Google Fonts from `fonts.googleapis.com`.
- **How to make it better:** Vendor `three` into a local `vendor/` folder (or bundle with Vite) so the game works offline and starts faster without external CDN latency.

---

## 6. Suggested Priority Roadmap

| Priority | Task | Impact |
| :--- | :--- | :--- |
| **P0** | Clean `taxi.glb` (`pCube*`/`pPlane*` removal) + snap camera on frame 0 | Fixes camera clipping/blur & startup view |
| **P0** | Default to `day` mode (or add loading screen + brighter night lamps) | Eliminates dark/empty initial screen |
| **P1** | Delete legacy commented blocks in `vehicles.js` & `openworld.js` | Prevents edit bugs, cuts file size by >60% |
| **P1** | Add `volk_jetta.glb` / `tree4.glb` texture resizing + further decimation | Major FPS & load-time boost |
| **P1** | Bypass `EffectComposer` when bloom is disabled | Immediate GPU frame-time reduction |
| **P2** | Unify traffic signals + add vehicle-to-vehicle collisions | Core driving gameplay feel |
| **P2** | Add cross-street passenger spawns + heading-aware minimap | Makes the open-world grid genuinely useful |
| **P3** | Procedural engine/meter audio, tramcars, & dynamic dash gauges | High Kolkata immersion & polish |
