# 08 — Podsetnici i slanja (Danas, Slanja, mejlovi)

## Cilj
Da se vidi šta sistem šalje, kome i kada: ekran **Danas**, ekran **Slanja** (outbox), i da podsetnici po obavezi idu pravom primaocu.

## Preduslovi
- `07` odrađen (postoje aktivnosti sa rokovima).
- Bar jedan interni korisnik sa mejlom (MAK tim = aktivni staff) i firma ima mejl.

## Koraci — Danas
1. **Danas** → očekivano: sekcije popunjene podacima:
   - **Kasni** (aktivnosti preko roka), **Stiže uskoro** (14 dana), **Neuspela slanja** (ako ih ima, sa „Ponovi"), **Slanja narednih 7 dana**.
2. Klik na red „Kasni/Stiže" → vodi na detalj aktivnosti.

## Koraci — generisanje i slanje
3. Postavi neku obavezu da dospeva uskoro: **Dodeljene obaveze** → izmeni datum tako da `danas − offset` padne danas/juče (npr. lekarski sa −30 → datum za 30 dana).
4. Pokreni ručno: `docker compose exec backend python manage.py run_process_reminders` → očekivano: outbox materijalizovan + poslato.
5. **Slanja** → očekivano: redovi sa kolonama kada/firma/tip/primaoci/status; filteri (status, firma, datum).
6. Na redu → **Pregled** → očekivano: vidi se naslov, telo i **primaoci** (i za neposlate/PENDING). Na FAILED → **Ponovi**.

## Provera — pravi primalac (po obavezi)
- [ ] Lekarski **podsetnik unapred** → MAK (pripremi uput).
- [ ] Lekarski **uput** (na datum) → **firma** (poslodavac).
- [ ] **Potvrda** (po završetku) → firma.
- [ ] Nalazi/servisi **podsetnik** („naruči pregled") → firma + MAK.
- [ ] Obuke **podsetnik** („organizuj") → firma + MAK.
- [ ] **Prekoračen rok** (bilo šta) → samo MAK.
- [ ] Tekst je po kategoriji (naruči/organizuj/uput/potvrda), ne generički; prikazuje datum, bez pogrešnog „za N dana".

## Video
- Status: **snimiti** (Danas i Slanja su novi, nema videa).

## Fill koji fali
- Nema (nema formi; sve je provera prikaza/slanja).

## Otvoreno / TODO
- Ako MAK tim nije skup aktivnih staff korisnika nego posebna grupa → podesi `REMINDER_INTERNAL_GROUP`.
- Overdue kadenca +7/+15/+30; proveriti da zatvaranje aktivnosti poništi preostale (nema spama kad nalaz kasni).
