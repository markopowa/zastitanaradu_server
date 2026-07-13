# 06 — Zaposleni, oprema, radna mesta

## Cilj
Dodavanje zaposlenih (sa override-om rizika i **automatskim otvaranjem obaveza pri zaposlenju**), opreme, i radnih mesta.

## Šta je ovo (za naraciju)
Zaposleni i oprema su **nosioci obaveza**. Kad dodaš zaposlenog na radno mesto određenog rizika, aplikacija mu **sama otvara obaveze** koje mu po zakonu pripadaju: osposobljavanje za BZR, ZOP obuku, zaduženje LZO, a za rad sa povećanim rizikom i **prethodni lekarski pregled** (koji se po obavljanju lančano nastavlja u periodični — vidi `07`). Isto za opremu: dodaš PP aparat → otvori se obaveza servisa.

Poenta za video: korisnik **ne mora ručno da pamti** šta kome treba — uneseš ko/šta je to i kog je rizika, a sistem otvori odgovarajuće obaveze i počne da prati rokove. Rizik radnog mesta se po potrebi može **redefinisati (override)** na samom zaposlenom.

## Preduslovi
- `03`–`05` odrađeni (firma sa radnim mestima i dokumentima).

## Koraci — zaposleni
1. **Zaposleni → Dodaj** (ili sa firme, tab Zaposleni) → **F2 → Popuni** → izaberi radno mesto sa **povećanim rizikom** → **Sačuvaj**.
2. Otvori tog zaposlenog → **istorija/aktivne obaveze** → očekivano: **automatski otvorene** obaveze pri zaposlenju:
   - Osposobljavanje BZR, ZOP obuka, LZO zaduženje (za svakog),
   - **Prethodni lekarski** (jer je povećan rizik) — dospeva odmah.
   - **Periodični lekarski NE** odmah — on dolazi tek kad se prethodni završi (vidi `07`, lančanje).
3. Dodaj zaposlenog na radno mesto **bez** povećanog rizika (**F3 → Popuni**) → očekivano: dobija obuke/ZOP/LZO, ali **ne** lekarski.
4. Na zaposlenom → **redefiniši rizik** (override) → očekivano: efektivni nivo se menja u odnosu na radno mesto.

## Koraci — oprema
5. **Oprema → Dodaj** → **EQ1 → Popuni** *(nov fill)* → **Sačuvaj** → očekivano: oprema u listi, vezana za firmu.
6. Na firmi sa instalacijom „PP aparati" (iz profila, `04`) → očekivano: oprema/PP servis obaveza postaje relevantna u Pregledu.

## Koraci — radna mesta
7. Tab Radna mesta → **E_ADD → Popuni** (dodaj) i **E_EDIT → Popuni** (izmeni Viljuškaristu) → očekivano: izmene vidljive, nivo rizika obavezan.

## Provera (checklist)
- [ ] Povećan rizik → prethodni lekarski + obuke/ZOP/LZO automatski; nizak → bez lekarskog.
- [ ] Periodični lekarski se NE pravi pri zaposlenju (čeka lančanje iz prethodnog).
- [ ] Override rizika menja efektivni nivo.
- [ ] Oprema se dodaje i veže za firmu.

## Šta reći u videu (predlog naracije)
> „Sad dodajemo zaposlene i opremu. Čim unesete nekog, aplikacija mu sama otvori obaveze koje po zakonu slede.
>
> **Dodaj zaposlenog**, upišem podatke, vežem za radno mesto sa **povećanim rizikom**, **Sačuvaj**. Otvorim radnika — pojavile su se obaveze: osposobljavanje za bezbedan rad, ZOP obuka, zaduženje opreme, i **prethodni lekarski pregled**, jer je rizik povećan. Periodični se ne otvara odmah — čeka da se prethodni završi, jer rok zavisi od nalaza. O tome sledeći video.
>
> Radnik bez povećanog rizika dobija obuke, ali ne i lekarski — aplikacija to zaključi iz nivoa rizika. Za pojedinačnog radnika rizik mogu i ručno da promenim.
>
> Isto sa opremom: **Oprema → Dodaj**, unesem PP aparat, **Sačuvaj** — odmah dobijem obavezu servisa sa rokom koji se dalje prati."

## Video
- Status: **snimiti** (delom u 03/04 starih, ali auto-spawn i override nisu pokazani).

## Fill koji fali
- `EQ1` — dodavanje opreme.

## Otvoreno / TODO
- Za postojeće (već zaposlene) radnike pri prelasku na aplikaciju — periodični se ne pravi automatski (nema prethodnog); dodaje se ručno. Razmotriti onboarding postojećih.
