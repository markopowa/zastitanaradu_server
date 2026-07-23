# 05 — Oprema i stručni nalazi

## Cilj
Dodavanje opreme sa vezanom obavezom servisa/pregleda, i stručni nalazi (ispitivanja) na firmi — upload, datum, rok/status.

## Šta je ovo (za naraciju)
Oprema je, kao i zaposleni, nosilac obaveza: dodam PP aparat, aplikacija otvori obavezu servisa sa rokom. Koja obaveza se otvara bira se pri dodavanju opreme, poljem **Vrsta obaveze servisa/pregleda**.

**Stručni nalazi** su druga vrsta dokumentacije firme — nalazi ispitivanja (npr. oprema za rad, električne instalacije, mikroklima leto/zima). Svaki nalaz ima rok važenja; kad istekne, status se menja i javlja se alarm.

## Preduslovi
- `01` odrađen (firma sa profilom — instalacije određuju koji su nalazi relevantni).

## Koraci — oprema
1. **Oprema → Dodaj opremu** → **EQ1 → Popuni**: Firma, Naziv, Kategorija, Inventarski broj, Lokacija, Beleške, **Vrsta obaveze servisa/pregleda** → **Sačuvaj**.
2. Oprema se pojavi u listi, vezana za firmu; obaveza servisa/pregleda je otvorena sa rokom.

## Koraci — stručni nalazi
3. Tab **Dokumentacija → Stručni nalazi**: za tip (npr. oprema za rad) klikni upload → **L_DATE → Popuni** (datum izdavanja) → priloži fajl.
4. Nalaz se pojavi sa statusom i rokom; akcije **Pregled** / **Promeni fajl** / **Obriši**.

## Provera (checklist)
- [ ] Dodavanje opreme traži vrstu obaveze servisa/pregleda i otvara aktivnost sa rokom.
- [ ] Stručni nalaz ima datum, rok i status.
- [ ] Pregled/Promeni fajl/Obriši rade na nalazu.

## Šta reći u videu
> Prošao sam kroz opremu i stručne nalaze.
>
> Idem na Oprema, Dodaj opremu. Upišem naziv, kategoriju, inventarski broj, lokaciju, i biram vrstu obaveze servisa ili pregleda za tu opremu. Sačuvam — oprema je u listi, i odmah ima otvorenu obavezu servisa sa rokom, isto kao kod zaposlenih.
>
> Sad stručni nalazi, na tabu Dokumentacija. Za tip, recimo oprema za rad, otvorim upload, upišem datum izdavanja, priložim fajl. Nalaz stoji sa rokom važenja i statusom — kad istekne, javlja mi se. Mogu da ga pregledam, promenim fajl ili obrišem.

## Video
- Status: **snimiti**.

## Fill koji fali
- Nema (koristi postojeće `EQ1`, `L_DATE`).

## Otvoreno / TODO
- Nema.
