from .bzr_docx_common import new_doc, title, subtitle, heading, para, bullet, numbered, spacer, company_header, signatures, director_name, finalize


def generate_pravilnik(company) -> bytes:
    doc = new_doc()

    company_header(doc, company)
    spacer(doc)

    title(doc, "PRAVILNIK O BEZBEDNOSTI I ZDRAVLJU NA RADU")
    spacer(doc)

    director = director_name(company)

    para(
        doc,
        "Na osnovu odredaba Zakona o bezbednosti i zdravlju na radu "
        '("Sl. glasnik RS", br. 35/2023) i podzakonskih akata donetih '
        "na osnovu tog zakona, poslodavac " + (company.name or "") + " "
        "(u daljem tekstu: poslodavac), donosi ovaj Pravilnik o bezbednosti "
        "i zdravlju na radu (u daljem tekstu: Pravilnik), kojim se uređuje "
        "sprovođenje i unapređivanje bezbednosti i zdravlja na radu zaposlenih "
        "i drugih lica koja učestvuju u radnom procesu kod poslodavca.",
    )
    spacer(doc)

    heading(doc, "Član 1")
    heading(doc, "Predmet i opšte odredbe")
    para(
        doc,
        "Ovim Pravilnikom uređuju se prava, obaveze i odgovornosti poslodavca "
        "i zaposlenih u oblasti bezbednosti i zdravlja na radu, organizovanje "
        "poslova bezbednosti i zdravlja na radu, mere prevencije rizika, "
        "osposobljavanje zaposlenih, obezbeđivanje sredstava i opreme za ličnu "
        "zaštitu na radu, postupanje u slučaju povrede na radu i u slučaju "
        "opasnosti, kao i vođenje propisanih evidencija.",
    )
    para(
        doc,
        "Cilj Pravilnika je stvaranje bezbednih i zdravih uslova rada, "
        "sprečavanje povreda na radu, profesionalnih oboljenja i oboljenja u "
        "vezi sa radom, kao i otklanjanje ili svođenje na najmanju moguću meru "
        "rizika za bezbednost i zdravlje zaposlenih.",
    )
    para(
        doc,
        "Odredbe ovog Pravilnika primenjuju se na sve zaposlene kod poslodavca, "
        "kao i na sva druga lica koja se po bilo kom osnovu nalaze u radnoj "
        "okolini poslodavca (lica na stručnom osposobljavanju i usavršavanju, "
        "učenici i studenti na praksi, lica koja obavljaju privremene i "
        "povremene poslove, kao i posetioci).",
    )
    spacer(doc)

    heading(doc, "Član 2")
    heading(doc, "Značenje izraza")
    para(doc, "Pojedini izrazi upotrebljeni u ovom Pravilniku imaju sledeće značenje:")
    bullet(
        doc,
        "bezbednost i zdravlje na radu jeste obezbeđivanje takvih uslova rada "
        "kojima se, u najvećoj mogućoj meri, smanjuju povrede na radu, "
        "profesionalna oboljenja i oboljenja u vezi sa radom;",
    )
    bullet(
        doc,
        "radno mesto jeste prostor namenjen za obavljanje poslova kod "
        "poslodavca u kome zaposleni boravi ili ima pristup u toku rada i koji "
        "je pod neposrednom ili posrednom kontrolom poslodavca;",
    )
    bullet(
        doc,
        "radna okolina jeste prostor u kome se obavlja rad i koji uključuje "
        "radna mesta, radne uslove, radne postupke i odnose u procesu rada;",
    )
    bullet(
        doc,
        "prevencija jeste proces koji obuhvata planiranje i primenu mera radi "
        "sprečavanja i smanjivanja rizika po bezbednost i zdravlje zaposlenih;",
    )
    bullet(
        doc,
        "rizik jeste verovatnoća nastanka povrede, oštećenja zdravlja ili "
        "oboljenja zaposlenog usled opasnosti;",
    )
    bullet(
        doc,
        "sredstva i oprema za ličnu zaštitu na radu jesu sredstva koja "
        "zaposleni nosi, drži ili na drugi način koristi radi zaštite od jedne "
        "ili više istovremenih opasnosti i štetnosti po bezbednost i zdravlje "
        "na radu;",
    )
    bullet(
        doc,
        "lice za bezbednost i zdravlje na radu jeste lice koje obavlja poslove "
        "bezbednosti i zdravlja na radu i ima položen odgovarajući stručni ispit "
        "u skladu sa zakonom.",
    )
    spacer(doc)

    heading(doc, "Član 3")
    heading(doc, "Prava, obaveze i odgovornosti poslodavca")
    para(
        doc,
        "Poslodavac je dužan da obezbedi zaposlenom rad na radnom mestu i u "
        "radnoj okolini u kojima su sprovedene mere bezbednosti i zdravlja na "
        "radu, kao i da preduzima mere za sprečavanje i otklanjanje rizika.",
    )
    para(doc, "Poslodavac je naročito dužan da:")
    numbered(
        doc,
        "donese akt o proceni rizika u pisanom obliku za sva radna mesta u "
        "radnoj okolini i utvrdi način i mere za njihovo otklanjanje;",
    )
    numbered(
        doc,
        "obezbedi da radni proces bude prilagođen telesnim i psihičkim "
        "mogućnostima zaposlenog, a radna okolina, sredstva za rad i sredstva "
        "i oprema za ličnu zaštitu na radu uređeni i osposobljeni u skladu sa "
        "propisima;",
    )
    numbered(
        doc,
        "organizuje poslove bezbednosti i zdravlja na radu i odredi lice za "
        "bezbednost i zdravlje na radu;",
    )
    numbered(
        doc,
        "osposobi zaposlene za bezbedan i zdrav rad i obezbedi im pisana "
        "uputstva i obaveštenja o merama bezbednosti;",
    )
    numbered(
        doc,
        "obezbedi zaposlenima korišćenje sredstava i opreme za ličnu zaštitu "
        "na radu bez naknade, kao i njihovo održavanje u ispravnom stanju;",
    )
    numbered(
        doc,
        "uputi zaposlene na prethodne i periodične lekarske preglede u skladu "
        "sa ocenom službe medicine rada, o svom trošku;",
    )
    numbered(
        doc,
        "obezbedi pružanje prve pomoći, kao i evakuaciju i spasavanje u "
        "slučaju opasnosti i utvrdi način postupanja u tim situacijama;",
    )
    numbered(
        doc,
        "vodi propisane evidencije i čuva dokumentaciju u oblasti bezbednosti "
        "i zdravlja na radu.",
    )
    para(
        doc,
        "Poslodavac obaveze u oblasti bezbednosti i zdravlja na radu sprovodi "
        "preko lica za bezbednost i zdravlje na radu, pri čemu obaveze i "
        "odgovornosti poslodavca utvrđene zakonom ne prestaju.",
    )
    spacer(doc)

    heading(doc, "Član 4")
    heading(doc, "Prava, obaveze i odgovornosti zaposlenih")
    para(
        doc,
        "Zaposleni ima pravo i obavezu da se pre početka rada upozna sa merama "
        "bezbednosti i zdravlja na radu na poslovima na koje je raspoređen, kao "
        "i da bude osposobljen za njihovo sprovođenje.",
    )
    para(doc, "Zaposleni je dužan da:")
    numbered(
        doc,
        "primenjuje propisane mere za bezbedan i zdrav rad i namenski koristi "
        "sredstva za rad i opasne materije;",
    )
    numbered(
        doc,
        "namenski koristi sredstva i opremu za ličnu zaštitu na radu, pažljivo "
        "sa njima rukuje i održava ih u ispravnom stanju;",
    )
    numbered(
        doc,
        "pre početka rada pregleda svoje radno mesto i sredstva za rad i o "
        "uočenim nedostacima obavesti poslodavca ili lice za bezbednost i "
        "zdravlje na radu;",
    )
    numbered(
        doc,
        "odmah obavesti poslodavca o svakoj vrsti potencijalne opasnosti koja "
        "bi mogla da utiče na bezbednost i zdravlje na radu;",
    )
    numbered(
        doc,
        "sarađuje sa poslodavcem i licem za bezbednost i zdravlje na radu radi "
        "sprovođenja propisanih mera.",
    )
    para(
        doc,
        "Zaposleni ima pravo da odbije da radi kada mu preti neposredna "
        "opasnost po život i zdravlje zbog toga što nisu sprovedene propisane "
        "mere bezbednosti i zdravlja na radu, kao i u drugim slučajevima "
        "utvrđenim zakonom, sve dok se ne obezbede propisane mere.",
    )
    spacer(doc)

    heading(doc, "Član 5")
    heading(doc, "Organizovanje poslova bezbednosti i zdravlja na radu")
    para(
        doc,
        "Poslodavac organizuje poslove bezbednosti i zdravlja na radu tako što "
        "određuje jedno ili više lica za bezbednost i zdravlje na radu, odnosno "
        "angažuje pravno lice ili preduzetnika sa licencom za obavljanje tih "
        "poslova, u skladu sa zakonom i brojem zaposlenih.",
    )
    para(doc, "Lice za bezbednost i zdravlje na radu obavlja naročito sledeće poslove:")
    bullet(doc, "učestvuje u pripremi akta o proceni rizika;")
    bullet(
        doc,
        "vrši kontrolu i daje savete poslodavcu u planiranju, izboru, "
        "korišćenju i održavanju sredstava za rad, opasnih materija i sredstava "
        "i opreme za ličnu zaštitu na radu;",
    )
    bullet(
        doc,
        "obavlja poslove osposobljavanja zaposlenih za bezbedan i zdrav rad;",
    )
    bullet(
        doc,
        "priprema uputstva za bezbedan rad i kontroliše njihovu primenu;",
    )
    bullet(
        doc,
        "zabranjuje rad na radnom mestu ili upotrebu sredstva za rad u slučaju "
        "neposredne opasnosti po život ili zdravlje zaposlenog;",
    )
    bullet(
        doc,
        "vodi evidencije u oblasti bezbednosti i zdravlja na radu i sarađuje sa "
        "službom medicine rada i nadležnim inspekcijskim organima.",
    )
    para(
        doc,
        "Poslodavac je dužan da licu za bezbednost i zdravlje na radu omogući "
        "nezavisno i samostalno obavljanje poslova, pristup svim potrebnim "
        "podacima i obezbedi potrebno vreme i sredstva za rad.",
    )
    spacer(doc)

    heading(doc, "Član 6")
    heading(doc, "Osposobljavanje zaposlenih za bezbedan i zdrav rad")
    para(
        doc,
        "Poslodavac je dužan da izvrši osposobljavanje zaposlenog za bezbedan "
        "i zdrav rad pri zasnivanju radnog odnosa, odnosno premeštaju na druge "
        "poslove, prilikom uvođenja nove tehnologije ili novih sredstava za "
        "rad, kao i kod promene procesa rada koja može da izazove promenu mera "
        "za bezbedan i zdrav rad.",
    )
    para(
        doc,
        "Osposobljavanje se sprovodi teorijski i praktično, u toku radnog "
        "vremena, o trošku poslodavca, a troškovi osposobljavanja ne mogu biti "
        "na teret zaposlenog.",
    )
    para(
        doc,
        "Poslodavac je dužan da osposobljavanje zaposlenih obnavlja periodično, "
        "a najkasnije u rokovima utvrđenim aktom o proceni rizika, kao i kada "
        "se u procesu rada uvedu nove mere bezbednosti i zdravlja na radu.",
    )
    para(
        doc,
        "O izvršenom osposobljavanju vodi se evidencija koju potpisuju "
        "zaposleni i lice koje je sprovelo osposobljavanje.",
    )
    spacer(doc)

    heading(doc, "Član 7")
    heading(doc, "Lekarski pregledi zaposlenih")
    para(
        doc,
        "Poslodavac je dužan da zaposlenom na radnom mestu sa povećanim rizikom "
        "pre početka rada obezbedi prethodni lekarski pregled, kao i periodični "
        "lekarski pregled u toku rada, u skladu sa aktom o proceni rizika i "
        "ocenom službe medicine rada.",
    )
    para(
        doc,
        "Lekarske preglede obavlja služba medicine rada, a troškove pregleda "
        "snosi poslodavac.",
    )
    para(
        doc,
        "Ako se u postupku lekarskog pregleda utvrdi da zaposleni ne ispunjava "
        "posebne zdravstvene uslove za rad na radnom mestu sa povećanim "
        "rizikom, poslodavac je dužan da ga premesti na drugo odgovarajuće "
        "radno mesto, u skladu sa zakonom.",
    )
    spacer(doc)

    heading(doc, "Član 8")
    heading(doc, "Sredstva i oprema za ličnu zaštitu na radu")
    para(
        doc,
        "Poslodavac je dužan da zaposlenima obezbedi sredstva i opremu za ličnu "
        "zaštitu na radu (LZO) koji su usaglašeni sa propisanim zahtevima, kada "
        "se rizik ne može otkloniti ili u dovoljnoj meri smanjiti drugim "
        "merama bezbednosti i zdravlja na radu.",
    )
    para(
        doc,
        "Vrsta sredstava i opreme za ličnu zaštitu na radu, radna mesta na "
        "kojima se koriste i rokovi njihove upotrebe utvrđuju se aktom o "
        "proceni rizika, u skladu sa opasnostima i štetnostima kojima je "
        "zaposleni izložen.",
    )
    para(
        doc,
        "Sredstva i opremu za ličnu zaštitu na radu poslodavac obezbeđuje bez "
        "naknade, održava ih u ispravnom i funkcionalnom stanju i obezbeđuje "
        "njihovu zamenu u propisanim rokovima ili kada izgube zaštitnu "
        "funkciju.",
    )
    para(
        doc,
        "Zaposleni je dužan da dodeljena sredstva i opremu za ličnu zaštitu na "
        "radu namenski koristi, čuva i vrati poslodavcu po prestanku potrebe "
        "za njihovim korišćenjem.",
    )
    spacer(doc)

    heading(doc, "Član 9")
    heading(doc, "Postupanje u slučaju povrede na radu i u slučaju opasnosti")
    para(
        doc,
        "U slučaju povrede na radu, zaposleni koji je povredu pretrpeo ili "
        "zaposleni koji je povredu uočio dužan je da odmah obavesti "
        "neposrednog rukovodioca, lice za bezbednost i zdravlje na radu i "
        "poslodavca, a povređenom se bez odlaganja pruža prva pomoć i "
        "obezbeđuje odgovarajuća medicinska pomoć.",
    )
    para(
        doc,
        "Poslodavac je dužan da nadležnoj inspekciji rada odmah, a najkasnije u "
        "roku od 24 časa od nastanka, prijavi svaku smrtnu, kolektivnu ili "
        "tešku povredu na radu, kao i opasnu pojavu koja bi mogla da ugrozi "
        "bezbednost i zdravlje zaposlenih.",
    )
    para(
        doc,
        "O povredi na radu poslodavac popunjava i izdaje izveštaj o povredi na "
        "radu u skladu sa propisima.",
    )
    para(
        doc,
        "U slučaju neposredne opasnosti po život i zdravlje, zaposleni ima "
        "pravo da preduzme odgovarajuće mere u skladu sa svojim znanjem i "
        "raspoloživim tehničkim sredstvima i da napusti radno mesto, radni "
        "proces, odnosno radnu okolinu, a poslodavac je dužan da obezbedi "
        "postupanje po planu evakuacije i spasavanja.",
    )
    spacer(doc)

    heading(doc, "Član 10")
    heading(doc, "Vođenje evidencija u oblasti bezbednosti i zdravlja na radu")
    para(
        doc,
        "Poslodavac vodi i čuva propisane evidencije u oblasti bezbednosti i "
        "zdravlja na radu, i to naročito evidencije o:",
    )
    bullet(doc, "radnim mestima sa povećanim rizikom;")
    bullet(
        doc,
        "zaposlenima raspoređenim na radna mesta sa povećanim rizikom i "
        "lekarskim pregledima tih zaposlenih;",
    )
    bullet(doc, "povredama na radu, profesionalnim oboljenjima i oboljenjima u vezi sa radom;")
    bullet(doc, "zaposlenima osposobljenim za bezbedan i zdrav rad;")
    bullet(
        doc,
        "izvršenim pregledima i ispitivanjima opreme za rad i uslova radne "
        "okoline;",
    )
    bullet(doc, "izdatim sredstvima i opremi za ličnu zaštitu na radu;")
    bullet(doc, "opasnim materijama koje se koriste u toku rada.")
    para(
        doc,
        "Evidencije se vode uredno i ažurno, a dokumentacija se čuva u rokovima "
        "propisanim zakonom i podzakonskim aktima.",
    )
    spacer(doc)

    heading(doc, "Član 11")
    heading(doc, "Prelazne i završne odredbe")
    para(
        doc,
        "Na sva pitanja koja nisu uređena ovim Pravilnikom neposredno se "
        "primenjuju odredbe Zakona o bezbednosti i zdravlju na radu i "
        "podzakonskih akata donetih na osnovu tog zakona.",
    )
    para(
        doc,
        "Izmene i dopune ovog Pravilnika vrše se na način i po postupku "
        "predviđenom za njegovo donošenje.",
    )
    para(
        doc,
        "Ovaj Pravilnik stupa na snagu osmog dana od dana objavljivanja, "
        "odnosno isticanja na oglasnoj tabli poslodavca, i primenjuje se na "
        "sve zaposlene kod poslodavca.",
    )
    para(
        doc,
        "Stupanjem na snagu ovog Pravilnika prestaju da važe raniji opšti akti "
        "poslodavca u delu u kome su u suprotnosti sa odredbama ovog "
        "Pravilnika.",
    )
    spacer(doc)

    para(doc, "Direktor: " + (director or ""))
    signatures(doc)

    return finalize(doc)
