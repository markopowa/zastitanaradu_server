from .bzr_docx_common import (
    new_doc,
    title,
    subtitle,
    heading,
    para,
    bullet,
    numbered,
    spacer,
    company_header,
    signatures,
    director_name,
    finalize,
)


def _employee_block(doc):
    para(doc, "Ime i prezime zaposlenog: ______________________________")
    para(doc, "Radno mesto: ______________________")
    para(doc, "JMBG: _____________________")
    para(doc, "Adresa prebivališta: ______________________________")


def _aneks(company):
    doc = new_doc()
    title(doc, "ANEKS UGOVORA O RADU")
    subtitle(doc, "za obavljanje poslova van prostorija poslodavca (rad od kuće)")
    spacer(doc)

    heading(doc, "Ugovorne strane")
    para(doc, "Poslodavac:")
    company_header(doc, company)
    para(doc, "koga zastupa direktor: " + (director_name(company) or "______________________"))
    spacer(doc)
    para(doc, "Zaposleni:")
    _employee_block(doc)
    spacer(doc)
    para(
        doc,
        "Ugovorne strane su dana ______________ zaključile Aneks ugovora o radu "
        "broj ____________ od ______________, u skladu sa Zakonom o radu i "
        "Zakonom o bezbednosti i zdravlju na radu (Sl. glasnik RS, br. 35/2023).",
    )
    spacer(doc)

    heading(doc, "Član 1. Predmet aneksa")
    para(
        doc,
        "Ovim aneksom ugovorne strane saglasno utvrđuju da će zaposleni ugovorene "
        "poslove obavljati radom od kuće, odnosno van prostorija poslodavca, pod "
        "uslovima i na način utvrđen ovim aneksom.",
    )
    para(
        doc,
        "Priroda posla omogućava da se poslovi obavljaju van prostorija poslodavca "
        "bez štete po kvalitet rada i bez ugrožavanja bezbednosti i zdravlja "
        "zaposlenog i drugih lica.",
    )
    spacer(doc)

    heading(doc, "Član 2. Mesto rada")
    para(
        doc,
        "Zaposleni poslove obavlja na adresi svog prebivališta, odnosno boravišta: "
        "______________________________________________.",
    )
    para(
        doc,
        "Zaposleni je dužan da obezbedi da prostor u kome obavlja poslove ispunjava "
        "propisane uslove u pogledu bezbednosti i zdravlja na radu.",
    )
    spacer(doc)

    heading(doc, "Član 3. Radno vreme")
    para(
        doc,
        "Radno vreme zaposlenog raspoređuje se u okviru pune, odnosno ugovorene "
        "nedeljne norme, u periodu od ________ časova do ________ časova.",
    )
    para(
        doc,
        "Zaposleni ostvaruje pravo na odmor u toku dnevnog rada, dnevni i nedeljni "
        "odmor u skladu sa zakonom i opštim aktom poslodavca.",
    )
    spacer(doc)

    heading(doc, "Član 4. Sredstva za rad")
    para(doc, "Za obavljanje poslova od kuće koriste se sledeća sredstva za rad:")
    bullet(doc, "računar sa pripadajućom opremom,")
    bullet(doc, "sredstva komunikacije (telefon, pristup internetu),")
    bullet(doc, "kancelarijski nameštaj (radni sto i radna stolica),")
    bullet(doc, "ostalo: ______________________________________________.")
    para(
        doc,
        "Ugovorne strane utvrđuju da sredstva za rad obezbeđuje (zaokružiti): "
        "poslodavac / zaposleni. Poslodavac je dužan da obezbedi ispravnost "
        "sredstava koja sam ustupa zaposlenom.",
    )
    spacer(doc)

    heading(doc, "Član 5. Obaveze u vezi sa bezbednošću i zdravljem na radu")
    para(doc, "Poslodavac se obavezuje da:")
    bullet(doc, "izvrši procenu rizika radnog mesta pri radu od kuće,")
    bullet(doc, "osposobi zaposlenog za bezbedan i zdrav rad,")
    bullet(doc, "obezbedi zaposlenom pisano uputstvo za bezbedan i zdrav rad od kuće,")
    bullet(doc, "prati sprovođenje mera bezbednosti i zdravlja na radu.")
    para(doc, "Zaposleni se obavezuje da:")
    bullet(doc, "primenjuje propisane mere bezbednosti i zdravlja na radu,")
    bullet(doc, "namenski i pravilno koristi sredstva za rad,")
    bullet(doc, "održava radni prostor urednim i bezbednim,")
    bullet(
        doc,
        "bez odlaganja obavesti poslodavca o svakoj povredi na radu, kvaru ili "
        "nepravilnosti koja može ugroziti bezbednost i zdravlje.",
    )
    spacer(doc)

    heading(doc, "Član 6. Troškovi")
    para(
        doc,
        "Naknadu troškova nastalih radom od kuće (utrošak električne energije i "
        "drugi troškovi) ugovorne strane utvrđuju u mesečnom iznosu od "
        "____________ dinara, odnosno na način bliže određen opštim aktom poslodavca.",
    )
    spacer(doc)

    heading(doc, "Član 7. Trajanje")
    para(
        doc,
        "Ovaj aneks zaključuje se na (zaokružiti): određeno vreme do ______________ / "
        "neodređeno vreme, i primenjuje se počev od ______________.",
    )
    para(
        doc,
        "Ostale odredbe osnovnog ugovora o radu koje nisu izmenjene ovim aneksom "
        "ostaju na snazi neizmenjene.",
    )
    spacer(doc)

    heading(doc, "Član 8. Završne odredbe")
    para(
        doc,
        "Ovaj aneks sačinjen je u dva istovetna primerka, po jedan za svaku "
        "ugovornu stranu, i stupa na snagu danom potpisivanja obe ugovorne strane.",
    )
    para(
        doc,
        "Na sve što nije uređeno ovim aneksom primenjuju se odredbe Zakona o radu, "
        "Zakona o bezbednosti i zdravlju na radu i opštih akata poslodavca.",
    )
    spacer(doc)
    para(doc, "Mesto i datum: ______________________, ______________")
    signatures(doc, left="Zaposleni", right="Poslodavac")
    return doc


def _kontrolna_lista(company):
    doc = new_doc()
    title(doc, "KONTROLNA LISTA")
    subtitle(doc, "za procenu uslova radnog mesta pri radu od kuće")
    spacer(doc)
    company_header(doc, company)
    spacer(doc)
    _employee_block(doc)
    para(doc, "Adresa mesta rada: ______________________________________________")
    para(doc, "Datum pregleda: ______________")
    spacer(doc)

    heading(doc, "Uslovi radnog mesta")
    para(
        doc,
        "Za svaku stavku označiti odgovarajuću ocenu i po potrebi upisati napomenu.",
    )
    spacer(doc)

    items = [
        ("Osvetljenje", "Prostor ima dovoljno prirodnog i veštačkog osvetljenja, bez odsjaja na ekranu."),
        ("Električne instalacije", "Utičnice, kablovi i produžni kablovi ispravni su i bez vidljivih oštećenja."),
        ("Radni sto", "Radni sto je stabilan, dovoljne površine i visine za bezbedan rad."),
        ("Radna stolica", "Stolica je stabilna, sa mogućnošću podešavanja visine i naslona."),
        ("Položaj ekrana", "Gornja ivica ekrana u visini očiju, ekran na odgovarajućem rastojanju."),
        ("Provetravanje", "Prostor se redovno provetrava i ima odgovarajuću temperaturu."),
        ("Protivpožarna bezbednost", "Prostor je bez zapaljivog materijala uz izvore toplote, obezbeđen izlaz."),
        ("Prostor za kretanje", "Oko radnog mesta obezbeđen slobodan i nezakrčen prostor za kretanje."),
        ("Prva pomoć", "Dostupna sredstva prve pomoći i poznati kontakti hitnih službi."),
    ]

    tbl = doc.add_table(rows=1, cols=4)
    tbl.style = "Table Grid"
    hdr = tbl.rows[0].cells
    hdr[0].text = "Stavka"
    hdr[1].text = "Opis"
    hdr[2].text = "Da / Ne"
    hdr[3].text = "Napomena"
    for naziv, opis in items:
        row = tbl.add_row().cells
        row[0].text = naziv
        row[1].text = opis
        row[2].text = "Da / Ne"
        row[3].text = ""

    spacer(doc)
    heading(doc, "Zaključak")
    para(
        doc,
        "Na osnovu utvrđenog stanja, uslovi za bezbedan i zdrav rad od kuće su "
        "(zaokružiti): ispunjeni / nisu ispunjeni.",
    )
    para(doc, "Predložene mere: ______________________________________________")
    para(doc, "______________________________________________________________")
    spacer(doc)
    signatures(doc, left="Zaposleni", right="Lice za bezbednost i zdravlje na radu")
    return doc


def _izjava(company):
    doc = new_doc()
    title(doc, "IZJAVA ZAPOSLENOG")
    subtitle(doc, "o ispunjenosti uslova za bezbedan i zdrav rad od kuće")
    spacer(doc)
    company_header(doc, company)
    spacer(doc)
    para(doc, "Ja, dole potpisani zaposleni:")
    _employee_block(doc)
    spacer(doc)
    para(doc, "pod punom materijalnom i krivičnom odgovornošću izjavljujem sledeće:")
    spacer(doc)

    numbered(
        doc,
        "Prostor u kome obavljam poslove od kuće ispunjava uslove u pogledu "
        "osvetljenja, provetravanja, električne i protivpožarne bezbednosti.",
    )
    numbered(
        doc,
        "Radni sto, radna stolica i oprema omogućavaju pravilan i bezbedan "
        "položaj tela tokom rada.",
    )
    numbered(
        doc,
        "Osposobljen sam za bezbedan i zdrav rad i upoznat sam sa rizicima "
        "vezanim za rad od kuće.",
    )
    numbered(
        doc,
        "Primio sam pisano uputstvo za bezbedan i zdrav rad od kuće i razumeo "
        "njegovu sadržinu.",
    )
    numbered(
        doc,
        "Obavezujem se da ću primenjivati sve propisane mere bezbednosti i "
        "zdravlja na radu i uputstva poslodavca.",
    )
    numbered(
        doc,
        "Obavezujem se da ću bez odlaganja obavestiti poslodavca o svakoj "
        "povredi na radu, kvaru sredstava za rad ili promeni uslova rada.",
    )
    spacer(doc)
    para(
        doc,
        "Ovu izjavu dajem slobodno i svojom voljom, za potrebe evidencije "
        "poslodavca u oblasti bezbednosti i zdravlja na radu.",
    )
    spacer(doc)
    para(doc, "Mesto i datum: ______________________, ______________")
    signatures(doc, left="Zaposleni", right="Poslodavac")
    return doc


def _test(company):
    doc = new_doc()
    title(doc, "TEST PROVERE OSPOSOBLJENOSTI")
    subtitle(doc, "za bezbedan i zdrav rad pri radu od kuće")
    spacer(doc)
    company_header(doc, company)
    spacer(doc)
    _employee_block(doc)
    para(doc, "Datum provere: ______________")
    spacer(doc)
    para(
        doc,
        "Uputstvo: na svako pitanje upisati odgovor na predviđenu liniju. "
        "Za tačan odgovor dodeljuje se jedan bod.",
    )
    spacer(doc)

    questions = [
        "Na kojoj visini treba da se nalazi gornja ivica ekrana u odnosu na oči "
        "radi pravilnog položaja tela?",
        "Koje osobine treba da ima radna stolica da bi obezbedila pravilno "
        "sedenje tokom rada?",
        "Zbog čega je važno redovno pravljenje pauza i kretanje tokom rada za "
        "računarom?",
        "Kako treba da bude postavljeno osvetljenje da bi se izbegao odsjaj na "
        "ekranu?",
        "Šta treba proveriti na električnim kablovima i utičnicama pre početka "
        "rada?",
        "Zašto se ne preporučuje preopterećivanje produžnih kablova većim brojem "
        "uređaja?",
        "Koje mere protivpožarne zaštite treba primeniti u prostoru za rad od "
        "kuće?",
        "Kako postupiti u slučaju lakše povrede na radu tokom rada od kuće?",
        "Koga i u kom roku je zaposleni dužan da obavesti o povredi na radu?",
        "Navedite osnovne obaveze zaposlenog u vezi sa bezbednim i zdravim radom "
        "od kuće.",
    ]
    for q in questions:
        numbered(doc, q)
        para(doc, "Odgovor: ______________________________________________________")
        para(doc, "______________________________________________________________")

    spacer(doc)
    heading(doc, "Rezultat provere")
    para(doc, "Broj tačnih odgovora: ________ od ukupno 10.")
    para(doc, "Ocena osposobljenosti (zaokružiti): zadovoljava / ne zadovoljava.")
    para(doc, "Napomena: ______________________________________________________")
    spacer(doc)
    signatures(doc, left="Zaposleni", right="Lice za bezbednost i zdravlje na radu")
    return doc


def _uputstvo(company):
    doc = new_doc()
    title(doc, "UPUTSTVO ZA BEZBEDAN I ZDRAV RAD OD KUĆE")
    subtitle(doc, "Zakon o bezbednosti i zdravlju na radu (Sl. glasnik RS, br. 35/2023)")
    spacer(doc)
    company_header(doc, company)
    spacer(doc)
    para(doc, "Namenjeno zaposlenom:")
    _employee_block(doc)
    spacer(doc)
    para(
        doc,
        "Ovo uputstvo utvrđuje pravila i mere za bezbedan i zdrav rad zaposlenog "
        "koji poslove obavlja van prostorija poslodavca (rad od kuće).",
    )
    spacer(doc)

    heading(doc, "1. Radni prostor")
    bullet(doc, "Za rad odrediti stalno i namenski uređeno mesto u stanu ili kući.")
    bullet(doc, "Obezbediti dovoljno prirodnog i veštačkog osvetljenja bez odsjaja.")
    bullet(doc, "Prostor redovno provetravati i održavati odgovarajuću temperaturu.")
    bullet(doc, "Oko radnog mesta obezbediti slobodan i nezakrčen prostor za kretanje.")
    spacer(doc)

    heading(doc, "2. Ergonomija")
    bullet(doc, "Radni sto treba da bude stabilan i dovoljne površine za opremu.")
    bullet(doc, "Radna stolica sa podesivom visinom i osloncem za leđa.")
    bullet(doc, "Gornja ivica ekrana u visini očiju, na rastojanju oko 50 do 70 cm.")
    bullet(doc, "Podlaktice i ručni zglobovi oslonjeni, ramena opuštena.")
    bullet(doc, "Praviti kratke pauze i menjati položaj tela na svakih 45 do 60 minuta.")
    spacer(doc)

    heading(doc, "3. Električna bezbednost")
    bullet(doc, "Pre rada proveriti ispravnost kablova, utičnica i napajanja.")
    bullet(doc, "Ne koristiti oštećene kablove i ne preopterećivati produžne kablove.")
    bullet(doc, "Uređaje isključivati iz napajanja nakon završetka rada.")
    bullet(doc, "Popravke električne opreme prepustiti isključivo stručnom licu.")
    spacer(doc)

    heading(doc, "4. Protivpožarna bezbednost")
    bullet(doc, "Ne držati zapaljive materijale u blizini izvora toplote i uređaja.")
    bullet(doc, "Obezbediti slobodan i prohodan put za izlazak iz prostorije.")
    bullet(doc, "Poznavati lokaciju i način upotrebe sredstava za gašenje požara.")
    bullet(doc, "U slučaju požara koji se ne može bezbedno ugasiti, pozvati vatrogasce.")
    spacer(doc)

    heading(doc, "5. Postupanje pri povredi")
    bullet(doc, "Kod lakše povrede primeniti mere prve pomoći dostupnim sredstvima.")
    bullet(doc, "Kod teže povrede pozvati hitnu pomoć na broj 194, odnosno 112.")
    bullet(doc, "Svaku povredu na radu bez odlaganja prijaviti poslodavcu.")
    bullet(doc, "Sačuvati podatke o okolnostima nastanka povrede radi evidencije.")
    spacer(doc)

    heading(doc, "6. Obaveze zaposlenog")
    bullet(doc, "Primenjivati propisane mere bezbednosti i zdravlja na radu.")
    bullet(doc, "Namenski i pravilno koristiti sredstva i opremu za rad.")
    bullet(doc, "Održavati radni prostor urednim, čistim i bezbednim.")
    bullet(doc, "Ne obavljati poslove pod uticajem alkohola ili drugih sredstava.")
    bullet(doc, "Obaveštavati poslodavca o nedostacima koji ugrožavaju bezbednost.")
    spacer(doc)

    para(
        doc,
        "Zaposleni potpisom potvrđuje da je primio ovo uputstvo, da ga je razumeo "
        "i da će ga primenjivati u radu.",
    )
    spacer(doc)
    para(doc, "Mesto i datum: ______________________, ______________")
    signatures(doc, left="Zaposleni", right="Lice za bezbednost i zdravlje na radu")
    return doc


def generate_rad_od_kuce(company, kind) -> bytes:
    builders = {
        "aneks": _aneks,
        "kontrolna_lista": _kontrolna_lista,
        "izjava": _izjava,
        "test": _test,
        "uputstvo": _uputstvo,
    }
    builder = builders.get(kind, _uputstvo)
    doc = builder(company)
    return finalize(doc)
