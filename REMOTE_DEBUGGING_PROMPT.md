# 🔍 Remote Bug Review & Diagnostic Prompt

Use this prompt when you encounter a bug on **www.bestflats.vip**. 

---

## 🚀 Diagnostic Toolbox (Run these on the Raspberry Pi)

### 1. Real-Time Log Monitoring
Watch the server's brain while you click buttons in the UI:
```bash
./check_logs.sh
```

### 2. Instant Email/Magic Link Retrieval
If you don't receive an email, you can use the **Mail Webserver Dashboard** directly in your browser:
*   **Local Network:** `http://<your-pi-ip>:8025`
*   **Via Cloudflare:** Map `mail.bestflats.vip` to `http://localhost:8025` in your Tunnel settings.

Alternatively, run this on the Pi to get the link in the terminal:
```bash
./check_emails.sh
```

### 3. Remote Non-Regression Tests (From Gemini CLI)
I can run these for you to verify the production environment:
```bash
cd rental-platform/frontend
npx playwright test --config=playwright.prod.config.ts
```

---

## 📧 Resolving "Email Not Sent" Issue

The platform uses **SendGrid** for production email delivery. Verify the following in your `.env`:

1. **Check SMTP settings:** Ensure `SMTP_HOST=smtp.sendgrid.net`, `SMTP_PORT=587`, `SMTP_USER=apikey`, and `SMTP_PASS` is set to your real SendGrid API key.
2. **Apply Changes:** Run `./start.sh` on the Pi.
3. **Verify:** Use `./check_logs.sh` to confirm the dispatch was successful.

---

## 📝 Bug Report Template

**Please provide the following details when you report a bug:**

- **Component:** (Frontend / Backend / Auth / Payments / Admin)
- **URL:** (e.g., https://www.bestflats.vip/calendar?apartmentId=...)
- **Steps to Reproduce:**
  1. ...
- **Observed Behavior:** (Error message? Blank screen?)
- **Expected Behavior:** (What should happen?)
- **Recent Changes:** (Environment variables or code updates?)

---

## 🛠️ Internal Diagnostic Strategy (For Gemini)
When a bug is reported, I will:
1. **Analyze:** Check the component and logic flow in the local codebase.
2. **Probe:** Execute `curl` or Playwright tests against the production URL.
3. **Hypothesize:** Identify misconfigurations (SMTP, SSL, Env, MongoDB).
4. **Suggest/Fix:** Propose code fixes or environment changes.

