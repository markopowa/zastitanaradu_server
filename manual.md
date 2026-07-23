# Ono što možeš samo ti

## Posle svakog većeg deploya (nevezano za Postmark)
```bash
docker exec zastitanaradu_server-backend-1 python manage.py add_setup
docker exec zastitanaradu_server-backend-1 python manage.py reconcile_obligation_catalog
docker exec zastitanaradu_server-backend-1 python manage.py seed_default_test
```
Kompletna checklista podešavanja: `frontend/src/testFlow/guides/00_pregled_podesavanja.md`.
Šta testiraš = vodiči 01–07 na `/integration-tests` (svaki ima „Provera" checklistu).


Jedina stvar koju ne mogu ni ja ni bilo ko drugi, jer traži tvoj nalog/tajnu:

## Postmark token (za mejlove)
U Postmark-u uzmi **Server API Token** i verifikuj pošiljaoca (Sender Signature
ili domen za `noreply@mak-total-safety.pznr.in.rs`). Upiši token u `backend.env`
u obe linije, pa redeploy:
```
EMAIL_HOST_USER=<SERVER_API_TOKEN>
EMAIL_HOST_PASSWORD=<SERVER_API_TOKEN>
```
Bez tokena sve radi osim slanja mejlova.
