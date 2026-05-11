# Lekarski pregledi — uputstvo za rad (objašnjeno polako)

Ovaj sistem radi sledeće: ti uneseš firmu i zaposlene jednom, podesiš na koliko meseci ide koji pregled, i posle toga sistem **sam pravi uput, sam šalje mejl poslodavcu i sam zakazuje sledeći pregled**. Tvoj posao je samo da uneseš podatke na početku i da označiš da je pregled završen kad stigne izveštaj.

---

## Šta se dešava korak po korak (priča)

1. **Ti uneseš firmu i zaposlene jednom.**
2. **Podesiš** koje preglede pratiš i na koliko meseci (npr. periodični na 12 meseci).
3. **Sistem sam** kad dođe termin: napravi Uput (Word dokument), pošalje ga mejlom poslodavcu.
4. **Poslodavac** odvede zaposlene na pregled i pošalje ti izveštaj nazad (PDF).
5. **Ti** otvoriš aktivnost u sistemu, klikneš "Završi" i uneseš podatke iz izveštaja.
6. **Sistem sam** zakaže sledeći pregled.
7. **Kad ti zatreba evidencija** za firmu — jedan klik i dobiješ Obrazac 1 popunjen.

---

## DEO 1 — Šta da uzmeš od poslodavca pre nego što ikako počneš

**Od firme:**
- Akt o proceni rizika (Word, PDF ili slika) — otpremićeš ga kao fajl na karticu firme; iz naziva fajla sistem automatski pravi naziv koji ide u uput
- Uput za prethodni lekarski pregled (Word obrazac)
- Uput za periodični lekarski pregled (Word obrazac)
- Uput za pregled vida (Word obrazac)
- Uput za ciljani oftalmološki pregled (Word obrazac)
- Obrazac evidencije (ako koriste svoj)
- Email adresu na koju će ići uputi
- Dogovor koliko često idu pregledi (najčešće 12 ili 36 meseci)

**Za SVAKOG zaposlenog:**
- Ime, prezime i **ime oca**
- JMBG (13 cifara)
- Datum i **mesto** rođenja
- Zanimanje (npr. električar)
- Radno mesto (gde tačno radi)
- Naziv radnog mesta **sa povećanim rizikom** (ako je primenjivo)
- Broj i datum donošenja Akta o proceni rizika

> ⚠️ Ako nemaš nešto od ovoga, **prvo prikupi** pa onda kreni sa unosom. Ne unosi pola podataka — uput će biti prazan na mestima koja nisi popunio.

---

## DEO 2 — Početno podešavanje (radiš JEDNOM po firmi)

### Korak 1: Unesi firmu

1. Idi na **Klijenti**
2. Klikni **Dodaj firmu**
3. Popuni podatke firme
4. Sačuvaj

### Korak 2: Unesi zaposlene

Za svakog zaposlenog otvori stranicu firme → **Dodaj zaposlenog** i popuni:
- Ime i prezime
- Ime oca
- JMBG
- Datum i mesto rođenja
- Zanimanje
- Radno mesto
- Naziv radnog mesta sa povećanim rizikom (ako postoji)

### Korak 3: Otpremi Akt o proceni rizika

1. Otvori karticu firme (**Klijenti → klikni firmu**)
2. U sekciji **"Akt o proceni rizika"** klikni **"Priloži fajl"**
3. Izaberi fajl (`.pdf`, `.docx`, ili slika — JPG/PNG)
4. Klikni **"Izmeni podatke"** na kartici firme i unesi **"Datum donošenja Akta o proceni rizika"**
5. Sačuvaj

Nakon otpremanja:
- Klikni **"Pregled"** da vidiš sadržaj u popupu (PDF i slike direktno; za DOCX dobiješ link za preuzimanje)
- Klikni **"Promeni fajl"** ako hoćeš da zameniš novim
- Klikni **"Obriši"** ako hoćeš da ukloniš

> Naziv fajla je ono što sistem koristi kao "Naziv Akta o proceni rizika" prilikom popunjavanja uputa. Zato dobro nazovi fajl (npr. `Akt o proceni rizika - Test firma 07.pdf`) — taj naziv (bez ekstenzije) će biti u uputu.

---

## DEO 3 — Podešavanje šablona uputa (radiš JEDNOM, vredi za sve firme)

Ako su ovo prvi uputi koje praviš u sistemu, treba da napraviš 4 šablona (po jedan za svaki tip pregleda). Posle ovog koraka, **sistem će sam koristiti te šablone** kad god treba da napravi uput.

**Za svaki uput** (prethodni, periodični, pregled vida, ciljani oftalmološki):

1. **Dokumenti → Šabloni dokumenata → Dodaj šablon**
2. Klikni **"Kreiraj iz fajla"** i otpremi DOCX obrazac (onaj koji ti je poslodavac dao)
3. Popuni:
   - Naziv: npr. `Uput – periodični lekarski pregled`
   - Kontekst: `Zaposleni`
   - Kategorija: po potrebi
   - Način generisanja: obavezno izaberi neku opciju
4. Sačuvaj

**Sad podesi mapiranje polja** — ovde govoriš sistemu "kad u Word dokumentu vidiš polje 'Ime', stavi tu pravo ime zaposlenog". Klikni svako polje u šablonu i izaberi iz liste šta tu treba da bude.

### Šta znače opcije iz liste

Kad klikneš polje, sistem ti otvori listu sa svim podacima koje može da ubaci. Evo šta gde stoji:

#### 👤 Podaci o ZAPOSLENOM (uzimaju se iz kartona zaposlenog)
| Šta piše u listi | Šta će biti uneto u dokument |
|------------------|-------------------------------|
| **Ime zaposlenog** | Ime (npr. "Marko") |
| **Prezime zaposlenog** | Prezime (npr. "Petrović") |
| **Ime oca** | Ime oca (npr. "Stevan") |
| **JMBG** | 13 cifara JMBG-a |
| **Datum rođenja** | dan.mesec.godina rođenja |
| **Mesto rođenja** | Mesto (npr. "Niš") |
| **Zanimanje** | Zanimanje iz kartona (npr. "Električar") |
| **Pozicija** | Radno mesto na kome radi |
| **Organizaciona jedinica** | Sektor / odeljenje u firmi |
| **Email zaposlenog** | Mejl zaposlenog (ako je unet) |
| **Radno mesto sa povećanim rizikom** | Naziv rizičnog radnog mesta (ako postoji) |

#### 🏢 Podaci o FIRMI (uzimaju se sa kartice firme)
| Šta piše u listi | Šta će biti uneto u dokument |
|------------------|-------------------------------|
| **Naziv firme** | Pun naziv firme |
| **PIB** | PIB firme |
| **Matični broj** | Matični broj firme |
| **Šifra delatnosti** | Šifra delatnosti |
| **Adresa firme** | Ulica i broj |
| **Telefon firme** | Telefon firme |
| **Email firme** | Email firme |
| **Web sajt firme** | Web sajt firme |
| **Naziv Akta o proceni rizika** | Naziv fajla Akta (bez ekstenzije) — automatski iz otpremljenog fajla |
| **Datum donošenja Akta o proceni rizika** | Datum kad je Akt donet (uneseš ručno na kartici firme) |

#### 🔧 Podaci o OPREMI (samo ako šablon važi za opremu)
| Šta piše u listi | Šta će biti uneto u dokument |
|------------------|-------------------------------|
| **Naziv opreme/mašine** | Naziv (npr. "Bager CAT 320") |
| **Kategorija opreme** | Kategorija |
| **Inventarski broj** | Inventarski broj |
| **Lokacija opreme** | Gde se nalazi oprema |

#### 📅 PROCES — sistem ih sam izračunava
*Ova polja popunjavaš na ovaj način — sistem ih sam ubacuje u trenutku kad pravi dokument:*

| Šta piše u listi | Šta će biti uneto u dokument |
|------------------|-------------------------------|
| **Datum zakazivanja** | Datum kad je pregled zakazan (iz aktivnosti) |
| **Datum izvođenja** | Datum kad je pregled obavljen (popunjeno tek nakon "Završi") |
| **Važi do** | Datum do kog važi (popunjeno tek nakon "Završi") |
| **Vrsta procesa** | Naziv vrste obaveze (npr. "Periodični lekarski pregled") |
| **Broj uputa** | Automatski generisan redni broj (UP-0001, UP-0002...) |
| **Datum prethodnog pregleda** | Datum poslednjeg završenog pregleda iste vrste (prazno ako je prvi) |
| **Godina rođenja** | Samo godina rođenja zaposlenog (npr. "1990") |

#### ✏️ Unos teksta — za stalni tekst
**"Unos teksta"** = za polja koja su uvek ista, bez obzira na zaposlenog ili firmu.

Primer: U svakom uputu piše "Dom zdravlja Niš". Umesto da ručno menjaš to svaki put, izaberi "Unos teksta" za to polje i jednom upišeš "Dom zdravlja Niš". Sistem će uvek tu staviti taj tekst.

> 💡 **Praktičan savet:** Ako ne znaš da li polje treba da bude promenjivo ili stalno — pravilo palca je: *ako se odgovor menja od pregleda do pregleda → biraj polje iz liste; ako je uvek isto → "Unos teksta"*.

Sačuvaj mapiranje. Gotovo.

---

## DEO 4 — Reci sistemu koje vrste pregleda pratiš (radiš JEDNOM)

**Procesi → Vrste obaveza** — dodaj svaku vrstu pregleda:

| Naziv | Subjekt | Period | Rok unapred | Uključi u evidenciju | Aktivan |
|-------|---------|--------|-------------|----------------------|---------|
| Prethodni lekarski pregled | Zaposleni | 12 mes. | 30 dana | DA | DA |
| Periodični lekarski pregled | Zaposleni | 12 mes. | 30 dana | DA | DA |
| Pregled vida | Zaposleni | 36 mes. | 30 dana | DA | DA |
| Ciljani oftalmološki pregled | Zaposleni | po dogovoru | 30 dana | DA | DA |

> "Rok unapred 30 dana" znači: sistem će 30 dana pre roka pripremiti aktivnost da znaš da treba uskoro.

---

## DEO 5 — Reci sistemu šta da radi kad dođe termin (šabloni procesa)

**Za svaku vrstu obaveze** iz tabele gore napravi šablon procesa:

1. **Procesi → Šabloni procesa → Dodaj**
2. Vrsta obaveze: izaberi (npr. `Periodični lekarski pregled`)
3. Okidač: **Na zakazani datum**
4. Generiši dokument: **DA** → izaberi odgovarajući šablon uputa
5. Pošalji mejl: **DA** → primaocu (mejl poslodavca), napiši naslov i telo
6. Sačuvaj

Ovo radiš jednom po vrsti pregleda. Posle ovog, **sistem će automatski** generisati uput i poslati mejl čim zakaže termin.

---

## DEO 6 — Automatski lanac (chaining)

Ovo je čarolija: kad se završi jedan pregled, sistem automatski zakaže sledeći.

Klasičan primer: **Prethodni → Periodični**

1. **Procesi → Šabloni procesa → Dodaj**
2. Vrsta obaveze: `Prethodni lekarski pregled`
3. Okidač: **Pri završetku**
4. Sledeća vrsta obaveze: `Periodični lekarski pregled`
5. Sačuvaj

Sad, kad označiš da je prethodni pregled završen, sistem **sam** zakaže periodični za 12 meseci od tog datuma.

Po potrebi dodaj i: **Pregled vida → Ciljani oftalmološki pregled**.

---

## DEO 7 — Rasporedi (kad je sledeći termin za KOG zaposlenog)

**Procesi → Rasporedi** → za svakog zaposlenog dodaj raspored za svaku obavezu koju pratiš:

- Vrsta obaveze (npr. Periodični lekarski pregled)
- Zaposleni (Marko Petrović)
- Datum sledećeg pregleda
- Period i rok (po default-u uzima iz vrste obaveze, menjaj samo ako odstupa)

---

## DEO 8 — Šta radiš svaki dan (rutina)

### 8.1 Pregled aktivnosti

**Procesi → Aktivnosti** — ovde vidiš sve preglede:
- **"Na čekanju"** = pregled je zakazan ali još nije obavljen
- **"Završeno"** = pregled je obavljen i podaci iz izveštaja su uneti

Kad dođe datum iz rasporeda, aktivnost **sama** osvane u listi sa statusom "Na čekanju". Sistem je u istom trenutku:
- Generisao **Uput** (popunjen Word/PDF dokument) — možeš ga skinuti
- Poslao mejl poslodavcu (ako si u šablonu procesa stavio **Pošalji mejl: DA**)

### 8.2 Kako da skineš i odštampaš Uput

> 🎯 **Ovo je najčešći zadatak:** "Treba mi popunjen uput za Marka — kako da ga izgenerišem?"

> 🆕 **Skraćenica — "Pošalji na pregled" (preporučeno za ad-hoc):**
>
> Umesto da čekaš da datum iz rasporeda dođe, klikni jedno dugme:
>
> - **(A) Sa liste zaposlenih:** Klijenti → Zaposleni → red sa zaposlenim → **"Pošalji na pregled"** → biraš vrstu pregleda → "Pošalji"
> - **(B) Sa rasporeda:** Procesi → Rasporedi → red rasporeda → **"Pošalji sad"** (vrsta je već određena)
>
> U tom trenutku sistem:
> 1. Napravi aktivnost u statusu **"Poslat"** (vidi se ko je poslao i kad)
> 2. Generiše uput i čuva ga u sistemu (tab Dokumenti u aktivnosti)
> 3. Šalje mejl primaocu iz šablona procesa, sa **uputom kao prilogom**
> 4. Te-be vraća na listu aktivnosti
>
> Ako mejl ne prođe, dobiješ žuti snackbar i možeš ručno da skineš uput i pošalješ ga (dokument je sačuvan u sistemu nezavisno od mejla).
>
> Detaljni dizajn: `instructions/posalji_na_pregled.md`

1. **Procesi → Aktivnosti**
2. Pronađi aktivnost za zaposlenog (filter po statusu **"Na čekanju"** ili po zaposlenom)
3. **Otvori aktivnost** (klikni na red)
4. Idi na tab **"Dokumenti"**
5. Vidiš listu generisanih dokumenata — npr. `Uput - periodični lekarski pregled – Run #1`
6. Klikni dugme za preuzimanje (download ikonica) → fajl se skida na računar
7. **Otvori i odštampaj** → daješ zaposlenom da nosi u ustanovu

> 📋 **Šta će biti popunjeno u uputu:**
> - Sva polja zaposlenog (ime, prezime, JMBG, datum rođenja, radno mesto...) — iz kartice zaposlenog
> - Naziv firme, PIB, šifra delatnosti, Akt o proceni rizika (naziv i datum) — iz kartice firme
> - Broj uputa (npr. UP-0001) — sistem automatski generiše redom
> - Datum prethodnog pregleda — sistem povlači iz poslednjeg završenog pregleda iste vrste (prazno ako je prvi)
> - Sve što si postavio kao "Unos teksta" (npr. naziv zdravstvene ustanove)
>
> Sve to si već mapirao u **DEO 3** — sad sistem samo popunjava prema tome.

### 8.3 Šta ako nema dokumenta u tabu "Dokumenti"?

- Da li je u šablonu procesa **"Generiši dokument: DA"**?
- Da li je u šablonu procesa izabran **šablon dokumenta** (Uput)?
- Da li si ulogovan kao **superuser** (ili korisnik sa pravom za generisanje)?
- Vidi `backend/logs/django.log` za detalje greške

### 8.4 Kad stigne izveštaj iz pregleda (PDF od poslodavca)

1. Otvori aktivnost u listi
2. (Opciono) Otpremi PDF kao prilog aktivnosti
3. Klikni **"Završi"** i unesi:
   - Datum izvršenog pregleda
   - Datum sledećeg pregleda
   - Broj izveštaja
   - Ocena sposobnosti
   - Preduzete mere
4. Potvrdi → aktivnost prelazi u **"Završeno"**
5. Sistem **sam** zakaže sledeći pregled (ako postoji raspored ili chaining)

---

## DEO 9 — Generisanje Obrasca 1 (evidencija)

Kad ti treba evidencija svih pregleda za jednu firmu:

1. **Klijenti** → izaberi firmu
2. Klikni **"Generiši Obrazac 1"**
3. DOCX fajl se sam skida na računar

U fajlu su svi završeni pregledi svih zaposlenih iz te firme, sa:
- Datumom pregleda i datumom sledećeg
- Brojem izveštaja
- Ocenom sposobnosti
- Preduzetim merama

> ⚠️ Da bi se podaci pojavili u Obrazcu 1, **morali su biti popunjeni** kad si kliknuo "Završi" na aktivnosti. Ako nisi uneo broj izveštaja — taj red u tabeli će biti prazan.

---

## Kontrolna lista (kad uvodiš novu firmu)

- [ ] Firma uneta
- [ ] Svi zaposleni uneti sa **svim** obaveznim podacima
- [ ] Akt o proceni rizika otpremljen
- [ ] Šabloni uputa već postoje u sistemu (ako ne — napravi ih, radiš JEDNOM)
- [ ] Vrste obaveza postoje i aktivne su (radiš JEDNOM)
- [ ] Šabloni procesa "Na zakazani datum" postoje (radiš JEDNOM)
- [ ] Chaining "Pri završetku" podešen tamo gde treba (radiš JEDNOM)
- [ ] Rasporedi uneti **za svakog zaposlenog za svaku obavezu koju pratiš**
- [ ] Test odrađen na jednom zaposlenom da vidiš da li uput stiže na mejl
- [ ] Generisao si Obrazac 1 makar jednom i proverio da su podaci tu

---

## Najčešća pitanja

**"Uneo sam sve, ali ništa se ne dešava."**
→ Da li si uneo **raspored** sa datumom u prošlosti ili danas? Sistem reaguje tek kad datum dođe.

**"Mejl nije stigao."**
→ Email adresa mora biti verifikovana u sistemu (SES). Probaj `python manage.py send_test_email tvoj@mejl.com` — ako test mejl ne stiže, problem je u podešavanju mejl servisa.

**"Obrazac 1 je prazan."**
→ Vrsta obaveze mora imati **"Uključi u evidenciju" = DA**, i pregledi moraju biti u statusu **"Završeno"** (ne "Na čekanju").

**"Uput nema sva polja popunjena."**
→ Vrati se u **Dokumenti → Šabloni dokumenata** i proveri mapiranje polja za taj šablon. Verovatno fali neki mapping.
