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
> Tri uloge, razlika namerna — i to odmah pokažem: odjavim se, ulogujem kao **anita**, pa kao **admin**, uporedim levi meni.
>
> **Operativa** radi ceo dnevni posao — firme, zaposleni, oprema, aktivnosti, slanja — ali ne dira podešavanja: vrste obaveza, šablone, nivoe rizika. **Pregled** dodaje samo čitanje tih podešavanja, bez izmene. **Admin** vidi i **Korisnike / Uloge** — to nije svakodnevni posao. Permisije menjam na **Administracija → Uloge**, ne na svakom korisniku pojedinačno.
>
> Kad pravim korisnika u **Korisnici**, upišem podatke i ulogu. Bitno: **email** mora da stoji — interni podsetnici „nama u MAK" idu na te adrese; to se vidi i u **Slanjima** kao primalac. Kad se prijavi, vidi tačno koliko uloga dozvoljava — dugme bez prava se ni ne pojavi. Primer: Anita = Operativa — **Firme**, **Danas**, bez Administracije. Ja kao Admin — i Korisnici, Uloge, Nivoi rizika.

## Video
- Status: **opciono** — administrativno, snima se samo ako treba uputstvo za podešavanje tima.

## Otvoreno / TODO
- Nema.
