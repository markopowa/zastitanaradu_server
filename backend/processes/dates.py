from datetime import date

from dateutil.relativedelta import relativedelta


def add_months(d: date, months: int) -> date:
    return d + relativedelta(months=months)
