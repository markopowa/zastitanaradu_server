# 05 — Dokumentacija firme

## Cilj
Obavezna dokumentacija (sa Word→PDF konverzijom), Akt o proceni rizika (sekcije, revizije, **izmene i dopune**, objedinjen PDF), stručni nalazi, i **blanko šabloni po radnom mestu**.

## Šta je ovo (za naraciju)
Pored obaveza koje se *ponavljaju* (pregledi, ispitivanja), svaka firma ima i **dokumentaciju** — papire koji moraju da postoje: akt o proceni rizika, pravilnik o BZNR, rešenja o imenovanju lica za bezbednost, evidencije. Ovde se ti dokumenti **čuvaju, kategorišu i preuzimaju**. Bitno razgraničiti: **dokument ≠ obaveza** — obaveza je radnja koja se ponavlja, dokument je dokaz/akt koji firma drži; zato dokumenta stoje u setupu firme, a ne u katalogu obaveza.

Dve posebnosti vredne pomena u videu:
- **Word→PDF**: kad se priloži `.docx`, sistem ga sam pretvori u PDF (osim blanko obrazaca koji ostaju Word jer se popunjavaju i štampaju).
- **Akt o proceni rizika** je „živ" dokument: ima sekcije, revizije sa razlogom, i **izmene/dopune** — kad se nešto u firmi promeni (novo radno mesto, oprema), radi se izmena akta i vodi se ovde kao ravnopravan dokument. Tu su i **blanko šabloni po radnom mestu** (Obrazac 6, revers LZO, potvrda po članu 5) koje korisnik preuzme, popuni i vrati potpisane.

## Preduslovi
- `04_firma_pregled.md` odrađen.
- Fajlovi u `files_for_test/` (PDF i .docx).

## Koraci — tab Dokumentacija
1. **Obavezna dokumentacija**: za neku stavku (npr. Pravilnik o BZNR) klikni upload → priloži **.docx** → očekivano: fajl se **automatski prebaci u PDF** i stoji kao PDF. Priloži i jedan PDF na drugu stavku (ostaje PDF).
2. Brojač „X / N priloženo" → očekivano: raste; opcione stavke (npr. Ocena medicine rada) ne ulaze u brojač (oznaka „opciono").
3. **Akt o proceni rizika**: 
   - **D_DATE → Popuni** (datum akta).
   - Priloži sekcije (Uvod / Procene / Zaključak); pri izmeni sekcije **D_REASON → Popuni** (razlog) + fajl.
   - **Objedini u PDF** → očekivano: jedan spojen PDF.
   - **Izmene i dopune Akta**: **Dodaj izmenu** → **D_AMD → Popuni** *(nov fill: naslov + napomena)* → priloži fajl (.pdf/.docx) → očekivano: amandman u listi, kao ravnopravan dokument pored Akta.
4. **Stručni nalazi**: za tip (npr. oprema za rad) → upload dijalog → **L_DATE → Popuni** (datum) → fajl → očekivano: nalaz sa statusom (važi 3 god, alarm) i „Pregled/Promeni/Obriši".

## Koraci — tab Radna mesta i rizik (blanko šabloni)
5. Sekcija **Blanko šabloni po radnom mestu** → za radno mesto priloži **Blanko obrazac 6**, **Blanko revers LZO**, **Blanko potvrda po članu 5** (.doc/.docx/.pdf) → očekivano: svaki slot pokazuje „Pregled/Ukloni"; ostaju Word (ne konvertuju se).

## Provera (checklist)
- [ ] Word upload → automatski PDF (osim blanko šablona po radnom mestu — oni ostaju Word).
- [ ] Akt: sekcije + revizije sa razlogom + objedinjen PDF + izmene/dopune kao zaseban dokument.
- [ ] Stručni nalaz ima rok/status.
- [ ] Blanko šabloni (obrazac 6 / revers / potvrda) se kače po radnom mestu.

## Šta reći u videu (predlog naracije)
> „Ovde stoji sva dokumentacija firme — akt o proceni rizika, pravilnici, rešenja, uputi. Kad priložim Word dokument, sistem ga sam pretvori u PDF. Bitno: dokument nije isto što i obaveza; obaveza se ponavlja, dokument je papir koji firma mora da ima. Akt o proceni rizika je poseban — ima sekcije i izmene/dopune, jer kad se nešto u firmi promeni, radimo izmenu akta i vodimo je tu. Na radnim mestima su i blanko obrasci koje korisnik preuzme, popuni i vrati potpisane."

## Video
- Status: **presnimiti**. `04_dokumenta...webm` pokriva osnovu, ali nema: Word→PDF konverziju, izmene/dopune Akta, objedinjen PDF, blanko šablone po radnom mestu.

## Fill koji fali
- `D_AMD` — amandman Akta (naslov + napomena).

## Otvoreno / TODO
- Po radnom mestu — da li svaki obrazac 6 zaista treba poseban po RM (potvrđeno: da; sadržaj iz Akta).
