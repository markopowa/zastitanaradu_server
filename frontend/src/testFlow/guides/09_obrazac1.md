# 09 — Obrazac 1 (medicinska evidencija)

## Cilj
Generisanje objedinjene evidencije lekarskih pregleda (Obrazac 1) za firmu, iz završenih lekarskih aktivnosti.

## Šta je ovo (za naraciju)
**Obrazac 1** je propisana evidencija zaposlenih raspoređenih na radna mesta sa **povećanim rizikom** i njihovih lekarskih pregleda — dokument koji poslodavac mora da vodi. Umesto ručnog kucanja tabele, aplikacija ga **sama generiše** iz već unetih podataka: uzima sve **završene** lekarske aktivnosti firme (datum pregleda, ocena sposobnosti, broj izveštaja, sledeći termin) i sklapa ih u jedan dokument sa zaglavljem firme.

Poenta za video: pošto se podaci o pregledima ionako unose kroz aktivnosti (`07`), evidencija je „besplatna" — jedan klik i dobiješ uredan, ažuran Obrazac 1 bez prepisivanja.

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

## Šta reći u videu (predlog naracije)
> „**Obrazac 1** je propisana evidencija lekarskih pregleda za radnike na mestima sa povećanim rizikom — papir koji firma mora da ima. Pošto smo sve podatke o pregledima već uneli kad smo zatvarali aktivnosti, ne moram ništa ponovo da kucam. Otvorim firmu i kliknem **Generiši Obrazac 1** — aplikacija sama sastavi ceo dokument: ko je pregledan, kog datuma, ocena sposobnosti, broj izveštaja, kad je sledeći, sa zaglavljem firme. Uvek je tačan jer se puni iz onoga što već vodimo."

## Video
- Status: **snimiti** — tek kad se generisanje potvrdi/dovrši.

## Fill koji fali
- Nema (koristi podatke iz završenih aktivnosti, `K`).

## Otvoreno / TODO
- **NEDOVRŠENO**: u ranijim videima rečeno da generisanje „treba još da se prouči". Pre snimanja: proveriti da `generateMedicalExamRecord` stvarno vraća ispravan dokument; finalizovati naziv („Obrazac 1" vs zvanični naziv evidencije).
