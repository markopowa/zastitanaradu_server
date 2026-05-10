# Lekarski pregledi zaposlenih — uputstvo za rad

---

## Tok rada (ukratko)

1. Poslodavac dostavlja podatke o zaposlenom i vrsti pregleda
2. Savetnik unosi zaposlenog u sistem (ako već nije unet)
3. Sistem generiše Uput i šalje ga mejlom poslodavcu
4. Poslodavac organizuje pregled i dostavlja Izveštaj (PDF)
5. Savetnik uploaduje Izveštaj u sistem i označava pregled kao završen
6. Sistem automatski zakazuje sledeći pregled po isteku perioda
7. Savetnik može da preuzme popunjenu Evidenciju odradjenih pregleda za firmu jednim klikom

---

## 1. Priprema — šta uzeti od klijenta

Pre unosa u sistem, od poslodavca prikupi:

- Akt o proceni rizika (Word/PDF)
- Uput za prethodni lekarski pregled (obrazac)
- Uput za periodični lekarski pregled (obrazac)
- Uput za pregled vida (obrazac)
- Uput za ciljani oftalmološki pregled (obrazac)
- Obrazac evidencije (ako se koristi)
- Za svakog zaposlenog:
  - Ime i prezime i ime oca
  - JMBG
  - Datum i mesto rođenja
  - Zanimanje
  - Naziv radnog mesta sa povećanim rizikom
  - Broj i datum donošenja Akta o proceni rizika
- Dogovoreni periodi pregleda (npr. 12 ili 36 meseci)
- Email adresa na koju se šalju uputi

---

## 2. Unos firme i zaposlenih

1. Klijenti → unesi firmu
2. Za firmu unesi zaposlene — obavezna polja:
   - Ime i prezime
   - Ime oca
   - JMBG
   - Datum i mesto rođenja
   - Zanimanje
   - Radno mesto
   - Naziv radnog mesta sa povećanim rizikom

---

## 3. Dodavanje Akta o proceni rizika

1. Dokumenti → Kategorije dokumenata → Dodaj kategoriju "Procena rizika" (ako ne postoji)
2. Dokumenti → Dokumenti → Dodaj dokument
   - Kategorija: Procena rizika
   - Naziv: Akt o proceni rizika – [Naziv firme]
   - Fajl: akt (.docx/.pdf)

---

## 4. Kreiranje šablona uputa

Za svaki uput (prethodni, periodični, pregled vida, ciljani oftalmološki):

1. Dokumenti → Šabloni dokumenata → Dodaj šablon
2. Izaberi "Kreiraj iz fajla" i otpremi DOCX obrazac
3. Popuni:
   - Naziv: npr. "Uput – periodični lekarski pregled"
   - Kontekst: Zaposleni
   - Kategorija: po potrebi
   - Način generisanja: obavezno izaberi
4. Sačuvaj, pa postavi mapiranje polja:
   - Ime → `employee.first_name`
   - Prezime → `employee.last_name`
   - Ime oca → `employee.father_name`
   - JMBG → `employee.national_id`
   - Datum rođenja → `employee.date_of_birth`
   - Godina rođenja → `year_of_birth`
   - Mesto rođenja → `employee.place_of_birth`
   - Zanimanje → `employee.occupation`
   - Radno mesto → `employee.position`
   - Naziv radnog mesta sa povećanim rizikom → `employee.high_risk_position_name`
   - Naziv firme → `client.name`
   - Broj uputa → `instruction_number` *(automatski sledeći broj pri svakom generisanju)*
   - Datum prethodnog pregleda → `last_exam_date` *(automatski povlači datum poslednjeg završenog pregleda iste vrste)*
   - Za fiksni tekst (npr. naziv zdravstvene ustanove) → izaberi "Unos teksta" i unesi vrednost
5. Sačuvaj mapiranje

---

## 5. Kreiranje vrsta obaveza

Procesi → Vrste obaveza. Kreiraj za svaki tip pregleda koji pratiš:

| Naziv | Subjekt | Period | Rok unapred |
|-------|---------|--------|-------------|
| Prethodni lekarski pregled | Zaposleni | 12 mes. | 30 dana |
| Periodični lekarski pregled | Zaposleni | 12 mes. | 30 dana |
| Pregled vida | Zaposleni | 36 mes. | 30 dana |
| Ciljani oftalmološki pregled | Zaposleni | po dogovoru | 30 dana |

Za svaku vrstu: **Aktivan: DA**, **Uključi u evidenciju pregleda: DA**

---

## 6. Šabloni procesa — automatsko slanje uputa

Za svaku vrstu obaveze kreiraj šablon:

- Okidač: **Na zakazani datum**
- Generiši dokument: DA → odgovarajući Uput
- Pošalji mejl: DA → podesi primaoca, naslov i telo

---

## 7. Automatski prelaz na sledeću obavezu

Za **Prethodni lekarski pregled** dodaj još jedan šablon:

- Okidač: **Pri završetku**
- Sledeća vrsta obaveze: Periodični lekarski pregled

Time sistem automatski otvara periodični pregled čim se prethodni završi.

Po potrebi dodaj i: Pregled vida → Ciljani oftalmološki pregled.

---

## 8. Rasporedi po zaposlenima

Procesi → Rasporedi. Za svakog zaposlenog unesi raspored za obaveze koje pratiš:

- Vrsta obaveze
- Zaposleni
- Datum sledećeg pregleda
- Period i rok (ako odstupa od podrazumevanog)

---

## 9. Dnevni rad

1. Procesi → Aktivnosti — prati šta je na čekanju i šta uskoro ističe
2. Kad sistem zakaže termin, aktivnost se pojavljuje u statusu "Na čekanju" i Uput je automatski generisan (i mejl poslat ako je podešeno)
3. Kad stigne Izveštaj od poslodavca:
   - Otpremi PDF (opciono priloži aktivnosti)
   - Otvori aktivnost → klikni "Završi"
   - Unesi:
     - Datum izvršenog pregleda
     - Datum sledećeg pregleda
     - Broj izveštaja
     - Ocena sposobnosti
     - Preduzete mere
   - Potvrdi — aktivnost prelazi u "Završeno"
4. Sistem automatski zakazuje sledeći pregled

---

## 10. Evidencija odradjenih pregleda

Kada su pregledi završeni i uneseni, možeš preuzeti popunjenu evidenciju za firmu jednim klikom:

1. Klijenti → izaberi firmu
2. Klikni **"Generiši Obrazac 1"**
3. Fajl se automatski skida kao `.docx`

Dokument sadrži sve završene preglede za sve zaposlene te firme, sa:
- Datumom pregleda i datumom sledećeg
- Brojem izveštaja
- Ocenom sposobnosti
- Preduzetim merama

> Da bi se ovi podaci pojavili u evidenciji, moraju biti popunjeni u dijalogu "Završi" kada se pregled označava kao završen.

---

## Kontrolna lista

- [ ] Firma i zaposleni uneti (sa svim obaveznim podacima)
- [ ] Akt o proceni rizika dodat u Dokumente
- [ ] Šabloni uputa napravljeni sa mapiranjem polja
- [ ] Vrste obaveza kreirane i aktivne
- [ ] Šabloni procesa "Na zakazani datum" podešeni
- [ ] Chaining "Pri završetku" podešen (Prethodni → Periodični)
- [ ] Rasporedi uneti za zaposlene
- [ ] Test na jednom zaposlenom prošao
- [ ] Evidencija pregleda generisana i proverena
