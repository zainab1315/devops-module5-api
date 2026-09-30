# Submissions checklist

Work through this top to bottom. Tick every box, then post the LinkedIn
update and submit both links on your dashboard.

---

## Step 0 â€” Fill in your details

Open these files and replace the placeholders:

- [ ] `package.json` â†’ `author`
- [ ] `README.md` â†’ title section
- [ ] `SUBMISSION.md` â†’ the `YOUR_` placeholders in Step 5

---

## Step 1 â€” Run and test locally

```powershell
cd D:\devops-module5-project
npm install
npm run lint
npm test
```

Expect: `4 passed` test suites, `35 passed` tests, ~98% coverage.

```powershell
npm start
```

In a second terminal:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expect `"status": "ok"`.

Stop the app with `Ctrl+C`.

---

## Step 2 â€” Run the full Docker stack

Docker Desktop must be running.

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

## Step 3 â€” Create the GitHub repository

```powershell
git init -b main
git add .
git status                     # check nothing sensitive is staged
git commit -m "feat: initial commit - Express REST API with tests, Docker, CI/CD and monitoring"
```

Verify `node_modules/` and `.env` are **not** listed â€” `.gitignore` handles both.

Create the repo on GitHub (private or public), then:

```powershell
git remote add origin https://github.com/zainab1315/devops-module5-api.git
git push -u origin main
```

`ci.yml` and `docker-publish.yml` trigger on this push. Watch them run under
the **Actions** tab. Because there are no secrets yet, the push step will
fail â€” that is expected at this point.

---

## Step 4 â€” Add the secrets

### Docker Hub

1. <https://hub.docker.com> â†’ sign up
2. **Account Settings â†’ Personal access tokens â†’ Generate new token** â†’ Read/Write â†’ copy it
3. GitHub â†’ your repo â†’ **Settings â†’ Secrets and variables â†’ Actions â†’ New repository secret**

Add these three:

| Secret name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | the access token (not your password) |
| `RENDER_DEPLOY_HOOK` | leave empty for now, see Step 5 |

Confirm each appears under **Settings â†’ Secrets and variables â†’ Actions**.

### Re-run the pipeline

```powershell
git commit --allow-empty -m "ci: trigger workflow with Docker Hub secrets"
git push
```

`docker-publish.yml` should now go green and your image appears at
<https://hub.docker.com/r/zainab1315/devops-module5-api>.

### Release with a version tag

```powershell
git tag v1.0.0
git push origin v1.0.0
```

This runs `cd.yml`: test â†’ build â†’ push â†’ Trivy scan â†’ deploy â†’ release.

---

## Step 5 â€” Deploy (pick one)

### Option A â€” Render (easiest, free tier)

1. <https://render.com> â†’ sign up with GitHub
2. **New â†’ Blueprint** â†’ connect `zainab1315/devops-module5-api`
3. Render reads `render.yaml` automatically â†’ click **Apply**
4. Once it deploys, copy the service URL, e.g. `https://devops-module5-api.onrender.com`
5. Service â†’ **Settings â†’ Deploy â†’ Deploy Hook** â†’ copy the URL
6. Add it as the `RENDER_DEPLOY_HOOK` secret in GitHub
7. Test the live API:

```powershell
Invoke-RestMethod https://devops-module5-api.onrender.com/health
```

Note: the free tier sleeps after 15 minutes idle, so the first request after a
pause takes ~30 seconds. Mention this in your write-up.

### Option B â€” Railway

```powershell
npm i -g @railway/cli
railway login
railway init
railway up
```

`railway.json` sets the Dockerfile builder and the `/health` check.

### Option C â€” AWS (ECR + App Runner)

Push to Amazon ECR, then create an App Runner service from that image with the
health check path `/health`. Show the Terraform or console steps in your report.

---

## Step 6 â€” LinkedIn post

```markdown
Module 5 of my internship is done â€” DevOps, CI/CD & Monitoring. ðŸš€

I built and shipped a production-style REST API end to end:

ðŸ”¹ Node.js + Express REST API with a full CRUD resource
ðŸ”¹ 35 unit and integration tests (Jest + Supertest) at ~98% coverage
ðŸ”¹ ESLint gating the pipeline, plus enforced coverage thresholds
ðŸ”¹ Multi-stage Dockerfile (alpine, non-root user, HEALTHCHECK)
ðŸ”¹ Docker Compose stack: API + Prometheus + Grafana
ðŸ”¹ GitHub Actions CI â†’ lint, test, build, smoke test, coverage artifacts
ðŸ”¹ GitHub Actions CD â†’ Docker Hub push, Trivy scan, Render deploy, release
ðŸ”¹ Observability: structured JSON logs, /health + /health/ready probes,
   Prometheus metrics and a provisioned Grafana dashboard

The pipeline is fully automated: `git push` runs the tests, builds and pushes
the image to Docker Hub, deploys to Render and verifies the live health
endpoint before it reports success.

Tech: Node.js 20 Â· Express Â· Jest Â· Docker Â· GitHub Actions Â· Prometheus Â· Grafana

Repo: https://github.com/zainab1315/devops-module5-api
Live:  https://devops-module5-api.onrender.com/health

#DevOps #CICD #Docker #GitHubActions #Monitoring #Prometheus #Grafana #Internship
```

Replace the repo and live URLs, then add your own screenshot.

---

## Step 7 â€” Final verification

- [ ] `npm test` passes locally
- [ ] `npm run lint` is clean
- [ ] `docker compose up` serves API, Prometheus and Grafana
- [ ] Grafana dashboard shows live data
- [ ] GitHub Actions runs are green
- [ ] Image is on Docker Hub
- [ ] Live URL returns `{"status":"ok"}` from `/health`
- [ ] LinkedIn post published
- [ ] Both links submitted on the dashboard

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm ci` fails: lock file out of sync | `rm package-lock.json; npm install` then commit |
| `DOCKERHUB_TOKEN` push denied | Use an access token, not your Docker Hub password |
| `docker compose` command not found | Update to Docker Desktop v2, or use `docker-compose` |
| Port 3000 already in use | `docker compose down`, or change the port mapping |
| `permission denied while trying to connect to the Docker daemon` | Start Docker Desktop and add your user to the `docker-users` group |
| Grafana shows no data | Run the load-test script; the panels fill in within ~30s |
| Render first request is slow | Expected on the free tier (cold start) |
| `cd.yml` skips the deploy step | `RENDER_DEPLOY_HOOK` secret is empty |
| Trivy step fails | Fix the CRITICAL/HIGH findings, or note the exception in your report |
