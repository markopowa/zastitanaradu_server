# 01 — Uvod i orijentacija

## Cilj
Prvi video: ukratko predstaviti **šta aplikacija radi, za koga je i kako je organizovana**, pre nego što se uđe u konkretan rad. Bez izmena podataka — samo obilazak.

## Šta je aplikacija (za naraciju)
Ovo je alat za firmu koja pruža usluge **bezbednosti i zdravlja na radu (BZNR)** i **zaštite od požara (ZOP)** drugim firmama (klijentima). Umesto vođenja po sveskama i Excel tabelama, sve stoji na jednom mestu:

- klijentske firme, njihovi zaposleni, radna mesta i oprema;
- koje **zakonske obaveze** svaka firma ima (lekarski pregledi, obuke, ispitivanja, stručni nalazi…);
- **kada** svaka obaveza dospeva — aplikacija sama šalje podsetnike (i nama i klijentu) pre isteka;
- **dokumentacija** (akt o proceni rizika, pravilnici, stručni nalazi, uputi…).

Suština koju treba reći u videu: *cilj je da se ništa ne propusti i da u svakom trenutku znaš šta je sledeće, šta je urađeno i šta uskoro ističe.*

## Kako je organizovana (tri zone u meniju)
- **Danas** — početni ekran; pokazuje šta traži pažnju: šta **kasni**, šta **stiže uskoro**, **neuspela slanja**, i šta će biti **poslato narednih 7 dana**. Odavde počinješ svaki dan.
- **Firme / Zaposleni / Oprema** — entiteti s kojima se radi.
- **Operativa** (Aktivnosti, Slanja) — tekući posao: pojedinačne aktivnosti (obaveze u toku) i pregled poslatih/zakazanih mejlova.
- **Administracija** (Vrste obaveza, Šabloni obaveza, Dokumenti, Kategorije/Šabloni dokumenata, Korisnici, Uloge, Nivoi rizika) — podešavanja koja se retko diraju. Katalog obaveza, nivoi rizika i okidači se **ubace jednom komandom `add_setup`** (ne radi se kroz aplikaciju kao deo testa); admin samo naknadno doda **fajlove i polja na šablone dokumenata**.

## Preduslovi
- Prijavljen superuser; prazna baza (još ništa nije podešeno).

## Koraci (demo)
1. Prijavi se → očekivano: otvara se **Danas** (prazno, jer nema podataka).
2. Prođi kroz levi meni i pokaži tri zone (vrh / Operativa / Administracija).
3. Klikni **Firme** → prazna lista.

## Provera (checklist)
- [ ] Landing posle prijave je Danas.
- [ ] Meni ima tri zone.
- [ ] Danas i Firme se otvaraju bez greške, prazni.

## Šta reći u videu (predlog naracije)
> „Dobar dan. Ovo je aplikacija u kojoj vodimo sve obaveze bezbednosti na radu i zaštite od požara za vaše firme — ono što ste do sad držali po sveskama, fasciklama i Excel tabelama. Da vam prvo pokažem kako izgleda i kako je podeljena, pa ćemo posle u svaki deo posebno.
>
> Čim se ulogujete, prvo vidite ekran **Danas** — to je vaša početna tabla. Tu vam aplikacija sama izbaci šta gori: šta je već probilo rok, šta stiže uskoro, koji mejl nije uspeo da ode, i šta će se poslati narednih sedam dana. Svako jutro počinjete odavde.
>
> Sa leve strane je meni. Gore su **Firme, Zaposleni i Oprema** — stvari sa kojima radite. Ispod, pod **Operativa**, su **Aktivnosti** (konkretni poslovi u toku) i **Slanja** (svi mejlovi koji su otišli ili čekaju). Na dnu je **Administracija** — to su podešavanja koja se nameste jednom na početku i posle se ne diraju; o njima priča sledeći video.
>
> Za sada je sve prazno jer još nismo uneli nijednu firmu. U narednim koracima unosimo firmu i sve ostalo — korak po korak."

## Video
- Status: **postoji** (`01_uvod.webm`), ali stariji — dosnimiti kratku turu menija (3 zone) i ovu rečenicu-dve o tome šta app radi.

## Otvoreno / TODO
- Nema.
