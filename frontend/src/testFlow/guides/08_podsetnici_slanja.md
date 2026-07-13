# 08 — Podsetnici i slanja (Danas, Slanja, mejlovi)

## Cilj
Da se vidi šta sistem šalje, kome i kada: ekran **Danas**, ekran **Slanja** (outbox), i da podsetnici po obavezi idu pravom primaocu.

## Šta je ovo (za naraciju)
Ovo je „motor obaveštavanja" — razlog zašto aplikacija postoji. Svaka obaveza ima **okidače sa pomerajima** (npr. 30 dana pre roka, na dan, pa 7/15/30 dana posle ako kasni). Sistem te buduće mejlove unapred „materijalizuje" u **outbox** (red za slanje), a dnevni zadatak ih šalje kad dođe vreme. Tako se **ništa ne propušta** i postoji trag ko je, šta i kada obavešten.

**Danas** je dnevni kokpit: šta **kasni**, šta **stiže uskoro**, **neuspela slanja** (sa „Ponovi") i šta će biti **poslato narednih 7 dana**. **Slanja** je istorija/red svih mejlova sa primaocima i statusom.

Ključna finesa za video — **pravi primalac zavisi od vrste i faze obaveze**: podsetnik za lekarski unapred ide nama (MAK, da pripremimo uput), uput na dan ide poslodavcu, potvrda po obavljanju ide firmi, a sve što **kasni** ide samo nama. Tekst mejla je prilagođen kategoriji (naruči / organizuj / uput / potvrda), nije generički.

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

## Šta reći u videu (predlog naracije)
> „Ovo je razlog zašto aplikacija postoji — sama opominje na vreme, vi ne jurite rokove. Za svaku obavezu je podešeno kad se javlja: trideset dana pre roka, na sam dan, pa ponovo ako rok probije. Mejlovi se spreme unapred i pošalju kad dođe vreme, sa punim tragom ko je i kad obavešten.
>
> Na **Danas** vidim šta kasni, šta stiže, koji mejl nije uspeo — sa dugmetom da pokušam ponovo — i šta ide narednih sedam dana. Na **Slanja** je spisak svih mejlova sa statusom, mogu da otvorim i pročitam svaki.
>
> Bitno: pravu poruku dobija prava strana. Podsetnik za lekarski ide nama u MAK, jer mi pripremamo uput. Uput ide poslodavcu, jer on šalje radnika. Potvrda po obavljanju ide firmi. Kad nešto kasni, opomena ide samo nama. Tekst je prilagođen svakoj situaciji, ne generički."

## Video
- Status: **snimiti** (Danas i Slanja su novi, nema videa).

## Fill koji fali
- Nema (nema formi; sve je provera prikaza/slanja).

## Otvoreno / TODO
- Ako MAK tim nije skup aktivnih staff korisnika nego posebna grupa → podesi `REMINDER_INTERNAL_GROUP`.
- Overdue kadenca +7/+15/+30; proveriti da zatvaranje aktivnosti poništi preostale (nema spama kad nalaz kasni).
