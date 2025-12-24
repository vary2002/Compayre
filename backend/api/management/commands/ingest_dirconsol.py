import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Company, Director, DirectorRemuneration, CompanyFinancialTimeSeries
from datetime import datetime, timedelta

# Utility functions for normalization

def normalize_headers(headers):
    seen = {}
    result = []
    for h in headers:
        if h not in seen:
            seen[h] = 1
            result.append(h)
        else:
            seen[h] += 1
            result.append(f"{h}__{seen[h]}")
    return result

def parse_money(val):
    if pd.isna(val) or val == '':
        return None
    try:
        return float(str(val).replace(',', ''))
    except Exception:
        return None

def parse_date(val):
    if pd.isna(val) or val == '':
        return None
    # Excel serial
    if isinstance(val, (int, float)):
        try:
            return datetime(1899, 12, 30) + timedelta(days=int(val))
        except Exception:
            return None
    # String date (prioritize datetime and date formats)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(val), fmt)
        except Exception:
            continue
    return None

def fy_label_from_date(dt):
    if not dt:
        return None
    return f"FY{dt.year}"

class Command(BaseCommand):
    help = 'Ingest and normalize Dir Consol Excel sheet into DB.'

    def add_arguments(self, parser):
        parser.add_argument('excel_path', type=str, help='Path to Excel file')

    @transaction.atomic
    def handle(self, *args, **options):
        excel_path = options['excel_path']
        df = pd.read_excel(excel_path, sheet_name='Dir Consol', dtype=str)
        df.columns = normalize_headers(df.columns)
        
        for idx, row in df.iterrows():
            if idx < 5:
                print(f"Row {idx} - Company: {row.get('Company Name')}, Director: {row.get('Director Name')}")
            # --- Company ---
            # --- Company ---
            company_id = row.get('BSE Scrip Code') or row.get('Company ID') or row.get('Company Name')
            if not company_id:
                continue
            company, _ = Company.objects.get_or_create(
                company_id=company_id,
                defaults={
                    'name': row.get('Company Name', ''),
                    'sector': row.get('Sector', ''),
                    'industry': row.get('Industry', ''),
                    'index': row.get('Index', ''),
                }
            )
            # --- Director ---
            director_id = row.get('DIN') or f"{company_id}_{row.get('Director Name','')}_{row.get('Appointment Date','')}"
            director, _ = Director.objects.get_or_create(
                director_id=director_id,
                defaults={
                    'name': row.get('Director Name', ''),
                    'appointment_date': parse_date(row.get('Appointment Date', '')),
                    'company': company
                }
            )
            # --- For each year slot (1-5) ---
            for slot in range(1, 6):
                # Remuneration block
                rem_date_val = row.get(f'Year {slot}')
                if idx < 5:
                    print(f"  Slot {slot} Remuneration date raw: {rem_date_val}")
                fy_end = parse_date(rem_date_val)
                if idx < 5:
                    print(f"    Parsed Remuneration date: {fy_end}")
                if fy_end:
                    fy_label = fy_label_from_date(fy_end)
                    DirectorRemuneration.objects.update_or_create(
                        company=company,
                        director=director,
                        fy_end_date=fy_end,
                        defaults={
                            'fy_label': fy_label,
                            'basic_salary': parse_money(row.get(f'Year {slot} Basic Salary', None)),
                            'pf': parse_money(row.get(f'Year {slot} PF/Retirement', None)),
                            'perqs': parse_money(row.get(f'Year {slot} Perquisites/Allowances', None)),
                            'bonus': parse_money(row.get(f'Year {slot} Bonus / Commission', None)),
                            'pay_excl_esops': parse_money(row.get(f'Year {slot} Pay (Excl ESOPS)', None)),
                            'esops': parse_money(row.get(f'Year {slot} ESOPS', None)),
                            'total_remuneration': parse_money(row.get(f'Year {slot} Total Remuneration', None)),
                            'options_granted': parse_money(row.get(f'Year {slot} Options Granted', None)),
                            'remuneration_status': row.get(f'Year {slot} Remuneration Status', None),
                            'comments': row.get(f'Year {slot} Comments', None),
                        }
                    )
                # Financials block (note: year-end date is in Year {slot}.1)
                fin_date_val = row.get(f'Year {slot}.1')
                if idx < 5:
                    print(f"  Slot {slot} Financials date raw: {fin_date_val}")
                fy_end_fin = parse_date(fin_date_val)
                if idx < 5:
                    print(f"    Parsed Financials date: {fy_end_fin}")
                if fy_end_fin:
                    fy_label_fin = fy_label_from_date(fy_end_fin)
                    CompanyFinancialTimeSeries.objects.update_or_create(
                        company=company,
                        fy_end_date=fy_end_fin,
                        defaults={
                            'fy_label': fy_label_fin,
                            'total_income': parse_money(row.get(f'Year {slot} Total Income', None)),
                            'pat': parse_money(row.get(f'Year {slot} PAT', None)),
                            'roa': parse_money(row.get(f'Year {slot} ROA', None)),
                            'employee_cost': parse_money(row.get(f'Year {slot} Employee Cost', None)),
                            'mcap': parse_money(row.get(f'Year {slot} MCAP', None)),
                            'employees': None,  # No of employees is not year-specific in your columns
                        }
                    )
        self.stdout.write(self.style.SUCCESS('Ingestion complete.'))
