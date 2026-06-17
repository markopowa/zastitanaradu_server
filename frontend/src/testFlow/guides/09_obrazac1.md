# 09 — Obrazac 1 (medicinska evidencija)

## Cilj
Generisanje objedinjene evidencije lekarskih pregleda (Obrazac 1) za firmu, iz završenih lekarskih aktivnosti.

## Preduslovi
- `07` odrađen — bar jedan **završen** lekarski pregled (sa unetim poljima: ocena, broj izveštaja, datum, sledeći termin).
- Vrsta obaveze „periodični lekarski" ima uključeno „ulazi u Obrazac 1".

## Koraci
1. Otvori firmu → tab **Usklađenost/Pregled** (gde stoji dugme) → **Generiši Obrazac 1**.
2. Očekivano: preuzima se Word/PDF sa tabelom: zaposleni, radno mesto sa povećanim rizikom, vrsta pregleda, datum, sledeći termin, broj izveštaja, ocena sposobnosti, mere — popunjeno iz završenih aktivnosti + zaglavlje firme.

## Provera (checklist)
- [ ] Dugme za generisanje postoji i radi bez greške.
- [ ] U dokumentu su samo zaposleni sa završenim pregledom koji „ulazi u Obrazac 1".
- [ ] Polja (ocena/datum/sledeći/izveštaj/mere) tačno iz `result_data` aktivnosti.

## Video
- Status: **snimiti** — tek kad se generisanje potvrdi/dovrši.

## Fill koji fali
- Nema (koristi podatke iz završenih aktivnosti, `K`).

## Otvoreno / TODO
- **NEDOVRŠENO**: u videu 03/04 rečeno da generisanje „treba još da se prouči". Pre snimanja: proveriti da `generateMedicalExamRecord` stvarno vraća ispravan dokument; finalizovati naziv („Obrazac 1" vs zvanični naziv evidencije).
