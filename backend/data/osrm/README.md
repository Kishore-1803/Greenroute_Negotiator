# OSRM Phase 1 setup — exact commands used

Mirrored into `CLAUDE.md`. Run from the repo root. Requires Docker Desktop running; uses the
`osrm/osrm-backend:latest` image (no native OSRM binaries needed on this machine).

All `docker` invocations below assume Git Bash with `export MSYS_NO_PATHCONV=1` set first
(otherwise MSYS mangles the `/data`, `/profiles` container paths). `WINPWD` = repo root as a
forward-slash Windows path, e.g. via `WINPWD=$(pwd -W)`.

## 1. Fetch the extract

Bbox = Gandhipuram / Cross Cut Road area, Coimbatore, TN — a placeholder feasibility area
only (~2.2km × 2.2km), not the final demo route. `minlon,minlat,maxlon,maxlat`:

```
76.957,10.991,76.977,11.011
```

```bash
curl -s -o backend/osrm/data/demo_region.osm \
  "https://lz4.overpass-api.de/api/map?bbox=76.957,10.991,76.977,11.011"
# NOTE: the main overpass-api.de endpoint returned 504 (server busy) on first try; the
# lz4.overpass-api.de mirror succeeded. Retry against a mirror if the primary times out.
```

Result: 2,512,409 bytes, 9,513 nodes, 1,681 ways.

## 2. Get stock profiles out of the image, derive two_wheeler.lua

```bash
docker run --rm -v "${WINPWD}/backend/osrm/profiles:/out" --entrypoint sh osrm/osrm-backend \
  -c "cp -r /opt/car.lua /opt/bicycle.lua /opt/lib /out/"
```

`two_wheeler.lua` = manual copy of `car.lua` with the `speeds.highway` table multiplied by
0.85 (documented in the file's own header as an untuned placeholder — see
`backend/osrm/profiles/two_wheeler.lua`). Access rules unchanged from car.

## 3. Extract + partition + customize, per mode, in isolated directories

Each mode gets its own copy of `demo_region.osm` inside its own dataset directory
(`backend/osrm/car/`, `.../two_wheeler/`, `.../cycle/`) so the car dataset can later be
re-customized with a traffic surge without touching the other two.

```bash
for MODE_PROFILE in "car:car" "two_wheeler:two_wheeler" "cycle:bicycle"; do
  MODE="${MODE_PROFILE%%:*}"; PROFILE="${MODE_PROFILE##*:}"
  cp backend/osrm/data/demo_region.osm "backend/osrm/${MODE}/demo_region.osm"
  docker run --rm -v "${WINPWD}/backend/osrm/${MODE}:/data" -v "${WINPWD}/backend/osrm/profiles:/profiles" \
    osrm/osrm-backend osrm-extract -p "/profiles/${PROFILE}.lua" /data/demo_region.osm
  docker run --rm -v "${WINPWD}/backend/osrm/${MODE}:/data" \
    osrm/osrm-backend osrm-partition /data/demo_region.osrm
  docker run --rm -v "${WINPWD}/backend/osrm/${MODE}:/data" \
    osrm/osrm-backend osrm-customize /data/demo_region.osrm
done
```

MLD algorithm throughout (`osrm-partition` + `osrm-customize`), per Blueprint Section 2 —
not CH.

## 4. Launch the 3 routed instances

```bash
docker run -d --name greenroute-osrm-car -p 5000:5000 \
  -v "${WINPWD}/backend/osrm/car:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/demo_region.osrm
docker run -d --name greenroute-osrm-two-wheeler -p 5001:5000 \
  -v "${WINPWD}/backend/osrm/two_wheeler:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/demo_region.osrm
docker run -d --name greenroute-osrm-cycle -p 5002:5000 \
  -v "${WINPWD}/backend/osrm/cycle:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/demo_region.osrm
```

| Mode | Container | Host port | `/route/v1/{profile}` |
|---|---|---|---|
| car | `greenroute-osrm-car` | 5000 | `driving` |
| two_wheeler | `greenroute-osrm-two-wheeler` | 5001 | `driving` |
| cycling | `greenroute-osrm-cycle` | 5002 | `cycling` |

## 5. Traffic-simulation experiment (car instance only)

Handled by `backend/services/osrm_service.py::simulate_traffic_surge()`:
baseline `annotations=nodes` query → consecutive node-pairs → `surge.csv`
(`from_node,to_node,speed_kmh` — **integer** km/h, OSRM's CSV parser rejects a float like
`8.0` with a segfault-adjacent crash, not a clean error) → re-run `osrm-customize` with
`--segment-speed-file` on the car dataset only → `docker restart greenroute-osrm-car` →
poll until it answers again → re-query the same OD pair.

Equivalent manual commands:

```bash
docker run --rm -v "${WINPWD}/backend/osrm/car:/data" -v "${WINPWD}/backend/osrm/surge:/surge" \
  osrm/osrm-backend osrm-customize /data/demo_region.osrm --segment-speed-file /surge/surge.csv
docker restart greenroute-osrm-car
```

**Reload mechanism used**: a full `docker restart` of the car container, not a live
`osrm-datastore` swap into a running process. The Blueprint describes the datastore-swap as
the ideal; a container restart is what was actually built and measured here (see CLAUDE.md
for the real timings — restart + become-ready was still well under the 3s budget in every
run, so this was not a blocking limitation in practice, but it is a different mechanism from
what Section 2 describes and should be called out honestly if asked).

## 6. Reset back to a clean baseline (undo the surge)

Re-run step 3's extract/partition/customize for `car` only (using the untouched
`backend/osrm/data/demo_region.osm`, not a surged copy), then `docker restart greenroute-osrm-car`.
