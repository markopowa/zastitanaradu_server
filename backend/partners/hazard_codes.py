HAZARD_GROUPS = (
    (1, range(1, 7),
     "MEHANIČKE OPASNOSTI KOJE SE POJAVLJUJU KORIŠĆENJEM OPREME ZA RAD"),
    (2, range(7, 15),
     "OPASNOSTI KOJE SE POJAVLJUJU U VEZI SA KARAKTERISTIKAMA RADNOG MESTA"),
    (3, range(15, 21),
     "OPASNOSTI KOJE SE POJAVLJUJU KORIŠĆENJEM ELEKTRIČNE ENERGIJE"),
    (4, range(21, 22),
     "OPASNOSTI KOJE POTIČU OD FIZIČKIH I HEMIJSKIH SVOJSTAVA HEMIJSKIH "
     "MATERIJA"),
    (5, range(22, 23),
     "DRUGE OPASNOSTI KOJE SE POJAVLJUJU U RADNOM PROCESU"),
    (6, range(23, 32),
     "ŠTETNOSTI KOJE NASTAJU ILI SE POJAVLJUJU U PROCESU RADA"),
    (7, range(32, 36),
     "ŠTETNOSTI KOJE PROISTIČU IZ PSIHIČKIH I PSIHOFIZIOLOŠKIH NAPORA KOJI "
     "SE UZROČNO VEZUJU ZA RADNO MESTO I POSLOVE KOJE ZAPOSLENI OBAVLJA"),
    (8, range(36, 37), "ŠTETNOSTI VEZANE ZA ORGANIZACIJU RADA"),
    (9, range(37, 41), "OSTALE ŠTETNOSTI KOJE SE POJAVLJUJU NA RADNIM MESTIMA"),
)

OTHER_GROUP = (99, "OSTALE OPASNOSTI I ŠTETNOSTI")

TRAINING_REASONS = {
    "01": "prilikom zasnivanja radnog odnosa, odnosno drugog radnog "
          "angažovanja",
    "02": "usled premeštaja na druge poslove",
    "03": "prilikom uvođenja nove tehnologije ili novih sredstava za rad ili "
          "promene opreme za rad",
    "04": "prilikom promene radnog procesa",
    "05": "ako poslodavac odredi zaposlenom da obavlja poslove na dva ili više "
          "radnih mesta",
    "06": "ako kod poslodavca rad obavljaju zaposleni drugog poslodavca",
    "07": "dodatna obuka kada to zahteva radni proces",
    "08": "dodatna obuka u slučaju teške, smrtne ili kolektivne povrede na radu",
    "09": "periodična obuka zaposlenih",
    "10": "obuka neposrednih rukovodilaca",
}


def hazard_group(official_code):
    try:
        number = int(official_code)
    except (TypeError, ValueError):
        return OTHER_GROUP
    for group_number, codes, title in HAZARD_GROUPS:
        if number in codes:
            return group_number, title
    return OTHER_GROUP
