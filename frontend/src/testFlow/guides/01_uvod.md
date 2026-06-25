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
> „Ovo je alat za vođenje BZNR i protivpožarnih obaveza za klijentske firme. Umesto svesaka i tabela, sve je na jednom mestu — firme, zaposleni, obaveze i rokovi. Aplikacija sama prati šta ističe i šalje podsetnike, nama i klijentu. Krećemo od ekrana **Danas**, koji pokazuje šta treba danas; entiteti su **Firme/Zaposleni/Oprema**; tekući posao je pod **Operativom**; a **Administracija** su podešavanja koja se rade jednom. U narednim videima idemo korak po korak."

## Video
- Status: **postoji** (`01_uvod.webm`), ali stariji — dosnimiti kratku turu menija (3 zone) i ovu rečenicu-dve o tome šta app radi.

## Otvoreno / TODO
- Nema.
