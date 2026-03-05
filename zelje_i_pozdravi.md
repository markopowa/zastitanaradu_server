### Idealna (bez ograničenja) specifikacija za rad sa šablonima

#### 1. Šablon = originalni dokument

- **Izvor istine** je uvek originalni fajl (`.docx` ili `.pdf`), sačuvan 1:1.
- Sistem **ni u jednom trenutku ne menja** taj fajl (nema „ugrađivanja“ Jinja koda u sam DOCX).
- Sve što radimo (placeholders, logika) je u metapodacima oko tog fajla.

#### 2. Prikaz u aplikaciji

- U browseru postoji **viewer** koji prikazuje dokument:
  - 1:1 kao u Word‑u / PDF readeru (fontovi, margine, širine kolona, linije, sve),
  - možeš listati stranice ako ih ima više.
- Korisnik kada otvori šablon u aplikaciji **ne može da vidi razliku** u odnosu na Word/PDF.

#### 3. Označavanje polja (placeholders)

- Korisnik:
  - klikne tačno na mesto u dokumentu (u ćeliji tabele, u zaglavlju, u tekstu),
  - iskoči **context meni** sa listom polja na srpskom (Naziv firme, PIB, Ime zaposlenog, JMBG, …),
  - izabere polje.
- Sistem:
  - nacrta mali marker/etiketu tačno tu (npr. `[Naziv firme]`),
  - omogućava drag‑and‑drop pomeranje markera,
  - omogućava brisanje markera (desni klik → „Ukloni polje“).

#### 4. Model podataka za šablon

- `generation_config` na `DocumentTemplate` čuva semantičke info:
  - lista markera:
    ```json
    {
      "placeholders": [
        {
          "id": "ph1",
          "fieldKey": "client.name",
          "page": 1,
          "x": 0.123,
          "y": 0.456
        }
      ]
    }
    ```
  - (opciono) dodatne informacije za tabele:
    - koji red je „šablon reda“,
    - koja kolona mapira koji field (ako hoćemo precizno).
- Korisnik **nikad ne vidi `fieldKey` ni Jinja**; sve je interno.

#### 5. Generisanje

- Kada sistem generiše dokument:
  - učita originalni DOCX,
  - za svaki placeholder:
    - na osnovu `(page, x, y)` pronađe odgovarajući tekst run / ćeliju,
    - upiše vrednost iz baze (`client.name`, `employee.jmbg`…),
  - sačuva novi DOCX (ili PDF) kao rezultat.
- Za tablične obrasce (Evidencija 1):
  - postoji dodatni mod „repeat row“:
    - zna koji je red/ćelija „šablon reda“,
    - umnožava red N puta na osnovu liste zaposlenih,
    - u svaku ćeliju upisuje vrednosti na osnovu `fieldKey` za tu kolonu i tekućeg zaposlenog.
- Rezultat je dokument koji vizuelno izgleda **kao da ga je čovek ručno popunio u Word‑u**.

#### 6. UX pojednostavljenja

- **Nema Jinja textarea** za ove šablone u UI‑ju.
- Nema `_____` + SELECT mehanike – sve radi isključivo preko klika na dokument.
- Za obične tekstualne šablone (bez zahtjeva za 1:1 look) može postojati odvojeni, mnogo jednostavniji ekran sa tekstom + polja‑kao‑čipovi.

#### 7. Ostalo (nice‑to‑have, ali poželjno)

- Undo/redo za markere u editoru.
- Validacija:
  - upozorenje ako mapira polje koje ne postoji u datom kontekstu (npr. `employee.jmbg` na šablon za `CLIENT_COMPANY`).
- Pregled u kome vidiš listu svih polja koja su mapirana i gde se nalaze (npr. po strani/koordinatama).
- Mogućnost dupiranja šablona (copy as new) zajedno sa svim markerima.

To je „želimo idealno“ bez obzira na to koliko će implementacija biti teška.

