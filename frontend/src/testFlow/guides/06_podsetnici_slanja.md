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
> Ovo je suština aplikacije, ne dodatak: ona sama pazi na rokove, ja ne moram da vodim tabelu u glavi ko kad ima lekarski ili servis.
>
> Kako to radi: svakog dana u 6 ujutru sistem prođe kroz sve firme i otvori ono što je dospelo. U 7 i u 13 časova pošalje mejlove koji su na redu tog dana. Znači, ne šalje se u trenutku kad nešto istekne, nego po unapred zadatom rasporedu, svaki dan.
>
> Kome ide mejl zavisi od toga gde je obaveza u svom toku — i to je fiksno, ne biram ja svaki put ručno. Kad se lekarskom bliži rok, prvi mejl ide nama, u MAK — 30 dana unapred, da stignemo da pripremimo uput. Sam uput, kad dođe dan, ide poslodavcu — on je taj koji šalje radnika na pregled. Kad se pregled obavi i ja upišem nalaz, potvrda ide firmi. A ako nešto probije rok — bilo šta, lekarski, servis opreme, obuka — ta opomena ide samo nama. Klijent ne vidi da kasni, mi to rešavamo interno.
>
> Sve to se vidi unapred, pre nego što je poslato — to je Danas. Gore su tri broja: koliko kasni, koliko stiže u narednih 30 dana, i ako su oba nula, piše mi da je sve u redu. Kliknem na broj i odem pravo na tu listu. Ispod toga vidim i šta ide narednih sedam dana, i da li je neki mejl pukao — ako jeste, tu je dugme Ponovi, ne moram da kopam po logovima.
>
> Slanja je istorija — svaki mejl koji je ikad otišao ili čeka da ode, sa statusom. Otvorim jedan, vidim tačno šta piše u naslovu i telu, i ko su primaoci. Ovo mi treba kad me klijent pita „jel meni nešto stiglo" — proverim ovde, ne pretražujem inbox.

## Ako pita — primer i gde da pokažeš
| Ako kaže / pita | Ti kažeš | Otvori u app |
|---|---|---|
| Primer: lekarski, kome ide šta? | 30 dana pre → MAK; na dan → uput firmi; posle završetka → potvrda firmi; kasni → samo MAK. | **Slanja** → otvori red → primaoci; ili checklist u ovom vodiču. |
| Gde vidim šta kasni danas? | Ekran Danas, crveni broj / sekcija Kasni. | Meni **Danas**. |
| Gde je istorija mejlova? | Slanja — status, primaoci, Pregled tela. | Meni **Slanja**. |
| Ko je „nama / MAK"? | Interni korisnici (Operativa) sa emailom — anita, zoran… | **Administracija → Korisnici** (Admin); mejl mora biti upisan. |
| Šta ako mejl pukne? | Na Danas / Slanja → **Ponovi**. | **Danas → Neuspela slanja** ili **Slanja** filter FAILED. |
| Test vs pravi primalac? | Dok je firma u test režimu, mejl ide na internu test adresu. | Firma → **Lična karta** (Admin vidi badge / switch test režima). |

## Video
- Status: **snimiti**.

## Otvoreno / TODO
- Nema. Interni tim (primalac kad ide „samo nama") = korisnici u grupi Operativa (`REMINDER_INTERNAL_GROUP`, podrazumevano "Operativa") — bogdan, anita, zoran su u toj grupi.
