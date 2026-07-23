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
> Idem na **Korisnici**, kliknem **Dodaj korisnika**. Upišem username, ime, prezime, email, i u polju **Role** izaberem ulogu koju taj čovek treba da ima. **Sačuvaj**.
>
> Uloge pravim na **Uloge**, dugme **Dodaj rolu**. Upišem naziv role i čekiram koje permisije ima — na primer, ko sme da menja firme, ko da završava aktivnosti. **Sačuvaj**.
>
> Kad se taj korisnik prijavi, vidi i radi samo ono za šta ima dozvolu. Dugmad za koja nema pravo mu se ni ne prikazuju.

## Video
- Status: **opciono** — administrativno, snima se samo ako treba uputstvo za podešavanje tima.

## Otvoreno / TODO
- Nema.
