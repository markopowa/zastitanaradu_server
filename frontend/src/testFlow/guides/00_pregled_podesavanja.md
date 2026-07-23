# 00 — Pregled podešavanja (checklista, nije video)

Referentna lista: šta instanca mora da ima posle setupa. Ovim proveravaš i MAK
i svaku sledeću firmu — ne pamtiš, štrikliraš.

## Komande setupa (posle svakog većeg deploya)
```bash
docker exec zastitanaradu_server-backend-1 python manage.py add_setup
docker exec zastitanaradu_server-backend-1 python manage.py reconcile_obligation_catalog
docker exec zastitanaradu_server-backend-1 python manage.py seed_default_test
docker exec zastitanaradu_server-backend-1 python manage.py seed_preliminary_users --password '...'
```
Po unosu radnih mesta pilot firme: `attach_obrazac6_blanks --company <ime> --kind all`.

## Šta Administracija mora da ima
- [ ] **Vrste obaveza: 17** — obuka BZR (36/12 povećan rizik), prethodni + periodični lekarski (12 povećan), LZO zaduženje, ZOP obuka (36), prva pomoć (60), PP servis (6) + PP hidrostatičko (60), hidranti (12), hidr. creva, SDP (6), 6 stručnih nalaza (36; gromobran 24). Svaka ima pravni osnov.
- [ ] **Šabloni obaveza** — podsetnici po vrsti (kome/kada); lančanje prethodni→periodični; generisanje: obuka→Obrazac 6, LZO→revers, lekarski→uput.
- [ ] **Šabloni dokumenata: 5** — Uput prethodni (Obrazac 1), Uput periodični (Obrazac 2), Obrazac 6, Revers, Potvrda čl. 5. Prva dva imaju tekst; ostali samo logiku (blanko ide po radnom mestu / vrsti obuke firme).
- [ ] **Polja/tagovi: 38** (employee/client/equipment/proces).
- [ ] **Nivoi rizika: 4** (Povećan = is_high_risk).
- [ ] **Vrste dokumenata firme** — katalog (~14; Obrazac 1, Ocena medicine, Registar radnih mesta = opcioni).
- [ ] **Uloge: 3** (Admin/Operativa/Pregled) + korisnici sa mejlovima (interni podsetnici).
- [ ] **Test pitanja: 15** (globalna; po firmi se dodaju svoja).
- [ ] **Operator config** — `OPERATOR_NAME`, `EMAIL_FROM_ADDRESS`, Postmark token u env.
- [ ] **Tajmeri**: `systemctl list-timers 'pznr-*'` — 5 aktivnih.

## Po firmi (radi se kroz aplikaciju — vodiči 01–07)
- [ ] Lična karta + profil (ZOP kategorija, instalacije, rizik delatnosti) + kontakti
- [ ] Radna mesta sa nivoima rizika + blanko šabloni po radnom mestu
- [ ] Vrste obuka firme + blanko potvrde
- [ ] Obavezna dokumentacija + Akt + stručni nalazi
- [ ] Upitnik-link za klijenta (Lična karta)
