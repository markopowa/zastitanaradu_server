# 06 — Podsetnici i slanja

## Cilj
Šta sistem šalje, kome i kada: ekran **Danas**, ekran **Slanja**, i provera da podsetnik ide pravom primaocu.

## Šta je ovo (za naraciju)
Ovo je razlog zašto aplikacija postoji — sama opominje na vreme. Svaka obaveza ima okidače sa pomerajima (npr. 30 dana pre roka, na dan, pa ponovo ako rok probije). Ti mejlovi se unapred pripreme u **outbox** (red za slanje), i dnevni zadatak ih šalje kad dođe vreme.

**Danas** je dnevni pregled: šta **kasni**, šta **stiže uskoro** (narednih 30 dana), **neuspela slanja** (sa dugmetom Ponovi), i šta ide narednih 7 dana. Na vrhu su semafor-čipovi — **Kasni: N**, **Stiže (≤30 dana): N**, i kad su oba nula, zeleni čip **Sve ostalo u redu**; klik na prva dva čipa skroluje do te sekcije. **Slanja** je istorija/red svih mejlova sa primaocima i statusom.

Ključno: pravi primalac zavisi od vrste i faze obaveze. Podsetnik za lekarski unapred ide nama (MAK, da pripremimo uput), uput na dan ide poslodavcu, potvrda po obavljanju ide firmi, a sve što kasni ide samo nama.

## Preduslovi
- `04` odrađen (postoje aktivnosti sa rokovima).
- Bar jedan interni korisnik (staff) sa mejlom, i firma ima mejl.

## Koraci — Danas
1. **Danas** → gore semafor-čipovi: **Kasni: N**, **Stiže (≤30 dana): N**, i **Sve ostalo u redu** kad nema ni kašnjenja ni bliskih rokova. Ispod, sekcije: **Kasni**, **Stiže uskoro** (narednih 30 dana), **Neuspela slanja** (ako ih ima, sa **Ponovi**), **Slanja narednih 7 dana**. Postoji i filter **Firma** koji sužava sve sekcije odjednom.
2. Klik na red iz Kasni/Stiže uskoro → vodi na detalj aktivnosti. Klik na čip Kasni/Stiže uskoro → skroluje do te sekcije na istoj stranici.

## Koraci — generisanje i slanje
3. Postavi neku obavezu da dospeva uskoro: na dodeljenoj obavezi izmeni datum tako da `danas − pomeraj` padne danas/juče.
4. Pokreni ručno: `docker compose exec backend python manage.py run_process_reminders` → outbox materijalizovan + poslato.
5. **Slanja** → kolone: kada / firma / tip / primaoci / status; filteri Status, Firma, datum Od/Do.
6. Na redu → **Pregled** → naslov, telo, primaoci (i za neposlate — PENDING). Na FAILED → **Ponovi**.

## Provera (checklist)
- [ ] Semafor-čipovi Kasni/Stiže (≤30 dana) pokazuju tačan broj i skroluju do sekcije na klik.
- [ ] Sve ostalo u redu se pojavljuje samo kad su i Kasni i Stiže uskoro prazni.
- [ ] Filter Firma sužava sve sekcije na Danas.

## Provera — pravi primalac
- [ ] Lekarski podsetnik unapred → MAK.
- [ ] Lekarski uput (na datum) → firma (poslodavac).
- [ ] Potvrda (po završetku) → firma.
- [ ] Nalazi/servisi podsetnik → firma + MAK.
- [ ] Prekoračen rok (bilo šta) → samo MAK.

## Šta reći u videu
> Prošao sam kroz podsetnike i slanja. Ovo je razlog zašto aplikacija postoji — sama opominje na vreme, ne jurim rokove ručno.
>
> Otvorim Danas. Gore su semafor-čipovi — koliko kasni, koliko stiže u narednih 30 dana, i ako je sve u redu, zeleni čip mi to i kaže. Kliknem na čip i skroluje me do te sekcije. Ispod vidim šta kasni, šta stiže, koji mejl nije uspeo — tu imam dugme Ponovi — i šta ide narednih sedam dana. Mogu i da filtriram sve po firmi.
>
> Otvorim Slanja. Ovo je spisak svih mejlova sa statusom. Filtriram po statusu, firmi, datumu. Otvorim jedan, Pregled — vidim naslov, tekst i ko su primaoci.
>
> Bitno je ko dobija koju poruku. Podsetnik za lekarski unapred ide nama u MAK, jer mi pripremamo uput. Sam uput ide poslodavcu, jer on šalje radnika. Potvrda po obavljanju ide firmi. Kad nešto kasni, opomena ide samo nama — klijent to ne vidi.

## Video
- Status: **snimiti**.

## Otvoreno / TODO
- Ako MAK tim nije skup svih staff korisnika nego posebna grupa → podesiti `REMINDER_INTERNAL_GROUP`.
