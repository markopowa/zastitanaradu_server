# Šta TI treba da uradiš da bude sve spremno

Kratka checklista. Oznake: **✅ već urađeno** · **▢ treba da uradiš** ·
**🔁 automatski kroz `deploy.sh`**.

Većinu posla radi `deploy.sh` (migracije, build frontenda, static, systemd
timeri, nginx, ssl). Tebi ostaje malo — dole je tačno šta.

---

## Redosled

### 1. ▢ Postmark token (za mejlove) — pre deploy-a
`backend.env` je već podešen za Postmark SMTP (host, port, TLS, from). Fali samo
token. U Postmark-u uzmi **Server API Token** i verifikuj pošiljaoca
(Sender Signature ili domen za `noreply@mak-total-safety.pznr.in.rs`), pa u
`backend.env` upiši token u **obe** linije:
```
EMAIL_HOST_USER=<SERVER_API_TOKEN>
EMAIL_HOST_PASSWORD=<SERVER_API_TOKEN>
```
> Ako preskočiš: sve radi, samo se mejlovi ne šalju dok ne dodaš token pa opet deploy.

### 2. ▢ Pokreni deploy (kao root, u svom terminalu)
```bash
sudo ./deploy.sh ./deploy.conf all --clean-logs
```
Ovo **automatski** (🔁): `docker compose down` (kratak prekid, baza ostaje) →
build backend image → `makemigrations` + `migrate` (primeni i `0011` za opremu) →
rebuild frontenda sa ispravnim API base (Obrazac 1 dugme, logo, izbor opreme) →
`collectstatic` → nginx/ssl/firewall → **systemd timeri** (dnevni motor).

### 3. ▢ Promeni privremenu lozinku
Nalozi su već napravljeni (vidi ✅ dole) sa privremenom lozinkom
`MakSafety2026!`. Uloguj se kao svaki i promeni je (ili reset komandom u §B).

### 4. ▢ Dodaj fajlove šablona i obeleži polja (kroz aplikaciju)
- **Šabloni dokumenata → „Uredi polja"** (`/documents/templates`): dodaj
  `.docx/.pdf` i klikom obeleži polja (npr. „Uput za lekarski pregled").
- **Na firmi → tab „Radna mesta i rizik" → „Blanko šabloni po radnom mestu"**:
  otpremi Obrazac 6 / Revers LZO / Potvrda po članu 5 za svako radno mesto
  (ostaju Word — popunjavaju se i štampaju ručno).

### 5. ▢ Provera da sve radi
```bash
# kontejneri gore
docker compose ps
# timeri aktivni
systemctl list-timers 'pznr-*'
# ceo tok "posle setapa" (scenario za video):
cd backend && .venv/bin/python manage.py test processes.test_integration_flow --settings=core.settings_test
```

---

## ✅ Već urađeno (ne moraš ponovo)

- **Inicijalni katalog** (`add_setup`) je pušten na ovoj instanci: nivoi rizika,
  9 vrsta obaveza + podsetnici, kategorije/šabloni dokumenata, uloge
  **Admin/Operativa/Pregled**. (Za potpuno novu instalaciju vidi §A.)
- **Preliminarni korisnici** kreirani na živoj bazi (lozinka `MakSafety2026!`):
  | Korisnik | Prava |
  |---|---|
  | `bogdan` (bogdan.pantic@yahoo.com) | superuser + Admin (kao ti) |
  | `anita` (maktotalsafety@gmail.com) | Operativa (bez Administracije) |
  | `zoran` (zoranantic61@gmail.com) | Operativa + Pregled (vidi Administraciju, ne menja) |

  `marko` nije pravljen — ti već imaš `admin` (superuser). Svi su `is_staff`
  (primaju interne podsetnike).
- **Backend** (test suite 90 OK): E2E integration test, oprema→auto-obaveza
  (+migracija 0011), 5 zastarelih testova usklađeno.
- **Frontend** (build OK): Obrazac 1 dugme, favicon+logo, izbor vrste obaveze na opremi.
- **Postmark** ne-tajni deo upisan u `backend.env`.

---

## Dodatak — komande koje ti mogu zatrebati

### §A. Nova instalacija / prazna baza (jednokratno)
Ako ikad podižeš čistu instancu, posle prvog deploy-a pusti katalog i korisnike:
```bash
docker exec zastitanaradu_server-backend-1 python manage.py add_setup
docker exec zastitanaradu_server-backend-1 python manage.py seed_preliminary_users --password 'IZABERI'
```

### §B. Reset lozinki preliminarnih korisnika
```bash
docker exec zastitanaradu_server-backend-1 \
  python manage.py seed_preliminary_users --password 'NOVA' --reset-password
```

### §C. Test slanja mejla (posle Postmark tokena)
```bash
docker exec zastitanaradu_server-backend-1 python manage.py send_test_email --to tvoj@mejl.rs
```

### §D. Ručno pokretanje dnevnog motora (inače ide preko timera)
```bash
docker exec zastitanaradu_server-backend-1 python manage.py run_due_processes
docker exec zastitanaradu_server-backend-1 python manage.py run_process_reminders
```
Interni primaoci = aktivni `is_staff` korisnici sa mejlom; za precizniji krug
postavi grupu i env `REMINDER_INTERNAL_GROUP=<naziv grupe>`.
