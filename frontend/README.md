# Frontend (React + TypeScript + Vite)

SPA za aplikaciju iz korenskog `README.md`. Poziva Django REST API; baza URL-a za build zadaje se preko `VITE_API_BASE_URL`.

## Lokalni razvoj

Iz ovog direktorijuma:

```bash
npm ci
npm run dev
```

Podrazumevano Vite očekuje backend na adresi iz `vite.config` / env. Za build koji gađa konkretan API:

```bash
set VITE_API_BASE_URL=https://tvoj-domen.rs
npm run build
```

( Na Linux/macOS: `export VITE_API_BASE_URL=...` )

## Skripte

| Skripta | Značenje |
|--------|----------|
| `npm run dev` | razvojni server (HMR) |
| `npm run build` | `tsc -b` + produkcijski bundle u `dist/` |
| `npm run preview` | lokalni pregled produkcijskog bundle-a |
| `npm run lint` | ESLint |

## Struktura (kratko)

- `src/App.tsx` — rute (`react-router-dom`)
- `src/components/AppLayout.tsx` — navigacija (grupe: Pregled, Klijenti, Aktivnosti, Dokumenti, **Procesi i Obaveze**, Korisnici)
- `src/processes/` — klijenti, zaposleni, oprema, obaveze (tipovi, šablon obaveze, obaveze, aktivnosti), dashboard „Ističe uskoro“
- `src/documents/` — dokumenti, kategorije, šabloni dokumenata
- `src/api/` — pozivi ka backendu

Na produkciji se `dist/` gradi u koraku **setupDocker** iz korenskog `deploy.sh` (v. `DEPLOY.md`).
