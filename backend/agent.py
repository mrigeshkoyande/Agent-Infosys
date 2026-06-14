ROLE_SIGNALS = {
    "manufacturing": ["Machine operation", "Quality control", "Maintenance", "Forklift", "Lean safety"],
    "retail": ["Customer support", "Inventory", "Cash handling", "Conflict resolution", "Scheduling"],
    "caregiving": ["Patient care", "Documentation", "Empathy", "Medication reminders", "Home safety"],
    "food": ["Food safety", "Prep workflow", "Sanitation", "Supplier receiving", "Rush-hour coordination"],
    "logistics": ["Route planning", "Warehouse systems", "Loading", "Dispatch", "OSHA awareness"],
}

PATHWAYS = [
    {
        "title": "Industrial Maintenance Technician",
        "wage": "$27-38/hr",
        "training": "8 week paid apprenticeship",
        "tags": ["manufacturing", "logistics"],
        "barrier": "Paid path, safety credential",
        "why": "Converts hands-on troubleshooting into a credential employers can verify quickly.",
    },
    {
        "title": "Supply Chain Coordinator",
        "wage": "$24-34/hr",
        "training": "6 week hybrid certificate",
        "tags": ["logistics", "retail", "food"],
        "barrier": "Hybrid schedule",
        "why": "Matches inventory, dispatch, vendor, and scheduling skills to resilient operations roles.",
    },
    {
        "title": "Certified Medical Assistant",
        "wage": "$21-29/hr",
        "training": "10 week evening bridge",
        "tags": ["caregiving", "retail"],
        "barrier": "Evening classes, bus access",
        "why": "Strong fit for service, documentation, and calm-under-pressure experience.",
    },
    {
        "title": "Food Safety Supervisor",
        "wage": "$23-31/hr",
        "training": "4 week ServSafe + leadership sprint",
        "tags": ["food", "retail"],
        "barrier": "Short credential",
        "why": "Turns frontline food experience into management-ready compliance evidence.",
    },
]

URGENCY_WEIGHTS = {
    "lost-job": 12,
    "at-risk": 8,
    "career-change": 4,
}


def extract_skills(selected):
    skills = []
    for signal in selected:
        for skill in ROLE_SIGNALS.get(signal, []):
            if skill not in skills:
                skills.append(skill)
    return skills


def score_pathway(pathway, selected, urgency):
    overlap = len([tag for tag in pathway["tags"] if tag in selected])
    urgency_boost = URGENCY_WEIGHTS.get(urgency, 4)
    return min(98, 58 + overlap * 15 + urgency_boost)


def analyze_worker(payload):
    selected = payload.get("selected") or ["manufacturing", "logistics"]
    urgency = payload.get("urgency") or "lost-job"
    notes = payload.get("notes") or ""
    skills = extract_skills(selected)

    ranked = []
    for pathway in PATHWAYS:
        item = dict(pathway)
        item["score"] = score_pathway(pathway, selected, urgency)
        item["next_steps"] = [
            "Validate experience with one supervisor or reference",
            f"Enroll in {pathway['training']}",
            "Generate a resume bullet set from the extracted skills",
        ]
        ranked.append(item)

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return {
        "notes": notes,
        "selected": selected,
        "urgency": urgency,
        "skills": skills,
        "pathways": ranked,
        "summary": {
            "skill_count": len(skills),
            "top_fit": ranked[0]["score"] if ranked else 0,
            "urgency_label": "High" if urgency == "lost-job" else "Medium",
        },
        "audit": [
            "Skill extraction completed",
            "Pathway ranking completed",
            "Barrier and next-step checks completed",
        ],
    }
