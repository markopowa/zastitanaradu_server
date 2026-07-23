# Šta aplikacija treba da radi

## Kome služi
Aplikacija je alat za firmu koja se bavi bezbednošću i zdravljem na radu (BZNR/BZR). Jedna instalacija je jedna takva firma (MAK je pilot; Zoran je stručnjak čija dokumenta su etalon). Ta firma kroz aplikaciju vodi svoje klijente (druge firme): njihove zaposlene, radna mesta, opremu, procenu rizika, obaveze i sva zakonski potrebna BZR dokumenta.

## Osnovni princip (suština)
Softver sam POPUNJAVA svako dokumenta i obrazac, za svaku firmu i svaku poziciju. To je cela poenta. Iz toga sledi:

1. Nigde nema hardkodovanih specifičnih vrednosti (nema „UKRAS", „MERILA", „ćuprija", „Pekara Klas" zapečeno u šablonima). Jedino config ide u settings i env.
2. Blanko šabloni su čisti i editabilni (žive u „Šabloni dokumenata"), tako da neko sutra može da promeni kako izgledaju. Na njima su POLJA gde ide podatak, a ne primeri.
3. Softver popunjava te editabilne blankove podacima konkretne firme i zaposlenog.
4. Kad softver ne može da IZVEDE podatak, platforma PITA korisnika (npr. procena rizika, LZO po radnom mestu). Ne izmišlja i ne hardkoduje.
5. Referentni podaci (tipske opasnosti, tipska LZO po radnom mestu) dolaze iz Zoranovih realnih dokumenata, seeduju se kao editabilan katalog (MAK baseline), pa se podešavaju od firme do firme.
6. Dokumenta izgledaju profesionalno, kao Zoranova realna, a ne generički.

## Šta operater unosi
Klijent firma (naziv, PIB, matični broj, adresa), zaposleni (JMBG, datumi, pozicija), radna mesta, oprema.

Po radnom mestu: procena rizika (opasnosti i štetnosti, mere, nivo rizika) i LZO. Ako je radno mesto tipsko (znamo ga), ponudi se popunjeno iz kataloga; ako ne, operater unosi.

## Koja dokumenta pravi (sva se popunjavaju iz podataka)
Akt o proceni rizika, Obrazac 6, Karton zaduženja LZO, Potvrda po članu 5, Uput za lekarski (prethodni i periodični), Obrazac 1, Pravilnik o BZR, Programi osposobljavanja (zaposleni i rukovodioci), rad od kuće, Registar radnih mesta sa povećanim rizikom, spojen PDF za inspekciju.

## Procesi i obaveze
Rokovi (obuke, lekarski, LZO, servis opreme) se automatski prate, obaveze same iskaču, a odgovarajuća dokumenta i podsetnici se generišu automatski.

## Šta korisnik NE sme da vidi
Interni žargon (npr. „Kinney"), didaktička objašnjenja, hardkodovane primere firmi, sirove `{{ }}` oznake, crtice kao separator.

## Radni princip za mene (kako da radim na ovome)
Kad korisnik kaže da nešto ne valja, ISPRAVLJAM to (čistim šablon, pravim polje popunjivim, doterujem izgled), ne brišem funkcionalnost. Blanko šabloni i njihovo uređivanje su feature koji ostaje; problem se rešava tako što šablon postane čist i popunjiv, a ne uklanjanjem.
