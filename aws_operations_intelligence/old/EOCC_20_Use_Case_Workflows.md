# EOCC — 20 Use Case Working Flows

**Purpose:** Realistic start-to-result flow for each original use case.  
**Audience:** Tech lead review, PRD Section 11.12.  
**Stack:** frontend-ecs → backend-ecs → agents-ecs → Aurora / Cortex / Pinecone / connectors.

**Common path (all user-initiated flows):**
```text
User → ALB → frontend-ecs → backend-ecs (auth/RBAC) → agents-ecs (if AI) → Aurora/Cortex → backend → UI
```

**Common path (alert-driven flows):**
```text
AWS/Splunk alert → EventBridge → SQS → backend-ecs or agents-ecs → InvestigationPackage → UI + notification
```

---

## UC 1 — Enterprise Ownership Intelligence

| Item | Detail |
|---|---|
| **Phase** | 1 (demo-ready) |
| **Trigger** | Copilot: *"Who owns glue-job-cn3?"* OR click service in Command Center |
| **Agents** | Ownership only (no LLM for facts) |
| **Mode** | Read |

### Flow

1. **Start** — User submits question or clicks `service_catalog` row in Command Center.
2. **API** — `POST /api/copilot/query` or `GET /api/services/{code}/ownership`.
3. **Router** — Intent = `ownership_only` → single agent, no parallel fan-out.
4. **Ownership agent** — Aurora SQL:
   - `service_catalog` → `service_ownership` → `team`, `person` (primary/secondary)
   - `escalation_policy` → `escalation_step` (ordered chain)
5. **Optional** — If question includes runbook context, Knowledge agent runs after (sequential).
6. **Response** — Structured JSON with `source: aurora`, row IDs, no hallucinated names.
7. **UI result** — Ownership card: team, primary POC, manager, escalation steps, Teams link.

### Example result
```json
{
  "service": "glue-job-cn3",
  "team": "Data Platform",
  "primary_poc": "Jane Doe",
  "escalation": ["Jane Doe", "Team Lead", "Manager"],
  "sources": ["aurora:service_ownership:uuid"]
}
```

---

## UC 2 — Business Process Monitoring

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Scheduled rollup every 5 min OR user opens Business Process Dashboard |
| **Agents** | None (metrics query) + Dependency for impact rollup |
| **Mode** | Read |

### Flow

1. **Start** — EventBridge schedule `eocc-business-health-rollup` → SQS → backend-ecs worker.
2. **Connector** — For each `business_process` (e.g. Payments, Onboarding):
   - Resolve linked `application` → `service_catalog` → `aws_resource`
   - Fetch CloudWatch + Splunk health signals per resource (error rate, latency, job failures).
3. **Rollup logic** — Worst-child-wins: if any critical service unhealthy → process = degraded.
4. **Write** — `operational_risk_signal` (Phase 2) or Redis cache `business_health:{process_id}`.
5. **User view** — Dashboard loads `GET /api/business-processes/health`.
6. **UI result** — Process tiles: green / amber / red with drill-down to failing services.

### Example result
> **Payments** — Degraded (Sev2) — Payment API Lambda error rate 8.2% (threshold 5%). 3 downstream services affected.

---

## UC 3 — Enterprise Dependency Intelligence

| Item | Detail |
|---|---|
| **Phase** | 1 basic / 2 enhanced |
| **Trigger** | Copilot: *"If payment-db fails, what breaks?"* OR RDS alert auto-opens Impact Explorer |
| **Agents** | Dependency (SQL/graph only) |
| **Mode** | Read |

### Flow

1. **Start** — User question or alert payload contains `service_catalog_id` or ARN.
2. **API** — `POST /api/copilot/query` or `GET /api/services/{id}/dependencies?direction=downstream`.
3. **Router** — Intent = `dependency_only`.
4. **Dependency agent** — Aurora recursive CTE on `dependency` table:
   - Technical deps (API → DB → queue)
   - Join `business_process`, `application` for business labels
   - Phase 2: include `team_dependency` for cross-team edges
5. **Synthesis** — Optional one LLM call if user asked natural-language summary (complexity ≥ 2).
6. **UI result** — Impact Explorer: interactive graph + table (service, team, criticality, customer-facing flag).

### Example result
> Blast radius: **12 services**, **4 applications**, **Payments** business process at risk. Primary: Payment API, Order Service, Notification Worker.

---

## UC 4 — AI Incident Investigation

| Item | Detail |
|---|---|
| **Phase** | 1 (demo-ready) |
| **Trigger** | CloudWatch/Glue failure → EventBridge → SQS **OR** user clicks **Investigate** on alert |
| **Agents** | Ownership + Dependency + Evidence + Knowledge → Synthesis |
| **Mode** | Read |

### Flow

1. **Start** — SQS message: `{ "alert_id", "service_arn", "severity", "timestamp" }`.
2. **API** — backend-ecs validates → internal `POST` to agents-ecs `/investigate`.
3. **Router** — Intent = `full_investigation` → parallel fan-out (max 4 agents, 15s timeout).
4. **Parallel gather:**
   - **Ownership** → Aurora POC/team/escalation
   - **Dependency** → blast radius
   - **Evidence** → Splunk logs, CloudWatch metrics, open Jira tickets (summarized via GPT-4o)
   - **Knowledge** → Pinecone similar incidents + Confluence runbooks (cited chunks)
5. **Join** — Merge into `InvestigationPackage` JSON; record `gaps[]` if any agent times out.
6. **Synthesis** — Claude 3.5 Sonnet: business severity, summary, recommended actions (citations required).
7. **Persist** — `incident_timeline_event` rows, Redis cache, audit log in backend-ecs.
8. **UI result** — Investigation Workspace: timeline, severity, owners, deps, runbook links, recommendations.

### Example result
> **Sev2** — Glue job CN3 failed: `ConcurrentRunsExceededException`. Owner: Data Platform / Jane Doe. Similar: INC-2241. Recommend: clear stuck runs per runbook §3.2.

---

## UC 5 — Enterprise Knowledge Search

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Copilot search: *"How do we restart Glue job CN3?"* |
| **Agents** | Knowledge (+ Ownership if service name ambiguous) |
| **Mode** | Read |

### Flow

1. **Start** — User submits search query in Copilot.
2. **API** — `POST /api/copilot/query` intent = `knowledge_search`.
3. **Disambiguation** — If service mentioned, resolve `service_catalog_id` via Aurora `external_reference`.
4. **Knowledge agent** — Cortex RAG:
   - Embed query with `text-embedding-3-large`
   - Pinecone `eocc-primary` top-k with metadata filter `service_id` (if resolved)
5. **No ownership hallucination** — Docs only; links back to Confluence/Jira URLs.
6. **Optional synthesis** — Format numbered steps from chunks (GPT-4o).
7. **UI result** — Ranked results: title, excerpt, source link, relevance score, last updated.

### Example result
> 3 results — (1) Confluence: *Glue Recovery Runbook* §3.2 — 94% match. (2) Jira INC-2241 resolution. (3) GitHub README data-platform/glue-jobs.

---

## UC 6 — Historical Incident Intelligence

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | During active investigation OR user asks *"Have we seen this failure before?"* |
| **Agents** | Evidence + Knowledge (parallel) → Synthesis |
| **Mode** | Read |

### Flow

1. **Start** — Investigation in progress OR standalone copilot question with symptom text.
2. **Evidence agent** — Current Splunk error signature, AWS alarm type, Jira open issues.
3. **Knowledge agent** — Dual retrieval:
   - Pinecone incident corpus (RCA docs, closed ticket text)
   - Aurora `incident_record` filtered by `service_catalog_id`
4. **Similarity** — Embedding cosine + metadata (same `service_type`, error class).
5. **Synthesis** — Compare current vs top match; surface resolution_summary from Aurora.
6. **UI result** — "Similar incidents" panel: match %, Jira key, resolution, link to full ticket.

### Example result
> **87% match** — INC-4521 (2025-11-03): same `ConcurrentRunsExceededException`. Resolved by clearing 4 stuck job runs. MTTR: 23 min.

---

## UC 7 — Autonomous Incident Coordination

| Item | Detail |
|---|---|
| **Phase** | 3 |
| **Trigger** | Investigation completes with `risk_score ≥ 70%` OR Sev1 classification |
| **Agents** | Coordination (new Phase 3) — uses prior InvestigationPackage |
| **Mode** | Execute (notify, assign, ticket create) |

### Flow

1. **Start** — agents-ecs emits `investigation.completed` → EventBridge → Coordination workflow.
2. **Create session** — Insert `active_incident` linked to Jira key (create if none).
3. **Assignment** — Query `engineer_service_experience` + `person_availability` + `on_call_rotation`:
   - Skip OOO engineers; prefer highest expertise_score for service type.
4. **Escalation** — Apply `escalation_policy` from Ownership data; first step = primary POC.
5. **Notifications** — `notification_rule` by risk %: Teams message + email (Phase 3 Teams connector).
6. **Jira write** — Update assignee, add investigation summary comment (connector write API).
7. **War room** — If Sev1: `war_room_session` → auto-create Teams channel (Phase 3).
8. **UI result** — Control Center: active incident card with assignee, notifications sent, Jira link.

### Example result
> Jira INC-5001 assigned to Alex Chen. Teams notified: Data Platform + Payments stakeholders. War room created for Sev1.

---

## UC 8 — AI Executive Briefings

| Item | Detail |
|---|---|
| **Phase** | 4 |
| **Trigger** | Sev1 `active_incident` OR scheduled daily exec digest (08:00) |
| **Agents** | Synthesis only (template-driven) on InvestigationPackage + business context |
| **Mode** | Read / draft |

### Flow

1. **Start** — EventBridge `exec-briefing-trigger` or on-call requests briefing.
2. **Gather** — Load `active_incident`, `service_criticality`, `business_process` impact, timeline.
3. **Synthesis** — LLM with executive template: no jargon, business impact, customer/revenue angle, ETA.
4. **Persist** — `executive_briefing` table; optional PDF to S3.
5. **Distribute** — Email/Teams to leadership distribution list (Phase 3+ notify infra).
6. **UI result** — Executive Dashboard: 1-page brief with status, impact, actions, next update time.

### Example result
> **Payments processing delayed ~15 min** — customer-facing. Root cause: Glue job backlog. Team engaged. Next update in 30 min.

---

## UC 9 — Architecture Intelligence

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Copilot: *"Show architecture for Payment Application"* |
| **Agents** | Knowledge + Aurora structured lookup |
| **Mode** | Read |

### Flow

1. **Start** — User query names application or service.
2. **Aurora** — `application` → `architecture_component` → `service_catalog` tree.
3. **Knowledge agent** — RAG on Confluence architecture pages filtered by `application_id`.
4. **Merge** — Structured graph + doc excerpts; dedupe components.
5. **Synthesis** — Optional narrative walkthrough (GPT-4o).
6. **UI result** — Copilot architecture view: components, dependencies, AWS resources, owners per node.

### Example result
> Payment App → Payment API (Lambda) → payment-db (RDS) → payment-queue (SQS). Owner: Payments Team. Doc: Confluence ARC-Payments-v2.

---

## UC 10 — Change Risk Intelligence

| Item | Detail |
|---|---|
| **Phase** | 3 |
| **Trigger** | GitHub deployment webhook OR Jira change ticket enters *Scheduled* state |
| **Agents** | Dependency + Synthesis |
| **Mode** | Read (advisory gate) |

### Flow

1. **Start** — GitHub `deployment.created` → connector → `change_request` row in Aurora.
2. **Map** — Link deployment repo/service to `service_catalog_id` via `external_reference`.
3. **Dependency agent** — Downstream blast radius of service being changed.
4. **Cross-check** — Any `active_incident` or `operational_risk_signal` on affected services?
5. **Synthesis** — Risk score 0–100 + recommend proceed / delay / extra approver.
6. **UI result** — Control Center change gate card before deploy pipeline continues.

### Example result
> **Risk: High (78)** — Deploying Payment API while payment-db shows elevated latency. Recommend delay until DB stable. 6 downstream services affected.

---

## UC 11 — Operational Risk Detection

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Scheduled scan every 15 min (EventBridge) |
| **Agents** | Governance (rules engine, not open-ended LLM) |
| **Mode** | Read |

### Flow

1. **Start** — Cron → SQS → backend-ecs governance worker.
2. **Rules evaluate** — Examples:
   - CloudWatch: error rate ↑ 3x over 1h baseline
   - RDS: replica lag > threshold
   - Splunk: new error signature not seen before
   - Aurora: critical service with no recent successful health check
3. **Write** — `operational_risk_signal` with `evidence_ref` (alarm ID, query link).
4. **Alert** — If score > threshold → Command Center banner (Phase 2); no auto-page in Phase 2.
5. **UI result** — Governance Center risk feed: proactive cards before hard outage.

### Example result
> **Risk signal** — payment-db replica lag 45s (threshold 10s). Trend worsening 2h. Evidence: CloudWatch alarm `RDSReplicaLag`.

---

## UC 12 — Ownership Gap Detection

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Nightly cron 02:00 UTC |
| **Agents** | Governance (SQL rules) |
| **Mode** | Read |

### Flow

1. **Start** — Scheduled job scans all active `service_catalog` rows.
2. **Rules:**
   - No row in `service_ownership` → gap
   - `primary_person_id` null → gap
   - `team` inactive → gap
   - Escalation policy missing for `sla_tier = 1` services → gap
3. **Write** — `governance_finding` type = `no_owner` / `no_escalation`.
4. **UI result** — Governance Center: sortable gap list with service name, env, last sync date, fix link.

### Example result
> 14 services missing primary owner — includes `lambda-reporting-cn7` (prod). Detected 2026-06-11.

---

## UC 13 — Runbook Coverage Analysis

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Weekly cron after Confluence sync completes |
| **Agents** | Governance |
| **Mode** | Read |

### Flow

1. **Start** — `integration_sync_log` success for Confluence → trigger coverage job.
2. **Build registry** — Upsert `runbook_registry` from Confluence pages tagged `runbook` + RAG metadata.
3. **Match** — Join `service_catalog` + `service_criticality` (sla_tier 1–2) LEFT JOIN `runbook_registry`.
4. **Gap** — Critical service with no runbook → `governance_finding` type = `no_runbook`.
5. **UI result** — Coverage dashboard: % covered, list of critical services without runbooks.

### Example result
> Runbook coverage **78%** for Tier-1 services. Missing: Payment API, Notification Worker (prod).

---

## UC 14 — Documentation Governance

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Weekly cron after Confluence sync |
| **Agents** | Governance |
| **Mode** | Read |

### Flow

1. **Start** — Post-sync governance job.
2. **Rules:**
   - `last_reviewed_at` > 12 months ago → stale
   - Page deleted in Confluence but still in RAG index → orphan
   - Service in catalog with zero linked Confluence refs → missing docs
3. **Write** — `governance_finding` type = `stale_doc` / `missing_doc`.
4. **Optional** — Re-index stale pages in Cortex RAG after owner updates.
5. **UI result** — Doc governance report with owner team and age.

### Example result
> 23 stale documents — ARC-Payments-v1 last reviewed 18 months ago. Owner: Payments Team.

---

## UC 15 — Organizational Dependency Analysis

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | User opens Team Dependency view OR exec asks *"Which teams block Payments?"* |
| **Agents** | Dependency (team-level graph) |
| **Mode** | Read |

### Flow

1. **Start** — `GET /api/teams/dependencies` or copilot query with team/process filter.
2. **Aurora** — Query `team_dependency` + aggregate service-level `dependency` by owning team.
3. **Rollup** — Map technical deps → upstream/downstream teams per `business_process`.
4. **UI result** — Team graph: nodes = teams, edges = dependency reason, thickness = criticality.

### Example result
> Payments delivery depends on **Data Platform** (Glue jobs) and **Infrastructure** (RDS). Cross-team risk: 2 single points.

---

## UC 16 — Critical Expert Detection

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Copilot: *"Who knows Aurora replication?"* OR Governance key-person report |
| **Agents** | Knowledge (Aurora aggregate query, optional light LLM rank) |
| **Mode** | Read |

### Flow

1. **Start** — User query with technology/service filter.
2. **Aurora** — `engineer_service_experience` JOIN `person`:
   - Filter `service_catalog.service_type = aws_rds` or tag match
   - ORDER BY `expertise_score DESC`, `incident_count DESC`
3. **Key-person risk** — If top engineer > 60% of resolved incidents → flag in response.
4. **UI result** — Expert list: name, team, incident count, last contribution, risk flag.

### Example result
> Top experts on Aurora: (1) Maria Santos — 31 incidents, score 0.94. **Key-person risk**: Maria owns 68% of RDS resolutions.

---

## UC 17 — Service Consumption Intelligence

| Item | Detail |
|---|---|
| **Phase** | 4 |
| **Trigger** | Exec dashboard load OR audit: *"Who consumes Payment API?"* |
| **Agents** | Dependency (consumption graph) |
| **Mode** | Read |

### Flow

1. **Start** — Scheduled AWS tag/API sync → `service_consumption` table.
2. **Map** — Consumer Lambda/API Gateway → provider service via tags, X-Ray, or config rules.
3. **Query** — Reverse dependency: who calls Payment API?
4. **UI result** — Consumption map: consumers, volume proxy, owning teams, governance flags.

### Example result
> Payment API consumed by 8 services across 4 teams. Highest coupling: Order Service, Mobile BFF.

---

## UC 18 — Enterprise Operational Search

| Item | Detail |
|---|---|
| **Phase** | 2 |
| **Trigger** | Unified search bar: *"payment outage runbook john"* |
| **Agents** | Knowledge + parallel Aurora entity search |
| **Mode** | Read |

### Flow

1. **Start** — `POST /api/search/unified` with query string.
2. **Parallel:**
   - **Pinecone** — semantic doc/incident search (Knowledge agent)
   - **Aurora** — ILIKE / trigram on `service_catalog`, `person`, `incident_record`
3. **Merge** — Dedupe by entity; rank: exact name match > semantic > related.
4. **UI result** — Single results page grouped: Services, People, Incidents, Documents.

### Example result
> 12 results — Services (2), People (1), Incidents (3), Docs (6). Top: Payment API service, INC-5001, Glue Recovery Runbook.

---

## UC 19 — Operational Digital Twin

| Item | Detail |
|---|---|
| **Phase** | 4 |
| **Trigger** | Hourly snapshot cron OR on-demand *"Refresh twin"* |
| **Agents** | All connectors sync → graph export (no LLM required for snapshot) |
| **Mode** | Read |

### Flow

1. **Start** — EventBridge hourly trigger full connector sync.
2. **Collect** — Latest Aurora graph + AWS resource states + health overlays from CloudWatch/Splunk.
3. **Export** — Serialize to `digital_twin_snapshot.graph_json` + `health_summary_json`.
4. **Store** — S3 archive + Aurora latest snapshot pointer.
5. **UI result** — Executive Dashboard live twin: zoomable graph with health colors, point-in-time selector.

### Example result
> Twin snapshot 2026-06-11 14:00 UTC — 342 services, 28 business processes, 3 degraded nodes highlighted.

---

## UC 20 — Controlled Operational Execution

| Item | Detail |
|---|---|
| **Phase** | 3 |
| **Trigger** | Engineer clicks **Approve & Execute** on action recommendation from investigation |
| **Agents** | Control (post-approval only) |
| **Mode** | Execute (governed) |

### Flow

1. **Start** — `action_recommendation` status = `proposed` (from UC 4 investigation).
2. **Approval** — Create `approval_request`; notify 2–6 seniors via Teams/email.
3. **Collect** — `approval_decision` rows until quorum met.
4. **Control agent** — Execute scoped AWS action (e.g. `ecs:UpdateService` force redeploy):
   - IAM role `eocc-control-executor` — least privilege per action type
   - Idempotency key prevents double-execution
5. **Audit** — `action_execution_log` + CloudTrail correlation ID.
6. **Jira** — Comment with execution result.
7. **UI result** — Control Center: action status Executed / Failed with full audit chain.

### Example result
> Action: Restart ECS service `payment-api` — Approved by 2/2 seniors. Executed 14:32 UTC. Service healthy at 14:38 UTC. Audit: `action_execution_log:id`.

---

## Flow summary matrix

| UC | Trigger type | Agents | Primary store | Output |
|---|---|---|---|---|
| 1 | User query | Ownership | Aurora | Ownership card |
| 2 | Schedule | Metrics rollup | Aurora/Redis | Process health dashboard |
| 3 | User/alert | Dependency | Aurora | Blast radius graph |
| 4 | Alert/SQS | All 4 + Synthesis | Aurora+Redis | Investigation package |
| 5 | User search | Knowledge | Pinecone | Ranked doc results |
| 6 | Investigation | Evidence+Knowledge | Pinecone+Aurora | Similar incidents |
| 7 | Post-investigation | Coordination | Aurora+Jira+Teams | Ticket, assign, notify |
| 8 | Sev1/schedule | Synthesis | Aurora | Executive brief |
| 9 | User query | Knowledge+Aurora | Aurora+Pinecone | Architecture map |
| 10 | Deploy webhook | Dependency | Aurora | Change risk score |
| 11 | Schedule | Governance rules | Aurora | Risk signals |
| 12 | Nightly cron | Governance SQL | Aurora | Ownership gaps |
| 13 | Weekly cron | Governance | Aurora+Confluence | Runbook coverage |
| 14 | Weekly cron | Governance | Aurora+Confluence | Stale doc report |
| 15 | User query | Dependency | Aurora | Team dependency graph |
| 16 | User query | Knowledge/Aurora | Aurora | Expert list |
| 17 | Dashboard | Dependency | Aurora+AWS | Consumption map |
| 18 | User search | Knowledge+SQL | Pinecone+Aurora | Unified search results |
| 19 | Hourly cron | Connectors | Aurora+S3 | Digital twin snapshot |
| 20 | User approve | Control | AWS API+Aurora | Executed action + audit |

---

## Phase 1 demo path (recommended walkthrough)

For tech lead demo, chain these live:

1. **UC 4** — Glue alert → full investigation  
2. **UC 1** — Ownership from same incident  
3. **UC 3** — Dependency blast radius  
4. **UC 5** (tease) — Runbook retrieval via Knowledge agent  
5. Command Center — **UC 2** preview with seeded business process health  

Phases 2–4 flows are architecturally defined; integrations unlock progressively.


---