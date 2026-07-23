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
16. Zamisao: umesto da konsultant ručno unosi novog zaposlenog, klijent (firma) sam prijavi podatke kroz javnu formu, konsultant samo odobri. Konsultant na firmi kreira link za upitnik, šalje ga klijentu mejlom; klijent otvara `/intake/<token>/`, bira „Novi zaposleni" ili „Nova oprema" i popunjava; prijava stiže konsultantu na čekanju; **Odobri** kreira zaposlenog (ili opremu) i otvara mu obaveze kao da je ručno unet, **Odbij** je odbacuje.
17. **Status u ovom build-u**: backend je gotov (`intake-links`, `intake-submissions`, javna stranica `/intake/<token>/`), ali na tabu **Lična karta** firme još nema vidljivog panela „Upitnik klijentu" u React aplikaciji — ne snimati dok se ne pojavi dugme za kreiranje/slanje linka i lista prijava sa Odobri/Odbij.

## Koraci — povrede na radu
18. Zamisao: na tabu **Zaposleni**, panel „Povrede na radu" — tabela povreda (zaposleni, datum, težina, opis, izveštaj) i dugme **Dodaj** koje otvara dijalog: zaposleni, datum, težina (Laka / Teška / Smrtna / Kolektivna), opis, fajl izveštaja.
19. **Status u ovom build-u**: backend je gotov (`work-injuries` endpoint), ali panel na tabu Zaposleni još nije vidljiv u React aplikaciji — ne snimati dok se ne pojavi.

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
- [ ] Upitnik klijentu i Povrede na radu — proveriti pre snimanja da li su panel(i) već vidljivi u aplikaciji.

## Šta reći u videu
> Prošao sam kroz zaposlene. Prvo radna mesta, pa zaposleni, pa papiri koji im idu uz obuku.
>
> Na tabu Radna mesta i rizik dodam radno mesto, upišem naziv i nivo rizika. Ovde otpremim i blanko šablone: Blanko obrazac 6, Blanko revers LZO, Blanko potvrda po članu 5 — to su prazni obrasci koje ćemo posle popunjavati po zaposlenom. Zašto ovde: obrasci su specifični za radno mesto, ne za firmu.
>
> Ispod toga su Vrste obuka — ovo je posebno od radnih mesta, jer jedna vrsta obuke (recimo rad na visini) može da važi za zaposlene sa različitih radnih mesta. Dodam vrstu, otpremim joj blanko potvrdu.
>
> Idem na Zaposleni, Dodaj zaposlenog, vežem ga za radno mesto s povećanim rizikom, Sačuvam. Otvorim ga — već su mu otvorene obaveze: osposobljavanje za bezbedan rad, ZOP obuka, zaduženje LZO, i prethodni lekarski, jer je rizik povećan. Periodični lekarski se ne otvara odmah — o tome sledeći video.
>
> Radnik bez povećanog rizika dobija obuke, ali ne i lekarski. Ako treba, mogu ručno da mu promenim rizik — polje Rizik — izuzetak, nezavisno od radnog mesta.
>
> Sad papiri. Na stranici zaposlenog kliknem Obrazac 6 — aplikacija uzme blanko šablon s radnog mesta, popuni ga podacima ovog zaposlenog i odmah mi ga preuzme. Isto Revers LZO za karton zaduženja, i Potvrda po članu 5 — tu prvo biram koju vrstu obuke potvrđujem.
>
> Umesto da ja sam upišem da je obuka odrađena, mogu da pustim zaposlenog da polaže test — kliknem Test obuke, on odgovara na pitanja, i ako prođe sa 75% ili više, aplikacija sama upiše obuku i sama generiše Obrazac 6. Ne moram ništa ručno da diram. Ako ne prođe, nudi mu se da pokuša ponovo.
>
> Sve obuke zaposlenog vidim na kartici Obuke — i one sa testa, i one koje sam ručno dodao. Kartica Dokumenti pokazuje sve što je za njega generisano.
>
> Ako mi treba za sve zaposlene odjednom, idem na firmu, tab Dokumentacija, dugme Generiši Obrazac 6 — svi zaposleni — jedan klik za celu firmu, i taj isti panel mi pokazuje istoriju svega generisanog za zaposlene te firme.

## Video
- Status: **snimiti**. Generisanje Obrazac 6 / Revers LZO / Potvrda na dugme, test obuke, i evidencija obuka su nove funkcije. Upitnik klijentu (Lična karta) i Povrede na radu (Zaposleni) imaju panele i snimaju se.

## Otvoreno / TODO
- Za postojeće (već zaposlene) radnike pri prelasku na aplikaciju — periodični lekarski se ne pravi automatski (nema prethodnog); dodaje se ručno.
