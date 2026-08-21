# 05 — Oprema i stručni nalazi

## Cilj
Dodavanje opreme sa vezanom obavezom servisa/pregleda, i stručni nalazi (ispitivanja) na firmi — upload, datum, rok/status.

## Šta je ovo (za naraciju)
Oprema je, kao i zaposleni, nosilac obaveza: dodam PP aparat, aplikacija otvori obavezu servisa sa rokom. Koja obaveza se otvara bira se pri dodavanju opreme, poljem **Vrsta obaveze servisa/pregleda**.

**Stručni nalazi** su druga vrsta dokumentacije firme — nalazi ispitivanja (npr. oprema za rad, električne instalacije, mikroklima leto/zima). Svaki nalaz ima rok važenja; kad istekne, status se menja i javlja se alarm.

## Preduslovi
- `01` odrađen (firma sa profilom — instalacije određuju koji su nalazi relevantni).

## Koraci — oprema
1. **Oprema → Dodaj opremu** → **EQ1 → Popuni**: Firma, PP aparat, inventarski broj, lokacija, **Vrsta obaveze = Servis PP aparata** → **Sačuvaj**.
2. Oprema se pojavi u listi, vezana za firmu; obaveza servisa je otvorena sa rokom.

## Koraci — stručni nalazi
3. Tab **Dokumentacija → Stručni nalazi**: za tip (npr. oprema za rad) klikni upload → **L_DATE → Popuni** (datum izdavanja) → priloži fajl.
4. Nalaz se pojavi sa statusom i rokom; akcije **Pregled** / **Promeni fajl** / **Obriši**.

## Provera (checklist)
- [ ] Dodavanje opreme traži vrstu obaveze servisa/pregleda i otvara aktivnost sa rokom.
- [ ] Stručni nalaz ima datum, rok i status.
- [ ] Pregled/Promeni fajl/Obriši rade na nalazu.

## Šta reći u videu
> Oprema nosi obavezu isto kao zaposleni, samo umesto obuke ima servis ili pregled. Otvorim **Oprema → Dodaj**: naziv, kategorija, inventarski broj, lokacija — i u polju **Vrsta obaveze servisa/pregleda** biram šta joj ide. Primer: **PP aparat** → servis PP aparata na 6 meseci; **hidrant** → ispitivanje hidranata. Čim sačuvam, rok je otvoren — vidim ga na detalju opreme, u **Aktivnostima**, i kad se bliži na **Danas**. Ne pravim obavezu ručno posle.
>
> **Stručni nalazi** su druga vrsta papira — firma → **Dokumentacija → Stručni nalazi**: nalazi ispitivanja, elektro, mikroklima… Za svaki tip upišem datum izdavanja i priložim fajl; rok i status računa sistem sam, kad istekne javi mi se. Šta je u fokusu zavisi i od profila firme: ako na **Ličnoj karti** nema hidranata, hidrantski tip nije u igri — isto kao na **Pregledu**.

## Video
- Status: **snimiti**.

## Fill koji fali
- Nema (koristi postojeće `EQ1`, `L_DATE`).

## Otvoreno / TODO
- Nema.
