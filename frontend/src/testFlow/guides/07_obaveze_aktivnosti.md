# 07 — Obaveze i aktivnosti (motor)

## Cilj
Životni ciklus obaveze: dodeljena obaveza → aktivnost → završetak → sledeći ciklus. Plus **lančanje prethodni → periodični lekarski**.

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

## Video
- Status: **snimiti** (motor, filteri i lančanje nisu pokazani u starim videima).

## Fill koji fali
- Nema nov (koristi se postojeći `K`).

## Otvoreno / TODO
- Proveriti `valid_until` semantiku pri završetku prethodnog (da periodični ne padne predaleko).
