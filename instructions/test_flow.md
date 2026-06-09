# Test flow — korak po korak

---

1. [ ] 🟦 **Firme → Dodaj firmu** → otvara se čarobnjak (7 koraka).
2. [ ] 🟦 Korak 1: Matični broj `20644206` → **Uvezi iz registra** (popuni naziv, opštinu, šifru delatnosti).
3. [ ] 🟦 Unesi **PIB** ručno (nije u open data) i dopuni **Naziv** → **Sledeći**/kreiraj firmu.
4. [ ] ⚙️ Provera: firma se otvori sa breadcrumbs `Firme / UKRAS` i tabovima: Lična karta, Dokumentacija, Radna mesta i rizik, Zaposleni, Obaveze/Aktivnosti, Stručni nalazi, Usklađenost.
5. [ ] ⚙️ Refresh stranice — tab ostaje (`?tab=` u URL-u).
6. [ ] 🟦 Tab **Lična karta** → **Kontakt-lica** → **Dodaj kontakt-lice**: `Petar Petrović`, uloga `Direktor`, telefon `060 111 2222`, email `markovuckovic1992@gmail.com`, **Primarni** uključi → Sačuvaj.
7. [ ] 🟦 Kontakt-lice: ⋮ **Izmeni** (promeni telefon) → Sačuvaj; pa ⋮ **Obriši** → potvrdi. Primarni ima ★.
8. [ ] ⚙️ **Izmeni podatke** firme → **Uvezi iz registra** → Sačuvaj bez greške.
9. [ ] 🟦 Tab **Dokumentacija** → **Obavezna dokumentacija**: brojač **0 / 7 priloženo**.
10. [ ] 🟦 Slot **Ugovor** → **Priloži** → `files_for_test\1.Ugovor.pdf` → **Pregled** otvara PDF.
11. [ ] 🟦 Slot **Odluka** → **Priloži** → `files_for_test\2.Odluka.pdf`.
12. [ ] 🟦 Priloži preostalih 5: 3 pravilnika + 3 programa obuke (ako imaš fajlove) → brojač ide ka **7 / 7**.
13. [ ] 🟦 Na jednom slotu **Obriši** → potvrdi → vraća se na **nema**; brojač se smanji.
14. [ ] 🟦 U tabu **Dokumentacija** → **Kreiraj Akt** (Akt o proceni rizika).
15. [ ] 🟦 **Datum donošenja** `15.01.2025.` → **Sačuvaj datum**.
16. [ ] 🟦 Sekcija **Uvod** → **Priloži** → test PDF → **Razlog izmene** (min. 5 znakova, npr. `Inicijalno prilaganje`) → Sačuvaj.
17. [ ] 🟦 Sekcija **Procene po radnom mestu** → Priloži + razlog → Sačuvaj.
18. [ ] 🟦 Sekcija **Zaključak** → Priloži + razlog → Sačuvaj → status **Kompletan (3/3)**.
19. [ ] 🟦 Na jednoj sekciji **Istorija** → vidi verziju, korisnika, razlog, **Preuzmi**.
20. [ ] 🟦 **Izmeni** istu sekciju (nov fajl + razlog) → stara verzija ostaje u istoriji.
21. [ ] 🟦 Provera: **Sačuvaj** je onemogućen bez fajla ili sa razlogom < 5 znakova.
22. [ ] 🟦 **Objedini u PDF** → preuzme se jedan spojeni PDF (Uvod + Procene + Zaključak).
23. [ ] 🟦 Tab **Radna mesta i rizik** → **Dodaj radno mesto**: Naziv `Električar na visini`, Nivo rizika `POVECAN`, Opis `Rad na visini` → Sačuvaj.
24. [ ] 🟦 Provera: badge `Naziv (R=skor)` + chip **Povećan rizik**; tabela ima Naziv / Nivo rizika / Zaposleni / Akcije.
25. [ ] 🟦 ⋮ **Izmeni** radno mesto (promeni opis) → Sačuvaj.
26. [ ] ⚙️ **Podešavanja → Nivoi rizika**: lista (NIZAK, UMEREN, DOPUSTIV, POVECAN). **Dodaj nivo** (`TEST`, skor `1`) → Sačuvaj → pa **Obriši**.
27. [ ] ⚙️ Provera: brisanje nivoa koji se koristi javlja da se ne može obrisati.
28. [ ] 🟦 Tab **Zaposleni** → **Dodaj zaposlenog**. Ime `Marko`, Prezime `Petrović`, Ime oca `Stevan`.
29. [ ] 🟦 JMBG `0102990710123` (prvo ovo) → **Datum rođenja** se sam popuni `01.02.1990.`; Mesto rođenja `Niš`.
30. [ ] 🟦 Email `markovuckovic1992@gmail.com`, Org. jedinica `Tehnička služba`, Pozicija `Električar`, Zanimanje `Električar`.
31. [ ] 🟦 **Radno mesto** `Električar na visini` → ispod se prikaže „Nivo rizika se nasleđuje iz radnog mesta: …".
32. [ ] 🟦 **Rizik — izuzetak**: ostavi `Nasleđeno iz radnog mesta` → **Sačuvaj**.
33. [ ] 🟦 Provera: u listi zaposlenih kolona **Rizik** = badge; klik na red → detalj → „Nivo rizika … — iz radnog mesta".
34. [ ] ⚙️ **Firme → Zaposleni** (lista): **Pretraga** `Marko`; ⋮ **Istorija pregleda**; detalj → **Izmeni** poziciju → Sačuvaj.
35. [ ] ⚙️ **Dokumenti → Kategorije → Dodaj** `Lekarski pregledi` (ako ne postoji).
36. [ ] 🟦 **Dokumenti → Šabloni dokumenata → Dodaj šablon**: Naziv `Uput - periodični lekarski pregled`, Kontekst `Zaposleni`, Kategorija `Lekarski pregledi`, **Kreiraj iz fajla** → `files_for_test\APR Ukras doo.pdf` → Sačuvaj.
37. [ ] 🟦 **Mapiranje polja**: Ime→`employee.first_name`, Prezime→`employee.last_name`, JMBG→`employee.national_id`, Datum rođenja→`employee.date_of_birth`, Radno mesto→`employee.position`, Naziv firme→`client.name`, Broj uputa→`instruction_number`, Datum prethodnog pregleda→`last_exam_date` → Sačuvaj.
38. [ ] ⚙️ ⋮ **Uredi polja** (vizuelni editor): klik na dokument → izaberi polje; **Veličina fonta** `12`; uključi **Poravnanje** (snap); **Pregled rezultata** (PDF); **Sačuvaj polja**.
39. [ ] 🟦 **Podešavanja → Vrste obaveza → Dodaj**: Naziv `Periodični lekarski pregled`, Subjekt `Zaposleni`, Period `12`, Rok unapred `30`, **Uključi u Obrazac 1: DA**, Aktivan: DA → Sačuvaj.
40. [ ] 🟦 **Podešavanja → Šabloni obaveza → Dodaj** okidač **Na zakazani datum**: Generiši dokument DA + šablon `Uput - …`, Pošalji mejl DA, Priloži generisani dokument DA, Primalac `Email zaposlenog`, Naslov `Uput za pregled - {{ process_type_name }}`, Telo sa `{{ process_type_name }}` i `{{ scheduled_for }}` → Sačuvaj.
41. [ ] 🟦 Dodaj okidač **Kada se završi pregled** → Sledeća vrsta obaveze `Periodični lekarski pregled` (chaining).
42. [ ] ⚙️ (Opciono) okidači **N dana pre termina** (mejl internoj ulozi) i **Kada nije završeno na vreme**.
43. [ ] 🟦 **Operativa → Obaveze → Dodaj**: Vrsta `Periodični lekarski pregled`, Zaposleni `Marko Petrović`, Sledeći termin **danas + 30** (ili **danas** uz Rok unapred `0` za brz test), Aktivan DA → Sačuvaj.
44. [ ] ⚙️ **Firme → Zaposleni** → red Marka → **Pošalji na pregled** → Vrsta `Periodični lekarski pregled` → **Pošalji** → aktivnost **Poslat**, uput prikačen.
45. [ ] ⚙️ **Operativa → Obaveze** → red rasporeda → **Pošalji sad** → isto kao 44.
46. [ ] ⚙️ Ponovi „Pošalji na pregled" isti dan → sistem **ne** pravi duplikat.
47. [ ] 🟦 Terminal: `python manage.py run_due_processes` → aktivnost **Na čekanju** (`scheduled_for` = termin), još nema uputa; ponovo → nema duplikata.
48. [ ] 🟦 Terminal: `python manage.py run_process_reminders --date <scheduled_for>` → aktivnost dobije dokument + (ako SES radi) mejl.
49. [ ] 🟦 **Operativa → Aktivnosti** → otvori aktivnost → tab **Dokumenti** → `Uput - … – Run #1` → preuzmi i otvori → polja popunjena (ime, JMBG, datum rođenja, radno mesto, firma, datum Akta, broj uputa).
50. [ ] 🟦 Inbox `markovuckovic1992@gmail.com`: stigao `Uput za pregled - Periodični lekarski pregled` sa prilogom; naslov bez sirovih `{{ }}`.
51. [ ] 🟦 Aktivnost → **Završi**: Datum **danas**, Važi do **danas + 12m**, Broj izveštaja `IZV-2026-001`, Ocena `Sposoban`, Mere `/` → Potvrdi → status **Završeno**.
52. [ ] 🟦 Provera chaining: **Operativa → Obaveze** → automatski kreiran nov raspored za Marka (termin = `valid_until + period`).
53. [ ] 🟦 Stranica firme → **Generiši Obrazac 1** → DOCX se skida → u njemu Marko, datum pregleda danas, sledeći za 12m, broj izveštaja, ocena `Sposoban`.
54. [ ] 🟦 Tab **Stručni nalazi** → 6 redova (gromobran i monitoring kao **nedostaje**).
55. [ ] 🟦 Na tipu **Pregled i provera opreme za rad** → **Priloži fajl** → PDF + **Datum izdavanja** `15.01.2025.` → Sačuvaj → **Važi do** = +36m, badge **važi**.
56. [ ] 🟦 Priloži još 1–2 nalaza sa starijim datumom → vidi badge **ističe uskoro** / **istekao**.
57. [ ] 🟦 Na nalazu: **Pregled** (PDF), **Promeni fajl** (zamena), **Obriši** (uz potvrdu → vraća **nedostaje**).
58. [ ] ⚙️ Tab **Usklađenost** → 4 kartice sa stvarnim statusom (Akt, Obavezna dok. X/7, Stručni nalazi, Lekarski) + ukupan indikator; klik **Otvori** vodi na tab.
59. [ ] ⚙️ **Pregled → Predstojeći rokovi** → filter **Firma** → lista sortirana po roku, statusi badge, zakasneli imaju **Kasni**.
