# Posle svakog većeg deploya

```bash
cd /var/www/zastitanaradu_server
docker compose exec -T backend python manage.py add_setup < /dev/null
docker compose exec -T backend python manage.py reconcile_obligation_catalog < /dev/null
docker compose exec -T backend python manage.py seed_default_test < /dev/null
```

Po unosu radnih mesta pilot firme:
```bash
docker compose exec -T backend python manage.py attach_obrazac6_blanks --company "<ime>" --kind all < /dev/null
```

Posle izmene `backend.env` (Postmark, domen, itd.) — **restart nije dovoljan**:
```bash
docker compose up -d backend
```

Checklista: `frontend/src/testFlow/guides/00_pregled_podesavanja.md`.
Testiranje: vodiči 01–07 na `/integration-tests`.

## Postmark (mejlovi)

U Postmark-u: **Server API Token** + verifikovan pošiljalac za `noreply@mak-total-safety.pznr.in.rs`.

U `backend.env`:
```
EMAIL_HOST=smtp.postmarkapp.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=<SERVER_API_TOKEN>
EMAIL_HOST_PASSWORD=<SERVER_API_TOKEN>
EMAIL_FROM_ADDRESS=noreply@mak-total-safety.pznr.in.rs
```

Zatim: `docker compose up -d backend`.

E2E / Playwright protiv produkcije (bez slanja mejlova): u `backend.env` dodaj `E2E_SUPPRESS_EMAIL_SECRET=<nasumičan string>`; isti string u `instructions/e2e/.env` kao `E2E_SUPPRESS_EMAIL_TOKEN`. Samo za test skripte — normalni korisnici i tajmeri i dalje šalju mejlove.
