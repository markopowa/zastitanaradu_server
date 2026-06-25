# 05 — Zaposleni, oprema, radna mesta

## Cilj
Dodavanje zaposlenih (sa override-om rizika i **automatskim otvaranjem obaveza pri zaposlenju**), opreme, i radnih mesta.

## Šta je ovo (za naraciju)
Zaposleni i oprema su **nosioci obaveza**. Kad dodaš zaposlenog na radno mesto određenog rizika, aplikacija mu **sama otvara obaveze** koje mu po zakonu pripadaju: osposobljavanje za BZR, ZOP obuku, zaduženje LZO, a za rad sa povećanim rizikom i **prethodni lekarski pregled** (koji se po obavljanju lančano nastavlja u periodični — vidi `06`). Isto za opremu: dodaš PP aparat → otvori se obaveza servisa.

Poenta za video: korisnik **ne mora ručno da pamti** šta kome treba — uneseš ko/šta je to i kog je rizika, a sistem otvori odgovarajuće obaveze i počne da prati rokove. Rizik radnog mesta se po potrebi može **redefinisati (override)** na samom zaposlenom.

## Preduslovi
- `02`–`04` odrađeni (firma sa radnim mestima i dokumentima).

## Koraci — zaposleni
1. **Zaposleni → Dodaj** (ili sa firme, tab Zaposleni) → **F2 → Popuni** → izaberi radno mesto sa **povećanim rizikom** → **Sačuvaj**.
2. Otvori tog zaposlenog → **istorija/aktivne obaveze** → očekivano: **automatski otvorene** obaveze pri zaposlenju:
   - Osposobljavanje BZR, ZOP obuka, LZO zaduženje (za svakog),
   - **Prethodni lekarski** (jer je povećan rizik) — dospeva odmah.
   - **Periodični lekarski NE** odmah — on dolazi tek kad se prethodni završi (vidi `06`, lančanje).
3. Dodaj zaposlenog na radno mesto **bez** povećanog rizika (**F3 → Popuni**) → očekivano: dobija obuke/ZOP/LZO, ali **ne** lekarski.
4. Na zaposlenom → **redefiniši rizik** (override) → očekivano: efektivni nivo se menja u odnosu na radno mesto.

## Koraci — oprema
5. **Oprema → Dodaj** → **EQ1 → Popuni** *(nov fill)* → **Sačuvaj** → očekivano: oprema u listi, vezana za firmu.
6. Na firmi sa instalacijom „PP aparati" (iz profila, `03`) → očekivano: oprema/PP servis obaveza postaje relevantna u Pregledu.

## Koraci — radna mesta
7. Tab Radna mesta → **E_ADD → Popuni** (dodaj) i **E_EDIT → Popuni** (izmeni Viljuškaristu) → očekivano: izmene vidljive, nivo rizika obavezan.

## Provera (checklist)
- [ ] Povećan rizik → prethodni lekarski + obuke/ZOP/LZO automatski; nizak → bez lekarskog.
- [ ] Periodični lekarski se NE pravi pri zaposlenju (čeka lančanje iz prethodnog).
- [ ] Override rizika menja efektivni nivo.
- [ ] Oprema se dodaje i veže za firmu.

## Šta reći u videu (predlog naracije)
> „Zaposleni i oprema su nosioci obaveza. Čim dodam zaposlenog na radno mesto, sistem mu sam otvori obaveze — osposobljavanje, ZOP obuku, zaduženje opreme, a za povećan rizik i prethodni lekarski. Periodični lekarski se ne pravi odmah, nego se nastavlja iz prethodnog kad ga obavimo. Rizik mogu i ručno da redefinišem na zaposlenom. Isto i za opremu: dodam PP aparat i odmah dobijem obavezu servisa. Ne moram ništa da pamtim — kažem ko je i kog je rizika, sistem zna ostalo."

## Video
- Status: **snimiti** (delom u 03/04 starih, ali auto-spawn i override nisu pokazani).

## Fill koji fali
- `EQ1` — dodavanje opreme.

## Otvoreno / TODO
- Za postojeće (već zaposlene) radnike pri prelasku na aplikaciju — periodični se ne pravi automatski (nema prethodnog); dodaje se ručno. Razmotriti onboarding postojećih.
