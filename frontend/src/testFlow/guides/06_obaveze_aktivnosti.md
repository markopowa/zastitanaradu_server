# 06 — Obaveze i aktivnosti (motor)

## Cilj
Životni ciklus obaveze: dodeljena obaveza → aktivnost → završetak → sledeći ciklus. Plus **lančanje prethodni → periodični lekarski**.

## Šta je ovo (za naraciju)
Dok je „obaveza" (vrsta iz kataloga) opšti pojam, **aktivnost** je njena konkretna pojava za određenog zaposlenog/opremu sa stvarnim rokom — npr. „periodični lekarski za Petra Petrovića, dospeva 1.9." To je ono na čemu se radi iz dana u dan. **Dodeljena obaveza** (vezivanje) je veza „ova vrsta obaveze važi za ovog zaposlenog", a iz nje se generišu pojedinačne aktivnosti i njihovi podsetnici.

Svaka aktivnost prolazi kroz tok: zakazana → (šalje se uput/obaveštenje) → realizovana → završena. Najvažnije za video je **lančanje (chaining)**: kad se prethodni lekarski završi, sistem automatski otvara **periodični** sa sledećim rokom; kad se periodični završi, otvara se sledeći — i tako ciklično. Tako obaveza nikad ne „ispadne" iz evidencije.

## Preduslovi
- `05` odrađen (zaposleni sa auto-otvorenim obavezama).

## Koraci — pregled
1. **Dodeljene obaveze** (admin) → očekivano: lista vezivanja po subjektu; akcije: izmeni datum, deaktiviraj, „Pošalji sad".
2. **Aktivnosti** → očekivano: brzi filteri **Kasni / Stiže uskoro / Otvorene / Sve** (podrazumevano Otvorene). Filtriraj „Stiže uskoro" → liste runova u narednih 14 dana.
3. Otvori jednu aktivnost (lekarski za zaposlenog) → detalji: zakazano, dokumenti, okidači/slanja, beleške.

## Koraci — završetak i lančanje
4. Otvori **prethodni lekarski** aktivnost → **K → Popuni** (datum pregleda, nalaz polja, važi do) → priloži nalaz (PDF) → **Završi**.
5. Očekivano:
   - aktivnost prelazi u **Završeno**, `važi do` postavljen;
   - **automatski se kreira PERIODIČNI lekarski** (lančanje iz prethodnog), zakazan od datuma pregleda + period;
   - preostali podsetnici prethodnog se otkazuju.
6. Otvori periodični (novi) → po završetku → očekivano: opet se zakaže sledeći periodični (ciklično).

## Provera (checklist)
- [ ] „Vezivanja" se zovu **Dodeljene obaveze** (nigde stari naziv).
- [ ] Aktivnosti imaju filtere; stara stranica „Rokovi" preusmerava ovde.
- [ ] Završetak prethodnog **lančano** otvara periodični (ne pravi se pri zaposlenju).
- [ ] Završetak periodičnog otvara sledeći periodični.
- [ ] Po završetku se zatvore/otkažu preostali podsetnici te aktivnosti.

## Šta reći u videu (predlog naracije)
> „Obaveza iz kataloga je opšti pojam; aktivnost je njena konkretna pojava — lekarski za tačno ovog zaposlenog, sa rokom. Aktivnost ima svoj tok: zakazujemo je, šalje se uput, realizujemo je, završavamo. Najvažnije: kad završim prethodni lekarski i unesem nalaz, sistem sam otvori periodični sa sledećim rokom, a kad se i on završi — opet sledeći. Tako se obaveze nikad ne izgube, lanac se nastavlja sam. Aktivnosti filtriramo po tome šta kasni, šta stiže i šta je otvoreno."

## Video
- Status: **snimiti** (motor, filteri i lančanje nisu pokazani u starim videima).

## Fill koji fali
- Nema nov (koristi se postojeći `K`).

## Otvoreno / TODO
- Proveriti `valid_until` semantiku pri završetku prethodnog (da periodični ne padne predaleko).
