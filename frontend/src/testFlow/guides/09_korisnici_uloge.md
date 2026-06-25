# 09 — Korisnici i uloge

## Cilj
Upravljanje korisnicima aplikacije (MAK tim) i njihovim ulogama/dozvolama. Administrativno, retko se menja.

## Šta je ovo (za naraciju)
Aplikaciju koristi **MAK tim** — više ljudi sa različitim zaduženjima. Ovde se prave **korisnici** i dodeljuju im se **uloge**, a uloga nosi **dozvole**: ko sme da menja firme, ko da završava aktivnosti, ko samo da gleda. Tako svako vidi i radi samo ono što mu pripada (dugmad bez dozvole se ni ne prikazuju).

Veza sa podsetnicima (`07`): korisnici koji su **staff i imaju mejl** čine „MAK tim" koji prima interna obaveštenja (podsetnike pre roka, prekoračene rokove). Ako treba precizniji krug primalaca, koristi se posebna grupa (`REMINDER_INTERNAL_GROUP`) umesto svih staff korisnika.

## Preduslovi
- Superuser prijavljen. Ostali docovi nisu nužni, ali baza treba da postoji.

## Koraci
1. **Korisnici** → **Dodaj korisnika** → popuni (ime, email, lozinka) → dodeli ulogu → **Sačuvaj**.
2. **Uloge** → pogledaj/izmeni dozvole jedne uloge (npr. ko sme da menja firme, ko da završava aktivnosti).
3. Odjavi se, prijavi kao taj korisnik → očekivano: vidi samo ono što mu uloga dozvoljava (npr. dugmad pod `PermissionGate` se ne prikazuju bez dozvole).
4. (Bitno za podsetnike) Korisnici sa mejlom koji su **staff** čine „MAK tim" koji prima interna obaveštenja (vidi `07`).

## Provera (checklist)
- [ ] Kreiranje korisnika i dodela uloge rade.
- [ ] Dozvole stvarno sakrivaju/zabranjuju akcije u UI-ju.
- [ ] MAK tim (staff sa mejlom) postoji za potrebe podsetnika.

## Šta reći u videu (predlog naracije)
> „Aplikaciju koristi ceo MAK tim, pa svakom pravimo korisnika i dodeljujemo mu ulogu. Uloga određuje šta sme — ko menja firme, ko završava aktivnosti, ko samo gleda. Kome dozvola fali, to dugme ni ne vidi. Još jedna stvar: članovi tima sa mejlom prirodno postaju primaoci internih podsetnika koje smo videli na ekranu Danas."

## Video
- Status: **opciono** (administrativno; snimiti samo ako treba uputstvo za podešavanje tima).

## Fill koji fali
- Nema.

## Otvoreno / TODO
- Razmotriti grupu `REMINDER_INTERNAL_GROUP` za precizan „MAK tim" umesto svih staff korisnika.
