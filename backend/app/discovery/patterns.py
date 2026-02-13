"""Pipeline and agent detection patterns — ported from discover.js."""

PIPELINE_PATTERNS = {
    "hydroflow": {
        "name": "HYDROFLOW Lead Generation",
        "icon": "droplets",
        "color": "#3b82f6",
        "patterns": ["hydroflow", "hydro-flow", "lead-gen", "opportunity-mining"],
        "stages": ["Discovery", "Lead Factory", "Content Engine", "Business Manager"],
        "metrics": ["leads_generated", "outreach_sent", "opportunities_found"],
    },
    "youtube-empire": {
        "name": "YouTube Empire",
        "icon": "tv",
        "color": "#ef4444",
        "patterns": ["youtube-empire", "youtube_empire", "video-automation"],
        "stages": ["Script Generation", "Video Creation", "Upload", "Distribution"],
        "metrics": ["videos_created", "views", "subscribers"],
    },
    "content-factory": {
        "name": "Content Factory",
        "icon": "pen-tool",
        "color": "#8b5cf6",
        "patterns": ["content-factory", "content_factory", "blog-automation"],
        "stages": ["Research", "Writing", "Editing", "Publishing"],
        "metrics": ["articles_published", "words_written", "engagement"],
    },
    "market-intel": {
        "name": "Market Intelligence",
        "icon": "bar-chart-2",
        "color": "#10b981",
        "patterns": ["market-intel", "market_intelligence", "daily-intelligence"],
        "stages": ["Scan", "Analyze", "Report", "Alert"],
        "metrics": ["opportunities_found", "trends_tracked", "reports_generated"],
    },
    "swarm-orchestrator": {
        "name": "Swarm Orchestrator",
        "icon": "bug",
        "color": "#f59e0b",
        "patterns": ["swarm", "orchestrator", "agent-coordinator"],
        "stages": ["Spawn", "Monitor", "Collect", "Cleanup"],
        "metrics": ["agents_spawned", "tasks_completed", "success_rate"],
    },
}

AGENT_PATTERNS = {
    "coder": {"icon": "code", "color": "#3b82f6", "skills": ["coding", "development", "debugging"]},
    "researcher": {"icon": "search", "color": "#8b5cf6", "skills": ["research", "analysis", "investigation"]},
    "writer": {"icon": "pen-tool", "color": "#ec4899", "skills": ["writing", "editing", "content"]},
    "devops": {"icon": "settings", "color": "#f59e0b", "skills": ["infrastructure", "deployment", "monitoring"]},
    "admin": {"icon": "shield", "color": "#64748b", "skills": ["management", "coordination", "oversight"]},
    "sales": {"icon": "dollar-sign", "color": "#10b981", "skills": ["sales", "outreach", "closing"]},
    "general": {"icon": "bot", "color": "#6366f1", "skills": ["general", "assistant", "support"]},
}

SKILL_CATEGORIES = {
    "search": ["search", "browse", "web", "brave", "google", "fetch"],
    "development": ["code", "git", "github", "npm", "docker", "dev"],
    "communication": ["email", "slack", "discord", "sms", "telegram", "notify"],
    "data": ["database", "sql", "csv", "json", "data", "analytics"],
    "ai": ["openai", "claude", "llm", "gpt", "ai", "ml"],
    "crypto": ["crypto", "sol", "token", "wallet", "blockchain"],
    "automation": ["cron", "schedule", "automate", "workflow", "pipeline"],
    "security": ["security", "auth", "password", "encrypt", "guard"],
    "file": ["file", "pdf", "image", "video", "audio", "media"],
    "productivity": ["calendar", "todo", "note", "task", "track"],
}

MODULE_TYPES = {
    "token": "crypto",
    "sol": "crypto",
    "memory": "infrastructure",
    "track": "productivity",
    "starter": "product",
}
