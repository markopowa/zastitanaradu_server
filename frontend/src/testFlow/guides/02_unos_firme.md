# 02 — Unos nove firme (čarobnjak)

## Cilj
Kroz čarobnjak napraviti firmu sa kojom će se raditi (lična karta, radna mesta, zaposleni, prva obaveza). Pilot: UKRAS DOO.

## Šta je ovo (za naraciju)
Kad uzmemo novog klijenta, sve počinje od **unosa firme**. Čarobnjak nas vodi korak po korak da odmah unesemo minimum potreban da firma „proradi": ko je firma (lična karta), koja **radna mesta** ima i sa kojim **nivoom rizika**, koji su **zaposleni**, i prva **obaveza** (npr. lekarski). Ideja je da se ne zaboravi nijedan ključni podatak.

Korisno reći: matični broj je veza ka **APR-u** — kasnije će podaci moći automatski da se povuku; za sada se unose ručno. Radna mesta i njihov rizik su važni jer **od rizika zavisi šta se zaposlenom automatski otvara** (vidi `05`).

## Preduslovi
- Katalog obaveza ubačen jednom komandom `add_setup` (početni setup, ne radi se kao test).
- Fajlovi u `files_for_test/`.

## Koraci
1. **Firme → Dodaj firmu** → otvara se čarobnjak.
2. Korak 1 (Lična karta): **A1 → Popuni** → matični broj `20644206` → **Uvezi** (APR — može ostati ručno ako uvoz nije dostupan) → **Sledeći**.
3. Korak 2 (Obavezna dokumentacija): može prazno za sada → **Sledeći**. (Detaljno u `04`.)
4. Korak 3 (Radna mesta i rizik): **A3 → Popuni** → **Dodaj radno mesto** → radno mesto u listi (nivo rizika obavezan) → **Sledeći**.
5. Korak 4 (Zaposleni): **Dodaj zaposlenog** → **F1 → Popuni** → **Sačuvaj** → **Sledeći**.
6. Korak 5 (Lekarski pregledi): **J1 → Popuni** → **Dodaj** → **Sledeći**.
7. **Završi** → prebacuje na tab **Pregled** firme (vidi `03`).

## Provera (checklist)
- [ ] Firma kreirana i otvorena.
- [ ] Radno mesto i zaposleni vidljivi.
- [ ] Po završetku otvoren tab **Pregled** (ne stari „Usklađenost").

## Šta reći u videu (predlog naracije)
> „Kad uzmemo novog klijenta, unos počinje ovde. Čarobnjak nas vodi kroz osnovno: ko je firma, koja radna mesta ima i koliki im je rizik, ko su zaposleni, i prva obaveza. Matični broj je veza ka APR-u — kasnije podatke vučemo automatski. Nivo rizika na radnom mestu je bitan jer od njega zavisi šta se zaposlenom automatski otvara. Na kraju nas vodi na Pregled firme."

## Video
- Status: **presnimiti**. `03_unos_firme.webm` je blizu, ali: čarobnjak više nema korak „Stručni nalazi"; završetak vodi na **Pregled** (ne Usklađenost); profil firme (ZOP/instalacije) se sad postavlja na Ličnoj karti (vidi `03`).

## Otvoreno / TODO
- APR uvoz iz matičnog broja — još ručno; kad proradi automatika, ažurirati korak 2.
