# Test flow — korak po korak (kompletan)

Otvori aplikaciju, prijavi se kao **superuser**, i radi tačno ovim redom. Kvadratić `[ ]` = uradi to. Posle ključnih koraka pogledaj da li je deo **Provera** prošao.

Ovaj dokument je **unija svih video-vodiča** (`video/00`–`video/06`) u jednom sekvencijalnom toku — može se čitati od vrha do dna dok se snima video. Svaki korak ide prirodnim redom procesa (firma → dokumentacija → radna mesta/rizik → zaposleni → pregledi → stručni nalazi → šabloni).

## Oznake

- 🟦 **ZORAN** — ovo je Zoran izričito tražio (u videu reci: „ovo ste tražili").
- ⚙️ **APP** — aplikaciona/UX dopuna (nije izričito traženo, ali olakšava rad).

## Šta je Zoran tražio (za napomenu u videu) → gde se testira

| Zahtev (iz mejlova) | Korak |
|---|---|
| Lična karta firme (PIB, matični, adresa, šifra delatnosti) | 2 |
| Direktor / kontakt-lice firme | 2c |
| Ugovor i Odluka (PDF) | 3a |
| Obavezna dokumentacija (pravilnici + programi obuke) | 3a |
| Akt o proceni rizika — 3 dela + izmene uz razlog + objedinjavanje u PDF | 3b |
| Radna mesta (po Aktu) + nivo rizika | 4 |
| Zaposleni | 5 |
| Lekarski pregledi (uput, mejl, evidencija) + Obrazac 1 | 6 |
| Stručni nalazi (6 tipova, rok 3 god, alarm 30 dana) | 7 |

## Mapa na video-vodiče

| Video | Pokriva korake |
|---|---|
| `video/00_pregled.md` | 0–1 (orijentacija) |
| `video/01_firma.md` | 2 |
| `video/02_obavezna_dokumentacija.md` | 3a |
| `video/03_akt_radna_mesta_rizik.md` | 3b, 4 |
| `video/04_zaposleni_lekarski.md` | 5, 6 |
| `video/05_strucni_nalazi.md` | 7 |
| `video/06_sabloni_polja.md` | 6.1 (vizuelni editor) |

---

## Test podaci (kopiraj odavde)

**Firma:**
- Naziv: `UKRAS`
- Puno poslovno ime: `PRIVREDNO DRUŠTVO UKRAS DOO, VELIKI POPOVIĆ`
- Matični broj: `20644206` *(Uvezi iz registra — popuni naziv i opštinu)*
- PIB: `unesi ručno` *(nije u open data — uzmi od klijenta)*
- Šifra delatnosti: iz registra ili ručno
- Adresa: `Veliki Popović` *(opštinu daje registar — punu adresu dopuni ručno)*
- Email: `markovuckovic1992@gmail.com` *(verifikovana SES adresa — za test)*
- Datum donošenja Akta: `15.01.2025.`

**Zaposleni:**
- Ime: `Marko` · Prezime: `Petrović` · Ime oca: `Stevan`
- JMBG: `0102990710123` *(unesi prvo — datum rođenja se sam popuni)* · Datum rođenja: `01.02.1990.` · Mesto rođenja: `Niš`
- Email: `markovuckovic1992@gmail.com` · Organizaciona jedinica: `Tehnička služba` · Pozicija: `Električar` · Zanimanje: `Električar`
- Naziv radnog mesta sa povećanim rizikom: `Električar na visini`
- Radno mesto: `Električar na visini` · Rizik — izuzetak: `Nasleđeno iz radnog mesta`

**Radno mesto i rizik:** Naziv `Električar na visini` · Nivo rizika `POVECAN` (najviši u listi)

**Nazivi:** Vrsta obaveze `Periodični lekarski pregled` · Šablon dokumenta `Uput - periodični lekarski pregled`

**Za „Završi pregled":** Datum pregleda **danas** · Važi do **danas + 12 meseci** · Broj izveštaja `IZV-2026-001` · Ocena `Sposoban` · Mere `/`

---

## 0. Priprema

- [ ] Backend radi (sajt se otvara, ne baca 500)
- [ ] Ulogovan kao **superuser** (bez toga generisanje dokumenata neće raditi)
- [ ] Test fajlovi u `files_for_test\` (Ugovor, Odluka, stručni nalazi, akt sekcije…)
- [ ] Mejl `markovuckovic1992@gmail.com` verifikovan u AWS SES
- [ ] Šifarnici popunjeni: `python manage.py fill_initial_template_fields_and_risk_levels`
- [ ] Registar firmi učitan: `python manage.py sync_company_registry` *(jednom, pa mesečno cron)*
- [ ] Tipovi stručnih nalaza: `python manage.py seed_compliance_finding_types`

---

## 1. Orijentacija — navigacija i radni prostor firme ⚙️ APP

- [ ] U sidebaru grupa se zove **Firme** (ne Klijenti); stavka **Firme** vodi na listu
- [ ] Grupe **Operativa** (Obaveze, Aktivnosti) i **Podešavanja** (Vrste obaveza, Šabloni obaveza, Nivoi rizika) su razdvojene
- [ ] Na listi firmi breadcrumbs: `Firme`
- [ ] **Firme → Dodaj firmu** otvara čarobnjak (7 koraka), ne dijalog

---

## 2. Unos firme (lična karta) 🟦 ZORAN

- [ ] **Firme → Dodaj firmu** (čarobnjak)
- [ ] Korak 1: Matični broj `20644206` → **Uvezi iz registra** (popuni naziv, opštinu, šifru delatnosti)
- [ ] PIB: unesi ručno *(obavezno — nije u open data)*
- [ ] Naziv: dopuni/izmeni ako treba *(obavezno)*
- [ ] Adresa / Email / dopuni po potrebi
- [ ] Koraci 2–7 čarobnjaka: **Preskoči korak** radi; **Završi** vodi na firmu (tab **Usklađenost**)

**Provera:**
- [ ] Firma se otvori — vidiš tab traku i breadcrumbs `Firme / UKRAS`
- [ ] Tabovi: Lična karta, Dokumentacija, Radna mesta i rizik, Zaposleni, Obaveze/Aktivnosti, Stručni nalazi, Usklađenost
- [ ] URL `?tab=…` zadržava tab posle refresh-a

### 2c. Kontakt-lica 🟦 ZORAN

- [ ] Tab **Lična karta** → sekcija **Kontakt-lica** → **Dodaj kontakt-lice**
- [ ] Ime i prezime `Petar Petrović` · Uloga `Direktor` · Telefon `060 111 2222` · Email `markovuckovic1992@gmail.com` · Primarni kontakt: uključi → **Sačuvaj**
- [ ] ⋮ → **Izmeni** (promeni telefon) → Sačuvaj; ⋮ → **Obriši** → potvrdi

**Provera:** prazna lista kaže **Nema kontakt-lica.**; primarni kontakt ima oznaku ★.

### 2e. Izmena firme i registar ⚙️ APP

- [ ] **Izmeni podatke** → unesi matični → **Uvezi iz registra** → Sačuvaj bez greške

---

## 3. Dokumentacija firme (tab Dokumentacija)

### 3a. Obavezna dokumentacija + Ugovor/Odluka 🟦 ZORAN

7 named slotova: **Ugovor, Odluka, 3 pravilnika, 3 programa obuke**.

- [ ] Proveri brojač **0 / 7 priloženo**
- [ ] Slot **Ugovor** → **Priloži** → `files_for_test\1.Ugovor.pdf`
- [ ] **Pregled** otvara PDF u dijalogu
- [ ] **Obriši** → potvrdi → slot se vraća na **nema**

**Provera:** svih 7 slotova uvek vidljivo; status **ima/nema**; brojač se ažurira.

### 3b. Akt o proceni rizika — 3 sekcije + revizije + objedinjavanje 🟦 ZORAN

- [ ] **Kreiraj Akt** (ako još nije kreiran)
- [ ] **Datum donošenja** `15.01.2025.` → **Sačuvaj datum**
- [ ] Sekcija **Uvod** → **Priloži** → test PDF → **Razlog izmene** (min. 5 znakova, npr. `Inicijalno prilaganje uvoda`) → **Sačuvaj**
- [ ] Ponovi za **Procene po radnom mestu** i **Zaključak** (svaki put sa razlogom)
- [ ] **Pregled** na jednoj sekciji — popup; **Istorija** — verzija, korisnik, razlog, **Preuzmi**
- [ ] **Objedini u PDF** — preuzme se jedan spojeni PDF (Uvod + Procene + Zaključak)

**Provera:**
- [ ] Status **Kompletan (3/3)** kad su sve tri sekcije priložene
- [ ] **Sačuvaj** onemogućen bez fajla ili sa razlogom kraćim od 5 znakova
- [ ] Stara verzija ostaje u istoriji posle izmene

---

## 4. Radna mesta i rizik (tab Radna mesta i rizik)

### 4a. Radno mesto + badge rizika 🟦 ZORAN (radna mesta)

- [ ] **Dodaj radno mesto** → Naziv `Električar na visini` · Nivo rizika `POVECAN` · Opis `Rad na visini i elektro instalacije` → Sačuvaj
- [ ] ⋮ → **Izmeni** (promeni opis) → Sačuvaj

**Provera:**
- [ ] Tabela: Naziv / Nivo rizika / Zaposleni / Akcije
- [ ] Nivo rizika je obojeni badge `Naziv (R=skor)`; kod povećanog rizika dodatni chip **Povećan rizik**
- [ ] **Obriši** onemogućen dok radno mesto ima zaposlene

### 4b. Šifarnik nivoa rizika ⚙️ APP

- [ ] **Podešavanja → Nivoi rizika** → lista prikazuje NIZAK, UMEREN, …
- [ ] **Dodaj nivo** (Šifra `TEST`, Naziv `Testni`, Skor `1`) → Sačuvaj; pa ⋮ → **Obriši** → potvrdi

**Provera:** brisanje nivoa koji se koristi prikazuje poruku da se ne može obrisati.

---

## 5. Zaposleni (tab Zaposleni) 🟦 ZORAN

- [ ] **Dodaj zaposlenog** (dijalog **Nov zaposleni**, tri sekcije: Lični podaci, Zaposlenje, Radno mesto i rizik)
- [ ] Ime `Marko` · Prezime `Petrović` · Ime oca `Stevan`
- [ ] JMBG `0102990710123` (prvo ovo — datum rođenja se sam popuni); proveri `01.02.1990.`
- [ ] Mesto rođenja `Niš` · Email `markovuckovic1992@gmail.com` · Org. jedinica `Tehnička služba` · Pozicija `Električar` · Zanimanje `Električar`
- [ ] Naziv radnog mesta sa povećanim rizikom `Električar na visini`
- [ ] **Radno mesto** `Električar na visini` → ispod se prikaže „Nivo rizika se nasleđuje iz radnog mesta: …"
- [ ] **Rizik — izuzetak** ostavi `Nasleđeno iz radnog mesta` → **Sačuvaj**

**Provera:**
- [ ] Marko u listi zaposlenih; kolona **Rizik** = obojeni badge
- [ ] Klik na red → detalj zaposlenog; „Nivo rizika" sa sufiksom „ — iz radnog mesta"

### 5a. Lista zaposlenih — pretraga i akcije ⚙️ APP

- [ ] **Firme → Zaposleni** → **Pretraga** `Marko`; ⋮ → **Istorija pregleda**; detalj → **Izmeni** → Sačuvaj

---

## 6. Lekarski pregledi — pun proces 🟦 ZORAN

### 6.1 Šablon dokumenta (Uput) + vizuelni editor polja (⚙️ editor)

- [ ] Ako fali kategorija: **Dokumenti → Kategorije → Dodaj** → `Lekarski pregledi`
- [ ] **Dokumenti → Šabloni dokumenata → Dodaj šablon**: Naziv `Uput - periodični lekarski pregled` · Kontekst `Zaposleni` · Kategorija `Lekarski pregledi`
- [ ] Način: **Kreiraj iz fajla (upload)** → `files_for_test\APR Ukras doo.pdf` → Sačuvaj
- [ ] Otvori **mapiranje polja** i poveži: Ime → `employee.first_name`, Prezime → `employee.last_name`, JMBG → `employee.national_id`, Datum rođenja → `employee.date_of_birth`, Radno mesto → `employee.position`, Naziv firme → `client.name`, Broj uputa → `instruction_number`, Datum prethodnog pregleda → `last_exam_date` → **Sačuvaj mapiranje**
- [ ] ⋮ → **Uredi polja**: klik na dokument → izaberi polje; **Veličina fonta** `12`; uključi **Poravnanje** (snap); **Pregled rezultata** (PDF); **Sačuvaj polja**

> Detaljno o editoru: `video/06_sabloni_polja.md`. PDF mora imati pravi tekst (ne sken).

### 6.2 Vrsta obaveze

- [ ] **Podešavanja → Vrste obaveza → Dodaj**: Naziv `Periodični lekarski pregled` · Subjekt `Zaposleni` · Period `12` · Rok unapred `30` · **Uključi u Obrazac 1: DA** · Aktivan: DA → Sačuvaj

**Provera:** subjekt se prikazuje kao **Zaposleni** (ne sirova vrednost); kod generiše se sam.

### 6.3 Šabloni obaveza (okidači)

- [ ] **Na zakazani datum** → Generiši dokument: DA + Šablon `Uput - periodični lekarski pregled` · Pošalji mejl: DA · Priloži generisani dokument: DA · Primalac `Email zaposlenog` (ili Custom `markovuckovic1992@gmail.com`) · Naslov `Uput za pregled - {{ process_type_name }}` · Telo (vidi ispod)
- [ ] **Kada se završi pregled** → Sledeća vrsta obaveze: `Periodični lekarski pregled` (chaining)
- [ ] *(opciono)* **N dana pre termina** → mejl internoj ulozi
- [ ] *(opciono)* **Kada nije završeno na vreme** → mejl/alarm

```
Poštovani,

U prilogu je uput za {{ process_type_name }}.
Datum: {{ scheduled_for }}.
```

### 6.4 Raspored (obaveza) za Marka

- [ ] **Operativa → Obaveze → Dodaj**: Vrsta `Periodični lekarski pregled` · Zaposleni `Marko Petrović` · Sledeći termin **danas + 30 dana** · Aktivan: DA → Sačuvaj

> Za ceo test bez čekanja: stavi **Termin = danas** i **Rok unapred = 0**.

### 6.5 „Pošalji na pregled" — jednokratno slanje ⚙️ APP

Testiraj OBA načina:
- [ ] **Firme → Zaposleni** → red Marka → **Pošalji na pregled** → Vrsta `Periodični lekarski pregled` → **Pošalji**
- [ ] **Operativa → Obaveze** → red rasporeda → **Pošalji sad**

**Provera:**
- [ ] Snackbar „Uput je poslat na mejl" (zelen) ili „…mejl nije poslat" (žut)
- [ ] Nova aktivnost u statusu **Poslat** (badge, ne sirov tekst); otvori → tab **Dokumenti** → uput prikačen
- [ ] Dvostruki klik istog dana **ne** pravi duplikat

### 6.6 `run_due_processes` (kreira aktivnost + ON_LEAD)

```bash
python manage.py run_due_processes
```
**Provera:** aktivnost **Na čekanju** (`scheduled_for` = termin); još nema uputa; ponovno pokretanje ne pravi duplikat.

### 6.7 `run_process_reminders` (uput na dan termina)

```bash
python manage.py run_process_reminders --date <scheduled_for>
```
**Provera:** aktivnost dobije dokument i (ako SES radi) mejl **Uput za pregled**.

### 6.8 Proveri generisani uput

- [ ] **Operativa → Aktivnosti** → otvori aktivnost → tab **Dokumenti** → `Uput - … – Run #1` → preuzmi i otvori
- [ ] Polja popunjena: ime/prezime, JMBG, datum rođenja, radno mesto, naziv firme, datum Akta, broj uputa
- [ ] Ctrl+P — pregled za štampu izgleda kao popunjen uput

### 6.9 Proveri mejlove

- [ ] Inbox `markovuckovic1992@gmail.com` — `Uput za pregled - Periodični lekarski pregled` sa prilogom; naslovi bez sirovih `{{ }}`
- [ ] Ako ne stiže: `python manage.py send_test_email markovuckovic1992@gmail.com`

### 6.10 Završi pregled i proveri ciklus

- [ ] **Operativa → Aktivnosti** → aktivnost → **Završi**: Datum **danas** · Važi do **danas + 12m** · Broj izveštaja `IZV-2026-001` · Ocena `Sposoban` · Mere `/` → Potvrdi

**Provera:** status **Završeno**; chaining napravio novi raspored (**Operativa → Obaveze**); termin sledećeg = `valid_until + period`.

### 6.11 Obrazac 1 (medicinska evidencija)

- [ ] Stranica firme → **Generiši Obrazac 1** → DOCX se skida
- [ ] U fajlu: Marko Petrović, datum pregleda = danas, sledeći za 12m, broj izveštaja, ocena `Sposoban`

---

## 7. Stručni nalazi (tab Stručni nalazi) 🟦 ZORAN

- [ ] Vidi **6 redova** (uključujući gromobran i monitoring kao **nedostaje**)
- [ ] **Priloži fajl** na jednom tipu → PDF + **Datum izdavanja** `15.01.2025.` → **Sačuvaj**
- [ ] Proveri kolonu **Važi do** (izdavanje + 36 meseci) i badge **važi**
- [ ] **Pregled** otvara PDF; **Promeni fajl** zamenjuje; **Obriši** (uz potvrdu) vraća **nedostaje**

**Provera:** svi aktivni tipovi imaju red; status badge: **važi / ističe uskoro / istekao / nedostaje**.

---

## 8. Usklađenost (tab Usklađenost) ⚙️ APP

- [ ] Otvori tab **Usklađenost**
- [ ] Vidi 4 kartice sa stvarnim statusom: **Akt** (Kompletan/Nepotpun/Nedostaje), **Obavezna dokumentacija** (X/7), **Stručni nalazi** (n ističe/nedostaje), **Lekarski pregledi** (n kasni)
- [ ] Ukupan indikator (U redu / Pažnja / Problem); klik **Otvori** vodi na odgovarajući tab

---

## 9. Predstojeći rokovi ⚙️ APP

- [ ] **Pregled → Predstojeći rokovi** → filter **Firma** → lista sortirana po roku; statusi badge; kasni aktivnosti imaju oznaku **Kasni**

---

## 🎉 Ako je sve gore prošlo — flow radi.

## Ako nešto pukne

| Šta je puklo | Šta proveriti |
|--------------|----------------|
| Nije se generisao dokument | Superuser? Postoji kategorija `Lekarski pregledi`? `backend/logs/django.log` |
| Mejl nije stigao | `python manage.py send_test_email tvoj@mejl.com`; ako test ne stiže → SES; ako stiže → `django.log` |
| `run_due_processes` ne pravi aktivnost | `fire_date = termin − rok unapred <= danas`? Aktivan raspored? Već postoji PENDING? |
| Nema uputa posle `run_due_processes` | Očekivano — `run_process_reminders` na dan termina (6.7) |
| Chaining ne radi | Okidač **Kada se završi pregled** + **Sledeća vrsta obaveze** popunjena? |
| Obrazac 1 prazan | Vrsta obaveze ima **Obrazac 1 = DA**? Pregled **Završeno**? |
| Registar ne popunjava | `python manage.py sync_company_registry`; ima li redova u bazi? |
