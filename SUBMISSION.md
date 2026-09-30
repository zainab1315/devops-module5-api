# Submissions checklist

Work through this top to bottom. Tick every box, then post the LinkedIn
update and submit both links on your dashboard.

Repository: <https://github.com/zainab1315/devops-module5-api>

---

## Step 0 - Fill in your details

- [ ] `package.json` -> `author`
- [ ] `README.md` -> the link table at the top
- [x] Repo name and placeholders already set to `zainab1315/devops-module5-api`

---

## Step 1 - Run and test locally

```powershell
cd D:\devops-module5-project
npm install
npm run lint
npm test
```

Expect: 4 passing test suites, 35 passing tests, ~98% coverage.

```powershell
npm start
```

In a second terminal:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expect `"status": "ok"`. Stop the app with `Ctrl+C`.

---

## Step 2 - Run the full Docker stack

Docker Desktop must be running (already installed here, engine v29.8.1).

```powershell
docker compose up -d --build
docker compose ps
```

| Check | URL | Expect |
|-------|-----|--------|
| API root | <http://localhost:3000> | JSON with `endpoints` |
| Health | <http://localhost:3000/health> | `"status":"ok"` |
| Metrics | <http://localhost:3000/metrics> | `api_http_requests_total` |
| Prometheus | <http://localhost:9090> | target `module5-api` = UP |
| Grafana | <http://localhost:3001> | `admin` / `admin` |

Generate traffic so the charts are not empty:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1 -Requests 300
```

Confirm the container is healthy:

```powershell
docker inspect --format '{{.State.Health.Status}}' module5-api
```

Take **two screenshots**: the Grafana dashboard and a green CI run. You will
need them for LinkedIn.

Tear down when finished:

```powershell
docker compose down
```

---

## Step 3 - Push to GitHub (done)

```powershell
git init -b main
git add .
git status                     # check nothing sensitive is staged
git commit -m "feat: initial commit"
git remote add origin https://github.com/zainab1315/devops-module5-api.git
git push -u origin main
```

Pushed, and both workflows run green:

| Workflow | Result |
|----------|--------|
| `CI` | success - Validate Workflows, Unit Tests, Build Docker Image |
| `Build and Push Image` | success - the push job is **skipped** until the Docker Hub secrets exist |

That skip is intentional: a `check-secrets` guard job inspects
`DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` and skips the push with a warning
annotation instead of failing the whole run.

---

## Step 4 - Add the secrets (required before the image is published)

### Docker Hub

1. <https://hub.docker.com> -> sign up
2. **Account Settings -> Personal access tokens -> Generate new token** -> Read/Write -> copy it
3. GitHub -> your repo -> **Settings -> Secrets and variables -> Actions -> New repository secret**

Add these two:

| Secret name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | your Docker Hub username (`zainab1315`) |
| `DOCKERHUB_TOKEN` | the access token (not your Docker Hub password) |

Confirm each appears under **Settings -> Secrets and variables -> Actions**.

### Trigger the publish

```powershell
git commit --allow-empty -m "ci: publish image with Docker Hub credentials"
git push
```

`docker-publish.yml` now runs for real and the image appears at
<https://hub.docker.com/r/zainab1315/devops-module5-api>.

### Release with a version tag

```powershell
git tag v1.0.0
git push origin v1.0.0
```

This runs `cd.yml`: test -> build -> push -> Trivy scan -> deploy -> release.

---

## Step 5 - Deploy (pick one)

### Option A - Render (easiest, free tier)

1. <https://render.com> -> sign up with GitHub
2. **New -> Blueprint** -> connect `zainab1315/devops-module5-api`
3. Render reads `render.yaml` automatically -> click **Apply**
4. Once it deploys, copy the service URL, e.g. `https://devops-module5-api.onrender.com`
5. Service -> **Settings -> Deploy -> Deploy Hook** -> copy the URL
6. Add it as the `RENDER_DEPLOY_HOOK` secret in GitHub
7. Test the live API:

```powershell
Invoke-RestMethod https://devops-module5-api.onrender.com/health
```

Note: the free tier sleeps after 15 minutes idle, so the first request after a
pause takes ~30 seconds. Mention this in your write-up.

### Option B - Railway

```powershell
npm i -g @railway/cli
railway login
railway init
railway up
```

`railway.json` sets the Dockerfile builder and the `/health` check.

### Option C - AWS (ECR + App Runner)

Push to Amazon ECR, then create an App Runner service from that image with the
health check path `/health`. Show the Terraform or console steps in your report.

---

## Step 6 - LinkedIn post

```markdown
Module 5 of my internship is done - DevOps, CI/CD & Monitoring.

I built and shipped a production-style REST API end to end:

- Node.js + Express REST API with a full CRUD resource
- 35 unit and integration tests (Jest + Supertest) at ~98% coverage
- ESLint gating the pipeline, plus enforced coverage thresholds
- Multi-stage Dockerfile (alpine, non-root user, HEALTHCHECK)
- Docker Compose stack: API + Prometheus + Grafana
- GitHub Actions CI -> actionlint, lint, test, build, smoke test, coverage artifacts
- GitHub Actions CD -> Docker Hub push, Trivy scan, Render deploy, release
- Observability: structured JSON logs, /health + /health/ready probes,
  Prometheus metrics and a provisioned Grafana dashboard

The pipeline is fully automated: a single git push runs the tests, builds and
pushes the image to Docker Hub, deploys to Render and verifies the live health
endpoint before it reports success.

One bug worth mentioning: my first workflow failed to even parse because
`secrets` is not an allowed context in a step-level `if:`. I found it with
actionlint, fixed it, and then added actionlint to CI so the same class of
error can never merge again.

Tech: Node.js 20, Express, Jest, Docker, GitHub Actions, Prometheus, Grafana

Repo: https://github.com/zainab1315/devops-module5-api
Live:  https://devops-module5-api.onrender.com/health

#DevOps #CICD #Docker #GitHubActions #Monitoring #Prometheus #Grafana #Internship
```

Replace the repo and live URLs, then add your own screenshot.

---

## Step 7 - Final verification

- [x] `npm test` passes locally (35 tests, ~98% coverage)
- [x] `npm run lint` is clean
- [x] `docker compose up` serves API, Prometheus and Grafana
- [x] Prometheus scrapes the API, all 5 alert rules loaded
- [x] Grafana dashboard auto-provisioned
- [x] Docker image builds and the container reports `healthy`
- [x] GitHub Actions runs are green
- [ ] Image published to Docker Hub (needs the secrets, Step 4)
- [ ] Live URL returns `{"status":"ok"}` from `/health` (needs the deploy, Step 5)
- [ ] LinkedIn post published
- [ ] Both links submitted on the dashboard

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm ci` fails: lock file out of sync | `rm package-lock.json; npm install` then commit |
| `DOCKERHUB_TOKEN` push denied | Use an access token, not your Docker Hub password |
| `docker compose` command not found | Add `C:\Program Files\Docker\Docker\resources\bin` to PATH |
| Port 3000 already in use | `docker compose down`, or change the port mapping |
| `permission denied while trying to connect to the Docker daemon` | Start Docker Desktop and add your user to the `docker-users` group |
| Grafana shows no data | Run the load-test script; the panels fill in within ~30s |
| Render first request is slow | Expected on the free tier (cold start) |
| `cd.yml` skips the deploy step | `RENDER_DEPLOY_HOOK` secret is empty |
| Trivy step fails | Fix the CRITICAL/HIGH findings, or note the exception in your report |
| A workflow fails instantly with "workflow file issue" | Run actionlint locally: `actionlint -color` |
