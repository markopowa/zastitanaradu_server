# Test flow — korak po korak

Fajlovi su u `files_for_test\` (podfolder po sekciji). Prijavi se kao superuser. Radi redom.

---

## A. Nova firma — čarobnjak (7 koraka)

1. **Firme → Dodaj firmu**.
2. Korak 1 **„Lična karta"**: u „Matični broj" unesi `20644206` → klikni **„Uvezi"**; pa popuni: „Naziv" `PRIVREDNO DRUŠTVO UKRAS DOO, VELIKI POPOVIĆ`, „PIB" `108277286`, „Šifra delatnosti" `1623`, „Adresa" `Veliki Popović bb`, „Telefon" `035 555 123`, „Email" `markovuckovic1992@gmail.com`, „Beleške" `Test` → **„Sledeći"**.
3. Korak 2 **„Akt o proceni rizika"**: „Datum donošenja akta (dd.mm.yyyy)" `15.01.2025` → **„Sledeći"**. *(Pun Akt sa 3 sekcije se prilaže na tabu — sekcija D.)*
4. Korak 3 **„Obavezna dokumentacija"**: klikni **„Preskoči korak"** *(dodaješ na tabu — sekcija C)*.
5. Korak 4 **„Radna mesta i rizik"**: „Naziv radnog mesta" `Viljuškarista`, „Nivo rizika" `Povećan` → **„Sledeći"**.
6. Korak 5 **„Zaposleni"**: **„Dodaj zaposlenog"** → popuni formu (vidi sekciju F, koraci 2–13) → **„Sledeći"**.
7. Korak 6 **„Lekarski pregledi"**: **„Preskoči korak"** *(prvo se konfiguriše vrsta obaveze — sekcija G)*.
8. Korak 7 **„Stručni nalazi"**: **„Završi"** *(vodi na tab „Usklađenost" firme)*.

---

## B. Kontakt-lice (tab Lična karta)

1. Otvori tab **„Lična karta"**.
2. U sekciji „Kontakt-lica" klikni **„Dodaj kontakt-lice"**.
3. „Ime i prezime" `Zoran Antić`.
4. „Uloga" `Direktor`.
5. „Telefon" `062 236 018`.
6. „Email" `markovuckovic1992@gmail.com`.
7. Uključi „Primarni kontakt".
8. **„Sačuvaj"**.

---

## C. Obavezna dokumentacija (tab Dokumentacija)

1. Otvori tab **„Dokumentacija"** → sekcija „Obavezna dokumentacija".
2. Red „Ugovor" → **„Priloži"** → `obavezna_dokumentacija\ugovor.pdf`.
3. Red „Odluka o imenovanju lica za BZNR" → **„Priloži"** → `obavezna_dokumentacija\odluka.pdf`.
4. Red „Pravilnik o BZNR" → **„Priloži"** → `obavezna_dokumentacija\Pravilnik BZNR - opste 2025.doc`.
5. Red „Pravilnik o LZO" → **„Priloži"** → `obavezna_dokumentacija\Pravilnik LZO - 2025.doc`.
6. Red „Program obuke za zaposlene" → **„Priloži"** → `obavezna_dokumentacija\Program obuke 2025.doc`.
7. Red „Program obuke za rukovodioce" → **„Priloži"** → `obavezna_dokumentacija\Program obuke za rukovodioce.docx`.
8. Red „Program obuke za LZO" → **„Priloži"** → `obavezna_dokumentacija\Program obuke za LZO 2025.doc`.

---

## D. Akt o proceni rizika — 3 sekcije (tab Dokumentacija)

1. U sekciji „Akt o proceni rizika" klikni **„Dodaj Akt"**.
2. „Datum donošenja (dd.mm.yyyy)" `15.01.2025` → **„Sačuvaj datum"**.
3. Sekcija „Uvod" → **„Priloži"** → „Izaberi fajl…" → `akt_o_proceni_rizika\0.Uvod.docx` → „Razlog izmene" `Inicijalni prilog uvoda` → **„Sačuvaj"**.
4. Sekcija „Procene" → **„Priloži"** → `akt_o_proceni_rizika\1.Direktor.doc` → „Razlog izmene" `Inicijalni prilog procene` → **„Sačuvaj"**.
5. Sekcija „Zaključak" → **„Priloži"** → `akt_o_proceni_rizika\Zakljucak.docx` → „Razlog izmene" `Inicijalni prilog zakljucka` → **„Sačuvaj"**.
6. Sekcija „Procene" → **„Izmeni"** → `akt_o_proceni_rizika\2.Finansijski direktor.doc` → „Razlog izmene" `Dopuna procene` → **„Sačuvaj"**.
7. Sekcija „Procene" → **„Istorija"**.
8. **„Objedini u PDF"**.

---

## E. Radna mesta (tab Radna mesta i rizik)

*(Viljuškarista je dodat u čarobnjaku, korak 5.)*
1. Otvori tab **„Radna mesta i rizik"**.
2. **„Dodaj radno mesto"** → „Naziv radnog mesta" `Magacioner`, „Nivo rizika" `Umeren` → **„Sačuvaj"**.
3. U redu „Viljuškarista" → meni akcija → **„Izmeni"** → „Opis" `Rukovanje viljuškarom u magacinu` → **„Sačuvaj"**.

---

## F. Zaposleni (tab Zaposleni)

*(Ako nisi dodao u čarobnjaku.)*
1. Otvori tab **„Zaposleni"** → **„Dodaj zaposlenog"**.
2. „Ime" `Marko`.
3. „Prezime" `Petrović`.
4. „Ime oca" `Stevan`.
5. „JMBG" `0102990710123` *(„Datum rođenja (dd.mm.yyyy)" se popuni automatski)*.
6. „Mesto rođenja" `Niš`.
7. „Email" `markovuckovic1992@gmail.com`.
8. „Organizaciona jedinica" `Proizvodnja`.
9. „Pozicija" `Viljuškarista`.
10. „Radno mesto" `Viljuškarista`.
11. **„Sačuvaj"**.

---

## G. Šablon dokumenta (Uput) + mapiranje polja

1. **Dokumenti → Šabloni dokumenata → Dodaj šablon**.
2. „Naziv" `Uput - periodični lekarski pregled`, „Kontekst" `Zaposleni`, „Kategorija" izaberi (ili `Lekarski pregledi`).
3. „Način kreiranja šablona" → **„Kreiraj iz fajla (upload)"** → „Izaberi fajl" → `sablon_dokumenta\Uput_za_periodicni_lekarski_pregled.pdf` → **„Sačuvaj"**.
4. Na redu šablona → meni akcija → **„Uredi polja"**.
5. Klikni na poziciju za ime → u „Pretraži polja…" izaberi „Ime zaposlenog".
6. Pozicija za prezime → „Prezime zaposlenog".
7. Pozicija za JMBG → „JMBG".
8. Pozicija za radno mesto → „Radno mesto sa povećanim rizikom".
9. Pozicija za datum → „Datum zakazivanja".
10. Pozicija za broj uputa → „Broj uputa".
11. **„Pregled rezultata"** → „Zatvori".
12. **„Sačuvaj polja"**.

---

## H. Vrsta obaveze

1. **Podešavanja → Vrste obaveza → Dodaj vrstu obaveze**.
2. „Naziv" `Periodični lekarski pregled`, „Subjekt" `Zaposleni`, „Period (meseci)" `12`, „Rok unapred (dana)" `30`, „Aktivan" `Da`, uključi „Uključi u Obrazac 1".
3. **„Sačuvaj"**.

---

## I. Šabloni obaveza (okidači)

1. **Podešavanja → Šabloni obaveza** → red „Periodični lekarski pregled" → **„Dodaj okidač"**.
2. „Okidač" `Na zakazani datum`; „Šablon dokumenta" `Uput - periodični lekarski pregled`; uključi „Generiši dokument", „Pošalji mejl", „Priloži generisani dokument u mejl"; „Primalac" `Email zaposlenog`; „Naslov mejla" `Uput za periodični lekarski pregled`; „Telo mejla" `U prilogu je uput za pregled.` → **„Sačuvaj"**.
3. Isti red → **„Dodaj okidač"**.
4. „Okidač" `Kada se završi pregled`; „Sledeća vrsta obaveze" `Periodični lekarski pregled` → **„Sačuvaj"**.

---

## J. Raspored i slanje

1. **Operativa → Obaveze → Dodaj obavezu**: „Vrsta obaveze" `Periodični lekarski pregled`, „Zaposleni" `Marko Petrović`, „Termin (dd.mm.yyyy)" `danas + 30` → **„Dodaj"**.
2. **Zaposleni** (lista) → red „Marko Petrović" → **„Pošalji na pregled"** → „Vrsta pregleda" `Periodični lekarski pregled` → **„Pošalji"**.
3. (Alternativa) **Operativa → Obaveze** → red „Marko Petrović" → meni akcija → **„Pošalji sad"**.
4. Terminal: `python manage.py run_due_processes`
5. Terminal: `python manage.py run_process_reminders --date <termin>`

---

## K. Aktivnost — uput i završetak

1. **Operativa → Aktivnosti** → red „Marko Petrović / Periodični lekarski pregled" → **„Detalji"**.
2. Sekcija „Obaveštenja i okidači" → red „Na zakazani datum" → **„Preuzmi"** (otvori uput, proveri popunjena polja).
3. Proveri inbox `markovuckovic1992@gmail.com` (uput u prilogu).
4. Sekcija „Završetak" → **„Završi aktivnost"**: „Važi do (dd.mm.yyyy)" `danas + 12m`, „Izvršeno (dd.mm.yyyy)" `danas`, „Broj izveštaja" `IZV-2026-001`, „Ocena sposobnosti" `Sposoban`, „Preduzete mere" `/` → **„Završi"**.

---

## L. Stručni nalazi (tab Stručni nalazi)

1. Otvori firmu → tab **„Stručni nalazi"**.
2. Red „opreme za rad" → **„Priloži fajl"** → `strucni_nalazi\Strucni nalaz_Oprema za rad_Ukras_31.03.2026.pdf`, „Datum izdavanja (dd.mm.yyyy)" `31.03.2026` → **„Sačuvaj"**.
3. Red „električnih instalacija" → **„Priloži fajl"** → `strucni_nalazi\Strucni nalaz -o pregledu i ispitivanju elektricnih instalacija_2026.pdf`, „Datum izdavanja" `01.02.2026` → **„Sačuvaj"**.
4. Red „uslovi radne sredine — letnji period" → **„Priloži fajl"** → `strucni_nalazi\Strucni nalaz_uslovi radne sredine letnji period_2025.pdf`, „Datum izdavanja" `15.06.2025` → **„Sačuvaj"**.
5. Red „uslovi radne sredine — zimski period" → **„Priloži fajl"** → `strucni_nalazi\Strucni nalaz_uslovi radne sredine zimski period_2025.pdf`, „Datum izdavanja" `15.01.2025` → **„Sačuvaj"**.
6. Na jednom nalazu → **„Pregled"** → „Zatvori"; pa **„Promeni fajl"** (izaberi isti, izmeni datum) → „Sačuvaj"; pa **„Obriši"** → potvrdi.

---

## M. Nivoi rizika (Podešavanja)

1. **Podešavanja → Nivoi rizika → Dodaj nivo**: „Šifra" `TEST`, „Naziv" `Testni nivo`, „Skor" `5` → **„Sačuvaj"**.
2. U redu „Testni nivo" → meni akcija → **„Obriši"** → potvrdi.

---

## N. Usklađenost + Obrazac 1 (tab Usklađenost)

1. Otvori firmu → tab **„Usklađenost"**.
2. Klikni **„Generiši Obrazac 1"** (skida se DOCX).
3. Na kartici „Stručni nalazi" klikni **„Otvori"**.

---

## O. Predstojeći rokovi (Pregled)

1. **Pregled → Predstojeći rokovi**.
2. „Firma" izaberi `PRIVREDNO DRUŠTVO UKRAS DOO, VELIKI POPOVIĆ`.
3. „U narednih dana" `30` → Enter.
4. U redu sa rokom → **„Detalji"**.
