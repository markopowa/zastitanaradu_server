# 01 — Unos firme (čarobnjak)

## Cilj
Kroz čarobnjak napravim novu klijentsku firmu: lična karta, radna mesta, zaposleni, prva obaveza. Posle toga postavim profil firme i pogledam tab Pregled. Pilot: UKRAS DOO.

## Uvod
Podešavanje (katalog obaveza, šabloni podsetnika, nivoi rizika, šabloni dokumenata, korisnici i uloge) je već ubačeno komandom `add_setup` — to ne radim kroz aplikaciju i ne pokazujem u ovim video-uputstvima. Ono što sledi je svakodnevni rad u već podešenoj aplikaciji, proces po proces.

## Preduslovi
- Katalog obaveza ubačen (`add_setup`).
- Fajlovi u `files_for_test/`.

## Koraci
1. **Firme → Dodaj firmu** → otvara se čarobnjak sa pet koraka: Lična karta, Obavezna dokumentacija, Radna mesta i rizik, Zaposleni, Lekarski pregledi.
2. Korak **Lična karta**: **A1 → Popuni** → upišem matični broj `20644206` → **Uvezi** → povuče podatke iz javnog registra (ako uvoz ne radi, upisujem ručno) → **Sledeći**.
3. Korak **Obavezna dokumentacija**: ostavljam prazno za sada, to radim u procesu „Dokumentacija firme" → **Sledeći**.
4. Korak **Radna mesta i rizik**: **A3 → Popuni** → **Dodaj radno mesto** → upišem naziv i biram nivo rizika (obavezno polje) → **Sledeći**.
5. Korak **Zaposleni**: **Dodaj zaposlenog** → **F1 → Popuni** → **Sačuvaj** → **Sledeći**.
6. Korak **Lekarski pregledi**: **J1 → Popuni** → **Dodaj** → **Sledeći**.
7. **Završi** → aplikacija me prebaci na tab **Pregled** firme — checklista svih obaveza (Bezbednost i zdravlje na radu i Zaštita od požara), svaka sa statusom (U redu / Uskoro dospeva / Kasni / Nedostaje / Nije primenljivo) i pravnim osnovom.
8. Tab **Lična karta** → **Izmeni podatke** → **P_PROFIL → Popuni** → postavim ZOP kategoriju, „Delatnost visokog rizika", instalacije (aparati za gašenje požara, hidrantska mreža…) → **Sačuvaj**.
9. Na Ličnoj karti → **Dodaj kontakt-lice** → **B → Popuni** → **Sačuvaj**.
10. Vratim se na **Pregled** → obaveze vezane za te instalacije više nisu „Nije primenljivo" nego dobijaju pravi status; obaveze bez tih instalacija ostaju „Nije primenljivo".
11. Na redu sa statusom „Nedostaje"/„Kasni" → klik na **⋮** → **Ispravi** (vodi na tab gde se to rešava) ili **Nije primenljivo** (traži razlog u dijalogu, obavezno polje).
12. Označim jednu obavezu kao „Nije primenljivo" uz razlog → red posivi, prikazuje razlog, ima dugme **Vrati**.

## Provera (checklist)
- [ ] Firma kreirana i otvorena.
- [ ] Radno mesto i zaposleni vidljivi.
- [ ] Po završetku otvoren tab **Pregled**, obaveze grupisane po Bezbednost i zdravlje na radu / Zaštita od požara.
- [ ] Profil (ZOP kategorija, Delatnost visokog rizika, instalacije) menja statuse obaveza.
- [ ] Kontakt-lice se čuva i vidi se na Ličnoj karti.
- [ ] „Nije primenljivo" traži razlog i može da se vrati.

## Šta reći u videu
> Prošao sam kroz unos nove firme. Idem na **Firme**, pa **Dodaj firmu** — otvori se čarobnjak sa pet koraka, da ništa ne preskočim.
>
> U prvom koraku upišem matični broj i kliknem **Uvezi** — podaci se povuku iz javnog registra. Ako uvoz ne uspe, upišem ručno naziv, PIB, adresu, telefon. Kliknem **Sledeći**.
>
> Drugi korak je dokumentacija — nju ostavljam praznu ovde, radim je posle, kao poseban proces. **Sledeći**.
>
> Treći korak su radna mesta. Kliknem **Dodaj radno mesto**, upišem naziv i moram da izaberem nivo rizika — obavezno polje. **Sledeći**.
>
> Četvrti korak su zaposleni. Kliknem **Dodaj zaposlenog**, upišem podatke, vežem za radno mesto, **Sačuvaj**, **Sledeći**.
>
> Peti korak je prvi lekarski pregled. Upišem podatke i kliknem **Dodaj**.
>
> Na kraju kliknem **Završi** — aplikacija me prebaci na tab **Pregled** te firme. Tu vidim sve obaveze firme na jednom mestu, podeljene na bezbednost na radu i zaštitu od požara, svaka sa statusom i pravnim osnovom.
>
> Da bi statusi bili tačni, moram da kažem aplikaciji šta firma ima. Idem na tab **Lična karta**, **Izmeni podatke**, upišem ZOP kategoriju, da li je delatnost povećanog rizika, i koje instalacije firma ima — recimo aparate za gašenje požara i hidrantsku mrežu. **Sačuvaj**.
>
> Tu isto dodam kontakt-lice — direktora ili lice za bezbednost, sa telefonom i mejlom.
>
> Vratim se na **Pregled** — obaveze vezane za te instalacije su sad dobile pravi status; ono što firma nema ostaje „nije primenljivo". Ako nešto stvarno ne važi za firmu, kliknem tri tačke, **Nije primenljivo**, upišem razlog — red posivi, i uvek mogu da ga vratim dugmetom **Vrati**.

## Video
- Status: **presnimiti**. Stari `03_unos_firme.webm` je blizu, ali čarobnjak više nema korak „Stručni nalazi", a završetak vodi na **Pregled**, ne na staru „Usklađenost".

## Otvoreno / TODO
- Uvoz iz matičnog broja (APR) — proveriti da li je uvoz automatski ili i dalje ručan pri snimanju.
