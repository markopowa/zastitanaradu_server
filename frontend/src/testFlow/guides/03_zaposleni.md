# 03 — Zaposleni (obuka, test, potvrda, Obrazac 6, revers LZO)

## Cilj
Dodavanje radnih mesta i zaposlenih, automatsko otvaranje obaveza pri zaposlenju, override rizika, generisanje popunjenog Obrazac 6 / revers LZO / potvrde po članu 5 za zaposlenog, test obuke sa automatskim generisanjem Obrazac 6 po polaganju, evidencija obuka na zaposlenom, i upitnik za klijenta kao alternativni način unosa novog zaposlenog.

## Šta je ovo (za naraciju)
Zaposleni su nosioci obaveza. Kad dodam zaposlenog na radno mesto određenog rizika, aplikacija mu sama otvara obaveze koje po zakonu pripadaju: osposobljavanje za BZR, ZOP obuku, zaduženje LZO — a za radno mesto povećanog rizika i prethodni lekarski pregled (o njemu u `04`). Rizik radnog mesta se po potrebi može redefinisati (override) na samom zaposlenom.

**Obrazac 6** (evidencija o osposobljenosti za bezbedan rad) i **revers LZO** (karton zaduženja) se prvo otpreme kao **blanko** šabloni na radnom mestu; posle toga se za svakog zaposlenog na tom radnom mestu mogu **generisati popunjeni**, na dugme, bez ručnog kucanja. **Potvrda po članu 5** radi isto, samo je blanko šablon vezan za **vrstu obuke** (definiše se na firmi), ne za radno mesto.

Osposobljenost se može proveriti i **testom**: zaposleni odgovara na pitanja, i ako položi (≥75%), obuka se sama zabeleži i Obrazac 6 se sam generiše — bez ručnog unosa datuma i bez ručnog klika na Obrazac 6.

## Preduslovi
- `01` odrađen (firma sa radnim mestima).
- Za Potvrdu (čl. 5) i test obuke: firma ima bar jednu **vrstu obuke** definisanu (tab Radna mesta i rizik → Vrste obuka).

## Koraci — radna mesta
1. Tab **Radna mesta i rizik**: **E_ADD → Popuni** (Dodaj radno mesto) i **E_EDIT → Popuni** (izmeni Viljuškaristu) → izmene vidljive, nivo rizika obavezan.
2. Sekcija **Blanko šabloni po radnom mestu**: za radno mesto klikni **Otpremi** kod **Blanko obrazac 6**, **Blanko revers LZO**, **Blanko potvrda po članu 5** (.doc/.docx/.pdf) → svaki slot pokazuje **Pregled** / **Ukloni**.
3. Ispod toga, sekcija **Vrste obuka**: **Dodaj vrstu obuke** → upiši naziv i opis (npr. „Obuka za rad na visini") → **Sačuvaj**. Na redu klikni **Otpremi** da priložiš blanko potvrdu za tu vrstu obuke — kad je priložena, red pokazuje **Pregled** / **Ukloni** umesto dugmeta za otpremanje. Ovo je preduslov za dugme **Potvrda (čl. 5)** na zaposlenom.

## Koraci — zaposleni
4. **Zaposleni → Dodaj zaposlenog** → **F2 → Popuni** → izaberi radno mesto sa **povećanim rizikom** → **Sačuvaj**.
5. Otvori tog zaposlenog → vidi se lista obaveza, automatski otvorenih pri zaposlenju: osposobljavanje BZR, ZOP obuka, LZO zaduženje, i **prethodni lekarski** (jer je rizik povećan) — periodični lekarski se ne otvara odmah (čeka lančanje, `04`).
6. Dodaj zaposlenog na radno mesto **bez** povećanog rizika (**F3 → Popuni**) → dobija obuke/ZOP/LZO, ali ne lekarski.
7. Na zaposlenom, polje **Nivo rizika** pokazuje efektivni nivo i odakle je (iz radnog mesta / izuzetak). U formi izmene, polje **Rizik — izuzetak** menja efektivni nivo bez diranja radnog mesta.

## Koraci — Obrazac 6 / revers na zaposlenom
8. Na stranici zaposlenog, dugme **Obrazac 6** → generiše se popunjen dokument iz blanko šablona radnog mesta i podataka zaposlenog, i preuzima se automatski.
9. Dugme **Revers LZO** → isto, za karton zaduženja LZO.
10. Na firmi, tab **Dokumentacija → Generisani dokumenti** → **Generiši Obrazac 6 — svi zaposleni** → generiše odjednom za sve zaposlene firme. Ovaj panel takođe pokazuje svaki dokument generisan za bilo kog zaposlenog firme (Obrazac 6, revers, potvrda), sa kolonama Naziv / Predmet / Vrsta obaveze / Datum.

## Koraci — potvrda, test i evidencija obuka
11. Na stranici zaposlenog, dugme **Potvrda (čl. 5)** → dijalog, izaberi **Vrstu obuke** iz padajuće liste → **Generiši dokument**. Dugme je onemogućeno ako firma nema nijednu vrstu obuke (title na dugmetu to objašnjava).
12. Dugme **Test obuke** → otvara stranicu `/testing/:id` sa pitanjima (radio izbor po pitanju). Kad su sva pitanja odgovorena, dugme **Predaj test** postaje aktivno.
13. Posle predaje: ako je rezultat ≥75%, piše „Test položen — obuka je zabeležena, Obrazac 6 se generiše automatski" i obuka + Obrazac 6 nastaju bez dodatnog klika. Ako je ispod 75%, piše da test nije položen i nudi dugme **Pokušaj ponovo**. U oba slučaja postoji **Nazad na zaposlenog**.
14. Kartica **Obuke** na zaposlenom: tabela Vrsta / Završena / Važi do. Dugme **Dodaj obuku** (onemogućeno bez definisanih vrsta obuka na firmi) otvara dijalog: Vrsta obuke, Datum završetka, Važi do → **Sačuvaj**. Ovo je ručni unos, za obuke odrađene van testa u aplikaciji (npr. eksterna obuka, stari podaci).
15. Kartica **Dokumenti** na zaposlenom: lista svih generisanih dokumenata za tog zaposlenog (Naziv / Vrsta obaveze / Datum / Preuzmi).

## Koraci — upitnik klijentu (alternativni unos zaposlenog)
16. Tab **Lična karta** → panel **Upitnik klijentu**: kreiraj link, pošalji klijentu, lista prijava sa **Odobri** / **Odbij**. Javna forma: `/intake/<token>/`.

## Koraci — povrede na radu
17. Tab **Zaposleni** → panel **Povrede na radu**: tabela povreda, **Dodaj** (zaposleni, datum, težina, opis, izveštaj).

## Provera (checklist)
- [ ] Povećan rizik → prethodni lekarski + obuke/ZOP/LZO automatski; nizak rizik → bez lekarskog.
- [ ] Periodični lekarski se NE pravi pri zaposlenju.
- [ ] Rizik — izuzetak menja efektivni nivo na zaposlenom.
- [ ] Obrazac 6 / Revers LZO na zaposlenom rade samo kad radno mesto ima otpremljen blanko šablon; bez njega — jasna greška.
- [ ] Generiši Obrazac 6 — svi zaposleni radi za celu firmu odjednom.
- [ ] Vrsta obuke se pravi na firmi, blanko potvrda se otprema na vrsti obuke.
- [ ] Potvrda (čl. 5) onemogućena bez vrsta obuka na firmi; sa njima — bira vrstu, generiše dokument.
- [ ] Test obuke: ispod 75% ne prolazi i nudi ponovni pokušaj; od 75% naviše prolazi, upisuje obuku i sam generiše Obrazac 6.
- [ ] Dodaj obuku (ručno) i lista Dokumenti rade na zaposlenom.
- [ ] Upitnik klijentu (Lična karta) i Povrede na radu (Zaposleni) rade.

## Šta reći u videu
> Zaposleni su ti koji nose obaveze, pa krećem od radnog mesta na koje ga vezujem, pa tek onda radnik.
>
> Na radnom mestu upišem naziv i nivo rizika, i tu otpremim blanko obrasce — Obrazac 6, revers LZO, potvrdu po članu 5. To su prazni šabloni te firme za to radno mesto, jednom otpremljeni, koriste se za svakog radnika koji dođe na to mesto. Vrste obuka stoje odvojeno od radnog mesta, jer ista obuka — recimo rad na visini — može da važi za ljude sa različitih radnih mesta.
>
> Kad dodam zaposlenog i vežem ga za radno mesto s povećanim rizikom, ne radim ništa više — aplikacija mu sama otvori sve što po zakonu ide uz to mesto: osposobljavanje za bezbedan rad, ZOP obuku, zaduženje LZO, i prethodni lekarski. Periodični lekarski se ne otvara odmah, njega pravi lančano tek kad se prethodni završi — to je sledeći video. Radnik bez povećanog rizika dobija sve osim lekarskog. Ako mi zatreba izuzetak — neko na „niskom" mestu ipak treba lekarski — to menjam ručno na samom radniku, bez diranja radnog mesta.
>
> Kad je obuka gotova, ne kucam papir ručno. Kliknem Obrazac 6 na radniku, aplikacija uzme blanko sa njegovog radnog mesta, upiše njegove podatke i odmah mi da gotov fajl. Isto za revers LZO. Za potvrdu po članu 5 samo biram koju vrstu obuke potvrđujem.
>
> A ako hoću da provera bude stvarna, ne samo formalnost — pustim radnika da polaže test. Ako prođe sa 75 ili više, aplikacija sama upiše da je obuka odrađena i sama generiše Obrazac 6, ja ne diram ništa. Ispod 75 — nudi mu ponovni pokušaj.
>
> Sve što je radnik prošao vidim na njegovoj kartici Obuke, a sve što mu je generisano na kartici Dokumenti. Kad mi treba za celu firmu odjednom, na firmi kliknem Generiši Obrazac 6 — svi zaposleni — i dobijem jedan fajl za sve, umesto da otvaram svakog pojedinačno.

## Video
- Status: **snimiti**. Generisanje Obrazac 6 / Revers LZO / Potvrda na dugme, test obuke, i evidencija obuka su nove funkcije. Upitnik klijentu (Lična karta) i Povrede na radu (Zaposleni) imaju panele i snimaju se.

## Otvoreno / TODO
- Za postojeće (već zaposlene) radnike pri prelasku na aplikaciju — periodični lekarski se ne pravi automatski (nema prethodnog); dodaje se ručno.
