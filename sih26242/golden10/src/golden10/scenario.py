"""Digital twin scenario: a flood-hit village at 02:14, monsoon season.

Modelled on Alluri Sitarama Raju district, Andhra Pradesh - the district where
Redwing's tribal medical-drone network flies 1,800+ sorties from Paderu GH to eight
facilities (reported Aug-Sep 2026). Terrain, flooding and victim states are
deterministic from a seed so runs are reproducible and testable.
"""

from __future__ import annotations

import random

from .config import Config
from .types import TerrainCell, Vec2, Victim


def _flood_band(x0, y0, x1, y1, factor, depth, kind):
    return TerrainCell(x0, y0, x1, y1, kind, factor, depth)


def build_terrain(cfg: Config) -> list[TerrainCell]:
    """Rectangular terrain patches. Later entries win, so water is added last."""
    cells = [
        _flood_band(-40, -40, 780, 620, 1.0, 0.0, "dry"),
        # landslide toe - broken ground, boulders, uprooted trees
        _flood_band(-40, 470, 320, 620, 0.30, 0.0, "debris"),
        # main channel: the village is cut off across it
        _flood_band(-40, 190, 820, 320, 0.44, 0.85, "water"),
        # backwater pond - deep, slow, drowned paddy
        _flood_band(210, 330, 540, 470, 0.40, 1.30, "water"),
    ]
    return cells


def terrain_at(cells: list[TerrainCell], p: Vec2) -> TerrainCell:
    for c in cells:
        if c.x0 <= p.x <= c.x1 and c.y0 <= p.y <= c.y1:
            return c
    return cells[0]


def build_victims(cfg: Config) -> list[Victim]:
    """Six people in trouble, at distances that make the scan order matter.

    Observable state only. Nothing here is a clinical diagnosis - see triage.py.
    """
    return [
        Victim(
            vid="V1",
            pos=Vec2(196.0, 246.0),
            label="stranded, waist-deep in channel",
            submersion=0.75,
            motion=0.30,
            thermal_delta_c=5.1,
            responsiveness=0.30,
            terrain="water",
        ),
        Victim(
            vid="V2",
            pos=Vec2(430.0, 402.0),
            label="immobile on paddy bund, submersion suspected",
            submersion=0.55,
            motion=0.04,
            thermal_delta_c=7.4,
            responsiveness=0.10,
            terrain="water",
        ),
        Victim(
            vid="V3",
            pos=Vec2(118.0, 546.0),
            label="under debris at landslide toe",
            submersion=0.10,
            motion=0.12,
            thermal_delta_c=6.6,
            responsiveness=0.18,
            terrain="debris",
        ),
        Victim(
            vid="V4",
            pos=Vec2(668.0, 268.0),
            label="submerged, low thermal signature",
            submersion=1.00,
            motion=0.20,
            thermal_delta_c=4.4,
            responsiveness=0.12,
            terrain="water",
        ),
        Victim(
            vid="V5",
            pos=Vec2(612.0, 512.0),
            label="walking, self-mobile",
            submersion=0.20,
            motion=0.72,
            thermal_delta_c=3.2,
            responsiveness=0.75,
            terrain="water",
        ),
        Victim(
            vid="V6",
            pos=Vec2(258.0, 574.0),
            label="trapped in collapsed dwelling",
            submersion=0.35,
            motion=0.08,
            thermal_delta_c=6.9,
            responsiveness=0.15,
            terrain="debris",
        ),
    ]


def environment(cfg: Config) -> dict:
    """Environmental conditions at the time of the mission."""
    rng = random.Random(cfg.scenario.seed)
    return {
        "local_time": "02:14",
        "is_night": cfg.scenario.is_night,
        "ambient_c": cfg.scenario.ambient_c,
        "rain_mmph": round(rng.uniform(18, 32), 1),
        "wind_mps": round(cfg.drone.wind_mps, 1),
        "visibility_m": round(rng.uniform(700, 1400), 0),
        "cellular_towers_down": cfg.net.towers_down,
        "deaths_confirmed_district": 87,
        "people_displaced_district": 705_000,
    }


class Scenario:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.name = cfg.scenario.name
        self.bounds = cfg.scenario.bounds_m
        self.terrain = build_terrain(cfg)
        self.victims = build_victims(cfg)
        self.env = environment(cfg)
        self.rng = random.Random(cfg.scenario.seed)

    @property
    def search_area_m2(self) -> float:
        x0, y0, x1, y1 = self.bounds
        return (x1 - x0) * (y1 - y0)

    def terrain_at(self, p: Vec2) -> TerrainCell:
        return terrain_at(self.terrain, p)

    def to_json(self) -> dict:
        return {
            "name": self.name,
            "bounds_m": list(self.bounds),
            "search_area_m2": round(self.search_area_m2, 1),
            "environment": self.env,
            "terrain": [
                {
                    "kind": c.kind,
                    "x0": c.x0,
                    "y0": c.y0,
                    "x1": c.x1,
                    "y1": c.y1,
                    "speed_factor": c.rover_speed_factor,
                    "flood_depth_m": c.flood_depth_m,
                }
                for c in self.terrain
            ],
            "victims": [
                {
                    "vid": v.vid,
                    "label": v.label,
                    "x": v.pos.x,
                    "y": v.pos.y,
                    "submersion": v.submersion,
                    "motion": v.motion,
                    "thermal_delta_c": v.thermal_delta_c,
                    "responsiveness": v.responsiveness,
                    "terrain": v.terrain,
                }
                for v in self.victims
            ],
        }
