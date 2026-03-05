### Uputstvo za korisnike – lekarski pregledi zaposlenih

Ovaj dokument je vodič za korisnike aplikacije kako da, korak po korak, podese kompletan proces lekarskih pregleda zaposlenih (prethodni, periodični, pregled vida, ciljani oftalmološki pregled).

Koraci se rade kroz sledeće ekrane:

- **Dokumenti → Šabloni dokumenata**
- **Procesi → Vrste obaveza**
- **Procesi → Šabloni procesa**
- **Procesi → Rasporedi**
- **Procesi → Aktivnosti**

Na kraju ćete imati:

- automatsko generisanje **Uputa** za svaki tip pregleda
- automatsko **slanje uputa mejlom** poslodavcu
- automatsko zakazivanje sledećeg pregleda unapred (npr. mesec dana ranije)
- mogućnost da vodite i štampate **Evidenciju** iz sistema

---

### 1. Šta je potrebno da pripremite

Od klijenta (poslodavca) prikupite sledeće Word / PDF dokumente:

- **Akt o proceni rizika** – gotov, potpisan akt o proceni rizika za tu firmu (po mogućstvu u Word / tekstualnom PDF formatu)
- **Uput za prethodni lekarski pregled**
- **Uput za periodični lekarski pregled**
- **Uput za pregled vida**
- **Uput za ciljani oftalmološki pregled**
- **Evidencija lekarskih pregleda** – obrazac evidencije lekarskih pregleda (npr. `EVIDENCIJA.docx`)

U nastavku uputstva ova dokumenta koristite na dva načina:

- **Akt o proceni rizika** je konačan dokument koji je izrađen za konkretnog poslodavca – u aplikaciju ga samo **otpremate kao dokument** (videti tačku 2.3), da biste ga imali sačuvan uz ostalu dokumentaciju.
- ostali obrasci (uputi i evidencija) služe kao **šabloni dokumenata** koje će sistem automatski popunjavati (videti poglavlje 3).

Preporuka je da svi obrasci budu u **.docx** formatu, sa podvučenim praznim mestima (____) gde se unose podaci – sistem će ta mesta automatski pretvoriti u polja koja se popunjavaju podacima iz aplikacije.

Napomena: Ako ste tek instalirali sistem i još uvek nemate nijednu kategoriju dokumenata, prvo u aplikaciji otvorite ekran **„Dokumenti“ → „Kategorije dokumenata“**, kliknite na **„Dodaj kategoriju“** i napravite kategoriju npr. **„Procena rizika“**. Tek nakon toga na ekranu **„Dokumenti“ → „Dokumenti“** možete da dodate sam Akt o proceni rizika i da u polju **Kategorija** izaberete tu novu kategoriju.

#### 1.1. Gde tačno učitavate koji fajl

Da ne bude zabune, za svaki od pripremljenih fajlova uradite sledeće:

- **Akt o proceni rizika**  
  1. U meniju izaberite **„Dokumenti“ → „Dokumenti“**.  
  2. Kliknite na **„Dodaj dokument“**.  
  3. U poljima popunite, na primer:  
     - **Kategorija**: „Procena rizika“ (ili neka postojeća odgovarajuća kategorija)  
     - **Naziv / naslov**: „Akt o proceni rizika – [Naziv firme]“  
     - **Fajl**: izaberite pripremljeni fajl akta (`.docx` ili PDF).  
  4. Sačuvajte dokument.  

- **Uputi i Evidencija lekarskih pregleda** (`Uput…` i `EVIDENCIJA.doc`)  
  Ove fajlove **ne unosite u „Dokumenti“**, nego od njih pravite **šablone**:
  - u nastavku (poglavlje 3) opisano je korak po korak: idete na **„Dokumenti“ → „Šabloni dokumenata“**, kliknete **„Dodaj šablon“** i tamo otpremate svaki od ovih fajlova kao šablon.

---

### 2. Unos podataka o firmi i zaposlenima

1. Na ekranu **Klijenti** unesite firmu poslodavca.
2. Za tu firmu unesite **zaposlene** (ekran za zaposlene klijenta), sa sledećim podacima:
   - ime i prezime
   - **JMBG**
   - **datum rođenja**
   - **mesto rođenja**
   - **zanimanje / radno mesto**
   - napomena da li je radno mesto sa povećanim rizikom (po potrebi).
3. Akt o proceni rizika:
   - idite na **Dokumenti**
   - otpremite fajl Akta (kategorija po izboru, npr. „Procena rizika“)
   - po potrebi zabeležite u napomeni ili nazivu na koga se akt odnosi (npr. sve zaposlene, određena radna mesta itd.).

Ovi podaci će se dalje koristiti u Uputima i u Evidenciji 1, tako da je važno da budu kompletni i tačni.

---

### 3. Kreiranje šablona dokumenata (Uputi i Evidencije)

Za svaki dokument koji želite da sistem automatski popunjava potrebno je da napravite **šablon dokumenta**.

1. Otvorite ekran **Dokumenti → Šabloni dokumenata**.
2. Kliknite na dugme **„Dodaj šablon“**.
3. Kao način kreiranja izaberite **„Kreiraj iz fajla (upload)“**.
4. Otpremite odgovarajući fajl:
   - Uput za prethodni lekarski pregled
   - Uput za periodični lekarski pregled
   - Uput za pregled vida
   - Uput za ciljani oftalmološki pregled
   - obrazac Evidencija
5. Za svaki šablon popunite:
   - **Naziv** – npr. „Uput – prethodni lekarski pregled“
   - **Kontekst** – za lekarske preglede najčešće **„Zaposleni“ (EMPLOYEE)**
   - **Kategoriju** – po želji (npr. „Lekarski pregledi“)
6. Sačuvajte šablon.

Na ekranu za uređivanje šablona možete koristiti listu dostupnih polja (sa desne strane, u obliku „čipova“) i klikom ih ubacivati u tekst (npr. ime, prezime, JMBG, naziv radnog mesta, naziv firme itd.). Sistem će ta polja automatski popunjavati prilikom generisanja dokumenata.

---

### 4. Definisanje vrsta obaveza za lekarske preglede

Sledeći korak je da definišete **vrste obaveza** – to su „tipovi pregleda“ koje sistem prati i planira.

Idite na **Procesi → Vrste obaveza** i dodajte barem sledeće vrste:

- **PRETHODNI LEKARSKI PREGLED**
  - **Naziv**: npr. „Prethodni lekarski pregled“
  - **Subjekt**: **Zaposleni**
  - **Period (meseci)**: npr. `12` (proveriti sa klijentom)
  - **Rok isporuke (dana)**: npr. `30`  
    - sistem će otprilike mesec dana pre isteka važenja podsetiti da treba pripremiti novi Uput
  - **Aktivan**: „Da“

- **PERIODIČNI LEKARSKI PREGLED**
  - **Naziv**: „Periodični lekarski pregled“
  - **Subjekt**: **Zaposleni**
  - **Period (meseci)**: npr. `12`
  - **Rok isporuke (dana)**: npr. `30` (Uput ide oko mesec dana pre isteka važenja)
  - **Aktivan**: „Da“

- **PREGLED VIDA**
  - **Naziv**: „Pregled vida“
  - **Subjekt**: **Zaposleni**
  - **Period (meseci)**: npr. `36`
  - **Rok isporuke (dana)**: npr. `30`  
    - sistem će oko 35. meseca od poslednjeg pregleda pripremiti novi Uput
  - **Aktivan**: „Da“

- **CILJANI OFTALMOLOŠKI PREGLED**
  - **Naziv**: „Ciljani oftalmološki pregled“
  - **Subjekt**: **Zaposleni**
  - **Period (meseci)**: po dogovoru (npr. `36` ili prema nalazu specijaliste)
  - **Rok isporuke (dana)**: npr. `30`
  - **Aktivan**: „Da“

Po potrebi možete dodati i posebnu vrstu obaveze za periodično generisanje **Evidencije** (npr. „Evidencija lekarskih pregleda – godišnji izveštaj“).

---

### 5. Šabloni procesa – povezivanje pregleda i šablona dokumenata

Na ekranu **Procesi → Šabloni procesa** podešavate:

- šta se dešava kada je pregled zakazan, završen ili istekne
- da li završetak jednog pregleda automatski priprema sledeći

Za svaku od vrsta obaveza iz prethodnog koraka, podesite bar jedan šablon procesa.

#### 5.1. Uput za prethodni lekarski pregled

- **Vrsta obaveze**: „Prethodni lekarski pregled“
- **Trigger**: **„Prilikom zakazivanja (ON_SCHEDULED)”**
- **Šablon dokumenta**: „Uput – prethodni lekarski pregled“
- **Generiši dokument**: uključeno
- **Pošalji mejl**: uključeno
- **Primalac mejla**: po pravilu „Glavni email klijenta“ (može i drugačije po dogovoru)
- **Naslov mejla**: npr. „Uput za prethodni lekarski pregled – [ime zaposlenog]“
- **Telo mejla**: kratak tekst, npr. „U prilogu se nalazi uput za lekarski pregled zaposlenog...“

Kada dođe vreme za pregled (na osnovu rasporeda), sistem će automatski pripremiti Uput i poslati ga mejlom poslodavcu.

#### 5.2. Uput za periodični lekarski pregled

- **Vrsta obaveze**: „Periodični lekarski pregled“
- **Trigger**: **„Prilikom zakazivanja (ON_SCHEDULED)”**
- Ostala podešavanja su ista kao za prethodni pregled, samo birate šablon „Uput – periodični lekarski pregled“.

#### 5.3. Uput za pregled vida

- **Vrsta obaveze**: „Pregled vida“
- **Trigger**: **„Prilikom zakazivanja (ON_SCHEDULED)”**
- **Šablon dokumenta**: „Uput – pregled vida“
- Mejl podešavanja po potrebi.

#### 5.4. Uput za ciljani oftalmološki pregled

- **Vrsta obaveze**: „Ciljani oftalmološki pregled“
- **Trigger**: **„Prilikom zakazivanja (ON_SCHEDULED)”**
- **Šablon dokumenta**: „Uput – ciljani oftalmološki pregled“

#### 5.5. „Sledeća vrsta obaveze“ (chaining)

U dijalogu za šablon procesa postoji polje **„Sledeća vrsta obaveze“** (nije obavezno).

Ako ga popunite, nakon što označite da je pregled završen (na ekranu **Procesi → Aktivnosti**):

- sistem će za istog zaposlenog automatski pronaći ili otvoriti **raspored** za izabranu sledeću vrstu obaveze
- postaviće planirani datum sledećeg pregleda na kraj važenja aktuelnog pregleda + period koji ste uneli u vrsti obaveze

Primer iz prakse:

- za šablon procesa **„Prethodni lekarski pregled – ON_COMPLETED“** podesite **„Sledeća vrsta obaveze“ = „Periodični lekarski pregled“**
- kada označite da je prethodni pregled završen, sistem će za istog zaposlenog pripremiti raspored za periodične preglede (sledeći pregled nakon isteka važenja prethodnog).

Na isti način možete povezati i druge vrste obaveza (npr. godišnje evidencije).

#### 5.6. Evidencije (po želji automatizovano)

Ako želite da se Evidencije generiše kroz procese:

- napravite posebnu **vrstu obaveze** (npr. „Evidencij – godišnji pregled“)
- napravite odgovarajući **šablon procesa**:
  - birate kada se pokreće (npr. određeni datum u godini ili ručno)
  - kao šablon dokumenta odaberete obrazac „Evidencij“
  - uključite generisanje dokumenta i, po želji, slanje mejla.

Često se Evidencija generiše na zahtev (kad HS službi zatreba), pa možete početi i ručnim pokretanjem, a kasnije po potrebi uvesti i automatiku.

---

### 6. Rasporedi obaveza po zaposlenima

Kada su šabloni spremni, sledeći korak je da obaveze povežete sa konkretnim zaposlenima.

1. Otvorite **Procesi → Rasporedi**.
2. Za svakog zaposlenog koji radi na radnom mestu sa povećanim rizikom, unesite rasporede za:
   - „Prethodni lekarski pregled“
   - „Periodični lekarski pregled“ (ako želite da odmah postoji i ovaj raspored)
   - „Pregled vida“ (ako je obavezan za to radno mesto)
3. Kod svakog rasporeda podesite:
   - početni datum sledećeg pregleda (ako već postoji važeći pregled, postavite datum nakon isteka važenja)
   - period i rok isporuke (ako se razlikuju od podrazumevanih vrednosti).

Od ovog trenutka sistem zna koji zaposleni imaju koje obaveze i u kom periodu ih treba obnavljati.

---

### 7. Kako izgleda tipičan tok pregleda

U praksi, proces izgleda ovako:

1. **Prethodni lekarski pregled za novog zaposlenog**
   - napravite raspored za „Prethodni lekarski pregled“ za tog zaposlenog
   - kada sistem dođe do predviđenog datuma, automatski priprema i šalje Uput poslodavcu
   - poslodavac organizuje pregled i šalje vam izveštaj (PDF)
   - vi otpremate PDF u sistem i obeležavate da je pregled završen (na ekranu „Aktivnosti“).

2. **Automatski prelazak na periodične preglede**
   - kada završite prethodni pregled i označite ga kao završen, sistem upisuje do kada pregled važi
   - ako ste u šablonu procesa podesili „Sledeća vrsta obaveze = Periodični lekarski pregled“, sistem automatski priprema raspored za periodične preglede za tog zaposlenog
   - naredni Uput za periodični pregled stiže blagovremeno pre isteka važenja prethodnog pregleda (u skladu sa unetim rokom u danima).

3. **Pregled vida i ciljani oftalmološki pregled**
   - za radna mesta gde je obavezan pregled vida, raspored funkcioniše na isti način, samo sa periodom od npr. 36 meseci
   - kada stigne novi termin, sistem priprema Uput za pregled vida
   - ako nalaz pregleda vida zahteva ciljani oftalmološki pregled, možete:
     - ručno napraviti raspored za „Ciljani oftalmološki pregled“, ili
     - unapred dogovoriti pravilo da se za takve slučajeve uvek otvara dodatna obaveza (po potrebi).

Na ovaj način sistem vam pomaže da ne zaboravite obaveze i da sve Upute i izveštaje imate na jednom mestu.

---

### 8. Rad sa Evidencijom

Evidencije (evidencija lekarskih pregleda) u sistemu je takođe dokument koji se može generisati na osnovu podataka o zaposlenom i obavljenim pregledima.

Najčešća upotreba je:

- **Evidencija po zaposlenom**
  - po potrebi pokrećete proces (ili ručno generisanje) koji koristi šablon „Evidencij“
  - dokument se popunjava osnovnim podacima o zaposlenom (ime, JMBG, datum rođenja, radno mesto, firma) i podacima o lekarskim pregledima koje ste evidentirali.

- **Godišnja / periodična Evidencija za više zaposlenih (zbirni obrazac)**
  - obrazac koji dobijete od klijenta je obično **zbirni Obrazac** – jedna tabela u kojoj svaki red predstavlja jednog zaposlenog na radnom mestu sa povećanim rizikom,
  - za svakog zaposlenog u istom redu postoje polja za prethodni i periodične preglede (više datuma, brojeva izveštaja itd.).

Sistem podržava scenarije gde:

- **jedan red u tabeli = jedan zaposleni**, sa podacima:
  - naziv radnog mesta sa povećanim rizikom,
  - ime i prezime zaposlenog,
  - interval periodičnih pregleda (u mesecima),
  - datumi izvršenih pregleda, broj izveštaja, ocena zdravstvene sposobnosti i preduzete mere.
- **više pregleda po zaposlenom** se u tabeli mogu prikazati:
  - kao više datuma / brojeva izveštaja unutar iste ćelije (odvojeni redovima ili zarezima), ili
  - kao više redova za istog zaposlenog – po dogovoru sa klijentom i načinom na koji žele da štampaju obrazac.

#### 8.1. Kako da pripremite šablon za Evidenciju

Da bi sistem mogao automatski da popunjava tabelu u Evidenciji, potrebno je da pripremite Word šablon na sledeći način:

- koristite zvanični obrazac **Obrazac** u **.docx** formatu,
- u gornjem delu ostavite polja za:
  - poslovno ime poslodavca,
  - adresu sedišta,
  - PIB poslodavca  
  (ova polja će sistem popunjavati podacima o klijentskoj firmi),
- u tabeli ostavite:
  - zaglavlje sa nazivima kolona tačno kao u obrascu,
  - **jedan prazan podatkovni red** (npr. red „1.“) koji je formatiran onako kako želite da izgledaju svi redovi u evidenciji.

Prilikom generisanja dokumenta:

- sistem će taj jedan podatkovni red tretirati kao **„šablon reda“** i na osnovu podataka iz baze:
  - za svakog zaposlenog na radnom mestu sa povećanim rizikom napraviti po jedan red u tabeli,
  - u odgovarajuće kolone upisati naziv radnog mesta, ime i prezime zaposlenog, interval pregleda, datume prethodnih i periodičnih pregleda, broj izveštaja, ocenu sposobnosti i eventualne mere,
- zaglavlje dokumenta (poslodavac, adresa, PIB) biće automatski popunjeno.

Na ovaj način, vi praktično samo obezbeđujete „čist“ Obrazac u Word formatu sa jednim primerom reda, a sistem pri svakom generisanju pravi **kompletnu zbirnu evidenciju** na osnovu upisanih pregleda.

Sve Evidencije koje sistem generiše su obični dokumenti u listi „Dokumenti“ – mogu se preuzeti, odštampati ili poslati mejlom.

---

### 8.2. Kako da napravite tablični šablon koji sistem sam popunjava

Kada želite da Evidencija bude jedan zbirni Word sa tabelom (jedan red = jedan zaposleni), šablon je potrebno pripremiti ovako:

1. U Wordu otvorite zvanični obrazac **Obrazac** ili postojeći primer Evidencije u **.docx** formatu.  
2. U gornjem delu (iznad tabele) ubacite polja iz sistema, npr.:  
   - naziv firme: `{{ client.name }}`  
   - PIB: `{{ client.pib }}`  
   - adresa: `{{ client.address }}`.  
3. U samoj tabeli ostavite:  
   - sve redove zaglavlja kako želite da izgledaju,  
   - **tačno jedan red** ispod zaglavlja koji predstavlja jednog zaposlenog na radnom mestu sa povećanim rizikom.  
4. U tom jednom podatkovnom redu upišite tekst i polja koja treba da se ponavljaju po zaposlenom, na primer:  
   - kolona „Radno mesto“: `{{ employee.high_risk_position_name }}`  
   - kolona „Ime i prezime“: `{{ employee.first_name }} {{ employee.last_name }}`  
   - kolona „Interval pregleda (meseci)“: `{{ interval_months }}`.  
5. U koloni gde treba da budu prethodni i periodični pregledi možete koristiti listu unutar jedne ćelije, na primer:

   Prethodni:  
   `{% for exam in prev_exam_info %}`  
   `- {{ exam.date }} ({{ exam.report_no }})`  
   `{% endfor %}`  

   Periodični:  
   `{% for exam in periodic_exam_info %}`  
   `- {{ exam.date }} ({{ exam.report_no }})`  
   `{% endfor %}`  

6. Sačuvajte fajl kao običan Word dokument (npr. `EVIDENCIJA_OBRAZAC.docx`).  
7. U aplikaciji idite na **Dokumenti → Šabloni dokumenata**, kliknite **„Dodaj šablon“** i otpremite ovaj fajl kao šablon sa kontekstom **„Zaposleni“ (EMPLOYEE)** ili drugim kontekstom po dogovoru.  
8. Tehnička podrška će za ovaj šablon jednom podesiti naprednu opciju da je u pitanju **tablični šablon** (interno: način generisanja „DOCX_TABLE_REPEAT_ROW“ i broj redova zaglavlja), posle čega će sistem pri svakom generisanju sam:  
   - proći kroz zaposlene na radnim mestima sa povećanim rizikom,  
   - za svakog napraviti jedan red u tabeli,  
   - popuniti sve kolone i liste pregleda u skladu sa podacima koje ste uneli u sistem.

Vama je u praksi dovoljno da obezbedite ispravan Word obrazac sa jednim podatkovnim redom, da ga učitate kao šablon i da koristite odgovarajuću vrstu obaveze / šablon procesa za generisanje Evidencije.

### 9. Šta treba tražiti od klijenta pre podešavanja

Da bi podešavanje prošlo brzo i glatko, preporučljivo je da od klijenta unapred tražite:

- Word / PDF fajlove:
  - Akt o proceni rizika
  - Uput za prethodni lekarski pregled
  - Uput za periodični lekarski pregled
  - Uput za pregled vida
  - Uput za ciljani oftalmološki pregled
  - obrazac Evidencija
- Spisak zaposlenih koji ulaze u proces, sa:
  - imenom i prezimenom
  - JMBG
  - datumom i mestom rođenja
  - nazivom radnog mesta, uz napomenu da li je radno mesto sa povećanim rizikom
- Informaciju o periodici pregleda (npr. 12 ili 36 meseci, ili drugačije po delatnostima).

Kada imate ove podatke i pratite korake iz ovog uputstva, kompletno podešavanje lekarskih pregleda za jednog klijenta obično se može završiti u jednom prolazu kroz aplikaciju.

### 9.1. Otvorena pitanja za klijenta – Evidencija

Pri prvom podešavanju Evidencije, obavezno razjasnite sa klijentom sledeće:

- **Na koji način vode Evidenciju?**
  - da li sada imaju **jednu zbirnu evidenciju za sve zaposlene** (svi zaposleni i svi pregledi na jednom obrascu),
  - ili vode **posebnu evidenciju po zaposlenom** (jedan obrazac na kome su svi pregledi tog zaposlenog).
- **Kada očekuju da se Evidencija generiše iz sistema?**
  - nakon **svakog završenog pregleda** za pojedinačnog zaposlenog,
  - **periodično** (npr. jednom godišnje / po potrebi),
  - ili **isključivo na ručni zahtev** kad im zatreba.
- **Da li žele jednu Evidenciju za celu firmu ili više dokumenata?**
  - npr. po firmi, po organizacionoj jedinici ili po radnom mestu.
- **Da li postoje zakonski ili interni zahtevi za format obrasca?**
  - da li je obrazac koji dostavljaju u startu već usklađen sa propisanim „Evidencij“ obrascem,
  - i da li očekuju da sistem **verbatim** popunjava taj obrazac ili su spremni na manje prilagođavanje forme.
- **Da li evidenciju dopunjavaju ručno i van sistema?**
  - ako deo podataka i dalje planiraju da vode ručno (npr. starije preglede), dogovoriti kako se ti podaci odnose prema onome što je u sistemu (da li se prenose, ignorišu ili vode paralelno).

