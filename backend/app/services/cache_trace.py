"""Streaming reader for the cache-trace.jsonl file.

The file can be multi-GB so we never load it fully into memory.
We maintain a file-position bookmark and rolling aggregates.
"""

import json
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from app.config import settings

_trace_file = settings.openclaw_dir / "logs" / "cache-trace.jsonl"

# Rolling aggregates
_aggregates: Dict = {}
_last_compute = 0.0
_CACHE_TTL = 60  # seconds


def _cost_for_model(model_id: str, provider: str, inp: int, out: int) -> float:
    if "kimi" in model_id.lower() or "moonshot" in provider.lower():
        return 0.0
    if "claude" in model_id.lower():
        return (inp * 0.003 + out * 0.015) / 1000
    if "gpt-4" in model_id.lower():
        return (inp * 0.03 + out * 0.06) / 1000
    return 0.0


def analyze_token_usage(days: int = 1) -> Dict:
    """Analyze token usage — reads from end of file for efficiency."""
    global _aggregates, _last_compute

    cache_key = f"tokens_{days}"
    now = time.time()
    if cache_key in _aggregates and now - _last_compute < _CACHE_TTL:
        return _aggregates[cache_key]

    if not _trace_file.exists():
        return {}

    cutoff = datetime.now() - timedelta(days=days)
    model_stats: Dict = defaultdict(lambda: {
        "input": 0, "output": 0, "cache_read": 0, "cache_write": 0,
        "provider": "", "count": 0
    })

    try:
        # For large files, read last portion only (approx last 50MB for 1-day queries)
        file_size = _trace_file.stat().st_size
        read_from = 0
        if days <= 1 and file_size > 50_000_000:
            read_from = file_size - 50_000_000
        elif days <= 7 and file_size > 200_000_000:
            read_from = file_size - 200_000_000

        with open(_trace_file) as f:
            if read_from > 0:
                f.seek(read_from)
                f.readline()  # skip partial line

            for line in f:
                try:
                    entry = json.loads(line.strip())
                    ts_str = entry.get("ts", "")
                    if ts_str:
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                        if ts.replace(tzinfo=None) < cutoff:
                            continue

                    model_id = entry.get("modelId", "unknown")
                    provider = entry.get("provider", "unknown")
                    usage = entry.get("usage", {})

                    stats = model_stats[model_id]
                    stats["provider"] = provider
                    stats["input"] += usage.get("input", 0)
                    stats["output"] += usage.get("output", 0)
                    stats["cache_read"] += usage.get("cacheRead", 0)
                    stats["cache_write"] += usage.get("cacheWrite", 0)
                    stats["count"] += 1
                except Exception:
                    continue
    except Exception:
        pass

    result = {}
    for model_id, stats in model_stats.items():
        cost = _cost_for_model(model_id, stats["provider"], stats["input"], stats["output"])
        result[model_id] = {
            "model": model_id,
            "provider": stats["provider"],
            "input_tokens": stats["input"],
            "output_tokens": stats["output"],
            "cost": cost,
            "cache_hits": stats["cache_read"],
            "cache_writes": stats["cache_write"],
            "requests": stats["count"],
        }

    _aggregates[cache_key] = result
    _last_compute = now
    return result


def get_timeseries(metric: str = "tokens", hours: int = 24) -> List[Dict]:
    """Generate time-series data from cache trace."""
    if not _trace_file.exists():
        return []

    cutoff = datetime.now() - timedelta(hours=hours)
    buckets: Dict[str, Dict] = {}

    try:
        file_size = _trace_file.stat().st_size
        read_from = 0
        if hours <= 24 and file_size > 100_000_000:
            read_from = file_size - 100_000_000

        with open(_trace_file) as f:
            if read_from > 0:
                f.seek(read_from)
                f.readline()

            for line in f:
                try:
                    entry = json.loads(line.strip())
                    ts_str = entry.get("ts", "")
                    if not ts_str:
                        continue
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None)
                    if ts < cutoff:
                        continue

                    hour_key = ts.strftime("%Y-%m-%d %H:00")
                    if hour_key not in buckets:
                        buckets[hour_key] = {"tokens": 0, "cost": 0.0, "requests": 0}

                    usage = entry.get("usage", {})
                    inp = usage.get("input", 0)
                    out = usage.get("output", 0)
                    model_id = entry.get("modelId", "")
                    provider = entry.get("provider", "")

                    buckets[hour_key]["tokens"] += inp + out
                    buckets[hour_key]["cost"] += _cost_for_model(model_id, provider, inp, out)
                    buckets[hour_key]["requests"] += 1
                except Exception:
                    continue
    except Exception:
        pass

    data_points = []
    for ts_key in sorted(buckets.keys()):
        b = buckets[ts_key]
        if metric == "tokens":
            value = b["tokens"]
        elif metric == "cost":
            value = round(b["cost"], 4)
        else:
            value = b["requests"]
        data_points.append({
            "timestamp": ts_key,
            "value": value,
            "label": ts_key.split(" ")[1] if " " in ts_key else ts_key,
        })

    return data_points


def get_breakdown() -> Dict:
    """Get token usage breakdown by model and daily trend."""
    usage = analyze_token_usage(days=7)

    by_model = []
    for model_id, stats in usage.items():
        by_model.append({
            "model": model_id,
            "tokens": stats["input_tokens"] + stats["output_tokens"],
            "cost": round(stats["cost"], 2),
            "requests": stats["requests"],
        })

    by_model.sort(key=lambda x: x["tokens"], reverse=True)

    # Daily trend from last 7 days
    daily = {}
    if _trace_file.exists():
        cutoff = datetime.now() - timedelta(days=7)
        try:
            file_size = _trace_file.stat().st_size
            read_from = max(0, file_size - 500_000_000)
            with open(_trace_file) as f:
                if read_from > 0:
                    f.seek(read_from)
                    f.readline()
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        ts_str = entry.get("ts", "")
                        if not ts_str:
                            continue
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None)
                        if ts < cutoff:
                            continue
                        day_key = ts.strftime("%Y-%m-%d")
                        if day_key not in daily:
                            daily[day_key] = {"tokens": 0, "cost": 0.0}
                        usage_d = entry.get("usage", {})
                        inp = usage_d.get("input", 0)
                        out = usage_d.get("output", 0)
                        daily[day_key]["tokens"] += inp + out
                        daily[day_key]["cost"] += _cost_for_model(
                            entry.get("modelId", ""), entry.get("provider", ""), inp, out
                        )
                    except Exception:
                        continue
        except Exception:
            pass

    daily_trend = [
        {"date": k, "tokens": v["tokens"], "cost": round(v["cost"], 2)}
        for k, v in sorted(daily.items())
    ]

    return {"by_model": by_model, "daily_trend": daily_trend}
