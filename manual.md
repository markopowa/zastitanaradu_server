# Ono što možeš samo ti

Jedina stvar koju ne mogu ni ja ni bilo ko drugi, jer traži tvoj nalog/tajnu:

## Postmark token (za mejlove)
U Postmark-u uzmi **Server API Token** i verifikuj pošiljaoca (Sender Signature
ili domen za `noreply@mak-total-safety.pznr.in.rs`). Upiši token u `backend.env`
u obe linije, pa redeploy:
```
EMAIL_HOST_USER=<SERVER_API_TOKEN>
EMAIL_HOST_PASSWORD=<SERVER_API_TOKEN>
```
Bez tokena sve radi osim slanja mejlova.
