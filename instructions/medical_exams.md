# Tok lekarskog pregleda — opis

## Kratak pregled

Sistem prati periodične lekarske preglede zaposlenih. Za svakog zaposlenog postoji raspored (binding) koji se automatski obnavlja. Korisnik ne mora ručno da pravi ništa osim prvog rasporeda.

---

## Okidači (šabloni obaveza)

| Okidač | Kada | Tipična akcija |
|--------|------|----------------|
| **N dana pre termina** (`ON_LEAD`) | `run_due_processes` kreira aktivnost (`fire_date = termin − rok unapred`) | Email internoj ulozi — pripremi termin |
| **Na zakazani datum** (`ON_SCHEDULED`) | Dan termina (`scheduled_for`); dnevni job `run_process_reminders` | Uput + email zaposlenom |
| **Kada se završi** (`ON_COMPLETED`) | Ručno završenje pregleda | Chaining — sledeći termin |
| **Kada nije završeno na vreme** (`ON_OVERDUE`) | Posle termina, aktivnost još **Na čekanju** / **Poslat**; `run_process_reminders` | Email podsetnik (npr. interno) |

`Rok unapred (dana)` na vrsti obaveze / rasporedu = koliko dana **pre** `Sledeći termin` sistem kreira aktivnost i šalje `ON_LEAD`.

---

## Šta se šalje i kada

### N dana pre termina — obavesti interno

Okidač: **N dana pre termina** (`ON_LEAD`)

Sistem (kad `run_due_processes` kreira aktivnost):
1. Kreira **ProcessRun** u statusu *Na čekanju*, `scheduled_for` = datum termina.
2. Izvršava šablone sa `ON_LEAD` (npr. email radniku u app — interna uloga).

Ne generiše uput zaposlenom u ovoj fazi (to ide na dan termina).

---

### Dan termina — pošalji uput

Okidač: **Na zakazani datum** (`ON_SCHEDULED`)

Dnevna komanda `run_process_reminders` (npr. 07:00), kada je `danas == scheduled_for`:

1. Generiše popunjen uput (DOCX/PDF) iz šablona.
2. Šalje mejl zaposlenom sa uputom u prilogu.

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

---

### Posle završetka pregleda — sledeći termin

Okidač: **Kada se završi** (`ON_COMPLETED`)

Korisnik unosi datum pregleda, važi do, broj izveštaja, ocenu, mere.

Sistem:
1. Zatvara aktivnost kao **Završeno**.
2. Pomera `next_run_at` na bindingu (`valid_until + period`) ili kreira sledeći binding preko **Sledeća vrsta obaveze** na šablonu.

---

### Nije završeno na vreme — podsetnik

Okidač: **Kada nije završeno na vreme** (`ON_OVERDUE`)

`run_process_reminders`: aktivnost je još **Na čekanju** ili **Poslat**, a `danas > scheduled_for`.

Jednom po aktivnosti — šalje email (npr. internoj ulozi) da pregled nije evidentiran.

---

## Raspored (binding) — životni ciklus

```
Kreiranje (ručno)
    ↓
D−30: run_due_processes → aktivnost + ON_LEAD (interno)
    ↓
D0:   run_process_reminders → ON_SCHEDULED (uput + mejl zaposlenom)
    ↓
Korisnik završi → ON_COMPLETED → next_run_at / chaining
    ↓
Ako nije završeno posle D0 → ON_OVERDUE (podsetnik)
    ↓
(ponavlja se)
```

Raspored se **nikad ne briše** — sam se obnavlja.

---

## Dnevni poslovi

| Komanda | Kada | Šta radi |
|---------|------|----------|
| `run_due_processes` | npr. 06:00 | Kreira PENDING run na `fire_date`; pali **ON_LEAD** |
| `run_process_reminders` | npr. 07:00 | **ON_SCHEDULED** na dan termina; **ON_OVERDUE** za propuštene |

Test sa budućim datumom: `python manage.py run_process_reminders --date 2026-06-20`

---

## Brzo slanje (bez schedulera)

Dugme **"Pošalji sad"** / **"Pošalji na pregled"**:

- Odmah kreira aktivnost (**Poslat**) i izvršava **ON_SCHEDULED** (uput + mejl).
- Ne čeka `run_due_processes` ni `run_process_reminders`.

---

## Evidencija (Obrazac 1 / medicinska evidencija)

Na stranici klijenta: **"Generiši medicinsku evidenciju"**.

DOCX tabela sa završenim pregledima (vrsta obaveze: **Lekarska evidencija = DA**).

---

## Podešavanja po vrsti obaveze

| Polje | Vrednost za lekarski pregled |
|-------|------------------------------|
| Subjekt | Zaposleni |
| Period (meseci) | 12 |
| Rok unapred (dana) | 30 |
| Lekarska evidencija | DA |

Tri šablona obaveza za istu vrstu:

1. **ON_LEAD** — email internoj ulozi (bez dokumenta).
2. **ON_SCHEDULED** — generiši uput + email zaposlenom.
3. **ON_COMPLETED** — chaining, bez mejla.
4. *(opciono)* **ON_OVERDUE** — email internoj ulozi ako nije završeno.

---

## Proširenje na grupu

Svaki zaposleni ima svoj raspored i svoj mejl. Grupno slanje nije u ovom toku.
