# 10 — Korisnici i uloge

## Cilj
Upravljanje korisnicima aplikacije (MAK tim) i njihovim ulogama/dozvolama. Administrativno, retko se menja.

## Šta je ovo (za naraciju)
Aplikaciju koristi **MAK tim** — više ljudi sa različitim zaduženjima. Ovde se prave **korisnici** i dodeljuju im se **uloge**, a uloga nosi **dozvole**: ko sme da menja firme, ko da završava aktivnosti, ko samo da gleda. Tako svako vidi i radi samo ono što mu pripada (dugmad bez dozvole se ni ne prikazuju).

Veza sa podsetnicima (`08`): korisnici koji su **staff i imaju mejl** čine „MAK tim" koji prima interna obaveštenja (podsetnike pre roka, prekoračene rokove). Ako treba precizniji krug primalaca, koristi se posebna grupa (`REMINDER_INTERNAL_GROUP`) umesto svih staff korisnika.

## Preduslovi
- Superuser prijavljen. Ostali docovi nisu nužni, ali baza treba da postoji.

## Koraci
1. **Korisnici** → **Dodaj korisnika** → popuni (ime, email, lozinka) → dodeli ulogu → **Sačuvaj**.
2. **Uloge** → pogledaj/izmeni dozvole jedne uloge (npr. ko sme da menja firme, ko da završava aktivnosti).
3. Odjavi se, prijavi kao taj korisnik → očekivano: vidi samo ono što mu uloga dozvoljava (npr. dugmad pod `PermissionGate` se ne prikazuju bez dozvole).
4. (Bitno za podsetnike) Korisnici sa mejlom koji su **staff** čine „MAK tim" koji prima interna obaveštenja (vidi `08`).

## Provera (checklist)
- [ ] Kreiranje korisnika i dodela uloge rade.
- [ ] Dozvole stvarno sakrivaju/zabranjuju akcije u UI-ju.
- [ ] MAK tim (staff sa mejlom) postoji za potrebe podsetnika.

## Šta reći u videu (predlog naracije)
> „Aplikaciju koristi ceo tim, pa svakom napravimo nalog. Kliknem **Korisnici → Dodaj korisnika**, upišem ime, mejl i lozinku, i dodelim mu **ulogu**. Uloga određuje šta sme da radi — neko menja firme, neko samo gleda, neko završava aktivnosti. Kome nešto nije dozvoljeno, to dugme uopšte ni ne vidi.
>
> I jedna veza sa podsetnicima: članovi tima koji imaju mejl automatski dobijaju interna obaveštenja koja smo videli na ekranu Danas."

## Video
- Status: **opciono** (administrativno; snimiti samo ako treba uputstvo za podešavanje tima).

## Fill koji fali
- Nema.

## Otvoreno / TODO
- Razmotriti grupu `REMINDER_INTERNAL_GROUP` za precizan „MAK tim" umesto svih staff korisnika.
