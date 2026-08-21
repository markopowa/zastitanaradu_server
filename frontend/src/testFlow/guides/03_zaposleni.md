# 03 — Zaposleni (obuka, test, potvrda, Obrazac 6, revers LZO)

## Cilj
Dodavanje radnih mesta i zaposlenih, automatsko otvaranje obaveza pri zaposlenju, override rizika, generisanje popunjenog Obrazac 6 / revers LZO / potvrde po članu 5 za zaposlenog, test obuke sa automatskim generisanjem Obrazac 6 po polaganju, evidencija obuka na zaposlenom, i upitnik za klijenta kao alternativni način unosa novog zaposlenog.

## Šta je ovo (za naraciju)
Zaposleni su nosioci obaveza. Kad dodam zaposlenog na radno mesto određenog rizika, aplikacija mu sama otvara obaveze koje po zakonu pripadaju: osposobljavanje za BZR, ZOP obuku, zaduženje LZO — a za radno mesto povećanog rizika i prethodni lekarski pregled (o njemu u `04`). Rizik radnog mesta se po potrebi može redefinisati (override) na samom zaposlenom.

**Obrazac 6** i **revers LZO** se generišu automatski iz master šablona i podataka radnog mesta (opasnosti, mere, LZO spisak) i zaposlenog — bez otpremanja blanka po radnom mestu. **Potvrda po članu 5** i dalje traži blanko šablon na **vrsti obuke** (definiše se na firmi).

Osposobljenost se može proveriti i **testom**: zaposleni odgovara na pitanja, i ako položi (≥75%), obuka se sama zabeleži i Obrazac 6 se sam generiše — bez ručnog unosa datuma i bez ručnog klika na Obrazac 6.

## Preduslovi
- `01` odrađen (firma sa radnim mestima).
- Za Potvrdu (čl. 5) i test obuke: firma ima bar jednu **vrstu obuke** definisanu (tab Radna mesta i rizik → Vrste obuka).

## Koraci — radna mesta
1. Tab **Radna mesta i rizik**: **E_ADD → Popuni** (Dodaj radno mesto) i **E_EDIT → Popuni** (izmeni Viljuškaristu) → izmene vidljive, nivo rizika obavezan.
2. Sekcija **Vrste obuka**: **Dodaj vrstu obuke** → upiši naziv i opis (npr. „Obuka za rad na visini") → **Sačuvaj**. Na redu klikni **Otpremi** da priložiš blanko potvrdu za tu vrstu obuke — kad je priložena, red pokazuje **Pregled** / **Ukloni**. Ovo je preduslov za dugme **Potvrda (čl. 5)** na zaposlenom.

## Koraci — zaposleni
3. **Zaposleni → Dodaj zaposlenog** → **F2 → Popuni** (Petar / Viljuškarista, povećan rizik) → **Sačuvaj**.
4. Otvori tog zaposlenog → vidi se lista obaveza, automatski otvorenih pri zaposlenju: osposobljavanje BZR, ZOP obuka, LZO zaduženje, i **prethodni lekarski** (jer je rizik povećan) — periodični lekarski se ne otvara odmah (čeka lančanje, `04`).
5. Dodaj zaposlenog na radno mesto **Magacioner** (**F3 → Popuni**, umeren rizik) → dobija obuke/ZOP/LZO, ali ne lekarski.
6. Na zaposlenom, polje **Nivo rizika** pokazuje efektivni nivo i odakle je (iz radnog mesta / izuzetak). U formi izmene, polje **Rizik — izuzetak** menja efektivni nivo bez diranja radnog mesta.

## Koraci — Obrazac 6 / revers na zaposlenom
7. Na stranici zaposlenog, dugme **Obrazac 6** → generiše se popunjen dokument iz master šablona i podataka radnog mesta/zaposlenog, i preuzima se automatski.
8. Dugme **Revers LZO** → isto, za karton zaduženja LZO.
9. Na firmi, tab **Dokumentacija → Generisani dokumenti** → **Generiši Obrazac 6 — svi zaposleni** → generiše odjednom za sve zaposlene firme. Ovaj panel takođe pokazuje svaki dokument generisan za bilo kog zaposlenog firme (Obrazac 6, revers, potvrda), sa kolonama Naziv / Predmet / Vrsta obaveze / Datum.

## Koraci — potvrda, test i evidencija obuka
10. Na stranici zaposlenog, dugme **Potvrda (čl. 5)** → dijalog, izaberi **Vrstu obuke** iz padajuće liste → **Generiši dokument**. Dugme je onemogućeno ako firma nema nijednu vrstu obuke (title na dugmetu to objašnjava).
11. Dugme **Test obuke** → otvara stranicu `/testing/:id` sa pitanjima (radio izbor po pitanju). Kad su sva pitanja odgovorena, dugme **Predaj test** postaje aktivno.
12. Posle predaje: ako je rezultat ≥75%, piše „Test položen — obuka je zabeležena, Obrazac 6 se generiše automatski" i obuka + Obrazac 6 nastaju bez dodatnog klika. Ako je ispod 75%, piše da test nije položen i nudi dugme **Pokušaj ponovo**. U oba slučaja postoji **Nazad na zaposlenog**.
13. Kartica **Obuke** na zaposlenom: tabela Vrsta / Završena / Važi do. Dugme **Dodaj obuku** (onemogućeno bez definisanih vrsta obuka na firmi) otvara dijalog: Vrsta obuke, Datum završetka, Važi do → **Sačuvaj**. Ovo je ručni unos, za obuke odrađene van testa u aplikaciji (npr. eksterna obuka, stari podaci).
14. Kartica **Dokumenti** na zaposlenom: lista svih generisanih dokumenata za tog zaposlenog (Naziv / Vrsta obaveze / Datum / Preuzmi).

## Koraci — upitnik klijentu (alternativni unos zaposlenog)
15. Tab **Lična karta** → panel **Upitnik klijentu**: kreiraj link, pošalji klijentu, lista prijava sa **Odobri** / **Odbij**. Javna forma: `/intake/<token>/`.

## Koraci — povrede na radu
16. Tab **Zaposleni** → panel **Povrede na radu**: tabela povreda, **Dodaj** (zaposleni, datum, težina, opis, izveštaj).

## Provera (checklist)
- [ ] Povećan rizik → prethodni lekarski + obuke/ZOP/LZO automatski; nizak rizik → bez lekarskog.
- [ ] Periodični lekarski se NE pravi pri zaposlenju.
- [ ] Rizik — izuzetak menja efektivni nivo na zaposlenom.
- [ ] Obrazac 6 / Revers LZO na zaposlenom se generišu iz podataka radnog mesta (opasnosti + LZO).
- [ ] Generiši Obrazac 6 — svi zaposleni radi za celu firmu odjednom.
- [ ] Vrsta obuke se pravi na firmi, blanko potvrda se otprema na vrsti obuke.
- [ ] Potvrda (čl. 5) onemogućena bez vrsta obuka na firmi; sa njima — bira vrstu, generiše dokument.
- [ ] Test obuke: ispod 75% ne prolazi i nudi ponovni pokušaj; od 75% naviše prolazi, upisuje obuku i sam generiše Obrazac 6.
- [ ] Dodaj obuku (ručno) i lista Dokumenti rade na zaposlenom.
- [ ] Upitnik klijentu (Lična karta) i Povrede na radu (Zaposleni) rade.

## Šta reći u videu
> Zaposleni su ti koji nose obaveze, pa krećem od radnog mesta na koje ga vezujem, pa tek onda radnik. Otvorim firmu → tab **Radna mesta i rizik**.
>
> Na mestu upišem naziv i nivo rizika. Ovde, **na mestu**, ne na radniku, pišem procenu rizika i LZO — jednom za mesto, važi za sve na njemu. Primer: za **viljuškaristu** u proceni upišem opasnosti — prevrtanje, buka — i mere, a u LZO šlem, zaštitne cipele. To kasnije uđe u Obrazac 6 i revers; ne otpremam blanko po mestu. **Vrste obuka** stoje odvojeno ispod — ista obuka, npr. rad na visini, može da važi za više mesta; blanko za potvrdu po članu 5 otpremim jednom na vrsti obuke (**Otpremi blanko**), ne na svakom mestu.
>
> Sad dodam zaposlenog i vežem ga za mesto s **povećanim** rizikom. Ne radim ništa više — otvorim ga na tabu **Zaposleni** i na kartici vidim šta je samo otvoreno: osposobljavanje za bezbedan rad, ZOP, zaduženje LZO, i **prethodni lekarski**. Periodični se još ne otvara — pravi se lančano tek kad se prethodni završi, to je sledeći video. Odmah uporedim sa drugim radnikom na **niskom** mestu: iste obuke i LZO, **bez** lekarskog. Ako mi zatreba izuzetak — neko na niskom mestu ipak treba lekarski — na tom radniku **Izmeni → Rizik — izuzetak**, bez diranja radnog mesta.
>
> Kad je obuka gotova, ne kucam papir. Na radniku kliknem **Obrazac 6** — aplikacija upiše opasnosti/mere i LZO sa mesta plus ime radnika i odmah da gotov fajl. Isto **Revers LZO**. Za potvrdu po članu 5 biram vrstu obuke.
>
> Ako hoću stvarnu proveru, ne formalnost — na kartici **Test obuke**. Prođe sa 75 ili više: sama upiše da je obuka odrađena i sama generiše Obrazac 6 — to se vidi na karticama **Obuke** i **Dokumenti**. Ispod 75 — ponovni pokušaj.
>
> Kad mi treba za celu firmu odjednom, na firmi **Generiši Obrazac 6 — svi zaposleni** — jedan fajl za sve, umesto da otvaram svakog pojedinačno.

## Video
- Status: **snimiti**. Generisanje Obrazac 6 / Revers LZO / Potvrda na dugme, test obuke, i evidencija obuka su nove funkcije. Upitnik klijentu (Lična karta) i Povrede na radu (Zaposleni) imaju panele i snimaju se.

## Otvoreno / TODO
- Za postojeće (već zaposlene) radnike pri prelasku na aplikaciju — periodični lekarski se ne pravi automatski (nema prethodnog); dodaje se ručno.
