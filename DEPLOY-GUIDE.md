# Deploy-guide: Kosttilskudsvalg.dk

Kör på samma VPS som fordonssajten. Kosttilskudsvalg kör på **port 3001**, fordonssajten behåller port 3000.

## Förutsättningar

Servern har redan (från fordonssajten):
- Node.js LTS
- npm
- PM2
- Nginx
- Certbot / Let's Encrypt

## 1. DNS (Inleed-panelen)

Lägg till A-records som pekar till VPS-IP:

```
kosttilskudsvalg.dk        A    <VPS-IP>
www.kosttilskudsvalg.dk    A    <VPS-IP>
```

## 2. Skapa GitHub-repo

```bash
# På din lokala dator (i Kostmag-mappen):
git init
git add .
git commit -m "Initial commit"

# Skapa privat repo på GitHub, sedan:
git remote add origin git@github.com:<ditt-konto>/kosttilskudsvalg.git
git branch -M main
git push -u origin main
```

## 3. Klona på servern

```bash
ssh <VPS-IP>
cd /var/www
git clone git@github.com:<ditt-konto>/kosttilskudsvalg.git
cd kosttilskudsvalg
```

## 4. Skapa .env.local

Alla variabler nedan krävs för att appen ska starta. Generera starka slumpmässiga värden på servern.

```bash
cat > .env.local << EOF
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<starkt-lösenord>
SESSION_SECRET=$(openssl rand -hex 32)
OPENAI_API_KEY=<din-openai-nyckel>
GEMINI_API_KEY=<din-gemini-nyckel>
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
EOF
```

## 5. Installera, bygg och starta

```bash
npm ci --include=dev
NODE_ENV=production npm run build
PORT=3001 pm2 start npm --name kosttilskudsvalg -- start
pm2 save
```

Verifiera att appen svarar:

```bash
curl -s http://localhost:3001 | head -20
```

## 6. Nginx-konfiguration

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/kosttilskudsvalg
sudo ln -s /etc/nginx/sites-available/kosttilskudsvalg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL-certifikat

```bash
sudo certbot --nginx -d kosttilskudsvalg.dk -d www.kosttilskudsvalg.dk
```

Certbot uppdaterar nginx-konfigurationen automatiskt med cert-sökvägar.

## 8. Verifiera

```bash
curl -sI https://www.kosttilskudsvalg.dk | head -5
pm2 status
```

## 9. GitHub webhook (valfritt, för auto-deploy)

1. Gå till repo → Settings → Webhooks → Add webhook
2. **Payload URL:** `https://www.kosttilskudsvalg.dk/api/github-deploy`
3. **Content type:** `application/json`
4. **Secret:** samma som `GITHUB_WEBHOOK_SECRET` i `.env.local`
5. **Events:** Just the push event

Auto-deploy är avstängd som standard. Aktivera genom att lägga till i `.env.local`:

```
AUTO_DEPLOY_ENABLED=true
```

## Manuell deploy

SSH:a in och kör:

```bash
cd /var/www/kosttilskudsvalg
bash scripts/deploy.sh
```

## Felsökning

```bash
# PM2-status
pm2 status
pm2 logs kosttilskudsvalg --lines 50

# Deploy-logg
tail -50 /var/www/kosttilskudsvalg/deploy.log

# Nginx-logg
sudo tail -50 /var/log/nginx/error.log

# Tvinga full deploy (skippa no-op check)
FORCE_DEPLOY=true bash scripts/deploy.sh
```
