# 02 — Početno podešavanje (katalog obaveza)

## Cilj
Napuniti katalog obaveza i okidače jednom komandom, pa proveriti u UI-ju da je sve tu. Jednokratno po instalaciji.

## Šta je ovo (za naraciju)
Pre nego što unesemo ijednu firmu, aplikacija mora da zna **koje obaveze uopšte postoje** po zakonu i kako se ponašaju. To je **katalog obaveza**. Svaka stavka je jedna **vrsta obaveze** (npr. periodični lekarski pregled, servis PP aparata, ispitivanje hidrantske mreže) i nosi: na kome se radi (zaposleni / oprema / firma), na koji se period ponavlja, i okidače.

Dva pojma koja treba razdvojiti u videu:
- **Vrsta obaveze** = *šta* se radi (npr. „periodični lekarski").
- **Šablon obaveze (okidač)** = *kada se i šta dešava* u vezi te obaveze (podsetnik pre roka, uput na datum, podsetnik posle roka).

Ranije se sve to unosilo ručno; sada je **seedovano jednom komandom**, pa se isti, ispravan skup od 15 obaveza pojavi automatski.

## Preduslovi
- Prazna baza, superuser. `deploy.sh all` odrađen (migracije primenjene).

## Koraci
1. Na serveru pokreni **jednom**:
   ```
   docker compose exec backend python manage.py reconcile_obligation_catalog --delete
   ```
   → očekivano: ispis „15 process types … reminder template(s) created", bez greške.
2. UI → **Vrste obaveza** → **15 obaveza** (lekarski periodični/prethodni, osposobljavanje, ZOP obuka, LZO zaduženje, 6 stručnih nalaza, PP aparati, hidranti, creva, SDP). Sve aktivne, bez `PRT-0001`/duplikata.
3. UI → **Šabloni obaveza** → svaka obaveza ima **okidače kao čipove**; nigde „Nema okidača" za seedovane.
4. UI → **Šabloni dokumenata** → postoji **„Uput za lekarski pregled"**.
5. UI → **Kategorije dokumenata** i **Nivoi rizika** → postoje (rizici: NIZAK/UMEREN/DOPUSTIV/POVEĆAN).

## Provera (checklist)
- [ ] Komanda prošla, ispisala broj kreiranih.
- [ ] Vrste obaveza = 15, bez stranih/duplih.
- [ ] Svaka obaveza ima bar jedan okidač.
- [ ] Postoji „Uput za lekarski pregled".

## Šta reći u videu (predlog naracije)
> „Pre rada sa firmama, aplikacija mora da zna koje obaveze postoje po zakonu — to je katalog. Umesto ručnog unosa, pokrenemo jednu komandu koja napuni ceo katalog: 15 obaveza, sa periodom i okidačima. Vrsta obaveze je *šta* se radi; okidač je *kada* se šalje podsetnik. Ovo se radi jednom po instalaciji; dalje sve ide automatski."

## Video
- Status: **presnimiti**. `02_predpodesavanje.webm` pokazuje ručno dodavanje — zastarelo (sad seed). Nov video: pokreni komandu, pa prošetaj kroz Vrste/Šabloni obaveza i pokaži da je sve tu.

## Otvoreno / TODO
- Naziv „Obrazac 1" (uključivanje u medicinsku evidenciju) — proveriti finalni (vidi `09`).
