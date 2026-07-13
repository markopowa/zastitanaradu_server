# 03 — Unos nove firme (čarobnjak)

## Cilj
Kroz čarobnjak napraviti firmu sa kojom će se raditi (lična karta, radna mesta, zaposleni, prva obaveza). Pilot: UKRAS DOO.

## Šta je ovo (za naraciju)
Kad uzmemo novog klijenta, sve počinje od **unosa firme**. Čarobnjak nas vodi korak po korak da odmah unesemo minimum potreban da firma „proradi": ko je firma (lična karta), koja **radna mesta** ima i sa kojim **nivoom rizika**, koji su **zaposleni**, i prva **obaveza** (npr. lekarski). Ideja je da se ne zaboravi nijedan ključni podatak.

Korisno reći: matični broj je veza ka **APR-u** — kasnije će podaci moći automatski da se povuku; za sada se unose ručno. Radna mesta i njihov rizik su važni jer **od rizika zavisi šta se zaposlenom automatski otvara** (vidi `06`).

## Preduslovi
- Katalog obaveza ubačen jednom komandom `add_setup` (početni setup, ne radi se kao test).
- Fajlovi u `files_for_test/`.

## Koraci
1. **Firme → Dodaj firmu** → otvara se čarobnjak.
2. Korak 1 (Lična karta): **A1 → Popuni** → matični broj `20644206` → **Uvezi** (APR — može ostati ručno ako uvoz nije dostupan) → **Sledeći**.
3. Korak 2 (Obavezna dokumentacija): može prazno za sada → **Sledeći**. (Detaljno u `05`.)
4. Korak 3 (Radna mesta i rizik): **A3 → Popuni** → **Dodaj radno mesto** → radno mesto u listi (nivo rizika obavezan) → **Sledeći**.
5. Korak 4 (Zaposleni): **Dodaj zaposlenog** → **F1 → Popuni** → **Sačuvaj** → **Sledeći**.
6. Korak 5 (Lekarski pregledi): **J1 → Popuni** → **Dodaj** → **Sledeći**.
7. **Završi** → prebacuje na tab **Pregled** firme (vidi `04`).

## Provera (checklist)
- [ ] Firma kreirana i otvorena.
- [ ] Radno mesto i zaposleni vidljivi.
- [ ] Po završetku otvoren tab **Pregled** (ne stari „Usklađenost").

## Šta reći u videu (predlog naracije)

> „Podešavanja smo završili prema vašim mejlovima. Dalje je korišćenje aplikacije, i to sad pokazujem. Prvi korak je unos klijenata — počinjemo sa firmom **UKRAS DOO Veliki Popović**."
>
> „Kliknem na **Firme**, pa **Dodaj firmu** — otvara se čarobnjak koji vodi kroz sve korake, da ništa ne preskočimo.
>
> Prvi korak je lična karta firme: naziv, PIB, adresa, telefon. Upišem **matični broj** i kliknem **Uvezi** — podaci se povuku direktno iz APR-a. Ako uvoz ne radi, unosim ručno. **Sledeći**.
>
> Drugi korak, dokumentacija, radimo kasnije — sad **Sledeći**.
>
> Treći korak su **radna mesta**: **Dodaj radno mesto**, upišem naziv — recimo „Viljuškarista" — i izaberem **nivo rizika**. Ovo polje je ključno: povećan rizik automatski znači i lekarski pregledi za radnika, bez njega ne. **Sledeći**.
>
> Četvrti korak, **zaposleni**: dodam podatke, vežem za radno mesto, **Sačuvaj**, **Sledeći**. Peti korak, prvi lekarski: upišem i **Dodaj**.
>
> **Završi** — aplikacija me prebaci na tab **Pregled** firme. Firma je u sistemu i od sad joj se prate rokovi."

## Video
- Status: **presnimiti**. `03_unos_firme.webm` je blizu, ali: čarobnjak više nema korak „Stručni nalazi"; završetak vodi na **Pregled** (ne Usklađenost); profil firme (ZOP/instalacije) se sad postavlja na Ličnoj karti (vidi `04`).

## Otvoreno / TODO
- APR uvoz iz matičnog broja — još ručno; kad proradi automatika, ažurirati korak 2.
