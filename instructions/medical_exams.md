### Uputstvo - lekarski pregledi zaposlenih

### 1) Priprema

Od klijenta uzmi:

1. Akt o proceni rizika (Word/PDF)
2. Uput za prethodni lekarski pregled
3. Uput za periodični lekarski pregled
4. Uput za pregled vida
5. Uput za ciljani oftalmološki pregled
6. Obrazac evidencije (ako se koristi)
7. Spisak zaposlenih:
  - ime i prezime
  - JMBG
  - datum rođenja
  - mesto rođenja
  - zanimanje/radno mesto
  - da li je radno mesto sa povećanim rizikom
8. Dogovorene periode pregleda (npr. 12 ili 36 meseci)
9. Email primaoca uputa

Ako ne postoji kategorija dokumenata za Akt:

- Dokumenti -> Kategorije dokumenata -> Dodaj kategoriju -> "Procena rizika"

---

### 2) Unos firme i zaposlenih

1. Klijenti -> unesi firmu. Opciono: šifra delatnosti.
2. Za firmu unesi zaposlene.
3. Obavezna polja zaposlenog:
  - ime i prezime
  - JMBG
  - datum i mesto rođenja
  - radno mesto
  - oznaka povećanog rizika

Opciono: ime oca, zanimanje, naziv radnog mesta sa povećanim rizikom.

---

### 3) Dodavanje Akta o proceni rizika

1. Dokumenti -> Dokumenti -> Dodaj dokument.
2. Popuni:
  - Kategorija: Procena rizika
  - Naziv: Akt o proceni rizika - [Naziv firme]
  - Fajl: akt (.docx/.pdf)
3. Sačuvaj.

Napomena: Akt ide u Dokumente. Uputi i evidencija idu u Šablone dokumenata.

---

### 4) Kreiranje šablona dokumenata

Za svaki šablon uradi isto:

1. Dokumenti -> Šabloni dokumenata -> Dodaj šablon.
2. Izaberi "Kreiraj iz fajla (upload)".
3. Otpremi fajl.
4. Popuni:
  - Naziv
  - Kontekst: Zaposleni
  - Kategorija (po potrebi)
  - **Način generisanja:** obavezno izaberi (običan za upute, tablični za evidencije). Šablon bez podešenog načina neće raditi.
5. Sačuvaj.
6. Otvori mapiranje polja i postavi potrebna polja na dokument:
  - ime, prezime, JMBG
  - datum rođenja, godina rođenja
  - radno mesto
  - naziv firme
  - broj uputa — automatski sledeći broj pri svakom generisanju
  - datum prethodnog pregleda — za istu vrstu obaveze i zaposlenog
  - ostala polja iz obrasca
  - **Fiksni tekst:** na mestu gde treba statičan sadržaj (npr. „Zdravstvena ustanova XYZ“) izaberi „Unos teksta“ i unesi vrednost
7. Sačuvaj mapiranje.

Ponovi za:

- Uput - prethodni lekarski pregled
- Uput - periodični lekarski pregled
- Uput - pregled vida
- Uput - ciljani oftalmološki pregled
- Evidencija (ako se koristi)

---

### 5) Kreiranje vrsta obaveza

Procesi -> Vrste obaveza. Kreiraj najmanje ove 4:

Napomena: Svakoj vrsti obaveze sistem automatski dodeljuje kod. Kod se ne može menjati.

1. Prethodni lekarski pregled
  - Subjekt: Zaposleni
  - Period (meseci): npr. 12
  - Rok unapred (dana): npr. 30
  - Aktivan: Da
2. Periodični lekarski pregled
  - Subjekt: Zaposleni
  - Period (meseci): npr. 12
  - Rok unapred (dana): npr. 30
  - Aktivan: Da
3. Pregled vida
  - Subjekt: Zaposleni
  - Period (meseci): npr. 36
  - Rok unapred (dana): npr. 30
  - Aktivan: Da
4. Ciljani oftalmološki pregled
  - Subjekt: Zaposleni
  - Period (meseci): po dogovoru
  - Rok unapred (dana): npr. 30
  - Aktivan: Da

---

### 6) Šabloni procesa za slanje Uputa

Procesi -> Šabloni procesa. Za svaku vrstu obaveze napravi šablon:

1. Vrsta obaveze: izabrani tip pregleda
2. Okidač: Na zakazani datum
3. Šablon dokumenta: odgovarajući Uput
4. Uključi:
  - Generiši dokument
  - Pošalji mejl
5. Podesi:
  - primalac mejla
  - naslov mejla
  - telo mejla
6. Sačuvaj.

Isto uradi za sva 4 tipa pregleda.

---

### 7) Automatski prelaz na sledeću obavezu (chaining)

Procesi -> Šabloni procesa -> dodaj još jedan šablon:

1. Vrsta obaveze: Prethodni lekarski pregled
2. Okidač: Pri završetku
3. Sledeća vrsta obaveze: Periodični lekarski pregled
4. Sačuvaj

Po potrebi dodaj i druge prelaze (npr. Pregled vida -> Ciljani oftalmološki).

**Pravila chaininga (lekarski pregledi):**

- **Prethodni lekarski pregled** → pri završetku otvara **Periodični lekarski pregled** (isti zaposleni, sledeći termin po periodu).
- **Pregled vida** → po potrebi može da vodi na **Ciljani oftalmološki pregled** (podesi u šablonu procesa: Sledeća vrsta obaveze).

Chaining se podešava u Šablonima procesa: za vrstu obaveze izaberi okidač „Pri završetku“ i polje „Sledeća vrsta obaveze“. Sistem za istog zaposlenog automatski ažurira ili kreira raspored za sledeću vrstu.

---

### 8) Rasporedi po zaposlenima

Procesi -> Rasporedi.

Za svakog zaposlenog unesi rasporede za obaveze koje pratiš:

- Prethodni lekarski pregled
- Periodični lekarski pregled
- Pregled vida (ako je obavezan)

Kod svakog rasporeda podesi:

- početni datum sledećeg pregleda
- period i rok isporuke (ako odstupa od podrazumevanog)

---

### 9) Test na jednom zaposlenom (obavezno)

1. Proveri da postoji raspored koji dolazi na red.
2. Kad se aktivnost zakaže, proveri:
  - da je kreirana aktivnost u čekanju
  - da je Uput generisan
  - da je mejl poslat/pripremljen
3. Posle pregleda:
  - otpremi izveštaj (PDF) — možeš ga priložiti aktivnosti (Dokumenti uz aktivnost)
  - u Aktivnostima otvori dijalog **„Završi“** i unesi:
    - datum izvršenog pregleda
    - datum sledećeg pregleda
    - opciono: broj izveštaja, ocena sposobnosti, preduzete mere (za Evidenciju 1)
  - označi kao završeno
4. Proveri da li je otvorena sledeća obaveza (ako je chaining podešen).

**Napomena:** Aktivnost ostaje u čekanju dok je korisnik ručno ne označi kao završenu. Sistem automatski ne zatvara aktivnost.

---

### 10) Dnevni rad

1. Prati Procesi -> Aktivnosti i „Ističe uskoro“. Ako koristiš filtriranje po roku, možeš prikazati samo one čiji rok pada u narednih X dana (X = Rok unapred vrste obaveze).
2. Kad stigne termin, sistem kreira aktivnost u čekanju i generiše Uput (i pošalje mejl ako je podešeno).
3. Kad stigne izveštaj:
  - otpremi PDF (opciono priloži aktivnosti)
  - otvori dijalog „Završi“, unesi datum pregleda, sledeći termin i (po želji) broj izveštaja, ocenu sposobnosti, preduzete mere
  - označi aktivnost kao završenu
4. Sistem dalje vodi istoriju i sledeće obaveze (chaining, raspored).

---

### 11) Evidencija 1 (Obrazac 1)

Kada su pregledi završeni i uneseni u sistem, možeš da skineš popunjenu Evidenciju 1 jednim klikom:

1. Idi na stranicu firme (Klijenti → izaberi firmu).
2. Klikni dugme **"Generiši Evidenciju 1"**.
3. Sačekaj sekund-dva — fajl se automatski skida na tvoj računar kao `.docx`.

Dokument sadrži sve završene preglede za sve zaposlene te firme, grupisane po zaposlenom, sa svim potrebnim podacima (datum pregleda, datum sledećeg, broj izveštaja, ocena sposobnosti, preduzete mere).

> Da bi se u evidenciji pojavili broj izveštaja, ocena sposobnosti i preduzete mere, ti podaci moraju biti popunjeni u dijalogu „Završi“ kada se pregled označava kao završen.

---

### 12) Kontrolna lista

- Firma i zaposleni uneti (uključujući šifru delatnosti ako treba)
- Akt dodat u Dokumente
- Sva 4 šablona Uputa napravljena, sa načinom generisanja i mapiranjem polja
- Sve vrste obaveza kreirane i aktivne
- Šabloni procesa „Na zakazani datum“ podešeni za sva 4 tipa
- Chaining „Pri završetku“ podešen (najmanje Prethodni -> Periodični)
- Rasporedi uneti za zaposlene
- Test na jednom zaposlenom prošao (aktivnost u čekanju -> Završi sa podacima -> završeno)
- Evidencija 1 generisana i proverena

---

### 13) Korisne napomene

- **Aktivnost u čekanju:** Kad sistem zakaže termin, kreira se aktivnost u čekanju. Sistem ne kreira novu aktivnost za isti raspored dok se ta ne završi (sprečava duple aktivnosti).
- **Dokumenti uz aktivnost:** Svaka aktivnost može imati priložene dokumente (izveštaji, PDF).
- **Dashboard „Ističe uskoro“:** Može se filtrirati da prikaže samo obaveze čiji rok pada u narednih X dana (X = Rok unapred vrste obaveze).

