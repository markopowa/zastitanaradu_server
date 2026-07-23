KINNEY_BANDS = (
    (20.0, "PRIHVATLJIV", "Prihvatljiv rizik"),
    (70.0, "MOGUCI", "Mogući rizik, potrebna pažnja"),
    (200.0, "ZNACAJAN", "Značajan rizik, potrebne mere"),
    (400.0, "VISOK", "Visok rizik, hitne mere"),
    (float("inf"), "VRLO_VISOK", "Vrlo visok rizik, obustaviti rad"),
)

HIGH_RISK_CATEGORIES = ("VISOK", "VRLO_VISOK")

CATEGORY_LABELS = {code: label for _, code, label in KINNEY_BANDS}


def compute_rizik(verovatnoca, izlozenost, posledica):
    return round(float(verovatnoca) * float(izlozenost) * float(posledica), 2)


def categorize(rizik):
    for threshold, code, label in KINNEY_BANDS:
        if rizik <= threshold:
            return code, label
    return KINNEY_BANDS[-1][1], KINNEY_BANDS[-1][2]


def category_label(code):
    return CATEGORY_LABELS.get(code, "")


def is_high_risk(code):
    return code in HIGH_RISK_CATEGORIES


DEFAULT_SCALE_OPTIONS = {
    "V": [
        (0.1, "Praktično nemoguće"),
        (0.2, "Jedva moguće"),
        (0.5, "Moguće ali malo verovatno"),
        (1.0, "Malo verovatno ali moguće"),
        (3.0, "Neuobičajeno ali moguće"),
        (6.0, "Sasvim moguće"),
        (10.0, "Očekivano, normalno"),
    ],
    "I": [
        (0.5, "Vrlo retko (godišnje)"),
        (1.0, "Retko (mesečno)"),
        (2.0, "Povremeno (nedeljno)"),
        (3.0, "Ponekad"),
        (6.0, "Često (dnevno)"),
        (10.0, "Stalno (kontinuirano)"),
    ],
    "P": [
        (1.0, "Mala (prva pomoć)"),
        (3.0, "Značajna (povreda bez izostanka)"),
        (7.0, "Ozbiljna (povreda sa izostankom)"),
        (15.0, "Vrlo ozbiljna (invaliditet)"),
        (40.0, "Katastrofa (jedan smrtni slučaj)"),
        (100.0, "Katastrofa (više smrtnih slučajeva)"),
    ],
}
