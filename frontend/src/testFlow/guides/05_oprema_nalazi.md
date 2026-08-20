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
> Oprema nosi obavezu isto kao zaposleni, samo umesto obuke ima servis ili pregled. Dodam opremu — naziv, kategorija, inventarski broj, lokacija — i biram koja vrsta obaveze joj ide. Primer: PP aparat → obaveza **servis PP aparata** (npr. na 6 meseci). Čim sačuvam, oprema ima otvoren rok, ne pravim obavezu ručno posle.
>
> Stručni nalazi su druga vrsta papira firme — nalazi ispitivanja, recimo za opremu za rad ili električne instalacije. Za svaki tip upišem datum izdavanja i priložim fajl. Rok važenja i status računa sistem sam; kad istekne, javi mi se, ne moram da pamtim datume po tipovima.

## Ako pita — primer i gde da pokažeš
| Ako kaže / pita | Ti kažeš | Otvori u app |
|---|---|---|
| Koja obaveza za koju opremu? | Biram pri unosu — npr. PP aparat → servis PP; hidrant → ispitivanje hidranata. | **Oprema → Dodaj** → polje **Vrsta obaveze servisa/pregleda**. |
| Gde vidim rok posle unosa? | Na opremi / u aktivnostima / na Danas kad se bliži. | Lista **Oprema** → detalj; ili **Aktivnosti** / **Danas**. |
| Šta je stručni nalaz? | Papir ispitivanja sa rokom (elektro, mikroklima…). | Firma → **Dokumentacija → Stručni nalazi**. |
| Zašto zavisi od profila? | Ako firma nema hidrante, taj tip nalaza nije u fokusu. | **Lična karta** (instalacije) + **Pregled** / Stručni nalazi. |

## Video
- Status: **snimiti**.

## Fill koji fali
- Nema (koristi postojeće `EQ1`, `L_DATE`).

## Otvoreno / TODO
- Nema.
