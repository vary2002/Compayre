"""
Data ingestion script to load Excel data into the database.
Reads from backend/data/data.xlsx and populates all models.
"""
import os
import sys
import django
import pandas as pd
from datetime import datetime
from pathlib import Path

# Add parent directory to path so we can import config
sys.path.insert(0, str(Path(__file__).parent.parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

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


def ingest_data(excel_path):
    """
    Ingest data from Excel file into database.
    """
    print(f"Reading Excel file from: {excel_path}")
    
    # Read the main data sheet
    df = pd.read_excel(excel_path, sheet_name='Dir Consol_DataPlay')
    print(f"Loaded {len(df)} rows from Excel")
    
    # Get unique companies
    companies_data = df[['BSE Scrip Code', 'Company Name', 'Sector', 'Industry', 'Index', 'No of employees']].drop_duplicates()
    
    print(f"\n{'=' * 60}")
    print("Step 1: Creating Companies...")
    print(f"{'=' * 60}")
    
    companies_map = {}
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
            print(f"✓ Created company: {company_name} ({company_id})")
        else:
            print(f"→ Already exists: {company_name} ({company_id})")
            
        companies_map[company_id] = company
    
    print(f"\nTotal companies: {len(companies_map)}")
    
    # Get unique directors
    print(f"\n{'=' * 60}")
    print("Step 2: Creating Directors...")
    print(f"{'=' * 60}")
    
    directors_data = df[[
        'DIN', 'Director Name', 'Company Name', 'BSE Scrip Code', 
        'Designation', 'Director Category', 'Qualification', 'DOB', 
        'Promoter/Non-promoter', 'Gender', 'Appointment Date'
    ]].drop_duplicates(subset=['DIN', 'BSE Scrip Code'])
    
    directors_map = {}
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
                print(f"✓ Created director: {name} (DIN: {din})")
            else:
                print(f"→ Already exists: {name} (DIN: {din})")
                
            directors_map[(din, company_id)] = director
        except Exception as e:
            print(f"✗ Error creating director {name}: {e}")
    
    print(f"\nTotal directors: {len(directors_map)}")
    
    # Create remuneration records
    print(f"\n{'=' * 60}")
    print("Step 3: Creating Director Remuneration Records...")
    print(f"{'=' * 60}")
    
    remuneration_count = 0
    
    # Process each year (Year 1 through Year 5)
    for year_num in range(1, 6):
        year_label_col = f'Year {year_num}'
        if year_label_col not in df.columns:
            continue
        
        print(f"\nProcessing {year_label_col}...")
        
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
            
            # Convert NaN to None for float fields
            basic_salary = None if pd.isna(basic_salary) else float(basic_salary)
            pf = None if pd.isna(pf) else float(pf)
            perqs = None if pd.isna(perqs) else float(perqs)
            bonus = None if pd.isna(bonus) else float(bonus)
            pay_excl_esops = None if pd.isna(pay_excl_esops) else float(pay_excl_esops)
            esops = None if pd.isna(esops) else float(esops)
            total_remuneration = None if pd.isna(total_remuneration) else float(total_remuneration)
            options_granted = None if pd.isna(options_granted) else float(options_granted)
            discount = None if pd.isna(discount) else float(discount)
            fair_value = None if pd.isna(fair_value) else float(fair_value)
            aggregate_value = None if pd.isna(aggregate_value) else float(aggregate_value)
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
                        print(f"  ✓ Created {remuneration_count} remuneration records...")
            except Exception as e:
                print(f"✗ Error creating remuneration for {director} ({fy_label}): {e}")
    
    print(f"\nTotal remuneration records created: {remuneration_count}")
    
    # Create financial records
    print(f"\n{'=' * 60}")
    print("Step 4: Creating Company Financial Records...")
    print(f"{'=' * 60}")
    
    financial_count = 0
    
    for year_num in range(1, 6):
        year_date_col = f'Year {year_num}.1'
        if year_date_col not in df.columns:
            continue
        
        print(f"\nProcessing financial data for Year {year_num}...")
        
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
            
            # Convert NaN to None
            total_income = None if pd.isna(total_income) else float(total_income)
            pat = None if pd.isna(pat) else float(pat)
            roa = None if pd.isna(roa) else float(roa)
            employee_cost = None if pd.isna(employee_cost) else float(employee_cost)
            mcap = None if pd.isna(mcap) else float(mcap)
            
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
                        print(f"  ✓ Created {financial_count} financial records...")
            except Exception as e:
                print(f"✗ Error creating financial record for {company} ({fy_label}): {e}")
    
    print(f"\nTotal financial records created: {financial_count}")
    
    # Create peer comparisons
    print(f"\n{'=' * 60}")
    print("Step 5: Creating Peer Comparisons...")
    print(f"{'=' * 60}")
    
    peer_count = 0
    
    for peer_num in range(1, 6):
        peer_company_col = f'Peer {peer_num} Comp'
        if peer_company_col not in df.columns:
            continue
        
        print(f"\nProcessing {peer_company_col}...")
        
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
            salary_to_median = None if pd.isna(salary_to_median) else float(salary_to_median)
            
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
                    print(f"  ✓ Created peer comparison: {company} - Peer {peer_num}: {peer_company}")
            except Exception as e:
                print(f"✗ Error creating peer comparison: {e}")
    
    print(f"\nTotal peer comparisons created: {peer_count}")
    
    print(f"\n{'=' * 60}")
    print("✓ Data ingestion completed successfully!")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    # Get the path to the Excel file
    # Since we're in backend/scripts/, go up two levels to get to backend/data/
    excel_path = Path(__file__).parent.parent / 'data' / 'data.xlsx'
    
    if not excel_path.exists():
        print(f"Error: Excel file not found at {excel_path}")
        sys.exit(1)
    
    ingest_data(str(excel_path))
