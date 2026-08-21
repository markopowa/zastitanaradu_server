# 02 — Dokumentacija firme

## Cilj
Obavezna dokumentacija (sa Word→PDF konverzijom) i Akt o proceni rizika (datum, sekcije, revizije sa razlogom, objedinjen PDF, izmene i dopune).

## Šta je ovo (za naraciju)
Pored obaveza koje se ponavljaju (pregledi, ispitivanja — to je proces `04`), svaka firma ima i **dokumentaciju**: papire koje mora da poseduje — akt o proceni rizika, pravilnik o BZNR, rešenja o imenovanju lica za bezbednost. Dokument nije obaveza: obaveza je radnja koja se ponavlja, dokument je papir koji firma drži. Zato dokumenti stoje na tabu **Dokumentacija**, a ne u spisku obaveza.

## Preduslovi
- `01` odrađen (firma postoji, otvorena).
- Fajlovi u `files_for_test/` (PDF i .docx).

## Koraci
1. Tab **Dokumentacija → Obavezna dokumentacija**: na stavci (npr. Pravilnik o BZNR) klikni **Priloži** → izaberi `.docx` → fajl se automatski prebaci u PDF (piše: „Word fajlovi se automatski prebacuju u PDF."). Priloži i jedan PDF na drugu stavku — ostaje PDF.
2. Brojač **X / N priloženo** raste; opcione stavke (Ocena medicine rada, **Obrazac 1 — evidencija lekarskih pregleda**, **Evidencija radnih mesta sa povećanim rizikom**) ne ulaze u brojač — te dve poslednje se popune same kad se generišu iz drugih procesa (Obrazac 1 iz `04`), ili se prilažu ručno kao gotov fajl. Lista stavki je dinamička (učitava se iz kataloga tipova dokumenata), ne fiksirana u kodu.
3. **Akt o proceni rizika**:
   - **D_DATE → Popuni** (datum donošenja) → **Dodaj Akt** (datum ide u create).
   - Priloži sekcije; pri izmeni sekcije **D_REASON → Popuni** (razlog izmene) + fajl.
   - **Objedini u PDF** → jedan spojen PDF.
4. **Izmene i dopune Akta**: **Dodaj izmenu** → **D_AMD → Popuni** (naslov + napomena) → priloži fajl → amandman se pojavi u listi, kao ravnopravan dokument pored Akta.

## Provera (checklist)
- [ ] Word upload na obaveznoj dokumentaciji → automatski PDF.
- [ ] Akt: datum + sekcije + revizija sa razlogom + Objedini u PDF.
- [ ] Izmena i dopuna Akta ide kao zaseban dokument u listi.

## Šta reći u videu
> Dokumentacija je odvojena od obaveza namerno — i to odmah pokažem: tab **Pregled** su rokove i radnje koje se ponavljaju; tab **Dokumentacija** su papiri koje firma mora da poseduje, tačka. Ne mešaju se sa aktivnostima.
>
> Idem na **Dokumentacija → Obavezna dokumentacija**. Primer stavke: **Pravilnik o BZNR**, ili rešenje o licu za BZR. Kliknem **Priloži**. Ako otpremim Word, aplikacija ga sama prebaci u PDF — to pokažem na ekranu: poruka i PDF u listi — jer inspekciji i arhivi šaljemo PDF, Word ostaje samo izvor. Brojač gore mi pokazuje koliko fali do kompletnog seta — to mi treba kad me klijent pita „šta mi još treba".
>
> **Akt o proceni rizika** je poseban jer se menja tokom vremena, ne piše se jednom. Upišem datum donošenja, priložim sekcije. Kad menjam sekciju koja već postoji, aplikacija traži **razlog izmene** — ne pušta me dalje bez njega, jer inspekcija može da pita zašto je ovo promenjeno. Kad su sve sekcije unutra, jednim klikom ih spojim u jedan PDF.
>
> Kad firma kasnije promeni nešto bitno — novu opremu, novo radno mesto — ne prepravljam stari akt. Otvorim **Akt → Izmene i dopune → Dodaj**: naslov, napomena, fajl. Stoji u listi pored akta kao trag šta se i kad menjalo — istorija ostaje, stari akt se ne briše.

## Video
- Status: **presnimiti**. Stari snimak pokriva osnovu, ali ne i Word→PDF napomenu na ekranu, objedinjen PDF i izmene/dopune Akta.

## Otvoreno / TODO
- Nema.
