"""GOLDEN-10 - autonomous drone + rover first-response network.

Simulation-first, hardware-agnostic. Every module is pure stdlib; the optional
adapters (``ultralytics`` detector, ``pyyaml``) are imported lazily and never
required to run the mission.
"""

__version__ = "0.1.0"
__all__ = [
    "config",
    "compliance",
    "console",
    "geo",
    "mission",
    "net",
    "perception",
    "planner",
    "scenario",
    "types",
    "vehicle",
]
