from .bzr_docx_common import new_doc, title, subtitle, heading, para, bullet, numbered, spacer, company_header, signatures, director_name, finalize

ZAKON = 'Zakon o bezbednosti i zdravlju na radu ("Sl. glasnik RS", br. 35/2023)'


def _intro(doc, company, group_text):
    para(
        doc,
        "Ovaj program osposobljavanja za bezbedan i zdrav rad donosi se u skladu sa odredbama "
        + ZAKON
        + ", kao i sa pratećim podzakonskim aktima, u privrednom društvu "
        + company.name
        + ".",
    )
    para(
        doc,
        "Program utvrđuje sadržaj, obim, način i trajanje osposobljavanja za "
        + group_text
        + ", a poslodavac obezbeđuje njegovo sprovođenje pre stupanja na rad, kod premeštaja na druge poslove, kod uvođenja nove tehnologije ili novih sredstava za rad, kao i kod promene procesa rada koja može da izazove promenu mera za bezbedan i zdrav rad.",
    )
    spacer(doc)


def _section_teorijski(doc, teme):
    heading(doc, "Teorijski deo")
    para(doc, "Teorijski deo osposobljavanja obuhvata sledeće teme:")
    for tema in teme:
        bullet(doc, tema)
    spacer(doc)


def _section_prakticni(doc, tekst):
    heading(doc, "Praktični deo")
    para(doc, tekst)
    spacer(doc)


def _section_trajanje(doc, tekst):
    heading(doc, "Trajanje i način sprovođenja")
    para(doc, tekst)
    spacer(doc)


def _section_provera(doc):
    heading(doc, "Način provere osposobljenosti")
    para(
        doc,
        "Provera osposobljenosti sprovodi se kroz teorijsku i praktičnu proveru.",
    )
    para(
        doc,
        "Teorijska provera obavlja se pisanim testom ili usmenim ispitivanjem i smatra se uspešnom ako je tačno odgovoreno na najmanje 60 odsto pitanja.",
    )
    para(
        doc,
        "Praktična provera obavlja se na radnom mestu ili u uslovima koji odgovaraju radnom mestu, kroz prikaz pravilnog i bezbednog obavljanja poslova, i ocenjuje se ocenom zadovoljava ili ne zadovoljava.",
    )
    para(
        doc,
        "Prag prolaznosti je uspešno položena teorijska provera (najmanje 60 odsto) i ocena zadovoljava na praktičnoj proveri. Lice koje ne zadovolji upućuje se na ponovno osposobljavanje i ponovnu proveru.",
    )
    spacer(doc)


def _section_periodicnost(doc, tekst):
    heading(doc, "Periodičnost (obnavljanje)")
    para(doc, tekst)
    spacer(doc)


def _section_evidencija(doc):
    heading(doc, "Evidencija")
    para(
        doc,
        "O sprovedenom osposobljavanju i izvršenim proverama poslodavac vodi propisanu evidenciju.",
    )
    para(doc, "Evidencija naročito sadrži:")
    bullet(doc, "ime i prezime lica koje je osposobljavano")
    bullet(doc, "radno mesto i poslove na kojima lice radi")
    bullet(doc, "datum i sadržaj sprovedenog osposobljavanja")
    bullet(doc, "podatke o licu koje je sprovelo osposobljavanje")
    bullet(doc, "rezultate teorijske i praktične provere")
    bullet(doc, "potpise učesnika i datum naredne provere")
    para(
        doc,
        "Evidencija se čuva u skladu sa zakonom i dostupna je nadležnoj inspekciji rada na uvid.",
    )
    spacer(doc)


def _program_zaposleni(doc, company):
    subtitle(doc, "za zaposlene")
    _intro(doc, company, "sve zaposlene koji obavljaju poslove kod poslodavca")

    heading(doc, "Cilj osposobljavanja")
    para(
        doc,
        "Cilj osposobljavanja je da zaposleni steknu potrebna znanja i veštine za bezbedno i zdravo obavljanje poslova, da prepoznaju opasnosti i štetnosti na svom radnom mestu i da pravilno primenjuju mere zaštite radi sprečavanja povreda na radu, profesionalnih oboljenja i oboljenja u vezi sa radom.",
    )
    spacer(doc)

    _section_teorijski(
        doc,
        [
            "pojam i značaj bezbednosti i zdravlja na radu",
            "prava i obaveze zaposlenih i poslodavca u oblasti bezbednosti i zdravlja na radu",
            "opasnosti i štetnosti na radnom mestu i u radnoj okolini",
            "mere zaštite i pravila bezbednog rada",
            "bezbedno korišćenje opreme za rad i sredstava za rad",
            "sredstva i oprema za ličnu zaštitu na radu (LZO)",
            "postupanje u slučaju povrede na radu i prijava povrede",
            "pružanje prve pomoći",
            "zaštita od požara i rukovanje sredstvima za gašenje požara",
            "postupak evakuacije i ponašanje u vanrednim situacijama",
        ],
    )

    _section_prakticni(
        doc,
        "Praktični deo sprovodi se na radnom mestu i obuhvata pokazivanje pravilnog i bezbednog načina obavljanja poslova, pravilno rukovanje opremom za rad, pravilnu upotrebu sredstava i opreme za ličnu zaštitu, kao i vežbu postupanja u slučaju povrede i osnovnih radnji evakuacije.",
    )

    _section_trajanje(
        doc,
        "Osposobljavanje sprovodi lice za bezbednost i zdravlje na radu, odnosno stručno lice koje odredi poslodavac, u prostorijama poslodavca i na radnom mestu. Okvirno trajanje je do jednog radnog dana, a prilagođava se složenosti poslova i nivou rizika radnog mesta. Osposobljavanje se sprovodi u toku radnog vremena i o trošku poslodavca.",
    )

    _section_provera(doc)

    _section_periodicnost(
        doc,
        "Obnavljanje osposobljavanja (periodična provera) za poslove sa povećanim rizikom sprovodi se najmanje jednom u 12 meseci, a za ostale poslove najmanje jednom u tri godine, kao i uvek kada to nalažu promene u procesu rada, uvođenje nove opreme ili nastanak povrede na radu.",
    )

    _section_evidencija(doc)


def _program_rukovodioci(doc, company):
    subtitle(doc, "za rukovodioce")
    _intro(
        doc,
        company,
        "rukovodioce koji organizuju i vode procese rada i upravljaju zaposlenima",
    )

    heading(doc, "Cilj osposobljavanja")
    para(
        doc,
        "Cilj osposobljavanja je da rukovodioci steknu znanja potrebna za organizovanje bezbednog i zdravog rada u okviru svojih nadležnosti, da razumeju svoje odgovornosti, da obezbeđuju i nadziru primenu mera zaštite i da doprinose stalnom unapređivanju uslova rada.",
    )
    spacer(doc)

    _section_teorijski(
        doc,
        [
            "organizovanje bezbednosti i zdravlja na radu u radnoj sredini",
            "odgovornosti i obaveze rukovodilaca u oblasti bezbednosti i zdravlja na radu",
            "akt o proceni rizika i primena mera utvrđenih tim aktom",
            "planiranje i sprovođenje mera za bezbedan i zdrav rad",
            "nadzor nad primenom mera i pravila bezbednog rada zaposlenih",
            "postupanje i prijava povreda na radu i opasnih pojava",
            "saradnja sa licem za bezbednost i zdravlje na radu i sa službom medicine rada",
            "obaveze prema predstavnicima zaposlenih i prema inspekciji rada",
        ],
    )

    _section_prakticni(
        doc,
        "Praktični deo obuhvata primenu stečenih znanja u radnoj sredini rukovodioca: prepoznavanje opasnosti i štetnosti u okviru organizacione celine, kontrolu primene mera i upotrebe sredstava lične zaštite, vođenje potrebne dokumentacije i postupanje u slučaju povrede na radu ili opasne pojave.",
    )

    _section_trajanje(
        doc,
        "Osposobljavanje sprovodi lice za bezbednost i zdravlje na radu, po potrebi uz učešće stručnjaka odgovarajuće struke. Okvirno trajanje je do jednog radnog dana, a prilagođava se obimu nadležnosti rukovodioca i nivou rizika procesa kojima rukovodi. Sprovodi se u toku radnog vremena i o trošku poslodavca.",
    )

    _section_provera(doc)

    _section_periodicnost(
        doc,
        "Obnavljanje osposobljavanja sprovodi se najmanje jednom u tri godine, a obavezno kod promene propisa, izmene akta o proceni rizika, uvođenja novih procesa ili tehnologija, kao i posle nastanka povrede na radu u organizacionoj celini kojom rukovodilac upravlja.",
    )

    _section_evidencija(doc)


def _program_predstavnici(doc, company):
    subtitle(doc, "za predstavnike zaposlenih za bezbednost i zdravlje na radu")
    _intro(
        doc,
        company,
        "predstavnike zaposlenih za bezbednost i zdravlje na radu",
    )

    heading(doc, "Cilj osposobljavanja")
    para(
        doc,
        "Cilj osposobljavanja je da predstavnici zaposlenih steknu znanja potrebna za ostvarivanje svoje uloge i ovlašćenja, da aktivno učestvuju u zaštiti bezbednosti i zdravlja zaposlenih i da kroz saradnju sa poslodavcem doprinose unapređivanju uslova rada.",
    )
    spacer(doc)

    _section_teorijski(
        doc,
        [
            "uloga, prava i ovlašćenja predstavnika zaposlenih za bezbednost i zdravlje na radu",
            "način izbora predstavnika i rad odbora za bezbednost i zdravlje na radu",
            "učešće u postupku procene rizika i u razmatranju akta o proceni rizika",
            "konsultacije sa poslodavcem o pitanjima bezbednosti i zdravlja na radu",
            "praćenje primene mera za bezbedan i zdrav rad na radnim mestima",
            "prikupljanje primedbi zaposlenih i pokretanje predloga za unapređenje",
            "obaveštavanje zaposlenih i saradnja sa licem za bezbednost i zdravlje na radu",
            "pravo obraćanja inspekciji rada i učešće u nadzoru inspekcije",
        ],
    )

    _section_prakticni(
        doc,
        "Praktični deo obuhvata učešće u obilasku radnih mesta, prepoznavanje opasnosti i štetnosti, pregled i razmatranje akta o proceni rizika, vođenje evidencije o uočenim nedostacima i predlozima, kao i vežbu pripreme obraćanja poslodavcu i po potrebi nadležnoj inspekciji rada.",
    )

    _section_trajanje(
        doc,
        "Osposobljavanje sprovodi lice za bezbednost i zdravlje na radu, po potrebi uz stručnu podršku. Okvirno trajanje je do jednog radnog dana, a prilagođava se obimu ovlašćenja predstavnika. Predstavnicima se obezbeđuje vreme i uslovi za osposobljavanje bez umanjenja zarade, a troškove snosi poslodavac.",
    )

    _section_provera(doc)

    _section_periodicnost(
        doc,
        "Obnavljanje osposobljavanja sprovodi se najmanje jednom u tri godine, a obavezno kod promene propisa, izmene akta o proceni rizika i kod bitnih promena u procesu rada koje utiču na bezbednost i zdravlje zaposlenih.",
    )

    _section_evidencija(doc)


def generate_program(company, kind) -> bytes:
    builders = {
        "zaposleni": _program_zaposleni,
        "rukovodioci": _program_rukovodioci,
        "predstavnici": _program_predstavnici,
    }
    builder = builders.get(kind, _program_zaposleni)

    doc = new_doc()
    company_header(doc, company)
    spacer(doc)
    title(doc, "PROGRAM OSPOSOBLJAVANJA ZA BEZBEDAN I ZDRAV RAD")
    builder(doc, company)
    spacer(doc)
    signatures(
        doc,
        left="Lice za bezbednost i zdravlje na radu",
        right="Direktor, " + director_name(company),
    )
    return finalize(doc)
