# Test flow — korak po korak

Otvori sajt, prijavi se kao superuser, i kuca tačno ovo što piše ispod.
Ne preskači korake. Kvadratić [ ] = uradi to. Posle svakog kvadratića pogledaj da li je deo "Provera" prošao.

> **Test podaci ispod su nasumični** — možeš ih bukvalno copy-paste. Ako pokrećeš test više puta, promeni broj na kraju imena firme (Test firma 01 → Test firma 02) da ne dobiješ duplikat.

---

## Test podaci (kopiraj odavde dok testiraš)

**Firma:** *(obavezna su samo Naziv i PIB — ostalo popuni radi realnog testa)*
- Naziv: `Test firma 07 d.o.o.`
- PIB: `123456789`
- Matični broj: `12345678`
- Šifra delatnosti: `4321` *(izvođenje elektroinstalacionih radova)*
- Adresa: `Bulevar testiranja 14, Beograd`
- Telefon: `+381 11 123 4567`
- Email: `markovuckovic1992@gmail.com` *(verifikovana SES adresa)*
- Website: `https://test-firma-07.rs`
- Akt o proceni rizika (fajl): otpremi posle čuvanja firme, sa stranice firme — koristi `files_for_test\Uput_za_periodični_lekarski_pregled.pdf` ili neki PDF/slika kao test
- Datum donošenja Akta o proceni rizika: `15.01.2025.`
- Napomene: `Test unos — slobodno obrisati`

**Zaposleni:** *(obavezna su Ime, Prezime, Email, Organizaciona jedinica, Pozicija)*
- Ime: `Marko`
- Prezime: `Petrović`
- Ime oca: `Stevan`
- JMBG: `0102990710123` *(unesi prvo JMBG — datum rođenja se sam popuni)*
- Datum rođenja: `01.02.1990.` *(auto iz JMBG)*
- Mesto rođenja: `Niš`
- Email: `markovuckovic1992@gmail.com`
- Organizaciona jedinica: `Tehnička služba`
- Pozicija: `Električar`
- Zanimanje: `Električar`
- Naziv radnog mesta sa povećanim rizikom: `Električar na visini`
- Radno mesto: `Električar na visini`
- Rizik — izuzetak: ostavi `Nasleđeno iz radnog mesta`

**Radno mesto i rizik:**
- Naziv radnog mesta: `Električar na visini`
- Nivo rizika: izaberi `POVECAN` / `Povećan` / najveći nivo rizika koji postoji u padajućoj listi

**Kategorije / nazivi:**
- Kategorija dokumenata: `Lekarski pregledi`
- Vrsta obaveze: `Periodični lekarski pregled`
- Šablon dokumenta: `Uput - periodični lekarski pregled`

**Za "Završi pregled":**
- Datum pregleda: **današnji datum**
- Važi do: **današnji datum + 12 meseci**
- Broj izveštaja: `IZV-2026-001`
- Ocena sposobnosti: `Sposoban`
- Preduzete mere: `/`

---

## 0. Pre nego što počneš — provera

- [ ] Backend radi (sajt se otvara, ne baca 500)
- [ ] Možeš da se uloguješ kao **superuser** (bez toga generisanje dokumenata neće raditi)
- [ ] Test fajl uputa postoji: `files_for_test\Uput_za_periodični_lekarski_pregled.pdf`
- [ ] Test mejl adresa `markovuckovic1992@gmail.com` je verifikovana u AWS SES (već jeste)
- [ ] Registar firmi učitan: `python manage.py sync_company_registry` *(jednom, pa mesečno cron)*

---

## 1. Napravi kategoriju dokumenata

- [ ] U meniju: **Dokumenti → Kategorije dokumenata → Dodaj**
- [ ] Naziv: `Lekarski pregledi`
- [ ] Sačuvaj

**Provera:**
- [ ] Kategorija se vidi u listi.
- [ ] Ako je lista bila prazna pre dodavanja, prikazuje se standardni prazan red, ne ružan prazan ekran.
- [ ] Ako otvoriš izmenu kategorije, primarno dugme je **Sačuvaj**, a odustajanje je **Odustani**.
- [ ] Ako klikneš **Obriši**, otvara se potvrda sa dugmadima **Odustani** i **Obriši**.

---

## 1b. Navigacija i radni prostor firme

- [ ] U sidebaru grupa se zove **Firme** (ne Klijenti); stavka **Firme** vodi na listu
- [ ] Grupe **Operativa** (Obaveze, Aktivnosti) i **Podešavanja** (Vrste obaveza, Šabloni obaveza, Nivoi rizika) su razdvojene
- [ ] Nema dinamičke grupe po vrsti obaveze u meniju
- [ ] Na listi firmi breadcrumbs: `Firme`
- [ ] **Firme → Dodaj firmu** otvara čarobnjak (7 koraka), ne dijalog

**Provera čarobnjaka:**
- [ ] Korak 1: matični broj + **Uvezi iz registra** (open data snapshot) + PIB ručno + Naziv → **Sledeći** kreira firmu
- [ ] Koraci 2–7: **Preskoči korak** radi; **Završi** vodi na firmu sa tabom **Usklađenost** (`?tab=compliance`)

---

## 2. Unesi firmu

*(Ako si već prošao čarobnjak u 1b, preskoči na 2a; inače uradi korak 1 čarobnjaka.)*

- [ ] **Firme → Dodaj firmu**
- [ ] Matični broj: npr. `07049820` *(iz APR open data — ili bilo koji validan MB)*
- [ ] Klikni **Uvezi iz registra** pored matičnog broja → popuni naziv, opštinu (adresa), šifru delatnosti
- [ ] PIB: `123456789` *(obavezno — ručno, nije u open data)*
- [ ] Naziv: dopuni/izmeni ako treba *(obavezno)*
- [ ] Šifra delatnosti: `4321`
- [ ] Adresa: `Bulevar testiranja 14, Beograd`
- [ ] Telefon: `+381 11 123 4567`
- [ ] Email: `markovuckovic1992@gmail.com`
- [ ] Website: `https://test-firma-07.rs`
- [ ] Napomene: `Test unos — slobodno obrisati`
- [ ] **Sledeći** / **Završi** (čarobnjak) ili sačuvaj na koraku 1

**Provera:** Firma se otvori — vidiš tab traku i breadcrumbs `Firme / <naziv>`.
- [ ] Tabovi: Lična karta, Dokumentacija, Radna mesta i rizik, Zaposleni, Obaveze/Aktivnosti, Stručni nalazi, Usklađenost
- [ ] URL `?tab=employees` (ili drugi tab) zadržava tab posle refresh-a

### 2a. Akt o proceni rizika (3 sekcije + revizije)

- [ ] Otvori tab **Dokumentacija**
- [ ] Klikni **Kreiraj Akt** (ako panel kaže da akt još nije kreiran)
- [ ] U polju **Datum donošenja** unesi `15.01.2025.` → **Sačuvaj datum**
- [ ] Za sekciju **Uvod** klikni **Priloži** → izaberi test PDF → **Razlog izmene** (min. 5 znakova, npr. `Inicijalno prilaženje uvoda`) → **Sačuvaj**
- [ ] Za **Procene po radnom mestu** i **Zaključak** ponovi prilog (isti ili drugi test fajl, svaki put sa razlogom)
- [ ] Klikni **Pregled** na jednoj sekciji — popup sa PDF/slikom
- [ ] Klikni **Istorija** — vidi verziju, korisnika, razlog, **Preuzmi**
- [ ] Klikni **Objedini u PDF** — preuzme se jedan spojeni PDF (Uvod + Procene + Zaključak)

**Provera:**
- [ ] Status prikazuje **Kompletan (3/3)** kad su sve tri sekcije priložene
- [ ] **Sačuvaj** u dijalogu izmene je onemogućeno bez fajla ili razloga kraćeg od 5 znakova
- [ ] Stara verzija ostaje u istoriji posle **Izmeni**

---

## 2a2. Stručni nalazi

> Pre testa: `python manage.py seed_compliance_finding_types` (posle migracije). Za alarme poveži `process_type` u adminu za svaki tip (vidi `instructions/expert_findings.md`).

- [ ] Otvori tab **Stručni nalazi**
- [ ] Vidi 6 redova (uključujući gromobran i monitoring kao **nedostaje**)
- [ ] Klikni **Priloži fajl** na jednom tipu → PDF + datum izdavanja `15.01.2025.` → **Sačuvaj**
- [ ] Proveri kolonu **Važi do** (izdavanje + 36 meseci) i badge **važi**
- [ ] **Pregled** otvara PDF u dijalogu
- [ ] **Promeni fajl** zamenjuje nalaz; **Obriši** (uz potvrdu) vraća **nedostaje**

**Provera:**
- [ ] Svi aktivni tipovi imaju red (prazni slotovi uključeni)
- [ ] Status badge: važi / ističe uskoro / istekao / nedostaje

---

## 2b. Dodaj radno mesto i proveri badge rizika

- [ ] Otvori tab **Radna mesta i rizik**
- [ ] Klikni **Dodaj radno mesto**
- [ ] Naziv radnog mesta: `Električar na visini`
- [ ] Nivo rizika: izaberi `POVECAN` / `Povećan` / najveći nivo rizika koji postoji u listi
- [ ] Opis: `Rad na visini i elektro instalacije`
- [ ] Sačuvaj
- [ ] Klikni ⋮ na redu → **Izmeni** → promeni opis → Sačuvaj

**Provera:**
- [ ] Sekcija **Radna mesta** je u kartici sa naslovom i dugmetom desno.
- [ ] Radno mesto se vidi u tabeli sa kolonama Naziv / Nivo rizika / Zaposleni / Akcije.
- [ ] Nivo rizika se prikazuje kao obojeni badge sa tekstom `Naziv (R=skor)`.
- [ ] Kod povećanog rizika vidi se dodatni chip **Povećan rizik**.
- [ ] **Obriši** je onemogućeno dok radno mesto ima zaposlene.

### 2b2. Šifarnik nivoa rizika

- [ ] U meniju: **Podešavanja → Nivoi rizika**
- [ ] Proveri da lista prikazuje postojeće nivoe (NIZAK, UMEREN, …)
- [ ] Klikni **Dodaj nivo** → Šifra `TEST`, Naziv `Testni`, Skor `1` → Sačuvaj
- [ ] Klikni ⋮ → **Obriši** na testnom nivou → potvrdi

**Provera:**
- [ ] Stranica `/risk-levels` radi bez greške.
- [ ] Brisanje nivoa koji se koristi na radnom mestu prikazuje poruku da se ne može obrisati.

### 2c. Kontakt-lica

- [ ] Na stranici firme nađi sekciju **Kontakt-lica**
- [ ] Klikni **Dodaj kontakt-lice**
- [ ] Ime i prezime: `Petar Petrović`
- [ ] Uloga: `Direktor`
- [ ] Telefon: `060 111 2222`
- [ ] Email: `markovuckovic1992@gmail.com`
- [ ] Primarni kontakt: uključi
- [ ] Sačuvaj
- [ ] Klikni ⋮ na redu → **Izmeni** → promeni telefon na `060 999 8888` → Sačuvaj
- [ ] Klikni ⋮ → **Obriši** → potvrdi

**Provera:**
- [ ] Prazna lista prikazuje **Nema kontakt-lica.**
- [ ] Dodavanje/izmena/brisanje rade bez greške.
- [ ] Primarni kontakt ima oznaku ★ u listi.

### 2d. Obavezna dokumentacija

- [ ] Na stranici firme nađi sekciju **Obavezna dokumentacija**
- [ ] Proveri brojač **0 / 7 priloženo** (ili više ako već ima fajlova)
- [ ] Kod slota **Ugovor** klikni **Priloži** i izaberi `files_for_test\Uput_za_periodični_lekarski_pregled.pdf`
- [ ] Klikni **Pregled** — PDF se otvara u dijalogu
- [ ] Klikni **Obriši** → potvrdi → slot se vraća na **nema** i **Priloži**

**Provera:**
- [ ] Svih 7 slotova je uvek vidljivo (Ugovor, Odluka, 3 pravilnika, 3 programa obuke).
- [ ] Status **ima** / **nema** je jasno označen.
- [ ] Nema dugmeta „Promeni fajl“ — samo Obriši pa ponovo Priloži.
- [ ] Brojač se ažurira posle uploada/brisanja.

### 2e. Izmena firme i registar

- [ ] Klikni **Izmeni podatke**
- [ ] Unesi matični broj i klikni **Uvezi iz registra**
- [ ] Sačuvaj bez greške

**Provera:**
- [ ] Dugme **Uvezi iz registra** postoji u edit formi.
- [ ] Ručni unos i čuvanje i dalje rade.

---

## 3. Unesi zaposlenog

- [ ] Na stranici firme klikni **Dodaj zaposlenog**
- [ ] Ime: `Marko` *(obavezno)*
- [ ] Prezime: `Petrović` *(obavezno)*
- [ ] Ime oca: `Stevan`
- [ ] JMBG: `0102990710123` *(unesi PRVO ovo — datum rođenja će se sam popuniti iz JMBG)*
- [ ] Datum rođenja: proveri da je `01.02.1990.` (auto popunjeno)
- [ ] Mesto rođenja: `Niš`
- [ ] Email: `markovuckovic1992@gmail.com` *(obavezno)*
- [ ] Organizaciona jedinica: `Tehnička služba` *(obavezno)*
- [ ] Pozicija: `Električar` *(obavezno)*
- [ ] Zanimanje: `Električar`
- [ ] Naziv radnog mesta sa povećanim rizikom: `Električar na visini`
- [ ] Radno mesto: `Električar na visini`
- [ ] Proveri da se ispod polja prikaže poruka da se nivo rizika nasleđuje iz radnog mesta
- [ ] Rizik — izuzetak: ostavi `Nasleđeno iz radnog mesta`
- [ ] Sačuvaj

**Provera:**
- [ ] Forma ima tri sekcije: **Lični podaci**, **Zaposlenje**, **Radno mesto i rizik**.
- [ ] Vrati se na stranicu firme — vidiš Marka Petrovića u listi zaposlenih.
- [ ] Sekcija **Zaposleni** je u kartici sa naslovom i dugmetom desno.
- [ ] U listi zaposlenih postoji kolona **Rizik**.
- [ ] Markov rizik se prikazuje kao obojeni badge.
- [ ] Klik na red vodi na detalj zaposlenog.

### 3a. Lista zaposlenih — pretraga i akcije

- [ ] **Zaposleni** u meniju → u **Pretraga** ukucaj `Marko`
- [ ] Klikni ⋮ → **Istorija pregleda**
- [ ] Otvori detalj zaposlenog → **Izmeni** → promeni poziciju → Sačuvaj

**Provera:**
- [ ] Pretraga filtrira po imenu.
- [ ] **Istorija pregleda** i **Izmeni** rade bez greške.

---

## 4. Napravi šablon dokumenta (Uput)

- [ ] **Dokumenti → Šabloni dokumenata → Dodaj šablon**
- [ ] Naziv: `Uput - periodični lekarski pregled`
- [ ] Kontekst: `Zaposleni`
- [ ] Kategorija: `Lekarski pregledi`
- [ ] Način kreiranja šablona: **"Kreiraj iz fajla (upload)"**
- [ ] Otpremi fajl: `files_for_test\Uput_za_periodični_lekarski_pregled.pdf`
- [ ] Sačuvaj

> Sistem podržava i `.pdf` i `.docx` (kao i .doc/.odt/.rtf/.xlsx/.pptx — automatski se konvertuju u PDF). PDF mora imati pravi tekst (ne sken).

Sada otvori **mapiranje polja** (treba da iskoči ili klikni dugme za mapiranje):

- [ ] Ime → `employee.first_name`
- [ ] Prezime → `employee.last_name`
- [ ] JMBG → `employee.national_id`
- [ ] Datum rođenja → `employee.date_of_birth`
- [ ] Radno mesto → `employee.position`
- [ ] Naziv firme → `client.name`
- [ ] Broj uputa → `instruction_number`
- [ ] Datum prethodnog pregleda → `last_exam_date`
- [ ] Sačuvaj mapiranje

**Provera:** Šablon se vidi u listi šablona.

### 4a. Vizuelni editor polja

- [ ] Na šablonu klikni ⋮ → **Uredi polja**
- [ ] Klikni na stranicu dokumenta → izaberi polje (npr. Ime zaposlenog)
- [ ] U panelu podesi **Veličina fonta** na `12`
- [ ] Uključi **Poravnanje** (snap)
- [ ] Klikni **Pregled rezultata** — PDF se prikazuje u dijalogu
- [ ] **Sačuvaj polja**

**Provera:**
- [ ] Marker se pomera i snap radi.
- [ ] Preview generiše PDF bez greške.

---

## 5. Napravi vrstu obaveze

- [ ] **Podešavanja → Vrste obaveza → Dodaj**
- [ ] Naziv: `Periodični lekarski pregled`
- [ ] Subjekt: `Zaposleni`
- [ ] Period (meseci): `12`
- [ ] Rok unapred (dana): `30`

  > ⚠️ "Rok unapred = 30" znači da sistem šalje uput **30 dana PRE** datuma pregleda.

- [ ] Lekarska evidencija: **DA** ✅
- [ ] Aktivan: **DA** ✅
- [ ] Sačuvaj

**Provera:** Vrsta obaveze `Periodični lekarski pregled` se vidi u listi sa automatski generisanim kodom.
- [ ] Subjekt se prikazuje kao **Zaposleni**, **Oprema** ili **Firma**, ne kao sirova vrednost iz baze.
- [ ] Ako klikneš **Obriši**, otvara se standardna potvrda sa **Odustani** i **Obriši**.

---

## 6. Napravi šablone obaveza

Potrebna su **tri šablona** (četvrti opciono):

### 6a. N dana pre termina — interno (opciono za test mejla)

- [ ] **Podešavanja → Šabloni obaveza → Dodaj**
- [ ] Vrsta obaveze: `Periodični lekarski pregled`
- [ ] Okidač: **N dana pre termina**
- [ ] Generiši dokument: **NE**
- [ ] Pošalji mejl: **DA** ✅
- [ ] Primalac: **Custom email** → `markovuckovic1992@gmail.com` *(ili Interna uloga)*
- [ ] Naslov: `Pripremi pregled - {{ process_type_name }}`
- [ ] Telo: `Termin {{ scheduled_for }} za {{ name }}.`
- [ ] Sačuvaj

### 6b. Dan termina — uput zaposlenom

- [ ] **Podešavanja → Šabloni obaveza → Dodaj**
- [ ] Vrsta obaveze: `Periodični lekarski pregled`
- [ ] Okidač: **Na zakazani datum**
- [ ] Generiši dokument: **DA** ✅
- [ ] Šablon dokumenta: `Uput - periodični lekarski pregled`
- [ ] Pošalji mejl: **DA** ✅
- [ ] Primalac: **Custom email** → `markovuckovic1992@gmail.com`
- [ ] Naslov: `Uput za pregled - {{ process_type_name }}`
- [ ] Telo:
```
Poštovani,

U prilogu je uput za {{ process_type_name }}.
Datum: {{ scheduled_for }}.
```
- [ ] Sačuvaj

### 6c. Po završetku — sledeći ciklus

- [ ] Okidač: **Kada se završi pregled**
- [ ] Generiši dokument: **NE**, Pošalji mejl: **NE**
- [ ] Sledeća vrsta obaveze: `Periodični lekarski pregled`
- [ ] Sačuvaj

### 6d. (Opciono) Nije završeno na vreme

- [ ] Okidač: **Kada nije završeno na vreme**
- [ ] Pošalji mejl: **DA** → Custom `markovuckovic1992@gmail.com`
- [ ] Naslov: `Pregled nije evidentiran - {{ name }}`

**Provera:** Minimum 3 šablona (6a–6c) za Periodični lekarski pregled.

### 6e. Predstojeći rokovi

- [ ] **Pregled → Predstojeći rokovi**
- [ ] Filter **Firma**: izaberi test firmu (ili Svi)
- [ ] Proveri da se lista učitava sortirano po roku
- [ ] Klikni na red → otvara detalj aktivnosti

**Provera:**
- [ ] Statusi su badge-ovi (Poslat, Na čekanju, …).
- [ ] Kasni aktivnosti imaju oznaku **Kasni**.

---

## 7. Napravi raspored za Marka

Prvi raspored se pravi ručno jednom. Svi naredni se kreiraju automatski po završetku pregleda.

- [ ] **Operativa → Obaveze** → **Dodaj**
- [ ] Vrsta obaveze: `Periodični lekarski pregled`

  > Subjekt tip (Zaposleni) se automatski preuzima iz vrste obaveze — polje nije vidljivo.

- [ ] Zaposleni: `Marko Petrović`
- [ ] Period (meseci): *(ostavi prazno — helper text pokazuje podrazumevano: 12 mes.)*
- [ ] Sledeći termin: **današnji datum + 30 dana**

  > Rok unapred = 30 → `fire_date = termin - 30 = danas` → `run_due_processes` kreira aktivnost i šalje **ON_LEAD** (ne uput).

- [ ] Aktivan: **DA** ✅
- [ ] Sačuvaj

**Provera:** Raspored za Marka — Periodični lekarski pregled, termin za 30 dana.

---

## 7b. (Brza varijanta) "Pošalji na pregled" bez čekanja schedulera

> 🎯 **Ovo testira dugme za jednokratno slanje** — preskače `run_due_processes`, sve se desi instant.
> Imaš **dva načina** da pošalješ Marka na pregled — testiraj OBA:

### Način A — sa liste zaposlenih

- [ ] **Firme → Zaposleni**
- [ ] Pronađi Marka u listi (filter po firmi `Test firma 07` ako treba)
- [ ] U koloni desno klikni dugme **"Pošalji na pregled"**
- [ ] Otvori se dijalog "Pošalji na pregled — Marko Petrović"
- [ ] Vrsta pregleda: `Periodični lekarski pregled`
- [ ] Klikni **"Pošalji"**

**Provera:**
- [ ] Snackbar **"Uput je poslat na mejl"** (zelen) ili "Uput je generisan, ali mejl nije poslat" (žut)
- [ ] Stranica se prebaci na **Operativa → Aktivnosti**
- [ ] Nova aktivnost za Marka u statusu **"Poslat"** (ne "Na čekanju") — sa današnjim datumom
- [ ] Status **Poslat** se prikazuje kao plavi/info badge, ne kao običan tekst
- [ ] Otvori aktivnost → tab **Dokumenti** → uput je prikačen
- [ ] (Ako je mejl prošao) proveri inbox `markovuckovic1992@gmail.com` — mejl je stigao **sa uputom kao prilogom**

### Način B — sa liste Obaveze

- [ ] **Operativa → Obaveze**
- [ ] U redu Markovog rasporeda klikni **"Pošalji sad"**

**Provera:** isto kao Način A — nova aktivnost u statusu "Poslat", dokument prikačen, mejl sa prilogom.

### Edge case — dvostruki klik

- [ ] Klikni **"Pošalji na pregled"** ponovo na istom Marku, ista vrsta pregleda, isti dan
- [ ] Sistem **NE** pravi duplikat — vraća postojeću aktivnost (provera: u tabu Dokumenti i dalje samo jedan uput)

### Šta proveri u aktivnosti

- [ ] Status: **Poslat**
- [ ] Status je prikazan kroz badge
- [ ] `Poslao: <tvoje korisničko ime>` i timestamp slanja vidljivi
- [ ] `email_error` polje prazno (ako je mejl prošao)
- [ ] Tab Dokumenti → jedan dokument `Uput - periodični lekarski pregled – Run #X`

---

## 8. Pokreni `run_due_processes` (kreira aktivnost + ON_LEAD)

U terminalu (folder `backend` ili gde je `manage.py`):

```bash
python manage.py run_due_processes
```

- [ ] Komanda bez greške

**Provera:**
- [ ] Aktivnost **Na čekanju**, `scheduled_for` = termin (danas + 30)
- [ ] **Još nema** uputa u tabu Dokumenti (uput ide na dan termina)
- [ ] Ako imaš šablon 6a: mejl **Pripremi pregled** je stigao (ON_LEAD)
- [ ] Ponovni `run_due_processes` isti dan — **nema** duplog run-a

---

## 8b. Pokreni `run_process_reminders` (uput na dan termina)

Uput i mejl zaposlenom idu **na dan termina**, ne pri kreiranju aktivnosti.

**A)** Sačekaj dan termina, pa:

```bash
python manage.py run_process_reminders
```

**B)** Test odmah — simuliraj dan termina (`scheduled_for` iz koraka 7, npr. `2026-06-20`):

```bash
python manage.py run_process_reminders --date 2026-06-20
```

(zameni datum iz aktivnosti Marka)

- [ ] Komanda bez greške

**Provera:** posle 8b aktivnost ima dokument i (ako SES radi) mejl **Uput za pregled**.

> Za ceo test **bez čekanja 30 dana**: u koraku 7 stavi **Sledeći termin = danas**, **Rok unapred = 0**, pa 8 → 8b isti dan.

---

## 9. Proveri generisani dokument (Uput koji ide na štampu)

> 🎯 Posle koraka **8b** (ne posle samo 8).

- [ ] **Operativa → Aktivnosti** — aktivnost Marka **Na čekanju** (ili Poslat ako je mejl prošao)
- [ ] Klikni red da otvoriš aktivnost
- [ ] Klikni tab **"Dokumenti"**
- [ ] Postoji dokument naziva `Uput - periodični lekarski pregled – Run #1`
- [ ] Klikni dugme za preuzimanje → fajl se skida na računar
- [ ] **Otvori fajl** (Word ili PDF, zavisi šta si otpremio kao šablon)
- [ ] Proveri da su polja popunjena (sve što si mapirao u Koraku 4):
  - [ ] Ime i prezime: `Marko Petrović`
  - [ ] JMBG: `0102990710123`
  - [ ] Datum rođenja: `01.02.1990.`
  - [ ] Radno mesto: `Električar na visini`
  - [ ] Naziv firme: `Test firma 07 d.o.o.`
  - [ ] Naziv Akta o proceni rizika: naziv fajla koji si otpremio (bez `.pdf`)
  - [ ] Datum donošenja Akta: `15.01.2025.`
  - [ ] Broj uputa: `UP-0001` (ili sledeći u nizu)
  - [ ] Datum prethodnog pregleda: **prazan** (prvi pregled — očekivano)
- [ ] **Test štampe:** Ctrl+P (ili File → Print) — pregled za štampu treba da izgleda kao popunjen uput, ne kao šablon sa praznim poljima

**Šta ovaj korak dokazuje:** flow generisanja uputa za potpis i štampu radi end-to-end. Ovo je dokument koji bi korisnik dao zaposlenom u realnoj upotrebi.

---

### Čemu služe dokumenti uz aktivnost?

Svaka aktivnost (ProcessRun) može imati priložene dokumente. Postoje dva tipa:

- **Uput (INSTRUCTION)** — generiše se automatski kada sistem okine aktivnost. To je popunjen uput koji korisnik štampa i daje zaposlenom da odnese u zdravstvenu ustanovu.
- **Izveštaj (REPORT)** — dodaje se ručno posle pregleda. To je izveštaj koji je ustanova vratila (nalaz, ocena sposobnosti). Čuva se kao arhiva uz tu konkretnu aktivnost.

Dugme **"Dokumenti"** na stranici Aktivnosti otvara dijalog gde možeš videti priložene dokumente, preuzeti ih ili dodati novi iz liste dokumenata u sistemu.

---

## 10. Proveri mejlove

- [ ] Inbox `markovuckovic1992@gmail.com`
- [ ] Posle **8**: eventualno `Pripremi pregled` (ON_LEAD, šablon 6a)
- [ ] Posle **8b**: `Uput za pregled - Periodični lekarski pregled` sa prilogom (ON_SCHEDULED)
- [ ] Naslovi bez sirovih `{{ ... }}` — varijable zamenjene

**Ako mejl nije stigao:**

```bash
python manage.py send_test_email markovuckovic1992@gmail.com
```

- [ ] Test mejl je stigao → SES radi, znači problem je u flow-u → vidi `backend/logs/django.log`
- [ ] Test mejl nije stigao → problem je u SES konfiguraciji ili verifikaciji adrese

---

## 11. Završi pregled i proveri ciklus

- [ ] **Operativa → Aktivnosti** → otvori Markovu aktivnost → klikni **"Završi"**
- [ ] Datum pregleda: **današnji datum**
- [ ] Važi do: **današnji datum + 12 meseci** (npr. `21.05.2027`)
- [ ] Broj izveštaja: `IZV-2026-001`
- [ ] Ocena sposobnosti: `Sposoban`
- [ ] Preduzete mere: `/`
- [ ] Potvrdi

**Provera:**
- [ ] Aktivnost je u statusu **"Završeno"**
- [ ] Chaining je proradio — **Podešavanja → Obaveze** → postoji novi raspored za Marka za `Periodični lekarski pregled` (automatski kreiran)
- [ ] Termin sledećeg = `valid_until + 12 * 30 dana`
- [ ] Raspored nikad ne treba brisati niti ponovo kreirati — ponavlja se sam svake godine

---

## 12. Generiši medicinsku evidenciju

- [ ] **Firme** → otvori `Test firma 07 d.o.o.`
- [ ] Klikni **"Generiši Obrazac 1"**
- [ ] DOCX fajl se automatski skida

Otvori fajl i proveri:
- [ ] Marko Petrović je u tabeli
- [ ] Datum pregleda = današnji
- [ ] Datum sledećeg pregleda = za 12 meseci
- [ ] Broj izveštaja: `IZV-2026-001`
- [ ] Ocena sposobnosti: `Sposoban`
- [ ] Preduzete mere: `/`

---

## 🎉 Ako je sve gore prošlo — flow radi.

---

## Ako nešto pukne — gde da gledaš

| Šta je puklo | Šta provero |
|--------------|-------------|
| Nije se generisao dokument | Ulogovan si kao superuser? Postoji li kategorija `Lekarski pregledi`? Vidi `backend/logs/django.log` |
| Mejl nije stigao | Pokreni `python manage.py send_test_email tvoj@mejl.com`. Ako test mejl ne stiže — SES nije podešen. Ako stiže — vidi `django.log` |
| `run_due_processes` ne pravi aktivnost | `Sledeći termin` i `fire_date = termin − rok unapred <= danas`? Aktivan raspored? Već postoji PENDING? |
| Nema uputa posle `run_due_processes` | Očekivano — pokreni `run_process_reminders` na dan termina (korak 8b) |
| `run_process_reminders` ne šalje uput | `--date` mora biti **tačno** `scheduled_for` aktivnosti; status Na čekanju/Poslat? |
| Chaining ne radi | Ima li šablon obaveze sa okidačem **"Kada se završi pregled"** i popunjenom **Sledeća vrsta obaveze = Periodični lekarski pregled**? |
| Medicinska evidencija je prazna | Vrsta obaveze ima **"Lekarska evidencija" = DA**? Pregled je u statusu **Završeno** (ne "Na čekanju")? |
