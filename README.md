# Module 5 — DevOps, CI/CD & Monitoring

A production-style Node.js / Express REST API with unit tests, Docker
containerisation, a GitHub Actions CI/CD pipeline, and a Prometheus + Grafana
monitoring stack.

```
Pipeline:  git push  ->  lint + tests  ->  docker build  ->  docker push  ->  deploy  ->  monitor
```

| | |
|---|---|
| Repository | <https://github.com/zainab1315/devops-module5-api> |
| Docker Hub | <https://hub.docker.com/r/zainab1315/devops-module5-api> |
| Live API | <https://devops-module5-api.onrender.com/health> |
| Stack | Node.js 20 · Express · Jest · Docker · GitHub Actions · Prometheus · Grafana |

---

## 1. Project structure

```
devops-module5-project/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR + push: lint, test, build & smoke test
│       ├── docker-publish.yml  # push to main: build & push to Docker Hub
│       └── cd.yml              # git tag: build, scan, push, deploy, release
├── src/
│   ├── app.js                  # express app, middleware, routes, error handler
│   ├── server.js               # http server + graceful shutdown
│   ├── config.js               # env config
│   ├── logger.js               # structured JSON logger
│   ├── metrics.js              # prom-client metrics
│   ├── store.js                # in-memory data store
│   └── routes/
│       ├── health.js           # /health, /health/ready, /health/detail, /metrics
│       └── items.js            # /api/items CRUD
├── tests/
│   ├── app.test.js
│   ├── health.test.js
│   ├── items.test.js
│   └── logger.test.js
├── monitoring/
│   ├── prometheus/prometheus.yml
│   └── grafana/
│       ├── provisioning/datasources/prometheus.yml
│       ├── provisioning/dashboards/dashboards.yml
│       └── dashboards/api-dashboard.json
├── scripts/
│   ├── load-test.ps1           # generates traffic so the charts have data
│   └── smoke-test.sh
├── Dockerfile                  # multi-stage production build
├── Dockerfile.test             # build target that also runs the tests
├── docker-compose.yml          # api + prometheus + grafana
├── .dockerignore
├── .gitignore
├── .env.example
├── .eslintrc.json
├── package.json
├── render.yaml                 # Render blueprint
├── railway.json                # Railway config
├── Procfile
├── README.md
├── MONITORING.md
└── SUBMISSION.md               # step-by-step submission checklist
```

---

## 2. Prerequisites

| Tool | Version | Check with |
|------|---------|-----------|
| Node.js | 20 or newer | `node --version` |
| npm | 10 or newer | `npm --version` |
| Git | any recent | `git --version` |
| Docker Desktop | any recent | `docker --version` |

Install Docker Desktop from <https://docs.docker.com/desktop/setup/install/windows-install/>
and make sure you start it before running any `docker` command.

---

## 3. Run it locally (no Docker)

```powershell
cd D:\devops-module5-project
npm install
Copy-Item .env.example .env
npm start
```

Verify it is alive:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

---

## 4. Run it with Docker

### Single container

```powershell
docker build -t devops-module5-api:local .
docker run -d --name module5-api -p 3000:3000 devops-module5-api:local
docker ps
docker logs -f module5-api
```

Stop and clean up:

```powershell
docker rm -f module5-api
```

### Full stack (API + Prometheus + Grafana)

```powershell
docker compose up -d --build
docker compose ps
```

| Service | URL | Notes |
|---------|-----|-------|
| API | <http://localhost:3000> | the app |
| Health | <http://localhost:3000/health> | health check |
| Metrics | <http://localhost:3000/metrics> | Prometheus scrape target |
| Prometheus | <http://localhost:9090> | query your metrics here |
| Grafana | <http://localhost:3001> | login `admin` / `admin` |

Generate traffic so the graphs are not empty:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1 -Requests 200
```

Shut down (add `-v` to delete the stored volumes too):

```powershell
docker compose down
```

---

## 5. API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | service metadata and endpoint list |
| GET | `/health` | liveness probe |
| GET | `/health/ready` | readiness probe |
| GET | `/health/detail` | deep health check with CPU/memory/system info |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/items` | list all items |
| GET | `/api/items/:id` | get one item |
| POST | `/api/items` | create an item — body `{ "name": "..." }` |
| DELETE | `/api/items/:id` | delete an item |

```powershell
# Create
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/items `
  -ContentType "application/json" -Body '{"name":"My task","status":"active"}'

# List
Invoke-RestMethod http://localhost:3000/api/items

# Health
Invoke-RestMethod http://localhost:3000/health

# Metrics (first 20 lines)
(Invoke-WebRequest http://localhost:3000/metrics).Content -split "`n" | Select-Object -First 20
```

---

## 6. Testing

```powershell
npm test          # tests + coverage report
npm run test:ci   # what CI runs
npm run lint      # ESLint
```

Current state: **35 tests across 4 suites, ~98% statement coverage.**
The Jest config enforces coverage thresholds, so the build fails if quality
drops below 80% lines / 80% statements / 80% functions / 70% branches.

---

## 7. CI/CD pipeline

Three workflows, each with a single responsibility.

### `ci.yml` — every push and pull request
1. Checkout code
2. Install Node.js 20 with npm cache
3. `npm ci`
4. `npm run lint`
5. Dependency audit
6. `npm run test:ci` with coverage thresholds
7. Upload the coverage report as a build artifact
8. Build the Docker image with BuildKit + GitHub Actions layer cache
9. Run the container and poll `/health` until healthy
10. Smoke test `/`, `/api/items` and `/metrics`
11. Always print the container logs, then clean up

Nothing is published from this workflow. It only proves the code is sound.

### `docker-publish.yml` — every push to `main`
1. Lint + test
2. Log in to Docker Hub
3. Build and push tagged `latest`, `main` and the short commit SHA
4. Write the published tags to the GitHub Actions job summary

### `cd.yml` — on a version tag such as `v1.0.0`
1. Lint + test (a failing test blocks the release)
2. Log in to Docker Hub, derive SemVer tags
3. Build and push `1.0.0`, `1.0`, `1`, `latest`
4. Scan the image with Trivy, failing on CRITICAL/HIGH
5. Trigger the Render deploy hook and poll the live `/health` endpoint
6. Create a GitHub Release with generated notes

### Docker Hub setup

1. Create a free account and a repository named `devops-module5-api`
2. Create an access token: **Account Settings → Personal access tokens → Read/Write**
3. In your GitHub repo go to **Settings → Secrets and variables → Actions → New repository secret**
4. Add:
   - `DOCKERHUB_USERNAME` — your Docker Hub username
   - `DOCKERHUB_TOKEN` — the access token (not your password)
   - `RENDER_DEPLOY_HOOK` — the Render deploy hook URL (see `SUBMISSION.md`)

### Deploy to Render

1. Push a tag: `git tag v1.0.0 && git push origin v1.0.0`
2. `cd.yml` runs, the image lands on Docker Hub, and Render redeploys
3. Confirm the live API at <https://devops-module5-api.onrender.com/health>

To get the deploy hook: Render dashboard → your service → **Settings → Deploy
→ Deploy Hook** → copy the URL into the `RENDER_DEPLOY_HOOK` secret.

### Deploy to AWS / DigitalOcean / Railway instead

All three are included but disabled by default:

```powershell
# Render blueprint, one command
render blueprint launch

# Railway
npm i -g @railway/cli
railway login
railway init
railway up
```

`railway.json` sets the Dockerfile builder and the `/health` health check path.
`Procfile` (`web: node src/server.js`) lets Heroku-style platforms build from
source with no Docker at all.

For AWS, build and push the image from the same pipeline, then reference
`<registry>/devops-module5-api:latest` in an ECS task definition or App Runner
service, with the target group health check path set to `/health`.

---

## 8. Monitoring

Full details, PromQL queries and the dashboard layout are in
[MONITORING.md](MONITORING.md). In short:

- **Logs** — every request and error is emitted as one JSON object on stdout
  (`src/logger.js`), so `docker logs`, the Docker logging driver and any log
  collector can parse them.
- **Metrics** — `prom-client` exposes `/metrics` with request count, latency
  histogram, plus default Node process metrics (CPU, memory, event loop, GC).
- **Health** — `/health` for liveness, `/health/ready` for readiness,
  `/health/detail` for diagnostics. The Docker `HEALTHCHECK` and the Render
  health check both use `/health`.
- **Dashboards** — a provisioned Grafana dashboard with request rate, latency
  percentiles, error ratio, per-route traffic and memory.

---

## 9. Common commands

```powershell
npm install                 # install dependencies
npm start                   # run the app
npm run dev                 # run with hot reload
npm test                    # tests with coverage
npm run lint                # lint only
docker compose up -d --build  # full stack
docker compose logs -f api   # follow API logs
docker compose down           # stop everything
git tag v1.0.0 && git push origin v1.0.0   # trigger a release
```
