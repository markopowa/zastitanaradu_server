# 02 — Početno podešavanje (katalog obaveza)

## Cilj
Napuniti katalog obaveza i okidače jednom komandom, pa proveriti u UI-ju da je sve tu. Ovo je jednokratno po instalaciji.

## Preduslovi
- Prazna baza, superuser.
- `deploy.sh all` odrađen (migracije primenjene).

## Koraci
1. Na serveru pokreni **jednom**:
   ```
   docker compose exec backend python manage.py reconcile_obligation_catalog --delete
   ```
   → očekivano: ispis „15 process types … reminder template(s) created", bez greške.
2. UI → **Vrste obaveza** → očekivano: **15 obaveza** (lekarski periodični/prethodni, osposobljavanje, ZOP obuka, LZO zaduženje, 6 stručnih nalaza, PP aparati, hidranti, creva, SDP). Sve aktivne. Nema `PRT-0001` ni duplikata.
3. UI → **Šabloni obaveza** → očekivano: svaka obaveza ima **okidače kao čipove** (npr. periodični lekarski: na zakazani datum + završetak + … ), nigde prazno „Nema okidača" za seedovane.
4. UI → **Šabloni dokumenata** → očekivano: postoji **„Uput za lekarski pregled"**.
5. UI → **Kategorije dokumenata** i **Nivoi rizika** → očekivano: postoje (nivoi rizika seedovani: NIZAK/UMEREN/DOPUSTIV/POVEĆAN).

## Provera (checklist)
- [ ] Komanda prošla bez greške, ispisala broj kreiranih.
- [ ] Vrste obaveza = 15, bez stranih/duplih redova.
- [ ] Svaka obaveza ima bar jedan okidač u Šablonima obaveza.
- [ ] Postoji šablon „Uput za lekarski pregled".

## Video
- Status: **presnimiti**. `02_predpodesavanje.webm` pokazuje **ručno** dodavanje kategorije, šablona, vrste obaveze i okidača — to je sada **zastarelo** (sve ide seedom). Nov video: pokreni komandu pa prošetaj kroz Vrste/Šabloni obaveza i pokaži da je sve tu.

## Otvoreno / TODO
- Naziv „Obrazac 1" (uključivanje u medicinsku evidenciju) — proveriti finalni naziv (vidi `09_obrazac1.md`).
