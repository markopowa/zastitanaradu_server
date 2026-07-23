from django.core.management.base import BaseCommand

from testing.models import TestQuestion

QUESTIONS = [
    {
        "text": "Ko je dužan da zaposlenom obezbedi bezbedne uslove rada?",
        "choices": [
            {"key": "a", "text": "Zaposleni sam sebi"},
            {"key": "b", "text": "Poslodavac"},
            {"key": "c", "text": "Inspekcija rada"},
            {"key": "d", "text": "Sindikat"},
        ],
        "correct_key": "b",
        "order": 1,
    },
    {
        "text": "Da li je zaposleni dužan da se pridržava usvojenih mera bezbednosti i zdravlja na radu?",
        "choices": [
            {"key": "a", "text": "Da, to je njegova obaveza"},
            {"key": "b", "text": "Ne, to je isključivo obaveza poslodavca"},
            {"key": "c", "text": "Samo ako to sam proceni da je potrebno"},
            {"key": "d", "text": "Samo tokom probnog rada"},
        ],
        "correct_key": "a",
        "order": 2,
    },
    {
        "text": "Šta je zaposleni dužan da uradi ako primeti neposrednu opasnost po život ili zdravlje?",
        "choices": [
            {"key": "a", "text": "Da nastavi sa radom i ništa ne prijavljuje"},
            {"key": "b", "text": "Da odmah obavesti poslodavca odnosno nadređenog"},
            {"key": "c", "text": "Da sam otkloni opasnost bez obzira na rizik"},
            {"key": "d", "text": "Da napusti posao trajno"},
        ],
        "correct_key": "b",
        "order": 3,
    },
    {
        "text": "Da li zaposleni sme da radi bez prethodne obuke za bezbedan i zdrav rad na svom radnom mestu?",
        "choices": [
            {"key": "a", "text": "Da, obuka nije obavezna"},
            {"key": "b", "text": "Ne, obuka je obavezna pre početka samostalnog rada"},
            {"key": "c", "text": "Samo ako je zaposlen kraće od mesec dana"},
            {"key": "d", "text": "Obuka je obavezna samo za rukovodioce"},
        ],
        "correct_key": "b",
        "order": 4,
    },
    {
        "text": "Koji dokument poslodavac mora da poseduje, a kojim se utvrđuju rizici na radnim mestima?",
        "choices": [
            {"key": "a", "text": "Akt o proceni rizika"},
            {"key": "b", "text": "Cenovnik usluga"},
            {"key": "c", "text": "Pravilnik o radu"},
            {"key": "d", "text": "Ugovor o radu"},
        ],
        "correct_key": "a",
        "order": 5,
    },
    {
        "text": "Ko snosi troškove sredstava i opreme za ličnu zaštitu na radu (LZO)?",
        "choices": [
            {"key": "a", "text": "Zaposleni iz sopstvenih sredstava"},
            {"key": "b", "text": "Poslodavac"},
            {"key": "c", "text": "Podjednako zaposleni i poslodavac"},
            {"key": "d", "text": "Republički fond zdravstvenog osiguranja"},
        ],
        "correct_key": "b",
        "order": 6,
    },
    {
        "text": "Da li je zaposleni obavezan da koristi propisanu ličnu zaštitnu opremu (LZO) u toku rada?",
        "choices": [
            {"key": "a", "text": "Da, u skladu sa namenom i uputstvom"},
            {"key": "b", "text": "Ne, korišćenje LZO je dobrovoljno"},
            {"key": "c", "text": "Samo kada je nadzor prisutan"},
            {"key": "d", "text": "Samo ako to sam proceni da mu je potrebno"},
        ],
        "correct_key": "a",
        "order": 7,
    },
    {
        "text": "Šta zaposleni treba da uradi ako primeti da je njegova lična zaštitna oprema oštećena ili neispravna?",
        "choices": [
            {"key": "a", "text": "Da je ipak koristi do kraja smene"},
            {"key": "b", "text": "Da o tome obavesti poslodavca i zatraži zamenu"},
            {"key": "c", "text": "Da je sam popravi improvizovano"},
            {"key": "d", "text": "Da je baci bez obaveštavanja"},
        ],
        "correct_key": "b",
        "order": 8,
    },
    {
        "text": "Šta je prvi korak u slučaju povrede na radu?",
        "choices": [
            {"key": "a", "text": "Sačekati kraj smene pa prijaviti povredu"},
            {"key": "b", "text": "Odmah ukloniti povređenog sa mesta opasnosti i pružiti prvu pomoć, uz pozivanje hitne pomoći po potrebi"},
            {"key": "c", "text": "Nastaviti sa radom da se ne izgubi vreme"},
            {"key": "d", "text": "Popuniti izveštaj pre bilo kakve pomoći"},
        ],
        "correct_key": "b",
        "order": 9,
    },
    {
        "text": "Da li je poslodavac dužan da evidentira i prijavi svaku povredu na radu?",
        "choices": [
            {"key": "a", "text": "Da, u skladu sa zakonom"},
            {"key": "b", "text": "Ne, samo teže povrede"},
            {"key": "c", "text": "Samo ako to zaposleni zahteva"},
            {"key": "d", "text": "Ne, to je obaveza zaposlenog"},
        ],
        "correct_key": "a",
        "order": 10,
    },
    {
        "text": "Šta predstavlja znak upozorenja u obliku žutog trougla sa crnim simbolom?",
        "choices": [
            {"key": "a", "text": "Zabranu"},
            {"key": "b", "text": "Obaveznu upotrebu zaštitne opreme"},
            {"key": "c", "text": "Upozorenje na opasnost"},
            {"key": "d", "text": "Oznaku izlaza za slučaj opasnosti"},
        ],
        "correct_key": "c",
        "order": 11,
    },
    {
        "text": "Šta predstavljaju znaci bezbednosti u obliku plavog kruga?",
        "choices": [
            {"key": "a", "text": "Zabranu određene radnje"},
            {"key": "b", "text": "Obavezu preduzimanja određene radnje (npr. obavezno nošenje zaštitne opreme)"},
            {"key": "c", "text": "Lokaciju opreme za prvu pomoć"},
            {"key": "d", "text": "Upozorenje na požar"},
        ],
        "correct_key": "b",
        "order": 12,
    },
    {
        "text": "Šta je zaposleni dužan da uradi po čuvenju signala za uzbunjivanje u slučaju požara?",
        "choices": [
            {"key": "a", "text": "Da nastavi sa poslom dok ne dobije dodatno obaveštenje"},
            {"key": "b", "text": "Da odmah prekine rad i evakuiše se propisanim putevima do zbornog mesta"},
            {"key": "c", "text": "Da pokuša sam da gasi požar bez obzira na obučenost"},
            {"key": "d", "text": "Da koristi lift radi bržeg izlaska"},
        ],
        "correct_key": "b",
        "order": 13,
    },
    {
        "text": "Da li zaposleni sme da koristi lift u slučaju evakuacije usled požara?",
        "choices": [
            {"key": "a", "text": "Da, radi brže evakuacije"},
            {"key": "b", "text": "Ne, evakuacija se sprovodi stepenicama i označenim izlazima"},
            {"key": "c", "text": "Samo ako je lift blizu"},
            {"key": "d", "text": "Samo rukovodioci smeju da koriste lift"},
        ],
        "correct_key": "b",
        "order": 14,
    },
    {
        "text": "Šta zaposleni treba da uradi ako primeti neispravan protivpožarni aparat ili blokiran izlaz za slučaj opasnosti?",
        "choices": [
            {"key": "a", "text": "Da to ignoriše jer nije njegova obaveza"},
            {"key": "b", "text": "Da odmah prijavi poslodavcu odnosno licu zaduženom za bezbednost"},
            {"key": "c", "text": "Da sam premesti ili popravi aparat"},
            {"key": "d", "text": "Da sačeka sledeći redovni pregled"},
        ],
        "correct_key": "b",
        "order": 15,
    },
]


class Command(BaseCommand):
    help = (
        "Seeds the default general BZR test questions (global, client_company=null). "
        "Idempotent by question text."
    )

    def handle(self, *args, **options):
        created = 0
        for item in QUESTIONS:
            _, was_created = TestQuestion.objects.get_or_create(
                client_company=None,
                text=item["text"],
                defaults={
                    "choices": item["choices"],
                    "correct_key": item["correct_key"],
                    "order": item["order"],
                    "is_active": True,
                },
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            f"{created} default test question(s) created "
            f"({len(QUESTIONS)} in catalog)."
        ))
