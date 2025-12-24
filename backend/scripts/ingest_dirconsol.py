import pandas as pd
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Company, Director, DirectorRemuneration, CompanyFinancialTimeSeries


# ----------------------------
# Utilities
# ----------------------------

def normalize_headers(headers):
    """
    Make duplicate headers unique by suffixing __2, __3, ...
    (Needed because 'Year 1..Year 5' appear twice in your sheet.)
    """
    seen = {}
    out = []
    for h in headers:
        h = str(h).strip()
        if h not in seen:
            seen[h] = 1
            out.append(h)
        else:
            seen[h] += 1
            out.append(f"{h}__{seen[h]}")
    return out


def is_blank(val) -> bool:
    if val is None:
        return True
    if isinstance(val, float) and pd.isna(val):
        return True
    s = str(val).strip()
    return s == "" or s.lower() in {"nan", "none", "null"}


def normalize_company_id(val: str) -> str | None:
    if is_blank(val):
        return None
    # BSE codes sometimes come like "523,395"
    s = str(val).strip().replace(",", "")
    return s if s else None


def parse_money(val):
    """
    Handles commas, blanks, and (123) negatives.
    Returns float or None.
    """
    if is_blank(val):
        return None
    s = str(val).strip().replace(",", "")
    # negatives written like (12345)
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        return float(s)
    except Exception:
        return None


def parse_int(val):
    if is_blank(val):
        return None
    s = str(val).strip().replace(",", "")
    try:
        return int(float(s))
    except Exception:
        return None


def parse_date(val):
    """
    Accepts:
    - pandas Timestamp
    - datetime/date
    - Excel serial numbers (int/float OR numeric strings)
    - strings like 3/31/2012, 2012-03-31, 31-03-2012, 31/03/2012
    Returns datetime or None.
    """
    if is_blank(val):
        return None

    # pandas Timestamp
    if isinstance(val, pd.Timestamp):
        return val.to_pydatetime()

    # python datetime
    if isinstance(val, datetime):
        return val

    # Excel serial number (int/float)
    if isinstance(val, (int, float)):
        try:
            return datetime(1899, 12, 30) + timedelta(days=int(val))
        except Exception:
            return None

    s = str(val).strip()

    # Excel serial number but as string
    if s.replace(".", "", 1).isdigit():
        try:
            return datetime(1899, 12, 30) + timedelta(days=int(float(s)))
        except Exception:
            pass

    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue

    return None


def fy_label_from_date(dt: datetime | None):
    return f"FY{dt.year}" if dt else None


# ----------------------------
# Command
# ----------------------------

class Command(BaseCommand):
    help = "Ingest and normalize 'Dir Consol' Excel sheet into DB."

    def add_arguments(self, parser):
        parser.add_argument("excel_path", type=str, help="Path to Excel file")

    @transaction.atomic
    def handle(self, *args, **options):
        excel_path = options["excel_path"]

        # IMPORTANT: don't force dtype=str; we want timestamps/numerics preserved where possible
        df = pd.read_excel(excel_path, sheet_name="Dir Consol")
        df.columns = normalize_headers(df.columns)

        # For safety: ensure common columns exist
        required_cols = ["Company Name", "BSE Scrip Code", "Director Name"]
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns in 'Dir Consol': {missing}")

        created_rem = 0
        created_fin = 0

        for _, row in df.iterrows():
            # ----------------------------
            # Company
            # ----------------------------
            company_id = normalize_company_id(row.get("BSE Scrip Code")) or normalize_company_id(row.get("Company ID"))
            if not company_id:
                # last resort fallback (not ideal as a primary key)
                company_id = str(row.get("Company Name", "")).strip() or None
            if not company_id:
                continue

            company_defaults = {
                "name": str(row.get("Company Name", "")).strip(),
                "sector": str(row.get("Sector", "")).strip(),
                "industry": str(row.get("Industry", "")).strip(),
                "index": str(row.get("Index", "")).strip(),
            }

            company, _ = Company.objects.update_or_create(
                company_id=company_id,
                defaults=company_defaults,
            )

            # optional: store employees at Company level if your Company model has it
            # company.employees = parse_int(row.get("No of employees"))
            # company.save(update_fields=["employees"])

            # ----------------------------
            # Director
            # ----------------------------
            din = str(row.get("DIN", "")).strip()
            appointment_dt = parse_date(row.get("Appointment Date"))

            director_id = din if din else f"{company_id}__{str(row.get('Director Name','')).strip()}__{appointment_dt or ''}"

            director_defaults = {
                "name": str(row.get("Director Name", "")).strip(),
                "appointment_date": appointment_dt.date() if appointment_dt else None,
                "company": company,
            }

            director, _ = Director.objects.update_or_create(
                director_id=director_id,
                defaults=director_defaults,
            )

            # ----------------------------
            # Year slots (1..5)
            # ----------------------------
            for slot in range(1, 6):
                # 'Year 1' exists twice in your sheet; first occurrence is fine for FY end date
                fy_end = parse_date(row.get(f"Year {slot}"))
                if not fy_end:
                    # fallback to second duplicate if first is blank
                    fy_end = parse_date(row.get(f"Year {slot}__2"))
                if not fy_end:
                    continue

                fy_label = fy_label_from_date(fy_end)
                fy_end_date = fy_end.date()

                # ---- Remuneration mapping (exact headers from your sheet) ----
                rem_defaults = {
                    "fy_label": fy_label,
                    "basic_salary": parse_money(row.get(f"Year {slot} Basic Salary")),
                    "pf": parse_money(row.get(f"Year {slot} PF/Retirement")),
                    "perqs": parse_money(row.get(f"Year {slot} Perquisites/Allowances")),
                    "bonus": parse_money(row.get(f"Year {slot} Bonus / Commission")),
                    "pay_excl_esops": parse_money(row.get(f"Year {slot} Pay (Excl ESOPS)")),
                    "esops": parse_money(row.get(f"Year {slot} ESOPS")),
                    "total_remuneration": parse_money(row.get(f"Year {slot} Total Remuneration")),
                    "options_granted": parse_money(row.get(f"Year {slot} Options Granted")),
                    "discount": parse_money(row.get(f"Year {slot} Discount")),
                    "fair_value": parse_money(row.get(f"Year {slot} Fair Value")),
                    "aggregate_value": parse_money(row.get(f"Year {slot} Aggregate Value")),
                    "comments": row.get(f"Year {slot} Comments"),
                    "remuneration_status": row.get(f"Year {slot} Remuneration Status"),
                }

                _, rem_created = DirectorRemuneration.objects.update_or_create(
                    company=company,
                    director=director,
                    fy_end_date=fy_end_date,
                    defaults=rem_defaults,
                )
                if rem_created:
                    created_rem += 1

                # ---- Financial mapping (exact headers from your sheet) ----
                fin_defaults = {
                    "fy_label": fy_label,
                    "total_income": parse_money(row.get(f"Year {slot} Total Income")),
                    "pat": parse_money(row.get(f"Year {slot} PAT")),
                    "roa": parse_money(row.get(f"Year {slot} ROA")),
                    "employee_cost": parse_money(row.get(f"Year {slot} Employee Cost")),
                    "mcap": parse_money(row.get(f"Year {slot} MCAP")),
                    # Sheet has one employees figure, not per year
                    "employees": parse_int(row.get("No of employees")),
                }

                _, fin_created = CompanyFinancialTimeSeries.objects.update_or_create(
                    company=company,
                    fy_end_date=fy_end_date,
                    defaults=fin_defaults,
                )
                if fin_created:
                    created_fin += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Ingestion complete. New rows: remuneration={created_rem}, financials={created_fin}"
            )
        )
