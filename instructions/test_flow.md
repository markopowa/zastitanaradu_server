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

---

## 1. Napravi kategoriju dokumenata

- [ ] U meniju: **Dokumenti → Kategorije dokumenata → Dodaj**
- [ ] Naziv: `Lekarski pregledi`
- [ ] Sačuvaj

**Provera:** Kategorija se vidi u listi.

---

## 2. Unesi firmu

- [ ] **Klijenti → Dodaj firmu**
- [ ] Naziv: `Test firma 07 d.o.o.` *(obavezno)*
- [ ] PIB: `123456789` *(obavezno)*
- [ ] Matični broj: `12345678`
- [ ] Šifra delatnosti: `4321`
- [ ] Adresa: `Bulevar testiranja 14, Beograd`
- [ ] Telefon: `+381 11 123 4567`
- [ ] Email: `markovuckovic1992@gmail.com`
- [ ] Website: `https://test-firma-07.rs`
- [ ] Napomene: `Test unos — slobodno obrisati`
- [ ] (Opciono) Otpremi logo
- [ ] Sačuvaj

**Provera:** Firma se otvori — vidiš stranicu sa njenim imenom.

### 2a. Priloži Akt o proceni rizika

- [ ] Na stranici firme nađi sekciju **"Akt o proceni rizika"**
- [ ] U polju **"Datum donošenja (dd.mm.yyyy)"** unesi `15.01.2025.` i klikni **"Sačuvaj datum"**
- [ ] Klikni **"Priloži fajl"** i izaberi `files_for_test\Uput_za_periodični_lekarski_pregled.pdf` (ili bilo koji test PDF/sliku)
- [ ] Klikni **"Pregled"** — otvori se popup sa PDF pregledom direktno u browseru (ne download)

**Provera:**
- [ ] Datum donošenja se čuva bez ulaska u edit formu
- [ ] Popup prikazuje sadržaj fajla (PDF se prikazuje, slika se prikazuje, .docx prikazuje poruku sa dugmetom za preuzimanje)
- [ ] Vidljivi dugmići: **Pregled / Promeni fajl / Obriši**

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
- [ ] Sačuvaj

**Provera:** Vrati se na stranicu firme — vidiš Marka Petrovića u listi zaposlenih.

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

---

## 5. Napravi vrstu obaveze

- [ ] **Procesi → Vrste obaveza → Dodaj**
- [ ] Naziv: `Periodični lekarski pregled`
- [ ] Subjekt: `Zaposleni`
- [ ] Period (meseci): `12`
- [ ] Rok unapred (dana): `30`

  > ⚠️ **Važno:** "Rok unapred = 30" znači da će sistem poslati uput **30 dana PRE** datuma pregleda, ne posle. Npr. ako je pregled zakazan za 1. jun, uput se šalje 1. maja.

- [ ] Uključi u evidenciju lekarskih pregleda: **DA** ✅
- [ ] Aktivan: **DA** ✅
- [ ] Sačuvaj

**Provera:** Vrsta obaveze ima automatski generisan **kod** (videćeš ga u listi).

---

## 6. Napravi šablon procesa (ono što okida slanje)

- [ ] **Procesi → Šabloni procesa → Dodaj**
- [ ] Vrsta obaveze: `Periodični lekarski pregled`
- [ ] Okidač: **Na zakazani datum**
- [ ] Generiši dokument: **DA** ✅
- [ ] Šablon dokumenta: `Uput - periodični lekarski pregled`
- [ ] Kategorija dokumenta: `Lekarski pregledi`
- [ ] Pošalji mejl: **DA** ✅ *(ako preskačeš mejl, stavi NE)*
- [ ] Primalac: **Custom email** → `markovuckovic1992@gmail.com`
- [ ] Naslov: `Uput za pregled - {{ process_type_name }}`
- [ ] Telo:

```
Poštovani,

U prilogu je uput za {{ process_type_name }}.
Datum: {{ scheduled_for }}.
```

- [ ] Sačuvaj

**Provera:** Šablon procesa se vidi u listi.

---

### 6b. (Opciono) Chaining — automatski otvori sledeću obavezu

Ako hoćeš da testiraš da li se posle završenog pregleda automatski zakazuje sledeći:

- [ ] **Procesi → Šabloni procesa → Dodaj**
- [ ] Vrsta obaveze: `Periodični lekarski pregled`
- [ ] Okidač: **Pri završetku**
- [ ] Sledeća vrsta obaveze: `Periodični lekarski pregled` *(za test, gađaj samog sebe)*
- [ ] Sačuvaj

---

## 7. Napravi raspored za Marka

- [ ] **Procesi → Rasporedi → Dodaj**
- [ ] Vrsta obaveze: `Periodični lekarski pregled`
- [ ] Zaposleni: `Marko Petrović`
- [ ] Sledeći termin: **današnji datum + 30 dana**

  > Pošto je "Rok unapred = 30 dana", sistem okida **30 dana pre** termina. Da bi `run_due_processes` odmah reagovao, postavi `Sledeći termin = danas + 30 dana` — sistem će izračunati `fire_date = danas` i odmah okidati.
  >
  > Alternativno, postavi `Sledeći termin = danas` za trenutno okidanje bez lead time efekta.

- [ ] Aktivan: **DA** ✅
- [ ] Sačuvaj

**Provera:** Raspored se vidi u listi sa Markom i postavljenim datumom.

---

## 7b. (Brza varijanta) "Pošalji na pregled" bez čekanja schedulera

> 🎯 **Ovo testira dugme za jednokratno slanje** — preskače `run_due_processes`, sve se desi instant.
> Imaš **dva načina** da pošalješ Marka na pregled — testiraj OBA:

### Način A — sa liste zaposlenih

- [ ] **Klijenti → Zaposleni**
- [ ] Pronađi Marka u listi (filter po firmi `Test firma 07` ako treba)
- [ ] U koloni desno klikni dugme **"Pošalji na pregled"**
- [ ] Otvori se dijalog "Pošalji na pregled — Marko Petrović"
- [ ] Vrsta pregleda: `Periodični lekarski pregled`
- [ ] Klikni **"Pošalji"**

**Provera:**
- [ ] Snackbar **"Uput je poslat na mejl"** (zelen) ili "Uput je generisan, ali mejl nije poslat" (žut)
- [ ] Stranica se prebaci na **Procesi → Aktivnosti**
- [ ] Nova aktivnost za Marka u statusu **"Poslat"** (ne "Na čekanju") — sa današnjim datumom
- [ ] Otvori aktivnost → tab **Dokumenti** → uput je prikačen
- [ ] (Ako je mejl prošao) proveri inbox `markovuckovic1992@gmail.com` — mejl je stigao **sa uputom kao prilogom**

### Način B — sa rasporeda

- [ ] **Procesi → Rasporedi**
- [ ] U redu Markovog rasporeda klikni **"Pošalji sad"**

**Provera:** isto kao Način A — nova aktivnost u statusu "Poslat", dokument prikačen, mejl sa prilogom.

### Edge case — dvostruki klik

- [ ] Klikni **"Pošalji na pregled"** ponovo na istom Marku, ista vrsta pregleda, isti dan
- [ ] Sistem **NE** pravi duplikat — vraća postojeću aktivnost (provera: u tabu Dokumenti i dalje samo jedan uput)

### Šta proveri u aktivnosti

- [ ] Status: **Poslat**
- [ ] `Poslao: <tvoje korisničko ime>` i timestamp slanja vidljivi
- [ ] `email_error` polje prazno (ako je mejl prošao)
- [ ] Tab Dokumenti → jedan dokument `Uput - periodični lekarski pregled – Run #X`

---

## 8. Pokreni komandu koja zakazuje aktivnosti

U terminalu, u root projekta:

```bash
python manage.py run_due_processes
```

- [ ] Komanda se izvršila bez crvenog teksta (greške)

**Kako komanda računa kada da okine:**
```
fire_date = next_run_at - lead_time_days
Okida ako: fire_date <= danas
```
Primer: `next_run_at = danas + 30`, `lead_time_days = 30` → `fire_date = danas` → **okida**.

**Provera:**
- [ ] **Procesi → Aktivnosti** — postoji nova aktivnost u statusu **"Na čekanju"** za Marka
- [ ] `scheduled_for` u aktivnosti = postavljeni termin (danas + 30), ne danas
- [ ] Otvori aktivnost — u snapshot-u vidiš `Marko Petrović`, JMBG `0102990710123`, radno mesto `Električar na visini`
- [ ] Ako pokreneš komandu ponovo isti dan — **nova aktivnost se NE pravi** (postoji već PENDING za Marka)

---

## 9. Proveri generisani dokument (Uput koji ide na štampu)

> 🎯 **Ovo simulira realnu situaciju:** korisnik ulazi u aktivnost, skida popunjen uput i daje ga zaposlenom da odnese u ustanovu.

- [ ] **Procesi → Aktivnosti** — pronađi aktivnost za Marka u statusu "Na čekanju"
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
  - [ ] Datum prethodnog pregleda: **prazan** (jer je prvi pregled — očekivano)
- [ ] **Test štampe:** Ctrl+P (ili File → Print) — pregled za štampu treba da izgleda kao popunjen uput, ne kao šablon sa praznim poljima

**Šta ovaj korak dokazuje:** flow generisanja uputa za potpis i štampu radi end-to-end. Ovo je dokument koji bi korisnik dao zaposlenom u realnoj upotrebi.

---

## 10. Proveri mejl

- [ ] Otvori inbox `markovuckovic1992@gmail.com`
- [ ] Stigao je mejl sa `noreply@mak-total-safety.pznr.in.rs`
- [ ] Naslov: `Uput za pregled - Periodični lekarski pregled` (NIJE `{{ process_type_name }}` — varijabla je zamenjena)
- [ ] Telo mejla je popunjeno, datum je današnji

**Ako mejl nije stigao:**

```bash
python manage.py send_test_email markovuckovic1992@gmail.com
```

- [ ] Test mejl je stigao → SES radi, znači problem je u flow-u → vidi `backend/logs/django.log`
- [ ] Test mejl nije stigao → problem je u SES konfiguraciji ili verifikaciji adrese

---

## 11. Završi pregled

- [ ] **Procesi → Aktivnosti** → otvori Markovu aktivnost → klikni **"Završi"**
- [ ] Datum izvršenog pregleda: **današnji datum**
- [ ] Važi do: **današnji datum + 12 meseci** (npr. ako je danas 11.05.2026, stavi 11.05.2027)
- [ ] Broj izveštaja: `IZV-2026-001`
- [ ] Ocena sposobnosti: `Sposoban`
- [ ] Preduzete mere: `/`
- [ ] Potvrdi

**Provera:**
- [ ] Aktivnost je sad u statusu **"Završeno"**
- [ ] Raspored za Marka ima ažuriran **next_run_at**:
  ```
  next_run_at = valid_until + 12 * 30 dana
  ```
  Npr. `valid_until = 11.05.2027` → `next_run_at = 10.09.2028`
- [ ] Sledeći uput će se poslati **30 dana pre** `next_run_at`, tj. `11.08.2028`
  ```
  fire_date = next_run_at - 30 = 10.08.2028
  ```

---

## 12. (Ako si radio chaining) Proveri da je sledeća obaveza otvorena

- [ ] **Procesi → Rasporedi** — postoji raspored za Marka za sledeći pregled sa datumom za 12 meseci

---

## 13. Generiši Obrazac 1 (evidencija)

- [ ] **Klijenti** → otvori `Test firma 07 d.o.o.`
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
| `run_due_processes` ne pravi aktivnost | Da li je `Sledeći termin` u rasporedu **danas ili u prošlosti**? Da li je raspored aktivan? Da li već postoji "Na čekanju" za Marka? |
| Chaining ne radi | Ima li šablon procesa sa okidačem **"Pri završetku"** i popunjenom **Sledeća vrsta obaveze**? |
| Obrazac 1 je prazan | Vrsta obaveze ima **"Uključi u evidenciju" = DA**? Pregled je u statusu **Završeno** (ne "Na čekanju")? |
