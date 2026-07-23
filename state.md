# state.md — kako svaki proces radi, od početka do kraja

Cilj: da golim okom vidiš logiku i nađeš rupe. Prvo pogled iz ptičje
perspektive (šta je ceo sistem), onda jedan konkretan primer kroz procese,
pa svaki proces posebno, pa validacije i granice.

## Pogled iz ptičje perspektive

- **Šta je proizvod:** aplikacija za jednu BZNR firmu (single-tenant, server po
  firmi). Ta firma (operater) vodi bezbednost za svoje **klijente**. Ništa nije
  vezano za konkretnu firmu — sve je katalog koji se menja kroz UI.
- **Kičma sistema:** sve je **obaveza**. Obaveza = subjekt (radnik / oprema /
  firma) + period + pravilo primenljivosti + podsetnici + (opciono) dokument.
  Kad dodaš radnika/opremu/firmu, sistem sam otvori obaveze koje slede iz
  profila. Nema tvrdo kodiranih spiskova — vrste obaveza, nivoi rizika, vrste
  dokumenata, vrste obuka su katalozi koji se uređuju.
- **Tri uloge:** *Operativa* radi sve **na stranici firme** (vođen tok, ne može
  da promaši); *Pregled* vidi isto ali read-only; *Admin/razvoj* vidi
  Administraciju (katalozi, šabloni) — Operativa je ne vidi u meniju.
- **Dokumenti:** svaki tip dokumenta ima stvaran master fajl (.docx/.pdf) sa
  vidljivim `{{polje}}` oznakama; firma ga može pregaziti svojim blankom po
  radnom mestu / vrsti obuke. Generisanje zameni oznake podacima i sačuva
  popunjen dokument uz radnika/firmu.
- **Motor podsetnika:** dnevni posao otvara dospele obaveze i materijalizuje
  svaki mejl unapred (semafor — uvek vidiš šta će i kome biti poslato).

## Konkretan primer (prati ga kroz procese)

Klijent: **Pekara „Klas" d.o.o.**, PIB `123456789`. Radnik: **Petar Petrović**,
radno mesto **Pekar** (povećan rizik). Oprema: **viljuškar VŽ-01**.

1. Dodaš Pekaru (proces 1) → dobija plan obaveza po profilu.
2. Dodaš Petra na radno mesto Pekar (proces 2) → sistem sam otvori: obuka BZR,
   ZOP obuka, zaduženje LZO, i — pošto je povećan rizik — **prethodni lekarski**.
3. Petar položi test obuke (75%) → automatski se generiše **Obrazac 6** sa
   njegovim imenom u blanko obrascu radnog mesta Pekar.
4. Prethodni lekarski: generiše se **uput**, ide mejl poslodavcu; kad vratiš
   izveštaj i „Završiš" obavezu — sam se zakaže **periodični** za 12 meseci.
5. Dodaš viljuškar VŽ-01 + vrstu servisa → obaveza pregleda opreme sa rokom.
6. Pred inspekciju: jedno dugme spoji svu dokumentaciju Pekare u jedan PDF.

## Mehanizam šablona (važi za sve dokumente)

- Tip dokumenta na `/documents/templates` ima **stvaran master fajl** (.docx)
  koji se vidi/preuzima/menja. U fajlu su vidljive oznake `{{polje}}` (spisak
  polja = katalog „Polja").
- Firma može da pregazi master svojim blankom: Obrazac 6 i revers **po radnom
  mestu** (firma → Radna mesta i rizik → Blanko šabloni), potvrda **po vrsti
  obuke** (firma → Vrste obuka). Blanko nosi tekst/izgled te firme; oznake
  ostaju gde ih staviš.
- Generisanje: uzme blanko (radnog mesta / vrste obuke ako postoji, inače
  master) → zameni oznake stvarnim podacima → sačuva popunjen dokument uz
  aktivnost (vidi se kod radnika i u „Generisani dokumenti" firme).
- PDF blanko: polja se postavljaju vizuelno kroz „Uredi polja" (render u slike
  + klik po koordinatama) — koristi se kad nema Worda.
- **Serije** (ponavljajući red — npr. red po pregledu u Obrascu 1): red tabele
  sa `{{r.polje}}` oznakama se umnožava po deklarisanom izvoru podataka.
- **Izuzetak koji treba znati:** *Obrazac 1 (registar lekarskih pregleda)* i
  *Registar radnih mesta sa povećanim rizikom* imaju master fajl koji se vidi i
  menja, ALI se u generisanju NE koriste — oni idu kroz ugrađeni generator koji
  crta tabelu iz unetih podataka. Vizuelni šablon-motor za njih postoji u kodu,
  ali se ne aktivira (nema deklarisan `series` izvor u konfiguraciji šablona).
  Funkcionalno radi (20 pregleda → 20 redova), ali izvor istine je generator,
  ne šablon. Ovo je poznata neurednost, ne bug.

## 1. Prijem klijenta

- **Pokretanje:** Firme → Dodaj firmu (čarobnjak: lična karta + APR uvoz →
  dokumentacija → radna mesta + rizik → zaposleni → prvi lekarski).
- **Podešeno u:** katalog obaveza i nivoi rizika (`add_setup`); profil firme
  (ZOP kategorija, instalacije, rizik delatnosti) na Ličnoj karti.
- **Šta se dešava:** profil + `applicability_rule` po vrsti obaveze određuju šta
  firma uopšte ima (Pregled: U redu / Stiže / Kasni / Nedostaje / Nije
  primenljivo); isključenja sa razlogom po firmi.
- **Primer:** Pekara ima gromobran → obaveza „gromobran 24 mes" postaje
  primenljiva; nema hidrante → ta obaveza stoji „Nije primenljivo".
- **Rezultat:** firma sa planom obaveza; dokumenta se pune kroz procese ispod.

## 2. Novi radnik → obuka (Obrazac 6)

- **Pokretanje:** Dodaj zaposlenog (radno mesto + rizik). `perform_create` →
  `ensure_default_bindings_for_employee`: otvara obaveze OBUKA BZR + ZOP OBUKA +
  LZO ZADUŽENJE svima; + PRETHODNI LEKARSKI ako je povećan rizik. Alternativno:
  klijent prijavi radnika kroz **upitnik** (javni link) → ti Odobri → isto
  auto-otvaranje.
- **Šablon:** „Obrazac 6" — blanko radnog mesta (komanda
  `attach_obrazac6_blanks --company X --kind all` posle unosa radnih mesta).
- **Podešeno u:** vrsta obaveze OSPOSOBLJAVANJE_BZR (period 36 mes / 12 povećan
  rizik — Zakon 35/2023 čl. 34); Šablon obaveze: ON_COMPLETED → generiši Obr. 6.
- **Okidači i zašto:** −15 dana podsetnik (operater štampa špil pre obuke);
  +7/+15/+30 kašnjenje samo nama (mi pritiskamo).
- **Tok obuke:** radnik polaže **test** (dugme „Test obuke", prag 75% iz
  Programa obuke) → položen test sam završava obavezu → generiše se popunjen
  Obrazac 6 (ime + datumi u blanko radnog mesta) → ostaje u aplikaciji; štampa
  se i potpisuje na obuci (papir je i zakonski obavezan). Može i na zahtev:
  dugme „Obrazac 6" kod radnika; za celu firmu: „Generiši Obrazac 6 — svi
  zaposleni" → jedan spojen PDF.
- **Primer:** Petar položi test 80% → Obrazac 6 za radno mesto Pekar se popuni
  „Petar Petrović", danas, važi 12 mes (povećan rizik).
- **Rezultat:** popunjen Obrazac 6 po radniku + sledeći ciklus zakazan (36/12).

## 3. Lekarski pregledi

- **Pokretanje:** automatski uz zaposlenje (povećan rizik → prethodni).
- **Šablon:** „Uput za prethodni lekarski pregled" (Obrazac 1 pravilnika) i
  „Uput za lekarski pregled" (periodični, Obrazac 2) — master fajlovi.
- **Podešeno u:** vrste PRETHODNI_LEKARSKI i LEKARSKI_PREGLED (12 mes povećan
  rizik); Šablon obaveze ON_SCHEDULED → generiši uput + mejl poslodavcu;
  lančanje: ON_COMPLETED prethodnog → otvara periodični.
- **Okidači i zašto:** −30 nama (pripremimo uput), na dan → uput poslodavcu (on
  šalje radnika), kašnjenje → samo nama.
- **Tok:** uput → poslodavac → klinika vrati izveštaj (Obrazac 3 prethodni / 4
  periodični, PDF) → pri „Završi obavezu" upišeš broj izveštaja, ocenu, datum,
  važi do → sledeći ciklus sam.
- **Rezultat + registri:** dugme „Generiši Obrazac 1" (registar svih pregleda) i
  „Registar radnih mesta sa povećanim rizikom" — oba iz već unetih podataka
  (vidi izuzetak u „Mehanizam šablona": idu kroz ugrađeni generator).

## 4. Zaduženje LZO (revers)

- Kao Obrazac 6: auto-obaveza pri zaposlenju; blanko po radnom mestu (spisak
  opreme iz Pravilnika LZO; kancelarijska radna mesta bez LZO — napomena u
  blanku); ON_COMPLETED → revers sa imenom; datumi/potpisi ručno na papiru.

## 5. Potvrda po članu 5

- **Pokretanje:** na zahtev — dugme „Potvrda (čl. 5)" kod radnika, biraš **vrstu
  obuke** (katalog po firmi: viljuškar, bager…; nova vrsta = novi red + blanko,
  bez koda).
- **Rezultat:** popunjena potvrda (ime, rođenje, JMBG); evidencija položenih
  obuka na kartici radnika.

## 6. Oprema

- **Pokretanje:** Dodaj opremu + „Vrsta obaveze servisa/pregleda" → auto-obaveza
  (pregled opreme 36 mes; PP servis 6 mes; PP hidrostatičko 60).
- **Tok:** podsetnik −30/−14 firmi + nama („naruči pregled") → nalaz stigne →
  upload uz obavezu / nalaze firme → važi dalje, alarm 30 dana pre isteka.
- **Primer:** viljuškar VŽ-01, vrsta „pregled opreme 36 mes" → obaveza sa rokom,
  podsetnik pre isteka.

## 7. Stručni nalazi firme

- 6 vrsta (oprema, elektro, sredina leto/zima, gromobran 24 mes, monitoring);
  upload PDF sa datumom merenja → rok teče, status VAŽI / ISTIČE / ISTEKAO;
  podsetnik firmi + nama.

## 8. Povrede na radu

- Panel na firmi (Zaposleni tab): datum, težina, opis, fajl povredne liste.
- Okidač: teška / smrtna / kolektivna → odmah mejl nama + firmi sa zakonskim
  rokom (prijava inspekciji u 24h, čl. 50) + upis u Dnevnik. Mejl-greška ne može
  da spreči unos.

## 9. Prva pomoć

- Vrsta obaveze (60 mes, čl. 13 Pravilnika 109/2016), dodeljuje se ručno;
  sertifikati (P1 fajlovi) se kače kao prilozi.

## 10. Upitnik klijentu

- Lična karta → „Upitnik klijentu": napravi link → pošalji mejlom → klijent bez
  naloga prijavi radnika / opremu → Odobri / Odbij → odobrenje otvara obaveze
  (proces 2 / 6). Zato postoji: poslodavci ne javljaju promene sami.

## 11. Motor podsetnika

- Dnevno (systemd 06:00 otvara dospele obaveze + puni red slanja; 07:00 i 13:00
  šalje). Svaki mejl unapred materijalizovan → uvek se vidi šta će biti poslato
  (Slanja) i šta je otišlo. Primalac zavisi od faze (najava → mi, uput →
  poslodavac, potvrda → firma, kašnjenje → samo mi). Danas = semafor.

## 12. Inspekcija

- Dugme „Za inspekciju (PDF)" na Dokumentaciji: obavezna dokumenta + Akt
  (sekcije + izmene) + nalazi + generisani dokumenti (najnoviji po obavezi)
  spojeni u jedan PDF, redom kataloga. Pokvaren / prazan fajl se preskače, ne
  obara ceo paket.

## Validacije (šta app odbija na unosu)

Unos kroz API/UI prolazi kroz validaciju; loš podatak dobija čist 400, ne
uđe u dokumenta:

- **JMBG:** 13 cifara + ispravna kontrolna cifra + validan datumski deo (prazno
  je dozvoljeno).
- **PIB:** tačno 9 cifara.
- **Matični broj:** tačno 8 cifara (ako je unet).
- **Datum rođenja:** ne u budućnosti, ne pre 1900.
- **Datum povrede:** ne u budućnosti.
- **Obuka:** datum isteka ne može biti pre datuma završetka; datum završetka ne
  u budućnosti.

## Princip korišćenja

Operater sve završava **na stranici firme** — tok je vođen (čarobnjak, paneli,
vodiči) i ne može da se promaši; jedini izlet je „Uredi polja". Administracija
je razvojna zona: Pregled je vidi read-only, čista Operativa je ne vidi u
meniju, menja je samo Admin.

## Proširivost (kako se dodaje nešto što danas ne postoji)

Za bilo koju novu regulativu / obavezu (kojih će uvek biti), bez koda:
1. nova **vrsta obaveze** kroz UI (subjekt, period, primenljivost, pravni osnov),
2. njeni **podsetnici** kroz šablone obaveza (kada, kome),
3. njen **dokument**: nova vrsta dokumenta u katalogu (upload) ili nov šablon sa
   master fajlom i `{{poljima}}` (generisanje),
4. firma je dobija prirodnim tokom (profil / primenljivost ili ručno dodavanje).

Granica mehanizma: ako nova evidencija traži **podatak koji aplikacija ne čuva**
(novo polje na radniku / opremi / obavezi), to je intervencija u kodu —
dodavanje polja i izvora; sve ostalo je podešavanje.
