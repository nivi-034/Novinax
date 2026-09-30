// SentinelOps Incident Data Repository
// Contains initial state, historical incidents, mock live event generators, and templates

const INITIAL_INCIDENTS = [
  {
    id: "INC-4821",
    title: "502 Bad Gateway & Elevated Latency on Checkout / Stripe Payment Webhooks",
    status: "Investigating", // Investigating, Identified, Monitoring, Resolved
    severity: "P1", // P1, P2, P3, P4
    service: "payment-gateway",
    environment: "production-us-east-1",
    startTime: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    resolvedTime: null,
    commander: "Nivetha (Staff SRE)",
    scribe: "Alex Rivera (Senior Backend)",
    impactedUsers: 14200,
    financialImpact: "$38,400 / hr",
    summary: "Spike in HTTP 502/504 errors on `/api/v2/checkout/process` and Stripe webhook listeners following release v2.14.8-hotfix-3. Connection pool exhaustion observed between payment service and Redis cluster.",
    
    // 1. ERROR MESSAGES & STACK TRACES
    errors: [
      {
        id: "ERR-901",
        name: "RedisConnectionPoolTimeoutException",
        message: "Timeout acquiring connection from pool [pool_size=10, active=10, idle=0] after 5000ms",
        count: 1420,
        rate: "48.2 req/s",
        firstSeen: "28m ago",
        lastSeen: "Just now",
        service: "payment-gateway",
        endpoint: "POST /api/v2/checkout/process",
        traceId: "tr-7f9a2b810e-001a",
        isRootCause: true,
        isSilenced: false,
        developerNote: "Suspected cause: Connection pool size was inadvertently dropped from 50 to 10 in helm values override.",
        stackTrace: `RedisConnectionPoolTimeoutException: Timeout acquiring connection from pool [pool_size=10, active=10, idle=0] after 5000ms
    at ConnectionPool.acquire (src/core/redis_pool.ts:84:19)
    at PaymentTransactionManager.lockSession (src/services/payment_lock.ts:42:11)
    at async CheckoutController.processPayment (src/controllers/checkout.ts:112:28)
    at async Router.handle (src/routes/api.ts:204:9)
    at async MiddlewareStack.execute (src/middleware/auth.ts:55:12)`
      },
      {
        id: "ERR-902",
        name: "StripeWebhookSignatureVerificationFailed",
        message: "Timestamp outside tolerance window (current: 1727680200, header: 1727679800)",
        count: 312,
        rate: "8.4 req/s",
        firstSeen: "22m ago",
        lastSeen: "1m ago",
        service: "webhook-consumer",
        endpoint: "POST /webhooks/stripe/events",
        traceId: "tr-4a88c3e911-002f",
        isRootCause: false,
        isSilenced: false,
        developerNote: "Lagging consumers due to blocked payment threads are delaying webhook validation beyond Stripe 5-minute tolerance window.",
        stackTrace: `StripeSignatureError: Webhook timestamp expired: [t=1727679800, now=1727680200, drift=400s > max 300s]
    at StripeWebhook.verify (node_modules/stripe/lib/webhooks.js:45:11)
    at StripeConsumer.onMessage (src/workers/stripe_consumer.ts:77:24)
    at KafkaConsumerBatch.process (src/queue/kafka.ts:150:18)`
      },
      {
        id: "ERR-903",
        name: "DatabaseCircuitBreakerOpenException",
        message: "PostgreSQL read replica query queue exceeded 120 waiting queries, breaker tripped",
        count: 185,
        rate: "3.1 req/s",
        firstSeen: "16m ago",
        lastSeen: "2m ago",
        service: "order-db-proxy",
        endpoint: "INTERNAL sql-read",
        traceId: "tr-99bb123ee4-003c",
        isRootCause: false,
        isSilenced: true,
        developerNote: "Circuit breaker activated as designed to protect primary DB from cascading lock timeouts.",
        stackTrace: `CircuitBreakerOpenException: Breaker 'order-db-read-pool' is OPEN (failure rate: 84% > threshold 50%)
    at CircuitBreaker.execute (src/resilience/breaker.ts:92:14)
    at OrderRepository.getOrderWithLock (src/repositories/order_repo.ts:210:9)
    at async CheckoutController.validateOrderState (src/controllers/checkout.ts:78:15)`
      }
    ],

    // 2. LIVE LOGS
    logs: [
      {
        id: "LOG-101",
        timestamp: "12:38:12.401",
        level: "FATAL",
        service: "payment-gateway",
        containerId: "pod-pay-gw-7b9d88c9f-xk82j",
        message: "CRITICAL: Redis lock pool exhausted. 10/10 connections occupied. Discarding incoming checkout transaction #TX-984210",
        pinned: true,
        comment: "Pinned to incident timeline as initial alert indicator."
      },
      {
        id: "LOG-102",
        timestamp: "12:38:14.112",
        level: "ERROR",
        service: "payment-gateway",
        containerId: "pod-pay-gw-7b9d88c9f-xk82j",
        message: "HTTP 502 upstream connection timeout on Stripe Gateway token exchange (took 5003ms)",
        pinned: false,
        comment: ""
      },
      {
        id: "LOG-103",
        timestamp: "12:38:19.890",
        level: "WARN",
        service: "ingress-controller",
        containerId: "ingress-nginx-lb-01",
        message: "upstream server temporarily disabled while connecting to upstream: payment-gateway.default.svc.cluster.local:8080",
        pinned: false,
        comment: ""
      },
      {
        id: "LOG-104",
        timestamp: "12:39:02.311",
        level: "ERROR",
        service: "webhook-consumer",
        containerId: "pod-stripe-hook-6cd4f77b9-mq93l",
        message: "Dropping event evt_3P9xKw2eZv: Signature timestamp expired (+400s drift)",
        pinned: false,
        comment: ""
      },
      {
        id: "LOG-105",
        timestamp: "12:40:15.540",
        level: "INFO",
        service: "hpa-autoscaler",
        containerId: "k8s-controller-manager",
        message: "Autoscaling deployment/payment-gateway from 4 to 12 replicas due to CPU 88% > target 60%",
        pinned: true,
        comment: "Scaling up replicas exacerbated pool contention because each pod requested Redis connections"
      },
      {
        id: "LOG-106",
        timestamp: "12:41:22.091",
        level: "WARN",
        service: "redis-cluster",
        containerId: "redis-master-node-0",
        message: "Max client connections limit (10000) at 84% capacity. Current active clients: 8,420",
        pinned: false,
        comment: ""
      }
    ],

    // 3. DEPLOYMENT DETAILS
    deployment: {
      activeRelease: "v2.14.8-hotfix-3",
      previousStableRelease: "v2.14.7-prod",
      deployedAt: "38 minutes ago (12:05 UTC)",
      deployedBy: "ci-bot (Triggered by @alex_dev)",
      pipelineId: "#GH-RUN-994218",
      commitSha: "f8a91c2b",
      cluster: "eks-us-east-prod-01",
      namespace: "ecommerce-core",
      canaryPercent: "100% (Promoted)",
      podStatus: {
        total: 12,
        healthy: 5,
        degraded: 7,
        restartCount: 23
      },
      metricsDelta: {
        latencyP99: "+340ms (from 65ms to 405ms)",
        errorRate: "+18.4% (from 0.02% to 18.42%)",
        cpuUsage: "+45% (HPA triggered)"
      },
      configDiffSummary: "Redis pool max_connections: 50 -> 10 in `helm/values-prod.yaml`",
      rollbackStatus: "Ready (v2.14.7-prod cached on registry)",
      deploymentNotes: "Hotfix was meant to patch currency formatting bug, but helm values included an unverified rate-limit override."
    },

    // 4. RECENT CHANGES (COMMITS, PRs, CONFIGS)
    recentChanges: [
      {
        id: "CHG-301",
        type: "Git Commit",
        title: "fix(checkout): adjust currency rounding & clean up connection configs",
        author: "alex.rivera@novintix.io",
        timestamp: "45m ago",
        sha: "f8a91c2b",
        prNumber: "#1842",
        suspectScore: 94, // % probability
        isSuspectedCause: true,
        diff: `--- a/helm/payment-gateway/values-prod.yaml
+++ b/helm/payment-gateway/values-prod.yaml
@@ -24,7 +24,7 @@ config:
   http_timeout_ms: 5000
   redis:
     host: "redis-cluster.internal"
-    pool_size: 50
+    pool_size: 10 # Testing conservative pool limits for staging parity
     idle_timeout: 300`
      },
      {
        id: "CHG-302",
        type: "Feature Flag",
        title: "ff_stripe_radar_v2_risk_check -> ENABLED (100% traffic)",
        author: "sarah.chen@novintix.io",
        timestamp: "1h 10m ago",
        sha: "FLAG-982",
        prNumber: "N/A",
        suspectScore: 18,
        isSuspectedCause: false,
        diff: `FeatureFlag: ff_stripe_radar_v2_risk_check
Old: { "enabled": false, "traffic_pct": 0 }
New: { "enabled": true, "traffic_pct": 100, "strict_mode": false }`
      },
      {
        id: "CHG-303",
        type: "Terraform / Infra",
        title: "infra(redis): upgraded redis master node instance type to cache.r6g.large",
        author: "devops-infra@novintix.io",
        timestamp: "3h ago",
        sha: "tf-881a9",
        prNumber: "#1839",
        suspectScore: 8,
        isSuspectedCause: false,
        diff: `--- a/terraform/redis.tf
+++ b/terraform/redis.tf
-  node_type = "cache.r5.large"
+  node_type = "cache.r6g.large"`
      }
    ],

    // 5. PREVIOUS INCIDENTS & POSTMORTEMS / RUNBOOKS
    previousIncidents: [
      {
        id: "INC-3810",
        title: "Redis Connection Bottleneck during Black Friday peak load",
        similarity: "92% Match",
        occurredAt: "8 months ago",
        resolutionDuration: "42 mins",
        rootCause: "Insufficient client pool size causing HTTP 504 on payment gateway endpoints during concurrency surge.",
        keyRemediation: "Increased pool size to 100 and deployed Redis Sentinel read replicas.",
        postmortemUrl: "#postmortem-inc-3810",
        runbookSuggested: "RUNBOOK-REDIS-DRAIN-EXPAND"
      },
      {
        id: "INC-4102",
        title: "Stripe Webhook Ingestion Backpressure & Circuit Breaker Trip",
        similarity: "74% Match",
        occurredAt: "3 months ago",
        resolutionDuration: "25 mins",
        rootCause: "Webhook queue consumer crashed, causing event drift and signature validation failure.",
        keyRemediation: "Flushed dead-letter queue, scaled workers to 20, adjusted signature tolerance in emergency config.",
        postmortemUrl: "#postmortem-inc-4102",
        runbookSuggested: "RUNBOOK-KAFKA-CONSUMER-DRAIN"
      }
    ],

    // RUNBOOKS
    runbooks: [
      {
        id: "RB-01",
        name: "Emergency Pool Expansion & Quick Patch",
        steps: [
          { step: 1, title: "Verify Redis memory and connection saturation via CLI", status: "completed", command: "redis-cli -h redis-cluster.internal info clients" },
          { step: 2, title: "Trigger ConfigMap hot-reload or rollback to v2.14.7-prod", status: "in_progress", command: "kubectl rollout undo deployment/payment-gateway -n ecommerce-core" },
          { step: 3, title: "Purge stale uncommitted transaction locks", status: "pending", command: "npm run scripts:purge-stale-locks -- --dry-run=false" },
          { step: 4, title: "Verify P99 latency returns under 80ms on Datadog APM", status: "pending", command: "curl -s https://apm.novintix.internal/health/payment-gateway" }
        ]
      }
    ],

    // 6. TIMELINE & SCRATCHPAD
    timeline: [
      { id: "TL-1", time: "12:05 UTC", text: "Release v2.14.8-hotfix-3 deployed to production", author: "CI/CD Bot", type: "system" },
      { id: "TL-2", time: "12:12 UTC", text: "Datadog Alert: Payment Gateway Error Rate > 5%", author: "PagerDuty", type: "alert" },
      { id: "TL-3", time: "12:15 UTC", text: "Nivetha declared P1 incident, assigned as Commander", author: "Nivetha", type: "manual" },
      { id: "TL-4", time: "12:22 UTC", text: "Identified high RedisConnectionPoolTimeoutException in error feed", author: "Alex Rivera", type: "manual" },
      { id: "TL-5", time: "12:30 UTC", text: "Correlated with PR #1842 changing pool_size from 50 to 10", author: "Nivetha", type: "manual" },
      { id: "TL-6", time: "12:38 UTC", text: "Preparing instant rollback to v2.14.7-prod", author: "Alex Rivera", type: "manual" }
    ],

    scratchpad: `## Live War Room Notes
- **Root Cause Verified**: PR #1842 helm values reduced pool_size to 10.
- **Immediate Action**: Rollback deployment to \`v2.14.7-prod\` in progress.
- **Side Effect**: Stripe webhooks lagging due to locked checkout threads, Kafka consumer will catch up automatically once locks clear.
- **Customer Comms**: Status page updated to "Degraded Performance on Checkout".`
  },

  {
    id: "INC-4820",
    title: "OOMKilled CrashLoopBackOff on Auth-Service Pods (Memory Leak)",
    status: "Monitoring",
    severity: "P2",
    service: "auth-service",
    environment: "production-eu-west-1",
    startTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    resolvedTime: null,
    commander: "Marcus Vance (Senior SecOps)",
    scribe: "Elena Rostova (Backend Lead)",
    impactedUsers: 5400,
    financialImpact: "$12,000 / hr",
    summary: "JWT token validation cache memory leak in Auth-Service v3.8.1 causing memory usage to exceed 2Gi limit and triggering Kubernetes OOMKill restarts.",
    
    errors: [
      {
        id: "ERR-801",
        name: "JavaScript Heap Out of Memory",
        message: "Fatal process out of memory: Zone allocation failed - process killed with signal 9 (SIGKILL)",
        count: 890,
        rate: "12.1 req/s",
        firstSeen: "1h 40m ago",
        lastSeen: "12m ago",
        service: "auth-service",
        endpoint: "POST /auth/oauth/token",
        traceId: "tr-oom-88a-99",
        isRootCause: true,
        isSilenced: false,
        developerNote: "Unbounded in-memory LRU map retaining expired public keys without TTL eviction.",
        stackTrace: `<--- JS stacktrace --->
==== JS stack trace =========================================
    0: ExitFrame [pc: 0x7fa289]
    1: TokenCache.set (src/auth/token_cache.ts:38:15)
    2: JWKSClient.getSigningKey (src/auth/jwks.ts:114:9)`
      }
    ],

    logs: [
      {
        id: "LOG-201",
        timestamp: "11:15:02.109",
        level: "WARN",
        service: "auth-service",
        containerId: "auth-pod-66c9-1a",
        message: "Node.js heap memory reached 1.94 GB (limit: 2.00 GB). Garbage collection pause: 1,420ms",
        pinned: true,
        comment: "Memory spike before CrashLoop"
      },
      {
        id: "LOG-202",
        timestamp: "11:16:30.000",
        level: "FATAL",
        service: "k8s-kubelet",
        containerId: "node-worker-eu-04",
        message: "Container 'auth-service' in pod 'auth-pod-66c9-1a' was terminated by OOMKiller (exit code 137)",
        pinned: true,
        comment: "K8s OOMKill event"
      }
    ],

    deployment: {
      activeRelease: "v3.8.1",
      previousStableRelease: "v3.8.0",
      deployedAt: "2 hours ago",
      deployedBy: "@elena_rostova",
      pipelineId: "#GH-RUN-88310",
      commitSha: "e993ab12",
      cluster: "eks-eu-west-prod-02",
      namespace: "auth-identity",
      canaryPercent: "100%",
      podStatus: { total: 8, healthy: 8, degraded: 0, restartCount: 14 },
      metricsDelta: { latencyP99: "+80ms", errorRate: "0.1% (Post mitigation)", cpuUsage: "40%" },
      configDiffSummary: "Pod memory limit increased from 2Gi to 4Gi temporary hotfix",
      rollbackStatus: "Patched via memory override",
      deploymentNotes: "Hot-patched memory limit while dev team works on TTL eviction fix in PR #2044"
    },

    recentChanges: [
      {
        id: "CHG-201",
        type: "Git Commit",
        title: "feat(jwt): add JWKS key caching layer",
        author: "elena.rostova@novintix.io",
        timestamp: "2h 15m ago",
        sha: "e993ab12",
        prNumber: "#2031",
        suspectScore: 98,
        isSuspectedCause: true,
        diff: `--- a/src/auth/token_cache.ts
+++ b/src/auth/token_cache.ts
@@ -12,3 +12,8 @@ export class TokenCache {
+  private keys = new Map<string, object>(); // Missing max size & TTL eviction!
+  set(kid: string, key: object) {
+    this.keys.set(kid, key);
+  }`
      }
    ],

    previousIncidents: [
      {
        id: "INC-2199",
        title: "Session Cache Memory Leak in User-Profile Gateway",
        similarity: "88% Match",
        occurredAt: "1 year ago",
        resolutionDuration: "35 mins",
        rootCause: "Unbounded Map caching user avatars without size constraints.",
        keyRemediation: "Switched to `lru-cache` package with explicit `max: 5000` entry limit.",
        postmortemUrl: "#postmortem-inc-2199",
        runbookSuggested: "RUNBOOK-NODEJS-HEAPDUMP"
      }
    ],

    runbooks: [
      {
        id: "RB-02",
        name: "Node.js Heapdump & Memory Triage",
        steps: [
          { step: 1, title: "Trigger diagnostic heapdump on canary pod", status: "completed", command: "kubectl exec -it auth-pod-canary -- node -e 'v8.writeHeapSnapshot()'" },
          { step: 2, title: "Bump pod memory limit to 4Gi in helm overrides", status: "completed", command: "helm upgrade auth-service ./helm --set resources.limits.memory=4Gi" },
          { step: 3, title: "Deploy v3.8.2-patch with LRU cache TTL", status: "in_progress", command: "kubectl set image deployment/auth-service auth=auth-service:v3.8.2" }
        ]
      }
    ],

    timeline: [
      { id: "TL-201", time: "10:30 UTC", text: "v3.8.1 deployed to EU-West cluster", author: "Elena Rostova", type: "system" },
      { id: "TL-202", time: "11:16 UTC", text: "First pod OOMKilled detected by Prometheus alert", author: "AlertManager", type: "alert" },
      { id: "TL-203", time: "11:35 UTC", text: "Bumped memory limits to 4Gi to stabilize CrashLoop", author: "Marcus Vance", type: "manual" },
      { id: "TL-204", time: "12:10 UTC", text: "PR #2044 created with fixed LRU cache eviction", author: "Elena Rostova", type: "manual" }
    ],

    scratchpad: `## Auth Service Triage
- Temporary memory bump to 4Gi is holding steady.
- PR #2044 approved by SecOps. Ready for staging verification.`
  }
];

// Mock log stream generator templates
const LOG_GENERATOR_TEMPLATES = [
  { level: "ERROR", service: "payment-gateway", msg: "Pool timeout: Client connection request timed out after 5000ms" },
  { level: "FATAL", service: "payment-gateway", msg: "Dropped payment event #TX-{RANDOM}: Redis lock failed" },
  { level: "WARN", service: "ingress-nginx", msg: "502 Bad Gateway returned to client 192.168.{RAND_IP}" },
  { level: "INFO", service: "checkout-worker", msg: "Retrying order capture for cart_id #CR-{RANDOM} (attempt 2/5)" },
  { level: "DEBUG", service: "stripe-sdk", msg: "Stripe API latency: {LATENCY}ms, HTTP status 200 OK" },
  { level: "ERROR", service: "order-db-proxy", msg: "Connection pool queue length: {QUEUE} > threshold 50" },
  { level: "WARN", service: "redis-cluster", msg: "Redis node 0 client count elevated: {CLIENTS} active clients" }
];
