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

> „Odradili smo podešavanja prema mejlovima koje ste poslali. Ono što ostaje je
> korišćenje aplikacije i sada ću to da vam pokažem. Prva stvar je unos klijenata
> sa kojima radite. Iz mejlova sam video da želimo da testiramo na firmi **UKRAS
> DOO Veliki Popović** — pa hajde da nju unesemo."
>
> „Sad unosimo novu firmu — klijenta. Kliknem levo na **Firme**, pa gore na **Dodaj firmu**. Otvara se čarobnjak — prozor koji me vodi korak po korak, baš zato da ništa ne preskočim; bolje da me aplikacija pita nego da se kasnije ispostavi da fali podatak.
>
> Prvi korak je **lična karta firme**: naziv, PIB, adresa, telefon. Da ne kucam sve ručno i ne grešim, ovde gore upišem **matični broj** i kliknem **Uvezi** — aplikacija ode u APR i sama povuče zvanične podatke firme. (Ako uvoz baš ne radi, sve mogu i ručno.) **Sledeći**.
>
> Drugi korak je obavezna dokumentacija — to radimo detaljno kasnije, sad samo **Sledeći**.
>
> Treći korak su **radna mesta**. Kliknem **Dodaj radno mesto**, upišem naziv, na primer „Viljuškarista", i — ovo je najvažnije polje — izaberem **nivo rizika**. Zašto je toliko bitno: od rizika radnog mesta kasnije zavisi šta se radniku automatski otvara. Ako je mesto sa povećanim rizikom, radnik dobija i lekarske preglede; ako nije — ne dobija. Zato ovde ne biram nasumično. **Sledeći**.
>
> Četvrti korak su **zaposleni**: **Dodaj zaposlenog**, upišem podatke, vežem za radno mesto, **Sačuvaj**, pa **Sledeći**. Peti korak je prvi lekarski — upišem i **Dodaj**.
>
> Na kraju **Završi** i aplikacija me odmah ubaci u karton firme, na tab **Pregled**. Firma je u sistemu i od ovog trenutka aplikacija počinje da prati njene rokove."

## Video
- Status: **presnimiti**. `03_unos_firme.webm` je blizu, ali: čarobnjak više nema korak „Stručni nalazi"; završetak vodi na **Pregled** (ne Usklađenost); profil firme (ZOP/instalacije) se sad postavlja na Ličnoj karti (vidi `04`).

## Otvoreno / TODO
- APR uvoz iz matičnog broja — još ručno; kad proradi automatika, ažurirati korak 2.
