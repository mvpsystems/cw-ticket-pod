# Ticket Context Pod — Setup Guide

This pod appears as a panel on every Service Ticket in ConnectWise PSA, showing:
- Company name, agreement status, and territory
- Count + list of other open tickets for that company (clickable)
- Contact name, email, and phone

---

## Current deployment (MVP Technologies)

| Item | Value |
|------|-------|
| GitHub repo | `https://github.com/mvpsystems/cw-ticket-pod` |
| Live URL | `https://mvpsystems.github.io/cw-ticket-pod/ticket-pod.html` |
| PSA registration | System → Setup Tables → Manage Hosted API → "Ticket Context Pod" |
| PSA URL field | `https://mvpsystems.github.io/cw-ticket-pod/ticket-pod.html?id=[cw_id]` |
| Status | ⚠ **CORS proxy not yet deployed** — pod loads but shows no data |

**Next step to make the pod work:** complete Step 1-A below (Cloudflare Worker).

---

## Step 1-A — Deploy the Cloudflare Worker (CORS proxy) — required

The ConnectWise REST API does not allow browser requests from external domains (CORS). You need a tiny proxy server that makes the API call on the pod's behalf.

**Cloudflare Workers** is free (100,000 requests/day), no credit card required.

### Deploy the Worker

1. Go to **https://dash.cloudflare.com** and sign in (or create a free account).
2. Click **Workers & Pages** → **Create** → **Create Worker**.
3. Name it `cw-api-proxy` and click **Deploy**.
4. Click **Edit Code** on the success screen.
5. **Select all** the starter code and delete it.
6. Open `cloudflare-worker.js` from this folder and paste the entire contents.
7. Click **Save & Deploy**.

### Set the credentials as environment variables

Still on the Worker page:

1. Go to **Settings** → **Variables and Secrets**.
2. Add four **Environment Variables** (click **Add Variable** for each):

| Variable name | Value |
|---------------|-------|
| `CW_COMPANY_ID` | `mvptech` |
| `CW_CLIENT_ID` | (your ConnectWise Client ID) |
| `CW_PUBLIC_KEY` | (your API member public key) |
| `CW_PRIVATE_KEY` | (your API member private key — **click Encrypt**) |

3. Click **Save and deploy**.

### Note your Worker URL

At the top of the Worker page you'll see a URL like:
`https://cw-api-proxy.mvpsystems.workers.dev`

Copy that URL — you need it in the next step.

---

## Step 1-B — Update the pod to use the Worker URL

1. Open `ticket-pod.html` in a text editor.
2. Find the `CONFIG` block near the top of the `<script>` section.
3. Replace `REPLACE_WITH_YOUR_WORKER_URL` with your actual Worker domain:

```javascript
API_BASE: 'https://cw-api-proxy.mvpsystems.workers.dev/v4_6_release/apis/3.0',
```

4. Save the file.
5. Commit and push to GitHub:
   ```
   git add ticket-pod.html
   git commit -m "fix: point API_BASE to Cloudflare Worker proxy"
   git push
   ```
6. GitHub Pages deploys in about 60 seconds. Then test:
   `https://mvpsystems.github.io/cw-ticket-pod/ticket-pod.html?id=1763`

---

## Step 2 — Register the pod in ConnectWise PSA (already done for MVP)

If you ever need to re-register or set up on a fresh instance:

1. Log in to PSA as an admin.
2. Go to **System → Setup Tables → Manage Hosted API**.
3. Click **+** and fill in:

| Field | Value |
|-------|-------|
| **Description** | Ticket Context Pod |
| **URL** | `https://mvpsystems.github.io/cw-ticket-pod/ticket-pod.html?id=[cw_id]` |
| **Origin** | `https://mvpsystems.github.io` |
| **Screen** | Service Tickets |
| **Type** | Pod |
| **Enabled** | ✓ |

> The `[cw_id]` token is replaced by PSA with the current ticket's record ID before loading the iframe.

---

## Step 3 — Add the pod to your ticket layout (per user, once)

Each PSA user must add the pod to their own layout:

1. Open any Service Ticket.
2. Click the **+** button on the right-side panel.
3. Scroll to **Ticket Context Pod** in the "Not Displayed" list.
4. Click it to select it, then click **>** to move it to "Displayed".
5. Click **Save**.

The pod will now appear on every Service Ticket for that user.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| "Could not load data (TypeError: Failed to fetch)" | Worker not deployed, or `API_BASE` still has the placeholder URL |
| "Could not load data (HTTP 401)" | Worker env vars wrong — check `CW_COMPANY_ID`, `CW_PUBLIC_KEY`, `CW_PRIVATE_KEY` |
| "Could not load data (HTTP 403)" | Worker rejecting the request — check that the request Origin matches `ALLOWED_ORIGIN` in the Worker |
| Blank white pod, no error | URL misconfigured in PSA Setup Tables, or GitHub Pages not yet deployed |
| "No ticket loaded" | `[cw_id]` token not substituted — check URL field in Setup Tables includes `?id=[cw_id]` |
| Data loads on first ticket but not on navigation | `ConnectWiseHostedAPI.1.0.js` not loading — check `<script src>` path |

---

## Customizing the pod

Everything is in `ticket-pod.html`. Key sections:

- **CONFIG block** (top of `<script>`) — Worker URL, max tickets shown
- **`loadTicket()`** — add more API calls here (e.g. pull RMM data, configuration list)
- **`renderContact()`** — change which contact fields are shown
- **Styles** — all CSS is inline; matches PSA's `#026ccf` blue and `#212121` body text
