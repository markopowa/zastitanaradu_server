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
   - **D_DATE → Popuni** (datum donošenja) → **Dodaj Akt**.
   - Priloži sekcije; pri izmeni sekcije **D_REASON → Popuni** (razlog izmene) + fajl.
   - **Objedini u PDF** → jedan spojen PDF.
4. **Izmene i dopune Akta**: **Dodaj izmenu** → **D_AMD → Popuni** (naslov + napomena) → priloži fajl → amandman se pojavi u listi, kao ravnopravan dokument pored Akta.

## Provera (checklist)
- [ ] Word upload na obaveznoj dokumentaciji → automatski PDF.
- [ ] Akt: datum + sekcije + revizija sa razlogom + Objedini u PDF.
- [ ] Izmena i dopuna Akta ide kao zaseban dokument u listi.

## Šta reći u videu
> Prošao sam kroz dokumentaciju firme. Idem na tab Dokumentacija.
>
> Prvo Obavezna dokumentacija. Kliknem na stavku, recimo Pravilnik o BZNR, dugme Priloži, izaberem Word fajl. Aplikacija ga sama pretvori u PDF — piše mi to ispod dugmeta. Brojač gore pokazuje koliko je priloženo od potrebnog.
>
> Zašto dokument nije isto što i obaveza: obaveza je radnja koja se ponavlja, dokument je papir koji firma drži. Zato su odvojeno.
>
> Sad Akt o proceni rizika. Kliknem Dodaj Akt, upišem datum donošenja. Prilažem sekcije. Kad menjam sekciju koja već postoji, moram da upišem razlog izmene — bez toga ne ide dalje. Kad su sve sekcije tu, kliknem Objedini u PDF i dobijem jedan spojen dokument.
>
> Kad se nešto u firmi promeni, staru verziju akta ne brišem nego dodam izmenu i dopunu: kliknem Dodaj izmenu, upišem naslov i napomenu, priložim fajl. Stoji u listi pored akta, kao istorija promena.

## Video
- Status: **presnimiti**. Stari snimak pokriva osnovu, ali ne i Word→PDF napomenu na ekranu, objedinjen PDF i izmene/dopune Akta.

## Otvoreno / TODO
- Nema.
