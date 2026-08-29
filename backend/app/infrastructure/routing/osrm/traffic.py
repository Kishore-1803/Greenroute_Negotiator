"""
infrastructure/routing/osrm/traffic.py

OSRMTrafficSimulator -- the concrete adapter implementing
domain.routing.interfaces.ConditionChangeSimulator, via OSRM's real segment-speed-file +
osrm-customize mechanism (Blueprint Section 2). Moved from Phase 1/2's
services/osrm_service.py -- same behavior (including the documented container-restart reload
mechanism and its known limitations), now behind the port.

Only the car OSRM dataset is ever modified (Blueprint: "Modify only the car instance's
segment speeds"; Phase 2 brief Part 8: "do not double-count traffic"). `apply_condition_change`
ignores its `mode` argument for anything other than "car" -- this simulator has exactly one
supported target, by design, not as an oversight.
"""

from __future__ import annotations

import asyncio
import csv
import logging
import subprocess
import time
from pathlib import Path

from app.domain.common.errors import RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.infrastructure.config.settings import Settings
from app.infrastructure.routing.osrm.client import OSRMRoutingProvider

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[4] / "data" / "osrm"
CAR_DATASET_DIR = DATA_DIR / "car"
SURGE_DIR = DATA_DIR / "surge"
SURGE_CSV_PATH = SURGE_DIR / "surge.csv"
DEMO_DATASET_NAME = "demo_region.osrm"


class OSRMTrafficSimulator:
    def __init__(self, settings: Settings, routing_provider: OSRMRoutingProvider):
        self._settings = settings
        self._routing = routing_provider

    def _write_segment_speed_file(self, node_sequence: tuple[int, ...], speed_kmh: float) -> int:
        SURGE_DIR.mkdir(parents=True, exist_ok=True)
        pairs = list(zip(node_sequence, node_sequence[1:]))
        speed_kmh_int = int(round(speed_kmh))  # OSRM's parser requires an integer km/h -- a
        # float like 8.0 crashes osrm-customize with a native exception, not a clean error
        # (discovered in Phase 1, fixed here, not re-broken by the move).
        with open(SURGE_CSV_PATH, "w", newline="") as f:
            writer = csv.writer(f)
            for from_node, to_node in pairs:
                writer.writerow([from_node, to_node, speed_kmh_int])
        return len(pairs)

    def _run_docker(self, args: list[str], timeout_s: float) -> subprocess.CompletedProcess:
        return subprocess.run(["docker", *args], capture_output=True, text=True, timeout=timeout_s)

    def _customize_with_surge(self) -> dict:
        win_dataset_dir = str(CAR_DATASET_DIR).replace("\\", "/")
        win_surge_dir = str(SURGE_DIR).replace("\\", "/")

        t0 = time.perf_counter()
        customize = self._run_docker(
            [
                "run", "--rm",
                "-v", f"{win_dataset_dir}:/data",
                "-v", f"{win_surge_dir}:/surge",
                "osrm/osrm-backend",
                "osrm-customize", f"/data/{DEMO_DATASET_NAME}",
                "--segment-speed-file", f"/surge/{SURGE_CSV_PATH.name}",
            ],
            timeout_s=self._settings.osrm_customize_timeout_s,
        )
        t1 = time.perf_counter()
        if customize.returncode != 0:
            raise RoutingUnavailableError(f"osrm-customize failed (exit {customize.returncode}): {customize.stderr[-1000:]}")

        container = self._settings.osrm_endpoints["car"].container_name
        restart = self._run_docker(["restart", container], timeout_s=self._settings.osrm_customize_timeout_s)
        t2 = time.perf_counter()
        if restart.returncode != 0:
            raise RoutingUnavailableError(f"container restart failed (exit {restart.returncode}): {restart.stderr[-1000:]}")

        return {
            "customize_seconds": round(t1 - t0, 3),
            "reload_seconds": round(t2 - t1, 3),
            "total_seconds": round(t2 - t0, 3),
        }

    async def _wait_for_ready(self, origin: tuple[float, float], destination: tuple[float, float]) -> float:
        start = time.perf_counter()
        last_error: Exception | None = None
        max_wait_s = self._settings.osrm_container_ready_timeout_s
        while time.perf_counter() - start < max_wait_s:
            try:
                await self._routing.route("car", origin, destination)
                return round(time.perf_counter() - start, 3)
            except RoutingUnavailableError as exc:
                last_error = exc
                await asyncio.sleep(0.5)
        raise RoutingUnavailableError(f"car instance did not become ready within {max_wait_s}s: {last_error}")

    async def apply_condition_change(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], surge_speed_kmh: float = 8.0
    ) -> tuple[RouteMetrics, dict]:
        """mode is accepted for interface symmetry but only "car" is ever actually surged --
        see module docstring."""
        baseline = await self._routing.route("car", origin, destination, with_nodes=True)
        if baseline.node_sequence is None:
            raise RoutingUnavailableError("baseline route had no node annotations -- cannot build a segment-speed-file")

        pair_count = self._write_segment_speed_file(baseline.node_sequence, surge_speed_kmh)
        timings = self._customize_with_surge()
        ready_wait_s = await self._wait_for_ready(origin, destination)

        post_change = await self._routing.route("car", origin, destination)

        timings["container_ready_wait_seconds"] = ready_wait_s
        timings["node_pairs_written"] = pair_count
        timings["surge_speed_kmh"] = surge_speed_kmh
        return post_change, timings
