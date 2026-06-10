"""
Wire Basnet agents into n8n neural network.
1. Adds webhook triggers to all 7 existing workflows
2. Creates Basnet Orchestrator workflow (multi-agent fan-out)
Run: python3 scripts/wire_n8n.py
"""

import sqlite3
import json
import uuid
import os
from pathlib import Path

DB_PATH = os.path.expanduser("~/.n8n/database.sqlite")
SECRET  = "aa3236372cac2fe41bf7749e21669fdd74e837008742519e2b4570ef98c43958"
LOCAL   = "http://localhost:3099"

# Webhook path for each existing workflow
WORKFLOW_WEBHOOKS = {
    "The Heartbeat":           "basnet-heartbeat",
    "Basnet Morning":          "basnet-morning",
    "Basnet weekly":           "basnet-weekly",
    "Spark Accountant Emails": "basnet-spark-emails",
    "Scout Daily":             "basnet-scout",
    "Lift Daily":              "basnet-lift",
    "Basnet Learn":            "basnet-learn",
}

def add_webhook(conn, workflow_name: str, webhook_path: str):
    row = conn.execute(
        "SELECT id, nodes, connections FROM workflow_entity WHERE name=?",
        (workflow_name,)
    ).fetchone()

    if not row:
        print(f"  ❌ Not found: {workflow_name}")
        return

    wf_id, nodes_json, connections_json = row
    nodes       = json.loads(nodes_json or "[]")
    connections = json.loads(connections_json or "{}")

    if any(n.get("type") == "n8n-nodes-base.webhook" for n in nodes):
        print(f"  ✅ Already has webhook: {workflow_name}")
        return

    http_node = next((n for n in nodes if n.get("type") == "n8n-nodes-base.httpRequest"), None)
    if not http_node:
        print(f"  ⚠️  No HTTP node in: {workflow_name}")
        return

    wh_id   = str(uuid.uuid4())
    wh_node = {
        "parameters": {
            "httpMethod": "POST",
            "path":       webhook_path,
            "responseMode": "lastNode",
            "options": {}
        },
        "type":        "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position":    [-220, 0],
        "id":          wh_id,
        "name":        "Webhook",
        "webhookId":   wh_id,
    }
    nodes.append(wh_node)
    connections["Webhook"] = {
        "main": [[{"node": http_node["name"], "type": "main", "index": 0}]]
    }

    conn.execute(
        "UPDATE workflow_entity SET nodes=?, connections=?, "
        "updatedAt=STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') WHERE id=?",
        (json.dumps(nodes), json.dumps(connections), wf_id)
    )
    print(f"  ✅ Added /webhook/{webhook_path} → {workflow_name}")


def create_orchestrator(conn):
    existing = conn.execute(
        "SELECT id FROM workflow_entity WHERE name='Basnet Orchestrator'"
    ).fetchone()
    if existing:
        print("  ✅ Orchestrator already exists")
        return

    # Node IDs
    wh_id        = str(uuid.uuid4())
    code_id      = str(uuid.uuid4())
    personal_id  = str(uuid.uuid4())
    technical_id = str(uuid.uuid4())
    health_id    = str(uuid.uuid4())
    intel_id     = str(uuid.uuid4())
    marketing_id = str(uuid.uuid4())
    merge_id     = str(uuid.uuid4())
    respond_id   = str(uuid.uuid4())

    auth_header = {"name": "x-agent-secret", "value": SECRET}

    nodes = [
        # 1. Webhook trigger
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "basnet-ask",
                "responseMode": "responseNode",
                "options": {}
            },
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [-400, 0],
            "id": wh_id,
            "name": "Webhook",
            "webhookId": wh_id,
        },

        # 2. Code node — classify question, build route
        {
            "parameters": {
                "jsCode": """
const question = $input.first().json.body?.question ?? '';
const q = question.toLowerCase();

const routes = {
  technical: ['error','bug','build','deploy','code','payg','stripe','supabase','sentry','status'],
  health:    ['churn','mrr','users','paid','revenue','conversion','retention'],
  intel:     ['competitor','xero','myob','market','pricing','ato update','news'],
  marketing: ['tiktok','blog','content','hook','linkedin','instagram','post'],
  personal:  ['visa','pr','job','jobs','darwin','weather','salary','university','how to'],
};

let route = 'ask';
for (const [r, keywords] of Object.entries(routes)) {
  if (keywords.some(k => q.includes(k))) { route = r; break; }
}

// Multi-agent: "how is everything" or "full report" → fan out to all
const isMulti = ['how is everything','full report','status report','how are we doing']
  .some(k => q.includes(k));

return [{ question, route, isMulti }];
"""
            },
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [-200, 0],
            "id": code_id,
            "name": "Classify",
        },

        # 3-7. Agent HTTP Request nodes (parallel fan-out)
        {
            "parameters": {
                "method": "POST",
                "url": f"{LOCAL}/ask",
                "sendHeaders": True,
                "headerParameters": {"parameters": [auth_header]},
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({question: $('Classify').first().json.question}) }}",
                "options": {"timeout": 20000}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [50, -200],
            "id": personal_id,
            "name": "Personal Agent",
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{LOCAL}/technical",
                "sendHeaders": True,
                "headerParameters": {"parameters": [auth_header]},
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({question: $('Classify').first().json.question}) }}",
                "options": {"timeout": 25000}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [50, -100],
            "id": technical_id,
            "name": "Technical Agent",
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{LOCAL}/health-check",
                "sendHeaders": True,
                "headerParameters": {"parameters": [auth_header]},
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({question: $('Classify').first().json.question}) }}",
                "options": {"timeout": 20000}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [50, 0],
            "id": health_id,
            "name": "Health Agent",
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{LOCAL}/intel",
                "sendHeaders": True,
                "headerParameters": {"parameters": [auth_header]},
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({question: $('Classify').first().json.question}) }}",
                "options": {"timeout": 25000}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [50, 100],
            "id": intel_id,
            "name": "Intel Agent",
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{LOCAL}/marketing",
                "sendHeaders": True,
                "headerParameters": {"parameters": [auth_header]},
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({question: $('Classify').first().json.question}) }}",
                "options": {"timeout": 20000}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [50, 200],
            "id": marketing_id,
            "name": "Marketing Agent",
        },

        # 8. Merge — wait for all agents
        {
            "parameters": {
                "mode": "passThrough",
                "output": "all",
            },
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [300, 0],
            "id": merge_id,
            "name": "Merge Results",
        },

        # 9. Respond to Webhook
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify({success: true, answer: $input.all().map(i => i.json.answer).filter(Boolean).join(' | ')}) }}",
                "options": {}
            },
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [500, 0],
            "id": respond_id,
            "name": "Respond",
        },
    ]

    connections = {
        "Webhook":  {"main": [[{"node": "Classify",         "type": "main", "index": 0}]]},
        "Classify": {"main": [[
            {"node": "Personal Agent",  "type": "main", "index": 0},
            {"node": "Technical Agent", "type": "main", "index": 0},
            {"node": "Health Agent",    "type": "main", "index": 0},
            {"node": "Intel Agent",     "type": "main", "index": 0},
            {"node": "Marketing Agent", "type": "main", "index": 0},
        ]]},
        "Personal Agent":  {"main": [[{"node": "Merge Results", "type": "main", "index": 0}]]},
        "Technical Agent": {"main": [[{"node": "Merge Results", "type": "main", "index": 1}]]},
        "Health Agent":    {"main": [[{"node": "Merge Results", "type": "main", "index": 2}]]},
        "Intel Agent":     {"main": [[{"node": "Merge Results", "type": "main", "index": 3}]]},
        "Marketing Agent": {"main": [[{"node": "Merge Results", "type": "main", "index": 4}]]},
        "Merge Results":   {"main": [[{"node": "Respond",       "type": "main", "index": 0}]]},
    }

    wf_id = str(uuid.uuid4())[:8] + str(uuid.uuid4())[:8]
    conn.execute(
        """INSERT INTO workflow_entity
           (id, name, active, nodes, connections, settings, versionId, triggerCount, meta, versionCounter)
           VALUES (?, ?, 0, ?, ?, ?, ?, 0, ?, 1)""",
        (
            wf_id,
            "Basnet Orchestrator",
            json.dumps(nodes),
            json.dumps(connections),
            json.dumps({"executionOrder": "v1"}),
            str(uuid.uuid4()),
            json.dumps({"templateCredsSetupCompleted": True}),
        )
    )
    print(f"  ✅ Created Basnet Orchestrator (id: {wf_id})")
    print(f"     Webhook: POST http://localhost:5678/webhook/basnet-ask")
    print(f"     Fan-out: Personal + Technical + Health + Intel + Marketing in parallel")


# ── Run ────────────────────────────────────────────────────────────────

print("\n🔌 Wiring Basnet agents into n8n...\n")
conn = sqlite3.connect(DB_PATH)

print("Adding webhook triggers to existing workflows:")
for name, path in WORKFLOW_WEBHOOKS.items():
    add_webhook(conn, name, path)

print("\nCreating Basnet Orchestrator:")
create_orchestrator(conn)

conn.commit()
conn.close()

print("\n✅ Done. Restart n8n for webhooks to activate:")
print("   pkill -f n8n && cd ~ && n8n start &")
print("\nWebhook endpoints available:")
for name, path in WORKFLOW_WEBHOOKS.items():
    print(f"  POST http://localhost:5678/webhook/{path}")
print(f"  POST http://localhost:5678/webhook/basnet-ask  (orchestrator)")
