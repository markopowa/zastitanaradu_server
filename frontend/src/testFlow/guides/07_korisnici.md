# 07 — Korisnici i uloge

## Cilj
Napravim korisnika, dodelim mu ulogu (rolu) i proverim da dozvole rade.

## Preduslovi
- Prijavljen superuser.

## Koraci
1. **Korisnici → Dodaj korisnika** → upišem username, ime, prezime, email, dodelim ulogu iz polja **Role (grupe)** → **Sačuvaj**.
2. **Uloge → Dodaj rolu** → upišem naziv, čekiram permisije iz liste → **Sačuvaj**.
3. Odjavim se, prijavim kao taj korisnik → vidim samo ono što mu uloga dozvoljava — dugmad bez dozvole se ne prikazuju.

Zašto: korisnici koji su staff i imaju upisan email automatski dobijaju interna obaveštenja (podsetnike, prekoračene rokove) na procesu „Podsetnici i slanja" — zato email mora biti tačan.

## Provera (checklist)
- [ ] Kreiranje korisnika i dodela uloge rade.
- [ ] Kreiranje/izmena role i njenih permisija rade.
- [ ] Dozvole stvarno sakrivaju akcije u UI-ju kad se korisnik prijavi.

## Šta reći u videu
> Tri uloge, i razlika je namerna. Operativa radi ceo dnevni posao — firme, zaposleni, oprema, aktivnosti, slanja — ali ne dira podešavanja: vrste obaveza, šablone, nivoe rizika. Pregled dodaje na to samo mogućnost da se ta podešavanja i vide, bez prava da se menjaju — za nekog ko treba da zna kako je sistem podešen, a ne da ga podešava. Korisnike i uloge vidi samo Admin — to nije nešto što se menja svaki dan.
>
> Kad pravim korisnika, upišem osnovne podatke i dodelim mu ulogu iz padajuće liste. Kad se on prijavi, vidi tačno onoliko koliko mu uloga dozvoljava — dugme za koje nema pravo mu se ni ne pojavljuje, ne mora da nagađa šta sme. Primer: Anita = Operativa — vidi Firme i Danas, ne vidi Administraciju. Ja kao Admin vidim i Korisnike / Uloge / Nivoe rizika.

## Ako pita — primer i gde da pokažeš
| Ako kaže / pita | Ti kažeš | Otvori u app |
|---|---|---|
| Ko šta sme? | Operativa = day-to-day. Pregled = + čitanje kataloga. Admin = korisnici/uloge/podešavanja. | Odjavi se → uloguj kao **anita** vs **admin** → uporedi meni levo. |
| Zašto email na korisniku? | Interni podsetnici (MAK) idu na te mejlove. | **Korisnici** → polje email; pa **Slanja** primaoci. |
| Gde se menjaju permisije? | Na ulozi, ne na svakom korisniku pojedinačno. | **Administracija → Uloge**. |

## Video
- Status: **opciono** — administrativno, snima se samo ako treba uputstvo za podešavanje tima.

## Otvoreno / TODO
- Nema.
