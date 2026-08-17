# 04 — Lekarski (uput, završetak, lančanje, Obrazac 1)

## Cilj
Ceo životni ciklus lekarskog pregleda: podsetnik/uput pri dospeću → završetak sa nalazom → automatsko lančanje u periodični → generisanje Obrazac 1 iz završenih pregleda.

## Šta je ovo (za naraciju)
Dve reči koje se koriste: **obaveza** je opšti pojam iz kataloga (npr. „periodični lekarski"), **aktivnost** je njena konkretna pojava za određenog zaposlenog sa stvarnim rokom (npr. „periodični lekarski za Petra Petrovića, dospeva 1.9."). Na aktivnostima se radi svakog dana.

Kad **prethodni lekarski** (otvoren automatski pri zaposlenju na radno mesto povećanog rizika, `03`) dospe, ide **uput** poslodavcu — to se vidi kao slanje na tabu Slanja/Danas (proces `06`). Kad se pregled obavi, aktivnost se **završi** sa unetim nalazom, i sistem **sam otvara periodični** lekarski sa novim rokom — lančano, bez ručnog kreiranja. Kad se završe lekarski pregledi, **Obrazac 1** se generiše iz njih jednim klikom.

## Preduslovi
- `03` odrađen (zaposleni sa auto-otvorenim prethodnim lekarskim).

## Koraci — pregled aktivnosti
1. Tab **Obaveze/Aktivnosti** (firma) ili stranica **Aktivnosti**: brzi filteri **Kasni / Stiže uskoro / Otvorene / Sve** (podrazumevano Otvorene).
2. Otvori **prethodni lekarski** aktivnost zaposlenog → vidi se status (npr. Poslato — uput je otišao poslodavcu).

## Koraci — završetak i lančanje
3. Na aktivnosti klikni **Završi aktivnost** → dijalog: **K → Popuni** — **Važi do**, **Izvršeno**, **Broj izveštaja**, **Ocena sposobnosti**, **Preduzete mere**, **Beleške** → priloži nalaz (PDF) → **Završi**.
4. Očekivano:
   - aktivnost prelazi u završeno, važi do je postavljeno;
   - automatski se kreira **periodični lekarski** (lančanje), zakazan od datuma pregleda + period;
   - preostali podsetnici prethodnog se otkazuju.
5. Otvori periodični (novi) → po završetku isto → opet se zakaže sledeći periodični, ciklično.

## Koraci — Obrazac 1
6. Otvori firmu → tab **Pregled** → dugme **Generiši Obrazac 1** (gore desno).
7. Očekivano: preuzima se dokument sa tabelom — zaposleni na mestima s povećanim rizikom, vrsta pregleda, datum, sledeći termin, broj izveštaja, ocena sposobnosti, mere — popunjeno iz završenih aktivnosti. Dokument se čuva i vidi se na tabu **Dokumentacija**, u „Obavezna dokumentacija", kao stavka **Obrazac 1 — evidencija lekarskih pregleda** (opciona stavka, ne ulazi u brojač).

## Koraci — evidencija radnih mesta sa povećanim rizikom (registar)
8. Tab **Pregled** → dugme **Registar radnih mesta sa povećanim rizikom** (pored Generiši Obrazac 1) → preuzima .docx, čuva se u Dokumentaciji kao opciona stavka.

## Provera (checklist)
- [ ] Aktivnosti imaju filtere Kasni/Stiže uskoro/Otvorene/Sve.
- [ ] Završetak prethodnog lančano otvara periodični (nije se pravio pri zaposlenju).
- [ ] Završetak periodičnog otvara sledeći periodični.
- [ ] Po završetku se zatvore preostali podsetnici te aktivnosti.
- [ ] Generiši Obrazac 1 radi i u dokumentu su samo zaposleni sa završenim pregledom; dokument se pojavljuje na tabu Dokumentacija.
- [ ] Registar radnih mesta sa povećanim rizikom — dugme na tabu Pregled generiše .docx.

## Šta reći u videu
> Prošao sam kroz ceo tok lekarskog. Dve reči koje koristim: obaveza je opšti pojam, „lekarski pregled"; aktivnost je konkretan slučaj, „lekarski za Petra Petrovića, rok 1. septembar". Na aktivnostima radim svakog dana.
>
> Filtriram aktivnosti: kasni, stiže uskoro, otvoreno. Otvorim prethodni lekarski jednog radnika — vidim da je uput već poslat poslodavcu, to je stiglo samo od sebe kad je dospeo rok.
>
> Kad je pregled obavljen, otvorim tu aktivnost, kliknem Završi aktivnost. Upišem datum izvršenja, broj izveštaja, ocenu sposobnosti, mere, i do kad važi. Priložim nalaz, kliknem Završi.
>
> Odmah se otvori sledeći, periodični lekarski, sa novim rokom. Zašto je ovo bitno: periodični se ne pravi kad zaposlim radnika, nego tek kad se prethodni završi, jer njegov rok zavisi od nalaza. Kad se i periodični završi, otvori se sledeći — i tako godinama, ciklično, ništa ne ispadne iz evidencije.
>
> Na kraju, Obrazac 1. To je propisana evidencija lekarskih pregleda za radnike na mestima s povećanim rizikom. Otvorim firmu, tab Pregled, kliknem Generiši Obrazac 1 — sastavi mi ceo dokument iz podataka koje sam već uneo kroz završene aktivnosti: ko je pregledan, kad, ocena, sledeći termin. Ništa ne prepisujem ručno. Taj dokument se posle vidi i na tabu Dokumentacija.
>
> Postoji i evidencija radnih mesta sa povećanim rizikom, kao posebna opciona stavka u dokumentaciji — isti princip kao Obrazac 1.

## Video
- Status: **snimiti**. Motor (filteri, lančanje) i Obrazac 1 nisu ranije snimljeni zajedno u jednom toku.

## Otvoreno / TODO
- Proveriti `valid_until` semantiku pri završetku prethodnog (da periodični ne padne predaleko).
- Registar: dugme „Registar radnih mesta sa povećanim rizikom" stoji na tabu Pregled, pored „Generiši Obrazac 1"; preuzima .docx i čuva se u Dokumentaciji kao opcioni slot.
