# OSRM Phase 1 setup — exact commands used

Mirrored from original setup session. Run from the repo root. Requires Docker Desktop running; uses the
`osrm/osrm-backend:latest` image (no native OSRM binaries needed on this machine).

All `docker` invocations below assume Git Bash with `export MSYS_NO_PATHCONV=1` set first
(otherwise MSYS mangles the `/data`, `/profiles` container paths). `WINPWD` = repo root as a
forward-slash Windows path, e.g. via `WINPWD=$(pwd -W)`.

## 1. Fetch the extract

**Active demo corridor: T. Nagar → Gemini Flyover, Chennai, TN**

Bbox = `minlon,minlat,maxlon,maxlat`:

```
80.22,13.02,80.25,13.05
```

```bash
curl -s -o backend/data/osrm/raw/demo_region.osm \
  "https://lz4.overpass-api.de/api/map?bbox=80.22,13.02,80.25,13.05"
# NOTE: the main overpass-api.de endpoint may return 504 (server busy); use the lz4 mirror
# or retry against another Overpass mirror if it times out.
```

Result: ~18MB OSM file covering central Chennai (~3km × 3km grid).

## 2. Get stock profiles out of the image, derive two_wheeler.lua

```bash
docker run --rm -v "${WINPWD}/backend/data/osrm/profiles:/out" --entrypoint sh osrm/osrm-backend \
  -c "cp -r /opt/car.lua /opt/bicycle.lua /opt/lib /out/"
```

`two_wheeler.lua` = manual copy of `car.lua` with the `speeds.highway` table multiplied by
0.85 (documented in the file's own header as an untuned placeholder — see
`backend/data/osrm/profiles/two_wheeler.lua`). Access rules unchanged from car.

## 3. Extract + partition + customize, per mode, in isolated directories

Each mode gets its own copy of `demo_region.osm` inside its own dataset directory
(`backend/data/osrm/car/`, `.../two_wheeler/`, `.../cycle/`) so the car dataset can later be
re-customized with a traffic surge without touching the other two.

```bash
for MODE_PROFILE in "car:car" "two_wheeler:two_wheeler" "cycle:bicycle"; do
  MODE="${MODE_PROFILE%%:*}"; PROFILE="${MODE_PROFILE##*:}"
  cp backend/data/osrm/raw/demo_region.osm "backend/data/osrm/${MODE}/demo_region.osm"
  docker run --rm -v "${WINPWD}/backend/data/osrm/${MODE}:/data" -v "${WINPWD}/backend/data/osrm/profiles:/profiles" \
    osrm/osrm-backend osrm-extract -p "/profiles/${PROFILE}.lua" /data/demo_region.osm
  docker run --rm -v "${WINPWD}/backend/data/osrm/${MODE}:/data" \
    osrm/osrm-backend osrm-partition /data/demo_region.osrm
  docker run --rm -v "${WINPWD}/backend/data/osrm/${MODE}:/data" \
    osrm/osrm-backend osrm-customize /data/demo_region.osrm
done
```

MLD algorithm throughout (`osrm-partition` + `osrm-customize`), not CH.

## 4. Launch the 3 routed instances

**Option A — docker compose (recommended):**

```bash
docker compose -f docker-compose.osrm.yml up -d
```

**Option B — manual `docker run` (fallback if compose unavailable):**

```bash
docker run -d --name greenroute-osrm-car -p 5000:5000 \
  -v "${WINPWD}/backend/data/osrm/car:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/demo_region.osrm
docker run -d --name greenroute-osrm-two-wheeler -p 5001:5000 \
  -v "${WINPWD}/backend/data/osrm/two_wheeler:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/demo_region.osrm
docker run -d --name greenroute-osrm-cycle -p 5002:5000 \
  -v "${WINPWD}/backend/data/osrm/cycle:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/demo_region.osrm
```

| Mode | Container | Host port | `/route/v1/{profile}` |
|---|---|---|---|
| car | `greenroute-osrm-car` | 5000 | `driving` |
| two_wheeler | `greenroute-osrm-two-wheeler` | 5001 | `driving` |
| cycling | `greenroute-osrm-cycle` | 5002 | `cycling` |

## 5. Traffic-simulation experiment (car instance only)

Handled by `backend/app/infrastructure/routing/osrm/traffic.py::apply_condition_change()`:
baseline `annotations=nodes` query → consecutive node-pairs → `surge.csv`
(`from_node,to_node,speed_kmh` — **integer** km/h, OSRM's CSV parser rejects a float like
`8.0` with a segfault-adjacent crash, not a clean error) → re-run `osrm-customize` with
`--segment-speed-file` on the car dataset only → `docker restart greenroute-osrm-car` →
poll until it answers again → re-query the same OD pair.

Equivalent manual commands:

```bash
docker run --rm -v "${WINPWD}/backend/data/osrm/car:/data" -v "${WINPWD}/backend/data/osrm/surge:/surge" \
  osrm/osrm-backend osrm-customize /data/demo_region.osrm --segment-speed-file /surge/surge.csv
docker restart greenroute-osrm-car
```

**Reload mechanism used**: a full `docker restart` of the car container, not a live
`osrm-datastore` swap. A container restart was measured well under the 3s budget in every
run, so this is not a blocking limitation in practice, but it is a different mechanism from
the datastore-swap described in an idealized design.

## 6. Reset back to a clean baseline (undo the surge)

Re-run step 3's extract/partition/customize for `car` only (using the untouched
`backend/data/osrm/raw/demo_region.osm`, not a surged copy), then `docker restart greenroute-osrm-car`.
