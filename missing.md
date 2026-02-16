## Backend – nedostaci

- **Migrations i inicijalni podaci**
    - Pokrenuti `makemigrations` za nove app-ove (`documents`, `trainings`) i `migrate`.
    - Seed za početne role, grupe i permissions (npr. `BZNR_ADMIN`, `BZNR_SAVETNIK`,…).
- **Precizni permissions po view-ovima**
    - Dodati custom DRF permission klase (npr. `IsBznrAdminOrReadOnly`) i povezati ih sa modulima.
    - Jasno definisati ko sme da upravlja korisnicima/rolama, dokumentima, obukama.
- **Logout / blacklist**
    - Uključiti `rest_framework_simplejwt.token_blacklist` i podesiti da `LogoutView` zaista blokira refresh tokene.
- **Dokumenti – upload i AI**
    - Jasno definisati upload (multipart) i eventualno poseban endpoint za fajl.
    - Dodatna logika i modeli za čuvanje rezultata AI obrade (parsed podaci) kada bude definisano u domenskim modulima.
- **Deployment konfiguracija**
    - `.env` i prod settings (SECRET_KEY, ALLOWED_HOSTS, DEBUG=False).
    - Docker/docker-compose za `web + postgres + redis` (ako se koristi).

## Frontend – nedostaci

- **Auth modul**
    - Reset lozinke: `/auth/reset-password` i `/auth/reset-password/confirm` stranice i Redux akcije.
    - Promena lozinke za ulogovanog korisnika (`/auth/password/change`).
    - Ekrani i forme za kreiranje/izmenu korisnika i rola (admin UI).
    - Globalni layout (sidebar, header) sa prikazom ruta po permissions.
- **Documents modul**
    - `DocumentFormPage` (new/edit) sa uploadom fajla, metapodacima i validacijom.
    - Redux thunkovi za `create/update/delete` dokumenta i kategorije sa optimističkim update-om listi.
    - Integracija AI obrade na UI-u:
        - izbor AI formata (`/api/documents/formats/`),
        - akcija “Pošalji na AI obradu” (`/api/ai/documents/{id}/run/`),
        - prikaz statusa (`/api/ai/documents/{id}/status/`).
- **Trainings modul**
    - Forme za kreiranje/izmenu tipova obuka, termina, prisustava i programa.
    - Filteri, paginacija i status filteri na listama (dashboard, sessions, attendance).
- **Permissions u UI-ju**
    - Uvođenje centralnog menija/sidebara koji koristi `user.permissions` i helper funkcije za prikaz/sakrivanje stavki.
    - Uklanjanje/skrivanje “Add/Edit/Delete” akcija za koje korisnik nema odgovarajuće `*_` permissions.


