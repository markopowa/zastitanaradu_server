# Tok lekarskog pregleda — opis

## Kratak pregled

Sistem prati periodične lekarske preglede zaposlenih. Za svakog zaposlenog postoji raspored (binding) koji se automatski obnavlja. Korisnik ne mora ručno da pravi ničega osim prvog rasporeda.

---

## Šta se šalje i kada

### Dan termina — pošalji uput

Okidač: **Na zakazani datum** (`ON_SCHEDULED`)

Sistem:
1. Generiše popunjen uput (DOCX/PDF) iz šablona, sa podacima zaposlenog i firme.
2. Šalje mejl na adresu zaposlenog sa uputom u prilogu.

**Kako izgleda mejl:**

```
Od: noreply@mak-total-safety.pznr.in.rs
Za: zaposleni@firma.rs
Naslov: Uput za pregled - Periodični lekarski pregled

Poštovani,

U prilogu je uput za Periodični lekarski pregled.
Datum pregleda: 20.06.2026.

Prilog: Uput - periodični lekarski pregled – Run #12.pdf
```

**Prilog** je popunjen uput sa:
- Ime, prezime, JMBG, datum rođenja
- Radno mesto, organizaciona jedinica
- Naziv firme, datum donošenja Akta o proceni rizika
- Broj uputa (automatski, npr. `UP-0007`)
- Datum prethodnog pregleda (iz prethodnog završenog pregleda)

---

### Posle završetka pregleda — kreiraj sledeći termin

Okidač: **Kada se završi** (`ON_COMPLETED`)

Korisnik unosi:
- Datum pregleda
- Važi do (datum isteka)
- Broj izveštaja
- Ocena sposobnosti
- Preduzete mere

Sistem:
1. Zatvara tekuću aktivnost kao **Završeno**.
2. Automatski pomera termin sledećeg pregleda: `next_run_at = valid_until + period` (npr. `valid_until + 12 meseci`).
3. Ne šalje ništa — čeka sledeći ciklus.

---

## Raspored (binding) — životni ciklus

```
Kreiranje (ručno)
    ↓
Aktivnost se kreira 30 dana pre termina  ←── run_due_processes
    ↓
Mejl + uput se šalju na dan termina      ←── run_due_processes
    ↓
Korisnik unosi rezultat → Završi
    ↓
next_run_at se pomera za sledeći ciklus
    ↓
(ponavlja se)
```

Raspored se **nikad ne briše** — sam se obnavlja.

---

## Brzo slanje (bez schedulera)

Za testiranje ili hitno slanje: dugme **"Pošalji sad"** u listi rasporeda, ili **"Pošalji na pregled"** na stranici zaposlenog.

- Sistem odmah generiše uput i šalje mejl.
- Ne čeka `run_due_processes`.
- Ako postoji aktivnost za taj dan — vraća postojeću (nema duplikata).

---

## Evidencija (Obrazac 1 / medicinska evidencija)

Na stranici klijenta: dugme **"Generiši medicinsku evidenciju"**.

Generiše DOCX tabelu sa svim završenim pregledima za tu firmu:
- Samo pregledi čija vrsta obaveze ima flag **"Lekarska evidencija" = DA**
- Kolone: zaposleni, JMBG, radno mesto, datum pregleda, važi do, ocena, broj izveštaja

---

## Podešavanja po vrsti obaveze

| Polje | Vrednost za lekarski pregled |
|-------|------------------------------|
| Subjekt | Zaposleni |
| Period (meseci) | 12 |
| Rok unapred (dana) | 30 |
| Lekarska evidencija | DA |

`Rok unapred = 30` znači: aktivnost se kreira 30 dana pre termina, mejl ide tog istog dana.

---

## Proširenje na grupu

Kada jedan zaposleni ima više rasporeda (npr. više vrsta pregleda), svaki se vodi posebno. Nema grupnog slanja — svaki zaposleni dobija svoj mejl.

Za buduće proširenje na slanje celoj firmi odjednom: dodati akciju koja prolazi kroz sve aktivne zaposlene firme i kreira aktivnosti za sve koji nemaju tekući PENDING pregled.
