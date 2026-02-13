"""Core discovery engine — ported from agent-console/discover.js to Python.

Scans the OpenClaw workspace for pipelines, agents, skills, cron jobs, and
custom modules. Results are cached and refreshed periodically.
"""

import json
import os
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from app.config import settings
from app.discovery.patterns import (
    PIPELINE_PATTERNS,
    AGENT_PATTERNS,
    SKILL_CATEGORIES,
    MODULE_TYPES,
)

_cached_result: Dict = {}
_last_discovery = 0.0

WORKSPACE = settings.openclaw_dir / "workspace"


def get_cached_result() -> Dict:
    """Return cached discovery result or empty dict."""
    return _cached_result


def run_discovery() -> Dict:
    """Run full discovery scan. Returns a dict matching DiscoveryResult schema."""
    global _cached_result, _last_discovery

    result = {
        "detected_at": datetime.now().isoformat(),
        "workspace": str(WORKSPACE),
        "pipelines": discover_pipelines(),
        "agents": discover_agents(),
        "skills": discover_skills(),
        "custom_modules": discover_custom_modules(),
        "metrics": {},
    }

    result["metrics"] = {
        "pipelines": len(result["pipelines"]),
        "agents": len(result["agents"]),
        "skills": len(result["skills"]),
        "modules": len(result["custom_modules"]),
    }

    _cached_result = result
    _last_discovery = time.time()
    return result


def needs_refresh() -> bool:
    return time.time() - _last_discovery > settings.discovery_interval_seconds


# ---------------------------------------------------------------------------
# Pipeline Discovery
# ---------------------------------------------------------------------------

def discover_pipelines() -> List[Dict]:
    pipelines = []
    seen_ids = set()

    if not WORKSPACE.exists():
        return pipelines

    try:
        for entry in WORKSPACE.iterdir():
            if not entry.is_dir():
                continue
            name_lower = entry.name.lower()

            for key, config in PIPELINE_PATTERNS.items():
                if key in seen_ids:
                    continue
                if any(p in name_lower for p in config["patterns"]):
                    stages = _detect_stages(entry)
                    pipelines.append({
                        "id": key,
                        "name": config["name"],
                        "icon": config["icon"],
                        "color": config["color"],
                        "directory": entry.name,
                        "path": str(entry),
                        "stages": stages if stages else config["stages"],
                        "metrics": config["metrics"],
                        "status": _detect_pipeline_status(entry),
                        "source": "filesystem",
                    })
                    seen_ids.add(key)
                    break
    except Exception:
        pass

    # Also check HEARTBEAT.md
    _check_heartbeat(pipelines, seen_ids)

    return pipelines


def _detect_stages(pipeline_path: Path) -> List[str]:
    stages = []
    skip = {"scripts", "src", "output", "logs", "config", "node_modules", ".git", "__pycache__", "venv"}
    try:
        for entry in pipeline_path.iterdir():
            if entry.is_dir() and entry.name.lower() not in skip:
                stages.append(entry.name)
    except Exception:
        pass
    return stages


def _detect_pipeline_status(pipeline_path: Path) -> str:
    try:
        one_hour_ago = time.time() - 3600
        for sub in ["logs", "output"]:
            d = pipeline_path / sub
            if d.exists():
                for f in d.iterdir():
                    if f.stat().st_mtime > one_hour_ago:
                        return "active"
        # Check root-level files
        for f in pipeline_path.iterdir():
            if f.is_file() and f.stat().st_mtime > one_hour_ago:
                return "active"
        return "idle"
    except Exception:
        return "unknown"


def _check_heartbeat(pipelines: List[Dict], seen_ids: set):
    hb = WORKSPACE / "HEARTBEAT.md"
    if not hb.exists():
        return
    try:
        content = hb.read_text()
        for line in content.split("\n"):
            import re
            m = re.match(r"^#+\s+(HYDROFLOW|YouTube|Pipeline|Orchestrator|Content|Market)", line, re.IGNORECASE)
            if m:
                name = line.lstrip("#").strip()
                pid = name.lower().replace(" ", "-")
                if pid not in seen_ids:
                    pipelines.append({
                        "id": pid,
                        "name": name,
                        "icon": "clipboard",
                        "color": "#6366f1",
                        "directory": "",
                        "path": "",
                        "stages": [],
                        "metrics": [],
                        "status": "active",
                        "source": "HEARTBEAT.md",
                    })
                    seen_ids.add(pid)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Agent Discovery
# ---------------------------------------------------------------------------

def discover_agents() -> List[Dict]:
    agents = []
    seen = set()

    agent_paths = [
        WORKSPACE / "agents",
        WORKSPACE / "agent-swarm",
        WORKSPACE / "swarm-framework",
        WORKSPACE / "hydroflow" / "config",
    ]

    for ap in agent_paths:
        if not ap.exists():
            continue
        try:
            for f in ap.iterdir():
                if not f.is_file():
                    continue
                if f.suffix == ".json" or "agent" in f.name.lower():
                    try:
                        data = json.loads(f.read_text())
                        if isinstance(data, dict) and any(k in data for k in ("agents", "agent", "name")):
                            agent_name = data.get("name", f.stem)
                            if agent_name in seen:
                                continue
                            seen.add(agent_name)
                            atype = _detect_agent_type(f.name, data)
                            pat = AGENT_PATTERNS.get(atype, AGENT_PATTERNS["general"])
                            agents.append({
                                "name": agent_name,
                                "type": atype,
                                "icon": pat["icon"],
                                "color": pat["color"],
                                "config_path": str(f),
                                "capabilities": data.get("capabilities", []),
                                "source": "config",
                                "status": "configured",
                            })
                    except (json.JSONDecodeError, Exception):
                        pass
        except Exception:
            pass

    # Discover from active sessions
    _discover_agents_from_sessions(agents, seen)

    return agents


def _detect_agent_type(filename: str, config: dict) -> str:
    name = (config.get("name", "") or filename).lower()
    for atype, pat in AGENT_PATTERNS.items():
        if any(skill in name for skill in pat["skills"]):
            return atype
    # Fallback patterns
    if any(w in name for w in ("code", "dev")):
        return "coder"
    if any(w in name for w in ("research", "investigate")):
        return "researcher"
    if any(w in name for w in ("write", "content")):
        return "writer"
    if any(w in name for w in ("ops", "deploy")):
        return "devops"
    if any(w in name for w in ("admin", "manage")):
        return "admin"
    if any(w in name for w in ("sales", "outreach")):
        return "sales"
    return "general"


def _discover_agents_from_sessions(agents: List[Dict], seen: set):
    try:
        result = subprocess.run(
            ["openclaw", "sessions", "list", "--json"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            sessions = json.loads(result.stdout)
            for s in sessions:
                aid = s.get("agentId", "")
                if aid and aid not in seen:
                    seen.add(aid)
                    agents.append({
                        "name": aid,
                        "type": "general",
                        "icon": "bot",
                        "color": "#6366f1",
                        "config_path": "",
                        "capabilities": [],
                        "source": "active_session",
                        "status": s.get("status", "unknown"),
                    })
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Skill Discovery
# ---------------------------------------------------------------------------

def discover_skills() -> List[Dict]:
    skills_dir = WORKSPACE / "skills"
    skills = []
    if not skills_dir.exists():
        return skills

    try:
        for entry in sorted(skills_dir.iterdir()):
            if entry.is_dir():
                readme = entry / "README.md"
                desc = ""
                if readme.exists():
                    try:
                        text = readme.read_text()[:500]
                        # First non-empty, non-heading line
                        for ln in text.split("\n"):
                            ln = ln.strip()
                            if ln and not ln.startswith("#"):
                                desc = ln[:200]
                                break
                    except Exception:
                        pass

                skills.append({
                    "name": entry.name,
                    "path": str(entry),
                    "category": _categorize_skill(entry.name),
                    "has_readme": readme.exists(),
                    "description": desc,
                })
    except Exception:
        pass

    return skills


def _categorize_skill(name: str) -> str:
    name_lower = name.lower()
    for cat, keywords in SKILL_CATEGORIES.items():
        if any(kw in name_lower for kw in keywords):
            return cat
    return "general"


# ---------------------------------------------------------------------------
# Custom Module Discovery
# ---------------------------------------------------------------------------

def discover_custom_modules() -> List[Dict]:
    modules = []
    known = [
        "swarmstarter", "solpaw", "clawnch", "hydroflow",
        "deepwork-tracker", "triple-memory",
    ]
    for mod in known:
        mod_path = WORKSPACE / mod
        if mod_path.exists():
            mtype = "custom"
            for keyword, t in MODULE_TYPES.items():
                if keyword in mod:
                    mtype = t
                    break
            modules.append({
                "name": mod,
                "path": str(mod_path),
                "type": mtype,
                "status": "installed",
            })
    return modules
