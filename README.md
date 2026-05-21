# Protivpožarna zaštita i zaštita na radu

Sistem za praćenje obaveza iz domena protivpožarne zaštite i zaštite na radu: obuke, pregledi, periodične provere i slično. Omogućava upis klijenata (firme), zaposlenih i opreme, definisanje vrsta obaveza i njihovo zakazivanje, kao i rad sa dokumentima i šablonima.

---

## Arhitektura

- **Backend**: Django (Python), Django REST Framework, JWT autentifikacija
- **Frontend**: React, TypeScript, Vite, Material UI
- **Baza**: PostgreSQL (u produkciji)
- **API**: REST; frontend komunicira sa backendom preko JSON API-ja

Struktura repozijuma:

- `backend/` — Django projekat (aplikacije: `authentication`, `documents`, `partners`, `ai_processing`, `processes`)
- `frontend/` — React SPA
- `DEPLOY.md` — uputstvo za deploy na server (nginx, gunicorn, Docker, SSL, systemd task runner, cron za certbot)

---

## Kako sistem radi — pregled

### 1. Partneri (klijenti, zaposleni, oprema)

Modul **partners** drži:

- **Klijentske firme** — naziv, PIB, adresa, kontakt (email, telefon), logo, napomene.
- **Zaposleni** — vezani uz klijentsku firmu (opciono), ime, prezime, email, organizaciona jedinica, pozicija.
- **Oprema** — vezana uz klijentsku firmu, naziv, kategorija, inventarski broj, lokacija.

Ovo su **subjekti** na koje se kasnije vezuju obaveze (npr. obuka za zaposlenog, pregled opreme, obaveza na nivou cele firme).

---

### 2. Dokumenti

Modul **documents** služi za:

- **Kategorije dokumenata** — grupisanje dokumenata.
- **Dokumenti (fajlovi)** — upload fajlova, vezani uz kategoriju, verziju, period važenja, jezik.
- **Šabloni dokumenata** — za generisanje dokumenata u toku obaveza. Mogu se napraviti:
  - **Iz postojećeg dokumenta** — sistem učitava DOCX/TXT, zamenjuje nizove `___` (tri ili više donjih crta) placehold-erima tipa `{{ field_1 }}`, `{{ field_2 }}` itd. i čuva telo šablona.
  - **Iz uploud-ovanog fajla** — ista logika za DOCX/TXT.
- Šablon ima **kontekst tipa**: zaposleni, oprema, klijentska firma ili mešovito (za popunjavanje polja pri generisanju).
- **AI formati** — definišu kako se dokument može parsirati (npr. ekstrakcija podataka). Za svaki dokument može da postoji instanca obrade po formatu (status: na čekanju, u toku, završeno, neuspešno). Pokretanje obrade i pregled statusa ide preko **ai_processing** API-ja. Red obrade obrađuje management komanda `python manage.py process_ai_document_queue` (ekstrakcija teksta iz PDF/TXT; za produkciju je zgodno zakazati je u cron-u ili systemd timeru pored ostalih poslova).

---

### 3. Obaveze — jezgro sistema

Modul **processes** upravlja periodičnim obavezama i njihovim izvršenjima.

#### 3.1 Vrste obaveza (ProcessType)

- **Šifra**, naziv, opis.
- **Subjekt**: obaveza se odnosi na **zaposlenog**, **opremu** ili **klijentsku firmu**.
- **Podrazumevani period** (npr. 12 meseci) — koliko traje važenje nakon izvršenja.
- **Lead time** (dani) — koliko dana unapred da se prijavi/obavi obaveza.
- Aktivna/neaktivna.

Primeri: „Obuka – zaštita na radu“, „Pregled aparata za gašenje“, „Provera dozvole za rad“.

#### 3.2 Šabloni obaveza (ProcessTemplate)

Za svaku **vrstu obaveze** definišu se šabloni koji kažu **šta da se uradi** i **kada**:

- **Trigger** (kada):
  - **N dana pre termina** (ON_LEAD) — kad `run_due_processes` kreira aktivnost (`fire_date = next_run_at − lead_time`).
  - **Na zakazani datum** (ON_SCHEDULED) — dan termina; dnevni job `run_process_reminders`.
  - **Prilikom završetka** (ON_COMPLETED) — kada korisnik označi run kao završen.
  - **Nije završeno na vreme** (ON_OVERDUE) — posle termina, run još pending/sent; `run_process_reminders`.
- **Akcije**:
  - **Generisanje dokumenta** — iz izabranog šablona dokumenta (za ON_SCHEDULED u `run_process_binding`).
  - **Slanje emaila** — primaoca biraš po tipu: glavni email klijenta, email zaposlenog, interna uloga ili prilagođena adresa; predmet i telo podržavaju Jinja2 (npr. `{{ valid_until }}`, `{{ process_type_name }}`).

**Kako radi generisanje dokumenta.** Kad šablon obaveze ima uključeno „generiši dokument“ i izabran šablon dokumenta, sistem pri pokretanju run-a: (1) sastavi **kontekst** iz snapshot-a subjekta (ime, email, inventarski broj itd.), datuma run-a (`scheduled_for`, `performed_at`, `valid_until`), naziva vrste obaveze i polja `field_1`, `field_2` iz snapshot-a; (2) ako šablon ima **DOCX fajl**, učitava ga i u svim paragrafima zamenjuje Jinja2 placeholdere (`{{ key }}`) vrednostima iz konteksta; (3) ako ima samo **template_body** (tekst) ili DOCX nije uspeo, renderuje telo šablona Jinja2-om; (4) kreira **DocumentFile** u izabranoj kategoriji, sa naslovom tipa „Ime šablona – Run #123“, snima generisani fajl i vezuje ga za run preko **ProcessRunDocument** (usage: izveštaj). Dokument se vodi kao upload-ovan od „sistemskog“ korisnika (npr. prvog superuser-a).

Jedna vrsta obaveze može imati više šablona (npr. jedan za „pri zakazivanju“ – email + dokument, drugi za „pri završetku“).

#### 3.3 Raspored obaveze (ProcessBinding)

- Vezuje **vrstu obaveze** za **jedan subjekt**: jednog zaposlenog, jednu stavku opreme ili jednu klijentsku firmu.
- Opciono: **prilagođeni period** (meseci) i **lead time** (dani), inače se uzimaju iz vrste obaveze.
- **next_run_at** — datum kada obaveza sledeće „due“ (treba da se pokrene).
- **last_run_at** — kada je poslednji put izvršena.
- Aktivna/neaktivna.

Primer: „Obuka – zaštita na radu“ za zaposlenog Marko Marković, sledeći rok 15.03.2026.

#### 3.4 Izvršenje obaveze (ProcessRun)

- Jedno **izvršenje** obaveze za dati **ProcessBinding**.
- Snapshot subjekta (JSON) u trenutku pokretanja — ime, email, inventarski broj itd.
- **scheduled_for** — zakazan datum, **performed_at** — izvršeno, **valid_until** — do kada važi (npr. obuka važi 12 meseci).
- **Status**: na čekanju, završeno, otkazano, neuspešno.
- Napomene, opciono **result_data** (JSON).
- Na run mogu da se vezuju **dokumenti** (npr. poziv, izveštaj, potvrda) i **zadaci** (TaskAssignment).

**Zadaci (TaskAssignment)** služe da se pojedinačno izvršenje obaveze dodeli nekom od radnika firme koja koristi ovaj softver. Na primer: obuka za zaštitu na radu za klijenta „XYZ“ je zakazana za 15. mart. Izvršenje (ProcessRun) se kreira, a zatim se tom run-u dodeli zadatak radniku Petru Periću — njegovo je zaduženje da održi obuku, da prati rok i da u sistemu označi zadatak kao završen. Zadatak ima naslov, opis, rok i status (za uraditi / u toku / završeno), tako da i rukovodilac i izvršilac vide ko je zadužen i u kom je stanju posao.

#### 3.5 Automatsko pokretanje obaveza koje su „due“

- Management komanda:  
  `python manage.py run_due_processes`  
  (u `backend/processes/management/commands/run_due_processes.py`).
- Logika:
  1. Nađe sve **aktivne ProcessBinding** gde je `next_run_at <= danas` i za koje već ne postoji **ProcessRun** u statusu „na čekanju“.
  2. Za svaki takav binding pozove `run_process_binding(binding_id)`:
     - kreira **ProcessRun** u statusu **na čekanju (PENDING)**, sa snapshot-om subjekta i `scheduled_for` iz bindinga;
     - primeni **ON_LEAD** šablone (npr. interni email); uput zaposlenom ide na dan termina preko `run_process_reminders`.
  3. **Ne** automatski završava run niti postavlja `performed_at` / `valid_until`; to korisnik (ili drugi tok) radi ručno preko API-ja **complete**. Nakon ručnog završetka binding dobija ažuriran `last_run_at` i `next_run_at` (v. odeljak 3.6).
- Na serveru se ovo **već zakazuje** korakom **setupTaskRunner** u `deploy.sh`: systemd timer pokreće komandu svakog dana u 06:00 (v. DEPLOY.md, odeljak o task runneru i logu `run_due_processes.log`).

#### 3.5.1 Podsetnici na dan termina i za propuštene (run_process_reminders)

- Management komanda:  
  `python manage.py run_process_reminders`
- **ON_SCHEDULED**: aktivnosti *Na čekanju* / *Poslat* gde je `scheduled_for = danas` — uput + email zaposlenom.
- **ON_OVERDUE**: isti statusi gde je `scheduled_for < danas` — podsetnik da pregled nije završen (jednom po run-u).
- Test: `python manage.py run_process_reminders --date YYYY-MM-DD`
- **Preporuka**: zakazati dnevno (npr. 07:00) pored `run_due_processes` (v. DEPLOY.md).

#### 3.5.2 Prilikom ručnog završetka (ON_COMPLETED)

- Kada korisnik ručno označi run kao završen (endpoint `complete`), poziva se `run_on_completed_trigger(run)`: za sve šablone obaveza sa triggerom **ON_COMPLETED** izvršava se ista putanja kao za druge triggere — **generisanje dokumenta** i/ili **slanje emaila** preko `execute_template_actions`, zatim se po potrebi kreira ili ažurira sledeći **ProcessBinding** kada šablon definiše **followup** vrstu obaveze.

#### 3.6 Ručno upravljanje run-ovima

- Preko API-ja (i frontenda) može se:
  - kreirati novi **ProcessRun** za binding (npr. ručno zakazivanje);
  - označiti run kao **završen** (endpoint `complete`) — unosi se `performed_at`, `valid_until`, napomene; bindingu se ažurira `last_run_at` i `next_run_at`.
- **Dashboard** (frontend) prikazuje obaveze koje **ističu** u narednih N dana (završeni run-ovi čiji je `valid_until` u tom periodu), sa filterima po firmi, tipu subjekta, vrsti obaveze.

---

### 4. Autentifikacija i korisnici

- **authentication** modul koristi Django korisnike; API koristi JWT (token u kolačiću ili Authorization header).
- Uloge i dozvole upravljaju ko može da pristupi kojem delu aplikacije (npr. Django model permissions na API resursima).

---

## Kratak tok primera

1. Uneseš **klijentsku firmu** i **zaposlene** (partners).
2. Kreiraš **vrstu obaveze** npr. „Obuka – zaštita na radu“, subjekt = zaposleni, period 12 meseci.
3. Za tu vrstu dodaješ **šablon obaveze**: trigger = pri zakazivanju, akcije = pošalji email zaposlenom i po potrebi **generiši dokument** iz šablona dokumenta (v. odeljak 3.2).
4. Za svakog zaposlenog kreiraš **ProcessBinding** (vrsta + zaposleni), sa `next_run_at` npr. 01.03.2026.
5. Na serveru zakazani posao (npr. systemd timer iz `deploy.sh`) svakodnevno pokreće `run_due_processes`. 1. marta za sve bindings sa `next_run_at <= 01.03.2026` (bez već postojećeg pending run-a) sistem kreira **pending** run i primeni ON_SCHEDULED šablone (email, generisanje dokumenta). Kada korisnik ručno završi run (`complete`), tada se postavljaju `performed_at`, `valid_until` i ažurira binding (`last_run_at`, `next_run_at`).
6. Korisnici na **dashboardu** vide obaveze koje ističu u narednih 30 dana; mogu ručno da kreiraju run-ove, završavaju ih i **dodeljuju zadatke radnicima** (npr. „Obuka za firmu XYZ“ → zadatak za Petra Perića da održi obuku i označi je kao završenu).

---

## Deployment

Produkcijski deploy: **DEPLOY.md** — `deploy.sh`, korak **setupTaskRunner**: `run_due_processes` (06:00), `run_process_reminders` (07:00), `process_ai_document_queue` (svakih 5 min).

**Brzi redeploy** (`./deploy.sh ./deploy.conf all --quick`): bez `docker compose down`; **setupDockerQuick** kopira `backend/` u kontejner (bez `docker build`), `migrate`, koristi postojeći `frontend/dist` na disku, restart backend-a i reload nginx-a. Posle izmene UI-a prvo `npm run build` u `frontend/` ili pun **setupDocker**.

**Nuklearna opcija** (`./deploy.sh ./deploy.conf all --nuclear`): pre pokretanja koraka izvršava se `docker compose down -v` — gasi se kontejneri i **brišu Docker volumeni** (uključujući bazu). Korisno za potpuno čisto ponovno postavljanje okruženja; svi podaci u bazi i na volumenima se gube.

---

## Šta možemo dopuniti
- **AI obrada**: Osnovni worker (`process_ai_document_queue`) radi ekstrakciju teksta (PDF/TXT) i prelazak u DONE ili FAILED; dalje se može dopuniti (LLM po `prompt_template`, drugi formati fajlova, eksterni servis).
