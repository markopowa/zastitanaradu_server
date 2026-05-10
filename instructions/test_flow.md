# Test flow — pregled radnika

Prolazak kroz ceo flow od setup-a do generisanja Obrasca 1.
Svaki korak ima šta da proveriš da je prošlo kako treba.

---

## 0. Preduslovi

- [ ] Backend pokrenut, baza dostupna
- [ ] Postoji superuser nalog (potreban za generisanje dokumenata)
- [ ] Postoji kategorija dokumenata — npr. "Lekarski pregledi"
  - Dokumenti → Kategorije dokumenata → Dodaj
- [ ] (Za test mejlova) Email adresa verifikovana u SES sandbox-u
  - AWS SES → Verified identities → Create identity → Email address
  - Potvrdi link koji stigne na tu adresu

---

## 1. Unos firme i zaposlenog

- [ ] Klijenti → Dodaj firmu
  - Naziv: npr. "Test firma d.o.o."
  - Popuni ostala polja po želji
- [ ] Za tu firmu dodaj zaposlenog
  - Ime, prezime
  - JMBG (13 cifara)
  - Datum i mesto rođenja
  - Radno mesto
  - Naziv radnog mesta sa povećanim rizikom (ako je primenjivo)
- [ ] Proveri da li se zaposleni vidi na stranici firme

---

## 2. Kreiranje šablona dokumenta

- [ ] Dokumenti → Šabloni dokumenata → Dodaj šablon
- [ ] Izaberi "Kreiraj iz fajla" i otpremi DOCX uput
- [ ] Popuni:
  - Naziv: npr. "Uput - periodični lekarski pregled"
  - Kontekst: Zaposleni
  - Kategorija: Lekarski pregledi
  - Način generisanja: izaberi odgovarajući
- [ ] Sačuvaj, pa otvori mapiranje polja
- [ ] Postavi bar ova polja:
  - [ ] Ime → `employee.first_name`
  - [ ] Prezime → `employee.last_name`
  - [ ] JMBG → `employee.national_id`
  - [ ] Datum rođenja → `employee.date_of_birth`
  - [ ] Radno mesto → `employee.position`
  - [ ] Naziv firme → `client.name`
  - [ ] Broj uputa → `instruction_number`
  - [ ] Datum prethodnog pregleda → `last_exam_date`
- [ ] Sačuvaj mapiranje

---

## 3. Kreiranje vrste obaveze

- [ ] Procesi → Vrste obaveza → Dodaj
  - Naziv: "Periodični lekarski pregled"
  - Subjekt: Zaposleni
  - Period (meseci): 12
  - Rok unapred (dana): 30
  - Uključi u evidenciju lekarskih pregleda: DA
  - Aktivan: DA
- [ ] Sačuvaj i proveri da je dobila automatski kod

---

## 4. Kreiranje šablona procesa

### 4a. Na zakazani datum (generiši dokument + pošalji mejl)

- [ ] Procesi → Šabloni procesa → Dodaj
  - Vrsta obaveze: Periodični lekarski pregled
  - Okidač: Na zakazani datum
  - Generiši dokument: DA
  - Šablon dokumenta: Uput - periodični lekarski pregled
  - Kategorija dokumenta: Lekarski pregledi
  - Pošalji mejl: DA
  - Primalac: Custom email (unesi svoju verifikovanu test adresu)
  - Naslov: `Uput za pregled - {{ process_type_name }}`
  - Telo: `Poštovani, u prilogu je uput za {{ process_type_name }}. Datum: {{ scheduled_for }}.`
- [ ] Sačuvaj

### 4b. Pri završetku (chaining na sledeću obavezu) — opciono

- [ ] Procesi → Šabloni procesa → Dodaj
  - Vrsta obaveze: Periodični lekarski pregled
  - Okidač: Pri završetku
  - Sledeća vrsta obaveze: Periodični lekarski pregled (ili druga vrsta)
- [ ] Sačuvaj

---

## 5. Kreiranje rasporeda

- [ ] Procesi → Rasporedi → Dodaj
  - Vrsta obaveze: Periodični lekarski pregled
  - Zaposleni: test zaposleni
  - Sledeći termin: **danas ili datum u prošlosti** (da bi run_due_processes odmah okidao)
  - Aktivan: DA
- [ ] Sačuvaj

---

## 6. Pokretanje run_due_processes

```bash
python manage.py run_due_processes
```

- [ ] Komanda se izvršila bez grešaka
- [ ] Procesi → Aktivnosti → postoji nova aktivnost u statusu "Na čekanju" za test zaposlenog
- [ ] Aktivnost ima ispravan `scheduled_for` datum
- [ ] Snapshot zaposlenog u aktivnosti sadrži ime, JMBG, radno mesto

---

## 7. Provera generisanog dokumenta

- [ ] Otvori aktivnost → tab Dokumenti
- [ ] Postoji generisani dokument (naziv tipa "Uput - periodični... – Run #X")
- [ ] Preuzmi dokument i proveri da su polja popunjena:
  - [ ] Ime i prezime zaposlenog
  - [ ] JMBG
  - [ ] Naziv firme
  - [ ] Broj uputa (UP-0001 ili sledeći u nizu)
  - [ ] Datum prethodnog pregleda (prazan ako je prvi pregled)

---

## 8. Provera mejla

- [ ] Proveri inbox verifikovane test adrese
- [ ] Mejl stigao sa `noreply@mak-total-safety.pznr.in.rs`
- [ ] Naslov i telo su ispravno popunjeni (Jinja2 varijable zamenjene)

Ako mejl nije stigao:
```bash
python manage.py send_test_email tvoja@adresa.com
```
- [ ] Test mejl stigao → konfiguracija SES radi
- [ ] Ako test radi a flow ne → proveri logove (`backend/logs/django.log`)

---

## 9. Završetak aktivnosti

- [ ] Procesi → Aktivnosti → otvori aktivnost → klikni "Završi"
- [ ] Unesi:
  - Datum izvršenog pregleda: danas
  - Važi do: danas + 12 meseci
  - Broj izveštaja: npr. "IZV-001"
  - Ocena sposobnosti: npr. "Sposoban"
  - Preduzete mere: npr. "/"
- [ ] Potvrdi
- [ ] Aktivnost prešla u status "Završeno"
- [ ] Raspored dobio ažuriran `last_run_at` i novi `next_run_at` (za 12 meseci)

---

## 10. Provera chaininga (ako je podešen)

- [ ] Procesi → Rasporedi → postoji ažuriran ili novi raspored za isti zaposleni za sledeću vrstu obaveze
- [ ] `next_run_at` je ispravno izračunat

---

## 11. Generisanje Obrasca 1

- [ ] Klijenti → otvori Test firma d.o.o.
- [ ] Klikni dugme "Generiši Obrazac 1"
- [ ] DOCX fajl se skida automatski
- [ ] Otvori fajl i proveri:
  - [ ] Zaposleni se pojavljuje u tabeli
  - [ ] Datum pregleda ispravan
  - [ ] Datum sledećeg pregleda ispravan
  - [ ] Broj izveštaja, ocena sposobnosti, preduzete mere popunjeni

---

## Česta mesta gde može da pukne

| Problem | Gde gledati |
|---------|-------------|
| Dokument nije generisan | Postoji li superuser? Postoji li kategorija dokumenta? Proveri `django.log` |
| Mejl nije poslat | Proveri `django.log` za SES greške. Pokreni `send_test_email` |
| run_due_processes ne kreira run | Da li je `next_run_at <= danas`? Da li raspored aktivan? Da li već postoji pending run? |
| Chaining ne radi | Da li šablon procesa ima okidač "Pri završetku" i "Sledeća vrsta obaveze"? |
| Obrazac 1 prazan | Da li vrsta obaveze ima "Uključi u evidenciju" = DA? Da li su pregledi završeni (ne pending)? |
