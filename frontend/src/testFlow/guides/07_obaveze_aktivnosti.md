# 07 — Obaveze i aktivnosti (motor)

## Cilj
Životni ciklus obaveze: dodeljena obaveza → aktivnost → završetak → sledeći ciklus. Plus **lančanje prethodni → periodični lekarski**.

## Šta je ovo (za naraciju)
Dok je „obaveza" (vrsta iz kataloga) opšti pojam, **aktivnost** je njena konkretna pojava za određenog zaposlenog/opremu sa stvarnim rokom — npr. „periodični lekarski za Petra Petrovića, dospeva 1.9." To je ono na čemu se radi iz dana u dan. **Dodeljena obaveza** (vezivanje) je veza „ova vrsta obaveze važi za ovog zaposlenog", a iz nje se generišu pojedinačne aktivnosti i njihovi podsetnici.

Svaka aktivnost prolazi kroz tok: zakazana → (šalje se uput/obaveštenje) → realizovana → završena. Najvažnije za video je **lančanje (chaining)**: kad se prethodni lekarski završi, sistem automatski otvara **periodični** sa sledećim rokom; kad se periodični završi, otvara se sledeći — i tako ciklično. Tako obaveza nikad ne „ispadne" iz evidencije.

## Preduslovi
- `06` odrađen (zaposleni sa auto-otvorenim obavezama).

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
> „Da objasnim razliku između dve reči koje stalno koristimo. **Obaveza** je opšti pojam — na primer „lekarski pregled". **Aktivnost** je konkretan slučaj — „lekarski za Petra Petrovića, rok 1. septembra". Na aktivnostima radimo svaki dan.
>
> Aktivnosti otvorim levo, i mogu da ih filtriram: šta kasni, šta stiže uskoro, šta je otvoreno. Otvorim jednu — vidim kad je zakazana, koji su dokumenti, koji mejlovi su otišli.
>
> Kad je pregled obavljen, otvorim tu aktivnost, upišem datum pregleda i nalaz, priložim PDF nalaza i kliknem **Završi**. Sad pazite šta se desi samo od sebe: aktivnost pređe u „završeno", a aplikacija **odmah otvori sledeći lekarski** sa novim rokom — i tako u krug. Znači obaveza nikad ne ispadne iz evidencije, lanac se nastavlja sam."

## Video
- Status: **snimiti** (motor, filteri i lančanje nisu pokazani u starim videima).

## Fill koji fali
- Nema nov (koristi se postojeći `K`).

## Otvoreno / TODO
- Proveriti `valid_until` semantiku pri završetku prethodnog (da periodični ne padne predaleko).
