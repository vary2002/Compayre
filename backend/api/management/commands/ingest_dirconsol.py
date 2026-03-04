"""
Management command: ingest_dirconsol
Loads the 'Dir Consol' Excel sheet into the new schema:
  Company, Director, DirectorRemuneration, CompanyFinancials

Usage:
  python manage.py ingest_dirconsol
  python manage.py ingest_dirconsol --path "C:/path/to/data.xlsx"
  python manage.py ingest_dirconsol --dry-run     # inspect columns, no DB writes
"""
import os
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta

import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Company, Director, DirectorRemuneration, CompanyFinancials

DEFAULT_EXCEL = r"C:\Project\Compayre\backend\data\data.xlsx"
DEFAULT_SHEET = "Dir Consol"

# ─── helpers ──────────────────────────────────────────────────────────────────

def dedup_cols(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rename duplicate column names in-place.
    The second occurrence of 'Year 1' becomes 'Year 1__2', etc.
    (The sheet has two 'Year N' header columns: one for remuneration FY,
     one for financial FY.)
    """
    cols = pd.Series(df.columns)
    for dup in cols[cols.duplicated()].unique():
        indices = cols[cols == dup].index.tolist()
        for rank, idx in enumerate(indices[1:], start=2):
            cols[idx] = f"{dup}__{rank}"
    df.columns = cols
    return df


def s(val):
    """Return stripped string or None for blank / nan / dash values."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    text = str(val).strip()
    return text if text and text.lower() not in ("nan", "none", "-", "n/a", "na", "") else None


def to_dec(val):
    """Parse numeric / currency string to Decimal; returns None on failure."""
    sv = s(val)
    if sv is None:
        return None
    sv = sv.replace(",", "").strip()
    try:
        return Decimal(sv)
    except (InvalidOperation, ValueError):
        return None


def to_int(val):
    """Parse integer, handling commas."""
    sv = s(val)
    if sv is None:
        return None
    try:
        return int(float(sv.replace(",", "")))
    except (ValueError, TypeError):
        return None


def to_date(val):
    """Parse a date from Excel (serial int, datetime, or string)."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        try:
            return (datetime(1899, 12, 30) + timedelta(days=int(val))).date()
        except Exception:
            return None
    sv = s(val)
    if sv is None:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
                "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(sv, fmt).date()
        except ValueError:
            continue
    try:
        return pd.to_datetime(sv, dayfirst=True).date()
    except Exception:
        return None


def to_bool(val):
    """Parse Key / boolean column."""
    sv = s(val)
    if sv is None:
        return None
    return sv.lower() in ("1", "true", "yes", "y")


def to_fy_label(val):
    """
    Convert an Excel date cell (e.g. '2022-03-31 00:00:00') to a FY label.
    Indian FY: April–March, so year-end date 2022-03-31 → 'FY22'.
    Falls back to the first 10 chars of the raw string if parsing fails.
    """
    d = to_date(val)
    if d:
        return f"FY{d.year % 100:02d}"
    sv = s(val)
    return sv[:10] if sv else None


# ─── command ──────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Ingest 'Dir Consol' Excel sheet into Company / Director / Remuneration / Financials tables."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=DEFAULT_EXCEL,
            help=f"Path to Excel file (default: {DEFAULT_EXCEL})",
        )
        parser.add_argument(
            "--sheet",
            default=DEFAULT_SHEET,
            help=f"Sheet name (default: {DEFAULT_SHEET})",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse the file and print column list; do not write to DB.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        path = options["path"]
        sheet = options["sheet"]
        dry_run = options["dry_run"]

        # ── Load ──────────────────────────────────────────────────────────────
        if not os.path.exists(path):
            raise FileNotFoundError(f"Excel file not found: {path}")

        self.stdout.write(f"Reading:  {path}")
        self.stdout.write(f"Sheet:    {sheet}")

        df = pd.read_excel(path, sheet_name=sheet, dtype=str, header=0)
        df = dedup_cols(df)

        self.stdout.write(f"Rows:     {len(df)}")
        self.stdout.write(f"Columns:  {len(df.columns)}")

        if dry_run:
            self.stdout.write("\n── Columns after dedup ─────────────────────────────────")
            for i, c in enumerate(df.columns):
                self.stdout.write(f"  [{i:3d}] {c}")

            self.stdout.write("\n── FY column samples ────────────────────────────────────")
            for slot in range(1, 6):
                for col in (f"Year {slot}", f"Year {slot}.1"):
                    present = col in df.columns
                    sample = df[col].dropna().head(3).tolist() if present else []
                    mark = "OK" if present else "MISSING"
                    self.stdout.write(f"  [{mark}]  {col!r:22s}  sample={sample}")

            self.stdout.write("\nDry-run complete — no data written.")
            return

        # ── Code generators ───────────────────────────────────────────────────
        existing_co = set(Company.objects.values_list("company_code", flat=True))
        existing_dir = set(Director.objects.values_list("director_code", flat=True))

        def _seq(codes, prefix, width):
            nums = [int(c.split("-")[-1]) for c in codes if c.startswith(prefix)]
            return [max(nums, default=0) + 1]

        co_seq = _seq(existing_co, "iias-c-", 5)
        dir_seq = _seq(existing_dir, "iias-d-", 6)

        def next_co_code():
            code = f"iias-c-{co_seq[0]:05d}"
            while code in existing_co:
                co_seq[0] += 1
                code = f"iias-c-{co_seq[0]:05d}"
            existing_co.add(code)
            co_seq[0] += 1
            return code

        def next_dir_code():
            code = f"iias-d-{dir_seq[0]:06d}"
            while code in existing_dir:
                dir_seq[0] += 1
                code = f"iias-d-{dir_seq[0]:06d}"
            existing_dir.add(code)
            dir_seq[0] += 1
            return code

        # ── Caches ────────────────────────────────────────────────────────────
        company_cache   = {c.company_name: c for c in Company.objects.all()}
        dir_cache_din   = {d.din: d for d in Director.objects.filter(din__isnull=False)}
        dir_cache_name  = {(d.company_id, d.director_name): d for d in Director.objects.all()}
        financials_seen = set()   # (company_id, financial_year) already written this run

        # ── Counters ──────────────────────────────────────────────────────────
        stats = dict(co_new=0, co_upd=0, dir_new=0, dir_upd=0,
                     rem_new=0, rem_upd=0, fin_new=0, fin_upd=0, skipped=0)

        # ── Row loop ──────────────────────────────────────────────────────────
        for idx, row in df.iterrows():
            company_name  = s(row.get("Company Name"))
            director_name = s(row.get("Director Name"))

            if not company_name or not director_name:
                stats["skipped"] += 1
                continue

            # ── Company ───────────────────────────────────────────────────────
            bse = s(row.get("BSE Scrip Code"))

            if company_name in company_cache:
                company = company_cache[company_name]
                changed = False

                if bse and not company.bse_scrip_code:
                    company.bse_scrip_code = bse
                    changed = True
                for attr, col in [("sector", "Sector"), ("industry", "Industry"),
                                   ("index_name", "Index")]:
                    v = s(row.get(col))
                    if v and not getattr(company, attr):
                        setattr(company, attr, v)
                        changed = True
                emp = to_int(row.get("No of employees"))
                if emp is not None and company.no_of_employees is None:
                    company.no_of_employees = emp
                    changed = True
                sal = to_dec(row.get("Salary to med emp pay"))
                if sal is not None and company.salary_to_median_employee_pay is None:
                    company.salary_to_median_employee_pay = sal
                    changed = True
                for i in range(1, 6):
                    pv = s(row.get(f"Peer {i} Comp"))
                    pa = f"peer_{i}_comp"
                    if pv and not getattr(company, pa):
                        setattr(company, pa, pv)
                        changed = True
                if changed:
                    company.save()
                    stats["co_upd"] += 1
            else:
                company = Company(
                    company_code=next_co_code(),
                    company_name=company_name,
                    bse_scrip_code=bse or None,
                    sector=s(row.get("Sector")),
                    industry=s(row.get("Industry")),
                    index_name=s(row.get("Index")),
                    no_of_employees=to_int(row.get("No of employees")),
                    salary_to_median_employee_pay=to_dec(row.get("Salary to med emp pay")),
                    peer_1_comp=s(row.get("Peer 1 Comp")),
                    peer_2_comp=s(row.get("Peer 2 Comp")),
                    peer_3_comp=s(row.get("Peer 3 Comp")),
                    peer_4_comp=s(row.get("Peer 4 Comp")),
                    peer_5_comp=s(row.get("Peer 5 Comp")),
                )
                company.save()
                company_cache[company_name] = company
                stats["co_new"] += 1

            # ── Director ──────────────────────────────────────────────────────
            din = s(row.get("DIN"))

            director = None
            if din and din in dir_cache_din:
                director = dir_cache_din[din]
            elif (company.id, director_name) in dir_cache_name:
                director = dir_cache_name[(company.id, director_name)]

            if director is None:
                director = Director(
                    director_code=next_dir_code(),
                    company=company,
                    director_name=director_name,
                    din=din,
                    designation=s(row.get("Designation")),
                    director_category=s(row.get("Director Category")),
                    qualification=s(row.get("Qualification")),
                    dob=to_date(row.get("DOB")),
                    promoter_status=s(row.get("Promoter/Non-promoter")),
                    role=s(row.get("Role")),
                    appointment_date=to_date(row.get("Appointment Date")),
                    gender=s(row.get("Gender")),
                    key_flag=to_bool(row.get("Key")),
                )
                director.save()
                if din:
                    dir_cache_din[din] = director
                dir_cache_name[(company.id, director_name)] = director
                stats["dir_new"] += 1
            else:
                changed = False
                for attr, col in [
                    ("designation",       "Designation"),
                    ("director_category", "Director Category"),
                    ("qualification",     "Qualification"),
                    ("promoter_status",   "Promoter/Non-promoter"),
                    ("role",              "Role"),
                    ("gender",            "Gender"),
                ]:
                    v = s(row.get(col))
                    if v and not getattr(director, attr):
                        setattr(director, attr, v)
                        changed = True
                kb = to_bool(row.get("Key"))
                if kb is not None and director.key_flag is None:
                    director.key_flag = kb
                    changed = True
                if changed:
                    director.save()
                    stats["dir_upd"] += 1

            # ── Per-year: remuneration + financials ───────────────────────────
            # First  'Year N'    → remuneration FY label
            # Second 'Year N.1'  → financial FY label  (pandas auto dedup rename)
            for slot in range(1, 6):
                fy_rem = to_fy_label(row.get(f"Year {slot}"))
                fy_fin = to_fy_label(row.get(f"Year {slot}.1"))

                # DirectorRemuneration ─────────────────────────────────────────
                if fy_rem:
                    _, created = DirectorRemuneration.objects.update_or_create(
                        director=director,
                        financial_year=fy_rem,
                        defaults=dict(
                            basic_salary=           to_dec(row.get(f"Year {slot} Basic Salary")),
                            pf_retirement=          to_dec(row.get(f"Year {slot} PF/Retirement")),
                            perquisites_allowances= to_dec(row.get(f"Year {slot} Perquisites/Allowances")),
                            bonus_commission=       to_dec(row.get(f"Year {slot} Bonus / Commission")),
                            pay_excl_esops=         to_dec(row.get(f"Year {slot} Pay (Excl ESOPS)")),
                            esops=                  to_dec(row.get(f"Year {slot} ESOPS")),
                            total_remuneration=     to_dec(row.get(f"Year {slot} Total Remuneration")),
                            options_granted=        to_dec(row.get(f"Year {slot} Options Granted")),
                            discount=               to_dec(row.get(f"Year {slot} Discount")),
                            fair_value=             to_dec(row.get(f"Year {slot} Fair Value")),
                            aggregate_value=        to_dec(row.get(f"Year {slot} Aggregate Value")),
                            comments=               s(row.get(f"Year {slot} Comments")),
                            remuneration_status=    s(row.get(f"Year {slot} Remuneration Status")),
                        ),
                    )
                    stats["rem_new" if created else "rem_upd"] += 1

                # CompanyFinancials (once per company+year) ────────────────────
                if fy_fin:
                    fin_key = (company.id, fy_fin)
                    if fin_key not in financials_seen:
                        _, created = CompanyFinancials.objects.update_or_create(
                            company=company,
                            financial_year=fy_fin,
                            defaults=dict(
                                total_income=  to_dec(row.get(f"Year {slot} Total Income")),
                                pat=           to_dec(row.get(f"Year {slot} PAT")),
                                roa=           to_dec(row.get(f"Year {slot} ROA")),
                                employee_cost= to_dec(row.get(f"Year {slot} Employee Cost")),
                                mcap=          to_dec(row.get(f"Year {slot} MCAP")),
                            ),
                        )
                        financials_seen.add(fin_key)
                        stats["fin_new" if created else "fin_upd"] += 1

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(
            "\n── Ingestion complete ─────────────────────────────────"
        ))
        self.stdout.write(f"  Companies  new/updated   {stats['co_new']} / {stats['co_upd']}")
        self.stdout.write(f"  Directors  new/updated   {stats['dir_new']} / {stats['dir_upd']}")
        self.stdout.write(f"  Remun.     new/updated   {stats['rem_new']} / {stats['rem_upd']}")
        self.stdout.write(f"  Financials new/updated   {stats['fin_new']} / {stats['fin_upd']}")
        self.stdout.write(f"  Rows skipped             {stats['skipped']}")
