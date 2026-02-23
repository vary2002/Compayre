"""
Django management command to ingest Excel data into the database.
Usage: python manage.py ingest_excel
"""
import pandas as pd
from datetime import datetime
from pathlib import Path
from django.core.management.base import BaseCommand
from api.models import Company, Director, DirectorRemuneration, CompanyFinancialTimeSeries, PeerComparison


def get_fiscal_year_label(date_obj):
    """Convert date to fiscal year label (e.g., FY2024)"""
    if pd.isna(date_obj):
        return None
    if isinstance(date_obj, str):
        return date_obj
    return f"FY{date_obj.year}"


def parse_date(date_val):
    """Parse date values from Excel"""
    if pd.isna(date_val):
        return None
    if isinstance(date_val, datetime):
        return date_val.date()
    try:
        return pd.to_datetime(date_val).date()
    except:
        return None


def safe_float(value):
    """Safely convert value to float, handling malformed data"""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    
    try:
        return float(value)
    except (ValueError, TypeError):
        # Handle common formatting issues
        if isinstance(value, str):
            # Remove extra decimal points (e.g., "12.88.800" -> "12.88800" -> try different approaches)
            # Count dots to identify the issue
            dot_count = value.count('.')
            if dot_count > 1:
                # Try keeping only the first decimal point
                parts = value.split('.')
                # Join all parts except the first with nothing (remove dots)
                cleaned = parts[0] + '.' + ''.join(parts[1:])
                try:
                    return float(cleaned)
                except (ValueError, TypeError):
                    pass
            
            # Try removing all non-numeric characters except decimal point
            cleaned = ''.join(c for c in value if c.isdigit() or c == '.')
            try:
                return float(cleaned)
            except (ValueError, TypeError):
                pass
        
        return None


class Command(BaseCommand):
    help = 'Ingest data from Excel file into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to Excel file (default: backend/data/data.xlsx)',
            default=None
        )

    def ingest_data(self, excel_path):
        """
        Ingest data from Excel file into database.
        """
        self.stdout.write(f"Reading Excel file from: {excel_path}")
        
        # Read the main data sheet
        df = pd.read_excel(excel_path, sheet_name='Dir Consol_DataPlay')
        self.stdout.write(f"Loaded {len(df)} rows from Excel")
        
        # Get unique companies
        companies_data = df[['BSE Scrip Code', 'Company Name', 'Sector', 'Industry', 'Index', 'No of employees']].drop_duplicates()
        
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("Step 1: Creating Companies..."))
        self.stdout.write(self.style.SUCCESS("="*60))
        
        companies_map = {}
        company_count = 0
        for _, row in companies_data.iterrows():
            company_id = str(row['BSE Scrip Code']).strip()
            if pd.isna(company_id) or company_id == 'nan':
                continue
                
            company_name = row['Company Name'] or 'Unknown'
            sector = row['Sector'] if not pd.isna(row['Sector']) else None
            industry = row['Industry'] if not pd.isna(row['Industry']) else None
            index = row['Index'] if not pd.isna(row['Index']) else None
            employees = int(row['No of employees']) if not pd.isna(row['No of employees']) and row['No of employees'] > 0 else None
            
            company, created = Company.objects.get_or_create(
                company_id=company_id,
                defaults={
                    'name': company_name,
                    'sector': sector,
                    'industry': industry,
                    'index': index,
                    'employees': employees,
                }
            )
            
            if created:
                self.stdout.write(f"✓ Created company: {company_name} ({company_id})")
                company_count += 1
            else:
                self.stdout.write(f"→ Already exists: {company_name} ({company_id})")
                
            companies_map[company_id] = company
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal companies: {len(companies_map)}"))
        
        # Get unique directors
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("Step 2: Creating Directors..."))
        self.stdout.write(self.style.SUCCESS("="*60))
        
        directors_data = df[[
            'DIN', 'Director Name', 'Company Name', 'BSE Scrip Code', 
            'Designation', 'Director Category', 'Qualification', 'DOB', 
            'Promoter/Non-promoter', 'Gender', 'Appointment Date'
        ]].drop_duplicates(subset=['DIN', 'BSE Scrip Code'])
        
        directors_map = {}
        director_count = 0
        for _, row in directors_data.iterrows():
            din = str(row['DIN']).strip()
            if pd.isna(din) or din == 'nan' or len(din) < 8:
                continue
            
            company_id = str(row['BSE Scrip Code']).strip()
            if company_id not in companies_map:
                continue
            
            company = companies_map[company_id]
            name = row['Director Name'] or 'Unknown'
            
            try:
                director, created = Director.objects.get_or_create(
                    director_id=din,
                    company=company,
                    defaults={
                        'name': name,
                        'designation': row['Designation'] if not pd.isna(row['Designation']) else None,
                        'category': row['Director Category'] if not pd.isna(row['Director Category']) else None,
                        'qualification': row['Qualification'] if not pd.isna(row['Qualification']) else None,
                        'dob': parse_date(row['DOB']),
                        'promoter_status': row['Promoter/Non-promoter'] if not pd.isna(row['Promoter/Non-promoter']) else None,
                        'gender': row['Gender'] if not pd.isna(row['Gender']) else None,
                        'appointment_date': parse_date(row['Appointment Date']),
                    }
                )
                
                if created:
                    self.stdout.write(f"✓ Created director: {name} (DIN: {din})")
                    director_count += 1
                else:
                    self.stdout.write(f"→ Already exists: {name} (DIN: {din})")
                    
                directors_map[(din, company_id)] = director
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"✗ Error creating director {name}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal directors: {len(directors_map)}"))
        
        # Create remuneration records
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("Step 3: Creating Director Remuneration Records..."))
        self.stdout.write(self.style.SUCCESS("="*60))
        
        remuneration_count = 0
        
        # Process each year (Year 1 through Year 5)
        for year_num in range(1, 6):
            year_label_col = f'Year {year_num}'
            if year_label_col not in df.columns:
                continue
            
            self.stdout.write(f"\nProcessing {year_label_col}...")
            
            for _, row in df.iterrows():
                din = str(row['DIN']).strip()
                company_id = str(row['BSE Scrip Code']).strip()
                
                if (din, company_id) not in directors_map:
                    continue
                
                # Check if year data exists
                year_end_date_val = row.get(year_label_col)
                if pd.isna(year_end_date_val):
                    continue
                
                director = directors_map[(din, company_id)]
                company = companies_map[company_id]
                
                fy_end_date = parse_date(year_end_date_val)
                if not fy_end_date:
                    continue
                
                fy_label = get_fiscal_year_label(fy_end_date)
                
                # Extract remuneration columns for this year
                basic_salary = row.get(f'Year {year_num} Basic Salary')
                pf = row.get(f'Year {year_num} PF/Retirement')
                perqs = row.get(f'Year {year_num} Perquisites/Allowances')
                bonus = row.get(f'Year {year_num} Bonus / Commission')
                pay_excl_esops = row.get(f'Year {year_num} Pay (Excl ESOPS)')
                esops = row.get(f'Year {year_num} ESOPS')
                total_remuneration = row.get(f'Year {year_num} Total Remuneration')
                options_granted = row.get(f'Year {year_num} Options Granted')
                discount = row.get(f'Year {year_num} Discount')
                fair_value = row.get(f'Year {year_num} Fair Value')
                aggregate_value = row.get(f'Year {year_num} Aggregate Value')
                remuneration_status = row.get(f'Year {year_num} Remuneration Status')
                comments = row.get(f'Year {year_num} Comments')
                
                # Convert NaN to None for float fields using safe conversion
                basic_salary = safe_float(basic_salary)
                pf = safe_float(pf)
                perqs = safe_float(perqs)
                bonus = safe_float(bonus)
                pay_excl_esops = safe_float(pay_excl_esops)
                esops = safe_float(esops)
                total_remuneration = safe_float(total_remuneration)
                options_granted = safe_float(options_granted)
                discount = safe_float(discount)
                fair_value = safe_float(fair_value)
                aggregate_value = safe_float(aggregate_value)
                remuneration_status = None if pd.isna(remuneration_status) else str(remuneration_status)
                comments = None if pd.isna(comments) else str(comments)
                
                try:
                    remun, created = DirectorRemuneration.objects.get_or_create(
                        company=company,
                        director=director,
                        fy_end_date=fy_end_date,
                        defaults={
                            'fy_label': fy_label,
                            'basic_salary': basic_salary,
                            'pf': pf,
                            'perqs': perqs,
                            'bonus': bonus,
                            'pay_excl_esops': pay_excl_esops,
                            'esops': esops,
                            'total_remuneration': total_remuneration,
                            'options_granted': options_granted,
                            'discount': discount,
                            'fair_value': fair_value,
                            'aggregate_value': aggregate_value,
                            'remuneration_status': remuneration_status,
                            'comments': comments,
                        }
                    )
                    if created:
                        remuneration_count += 1
                        if remuneration_count % 100 == 0:
                            self.stdout.write(f"  ✓ Created {remuneration_count} remuneration records...")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"✗ Error creating remuneration for {director} ({fy_label}): {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal remuneration records created: {remuneration_count}"))
        
        # Create financial records
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("Step 4: Creating Company Financial Records..."))
        self.stdout.write(self.style.SUCCESS("="*60))
        
        financial_count = 0
        
        for year_num in range(1, 6):
            year_date_col = f'Year {year_num}.1'
            if year_date_col not in df.columns:
                continue
            
            self.stdout.write(f"\nProcessing financial data for Year {year_num}...")
            
            for _, row in df.iterrows():
                company_id = str(row['BSE Scrip Code']).strip()
                if company_id not in companies_map:
                    continue
                
                company = companies_map[company_id]
                
                # Check if financial data exists for this year
                fy_end_date_val = row.get(year_date_col)
                if pd.isna(fy_end_date_val):
                    continue
                
                fy_end_date = parse_date(fy_end_date_val)
                if not fy_end_date:
                    continue
                
                fy_label = get_fiscal_year_label(fy_end_date)
                
                # Extract financial columns for this year
                total_income = row.get(f'Year {year_num} Total Income')
                pat = row.get(f'Year {year_num} PAT')
                roa = row.get(f'Year {year_num} ROA')
                employee_cost = row.get(f'Year {year_num} Employee Cost')
                mcap = row.get(f'Year {year_num} MCAP')
                
                # Convert NaN to None using safe conversion
                total_income = safe_float(total_income)
                pat = safe_float(pat)
                roa = safe_float(roa)
                employee_cost = safe_float(employee_cost)
                mcap = safe_float(mcap)
                
                try:
                    fin, created = CompanyFinancialTimeSeries.objects.get_or_create(
                        company=company,
                        fy_end_date=fy_end_date,
                        defaults={
                            'fy_label': fy_label,
                            'total_income': total_income,
                            'pat': pat,
                            'roa': roa,
                            'employee_cost': employee_cost,
                            'mcap': mcap,
                        }
                    )
                    if created:
                        financial_count += 1
                        if financial_count % 100 == 0:
                            self.stdout.write(f"  ✓ Created {financial_count} financial records...")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"✗ Error creating financial record for {company} ({fy_label}): {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal financial records created: {financial_count}"))
        
        # Create peer comparisons
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("Step 5: Creating Peer Comparisons..."))
        self.stdout.write(self.style.SUCCESS("="*60))
        
        peer_count = 0
        
        for peer_num in range(1, 6):
            peer_company_col = f'Peer {peer_num} Comp'
            if peer_company_col not in df.columns:
                continue
            
            self.stdout.write(f"\nProcessing {peer_company_col}...")
            
            for _, row in df.iterrows():
                company_id = str(row['BSE Scrip Code']).strip()
                if company_id not in companies_map:
                    continue
                
                company = companies_map[company_id]
                
                peer_company_id = str(row[peer_company_col]).strip()
                if pd.isna(peer_company_id) or peer_company_id == 'nan' or peer_company_id not in companies_map:
                    continue
                
                peer_company = companies_map[peer_company_id]
                if peer_company_id == company_id:  # Skip self-comparisons
                    continue
                
                salary_to_median = row.get('Salary to med emp pay')
                salary_to_median = safe_float(salary_to_median)
                
                try:
                    peer, created = PeerComparison.objects.get_or_create(
                        company=company,
                        peer_company=peer_company,
                        peer_position=peer_num,
                        defaults={
                            'salary_to_median_emp_pay': salary_to_median,
                        }
                    )
                    if created:
                        peer_count += 1
                        self.stdout.write(f"  ✓ Created peer comparison: {company} - Peer {peer_num}: {peer_company}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"✗ Error creating peer comparison: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal peer comparisons created: {peer_count}"))
        
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("✓ Data ingestion completed successfully!"))
        self.stdout.write(self.style.SUCCESS("="*60))

    def handle(self, *args, **options):
        excel_file = options.get('file')
        
        if not excel_file:
            # Default path
            excel_path = Path(__file__).parent.parent.parent.parent / 'data' / 'data.xlsx'
        else:
            excel_path = Path(excel_file)
        
        if not excel_path.exists():
            self.stdout.write(self.style.ERROR(f"Error: Excel file not found at {excel_path}"))
            return
        
        self.ingest_data(str(excel_path))
