"""
Enhanced Django management command to load data from Excel files.

Supports:
1. Simple format: Separate sheets (Companies, Directors, etc.)
2. Consolidated format: "Dir Consol" sheet with multi-year data

Usage:
    python manage.py load_excel_data path/to/file.xlsx
    python manage.py load_excel_data path/to/file.xlsx --sheet "Dir Consol"
    python manage.py load_excel_data path/to/file.xlsx --sheet Companies
    python manage.py load_excel_data path/to/file.xlsx --verbosity 2
"""

import os
import sys
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import pandas as pd
from datetime import datetime
import re

from api.models import (
    Company, Director, DirectorRemuneration,
    CompanyFinancialTimeSeries, PeerComparison
)


class ExcelDataLoader:
    """Handles loading data from Excel with flexible column mapping."""
    
    def __init__(self, filepath, verbosity=1):
        self.filepath = filepath
        self.verbosity = verbosity
        self.stats = {}
        
    def log(self, level, message):
        """Print log messages based on verbosity level."""
        verbosity_levels = {0: [0], 1: [0, 1], 2: [0, 1, 2], 3: [0, 1, 2]}
        if level in verbosity_levels.get(self.verbosity, []):
            print(f"{'  ' * level}→ {message}")
    
    def normalize_column_name(self, col_name):
        """Normalize column names for matching."""
        if not isinstance(col_name, str):
            return str(col_name).lower().strip()
        return col_name.lower().strip().replace(' ', '_').replace('-', '_').replace('/', '_')
    
    def find_column(self, df, patterns):
        """Find a column by matching patterns (case-insensitive)."""
        if isinstance(patterns, str):
            patterns = [patterns]
        
        normalized_columns = {self.normalize_column_name(col): col for col in df.columns}
        
        for pattern in patterns:
            normalized_pattern = self.normalize_column_name(pattern)
            if normalized_pattern in normalized_columns:
                return normalized_columns[normalized_pattern]
        
        return None
    
    def safe_convert(self, value, target_type):
        """Safely convert value to target type."""
        if pd.isna(value) or value == '' or value is None:
            return None
        
        try:
            if target_type == 'int':
                return int(float(value))
            elif target_type == 'float':
                return float(value)
            elif target_type == 'date':
                if isinstance(value, str):
                    return pd.to_datetime(value).date()
                return value.date() if hasattr(value, 'date') else value
            elif target_type == 'string':
                return str(value).strip() if value else None
            return value
        except (ValueError, TypeError, AttributeError) as e:
            return None
    
    def load_dir_consol_sheet(self, df):
        """Load data from consolidated 'Dir Consol' sheet with multi-year data."""
        self.log(1, "Loading consolidated Dir Consol sheet...")
        
        # Find key columns
        company_name_col = self.find_column(df, ['company name'])
        bse_code_col = self.find_column(df, ['bse scrip code'])
        director_name_col = self.find_column(df, ['director name'])
        din_col = self.find_column(df, ['din'])
        designation_col = self.find_column(df, ['designation'])
        category_col = self.find_column(df, ['director category'])
        qualification_col = self.find_column(df, ['qualification'])
        dob_col = self.find_column(df, ['dob'])
        promoter_col = self.find_column(df, ['promoter/non-promoter'])
        appointment_col = self.find_column(df, ['appointment date'])
        gender_col = self.find_column(df, ['gender'])
        role_col = self.find_column(df, ['role'])
        sector_col = self.find_column(df, ['sector'])
        industry_col = self.find_column(df, ['industry'])
        index_col = self.find_column(df, ['index'])
        employees_col = self.find_column(df, ['no of employees'])
        
        # Verify required columns
        if not all([company_name_col, bse_code_col, director_name_col, din_col]):
            raise CommandError("Dir Consol sheet missing required columns: Company Name, BSE Scrip Code, Director Name, DIN")
        
        companies_created = 0
        directors_created = 0
        remuneration_created = 0
        financial_created = 0
        peer_created = 0
        skipped = 0
        
        for idx, row in df.iterrows():
            try:
                company_name = self.safe_convert(row.get(company_name_col), 'string')
                bse_code = str(self.safe_convert(row.get(bse_code_col), 'int')) if bse_code_col else None
                director_name = self.safe_convert(row.get(director_name_col), 'string')
                din = str(self.safe_convert(row.get(din_col), 'int')) if din_col else None
                
                if not all([company_name, bse_code, director_name, din]):
                    if idx < 3:  # Log first few rows
                        self.log(2, f"Row {idx}: Missing fields - Name:{company_name}, Code:{bse_code}, Dir:{director_name}, DIN:{din}")
                    skipped += 1
                    continue
                
                # Create/get Company
                try:
                    company, company_created = Company.objects.get_or_create(
                        company_id=bse_code,
                        defaults={
                            'name': company_name,
                            'sector': self.safe_convert(row.get(sector_col), 'string'),
                            'industry': self.safe_convert(row.get(industry_col), 'string'),
                            'index': self.safe_convert(row.get(index_col), 'string'),
                            'employees': self.safe_convert(row.get(employees_col), 'int'),
                        }
                    )
                    if company_created:
                        companies_created += 1
                        if idx < 3:
                            self.log(2, f"Row {idx}: Created company {bse_code}")
                except Exception as e:
                    if idx < 3:
                        self.log(2, f"Row {idx}: Company error - {str(e)[:100]}")
                    skipped += 1
                    continue
                
                # Create/get Director
                try:
                    director, director_created = Director.objects.get_or_create(
                        director_id=din,
                        company=company,
                        defaults={
                            'name': director_name,
                            'designation': self.safe_convert(row.get(designation_col), 'string'),
                            'category': self.safe_convert(row.get(category_col), 'string'),
                            'qualification': self.safe_convert(row.get(qualification_col), 'string'),
                            'dob': self.safe_convert(row.get(dob_col), 'date'),
                            'promoter_status': self.safe_convert(row.get(promoter_col), 'string'),
                            'appointment_date': self.safe_convert(row.get(appointment_col), 'date'),
                            'gender': self.safe_convert(row.get(gender_col), 'string'),
                        }
                    )
                    if director_created:
                        directors_created += 1
                        if idx < 3:
                            self.log(2, f"Row {idx}: Created director {din}")
                except Exception as e:
                    if idx < 3:
                        self.log(2, f"Row {idx}: Director error - {str(e)[:100]}")
                    skipped += 1
                    continue
                
                # Process multi-year data (Years 1-5)
                for year_num in range(1, 6):
                    year_label = f"Year {year_num}"
                    
                    # Find year date column
                    year_col = self.find_column(df, [year_label])
                    if not year_col or pd.isna(row.get(year_col)):
                        continue
                    
                    fy_date = self.safe_convert(row.get(year_col), 'date')
                    if not fy_date:
                        continue
                    
                    fy_label = f"FY{fy_date.year}"
                    
                    # Director Remuneration
                    remun_data = {
                        'basic_salary': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Basic Salary'])), 'float'),
                        'pf': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} PF/Retirement'])), 'float'),
                        'perqs': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Perquisites/Allowances'])), 'float'),
                        'bonus': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Bonus / Commission'])), 'float'),
                        'pay_excl_esops': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Pay (Excl ESOPS)'])), 'float'),
                        'esops': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} ESOPS'])), 'float'),
                        'total_remuneration': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Total Remuneration'])), 'float'),
                        'options_granted': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Options Granted'])), 'float'),
                        'discount': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Discount'])), 'float'),
                        'fair_value': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Fair Value'])), 'float'),
                        'aggregate_value': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Aggregate Value'])), 'float'),
                        'remuneration_status': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Remuneration Status'])), 'string'),
                        'comments': self.safe_convert(
                            row.get(self.find_column(df, [f'{year_label} Comments'])), 'string'),
                    }
                    
                    remun, remun_created = DirectorRemuneration.objects.get_or_create(
                        company=company,
                        director=director,
                        fy_end_date=fy_date,
                        defaults={
                            'fy_label': fy_label,
                            **remun_data
                        }
                    )
                    if remun_created:
                        remuneration_created += 1
                    
                    # Company Financial Data
                    total_income_col = self.find_column(df, [f'{year_label} Total Income'])
                    if total_income_col and not pd.isna(row.get(total_income_col)):
                        financial_data = {
                            'total_income': self.safe_convert(row.get(total_income_col), 'float'),
                            'pat': self.safe_convert(
                                row.get(self.find_column(df, [f'{year_label} PAT'])), 'float'),
                            'roa': self.safe_convert(
                                row.get(self.find_column(df, [f'{year_label} ROA'])), 'float'),
                            'employee_cost': self.safe_convert(
                                row.get(self.find_column(df, [f'{year_label} Employee Cost'])), 'float'),
                            'mcap': self.safe_convert(
                                row.get(self.find_column(df, [f'{year_label} MCAP'])), 'float'),
                        }
                        
                        financial, fin_created = CompanyFinancialTimeSeries.objects.get_or_create(
                            company=company,
                            fy_end_date=fy_date,
                            defaults={
                                'fy_label': fy_label,
                                **financial_data
                            }
                        )
                        if fin_created:
                            financial_created += 1
                
                # Peer Comparisons
                for peer_num in range(1, 6):
                    peer_comp_col = self.find_column(df, [f'Peer {peer_num} Comp'])
                    if not peer_comp_col or pd.isna(row.get(peer_comp_col)):
                        continue
                    
                    peer_company_id = str(self.safe_convert(row.get(peer_comp_col), 'int')) if peer_comp_col else None
                    if not peer_company_id:
                        continue
                    
                    salary_ratio_col = self.find_column(df, ['Salary to med emp pay'])
                    
                    try:
                        peer_company = Company.objects.get(company_id=peer_company_id)
                        
                        peer_comp, peer_created_flag = PeerComparison.objects.get_or_create(
                            company=company,
                            peer_company=peer_company,
                            peer_position=peer_num,
                            defaults={
                                'salary_to_median_emp_pay': self.safe_convert(
                                    row.get(salary_ratio_col), 'float') if salary_ratio_col else None
                            }
                        )
                        if peer_created_flag:
                            peer_created += 1
                    except Company.DoesNotExist:
                        pass
                    except Exception:
                        pass
                
            except Exception as e:
                skipped += 1
        
        self.stats['dir_consol'] = {
            'companies': companies_created,
            'directors': directors_created,
            'remuneration': remuneration_created,
            'financial': financial_created,
            'peers': peer_created,
            'skipped': skipped
        }
        
        self.log(1, f"Dir Consol Summary:")
        self.log(1, f"  Companies: {companies_created} created")
        self.log(1, f"  Directors: {directors_created} created")
        self.log(1, f"  Remuneration: {remuneration_created} created")
        self.log(1, f"  Financial: {financial_created} created")
        self.log(1, f"  Peers: {peer_created} created")
        self.log(1, f"  Skipped: {skipped}")
    
    def get_column_mapping(self, df, expected_fields):
        """Create a mapping between Excel columns and model fields."""
        column_mapping = {}
        df_columns_normalized = {
            self.normalize_column_name(col): col 
            for col in df.columns
        }
        
        for field in expected_fields:
            normalized_field = self.normalize_column_name(field)
            if normalized_field in df_columns_normalized:
                column_mapping[field] = df_columns_normalized[normalized_field]
            else:
                self.log(2, f"⚠️  Column '{field}' not found (will use None)")
        
        return column_mapping
    
    def load_companies(self, df):
        """Load company data from DataFrame."""
        self.log(1, "Loading Companies...")
        
        mapping = self.get_column_mapping(df, ['company_id', 'name', 'sector', 'industry', 'index', 'employees'])
        
        if not mapping.get('company_id') or not mapping.get('name'):
            raise CommandError("Companies sheet must have 'company_id' and 'name' columns")
        
        created_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                company_id = self.safe_convert(row.get(mapping['company_id']), 'string')
                name = self.safe_convert(row.get(mapping['name']), 'string')
                
                if not company_id or not name:
                    self.log(2, f"Row {idx}: Skipped (missing company_id or name)")
                    skipped_count += 1
                    continue
                
                company, created = Company.objects.get_or_create(
                    company_id=company_id,
                    defaults={
                        'name': name,
                        'sector': self.safe_convert(row.get(mapping.get('sector')), 'string'),
                        'industry': self.safe_convert(row.get(mapping.get('industry')), 'string'),
                        'index': self.safe_convert(row.get(mapping.get('index')), 'string'),
                        'employees': self.safe_convert(row.get(mapping.get('employees')), 'int'),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                self.log(2, f"Row {idx}: Error - {str(e)[:100]}")
                skipped_count += 1
        
        self.stats['companies'] = {'created': created_count, 'skipped': skipped_count}
        self.log(1, f"Companies: {created_count} created, {skipped_count} skipped")
    
    def load_directors(self, df):
        """Load director data from DataFrame."""
        self.log(1, "Loading Directors...")
        
        mapping = self.get_column_mapping(df, [
            'director_id', 'name', 'company_id', 'designation', 'category',
            'qualification', 'dob', 'appointment_date', 'promoter_status', 'gender'
        ])
        
        if not mapping.get('director_id') or not mapping.get('name') or not mapping.get('company_id'):
            raise CommandError("Directors sheet must have 'director_id', 'name', and 'company_id' columns")
        
        created_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                director_id = self.safe_convert(row.get(mapping['director_id']), 'string')
                name = self.safe_convert(row.get(mapping['name']), 'string')
                company_id = self.safe_convert(row.get(mapping['company_id']), 'string')
                
                if not director_id or not name or not company_id:
                    self.log(2, f"Row {idx}: Skipped (missing required fields)")
                    skipped_count += 1
                    continue
                
                try:
                    company = Company.objects.get(company_id=company_id)
                except Company.DoesNotExist:
                    self.log(2, f"Row {idx}: Company {company_id} not found, skipped")
                    skipped_count += 1
                    continue
                
                director, created = Director.objects.get_or_create(
                    director_id=director_id,
                    company=company,
                    defaults={
                        'name': name,
                        'designation': self.safe_convert(row.get(mapping.get('designation')), 'string'),
                        'category': self.safe_convert(row.get(mapping.get('category')), 'string'),
                        'qualification': self.safe_convert(row.get(mapping.get('qualification')), 'string'),
                        'dob': self.safe_convert(row.get(mapping.get('dob')), 'date'),
                        'appointment_date': self.safe_convert(row.get(mapping.get('appointment_date')), 'date'),
                        'promoter_status': self.safe_convert(row.get(mapping.get('promoter_status')), 'string'),
                        'gender': self.safe_convert(row.get(mapping.get('gender')), 'string'),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                self.log(2, f"Row {idx}: Error - {str(e)[:100]}")
                skipped_count += 1
        
        self.stats['directors'] = {'created': created_count, 'skipped': skipped_count}
        self.log(1, f"Directors: {created_count} created, {skipped_count} skipped")
    
    def load_director_remuneration(self, df):
        """Load director remuneration data from DataFrame."""
        self.log(1, "Loading Director Remuneration...")
        
        mapping = self.get_column_mapping(df, [
            'company_id', 'director_id', 'fy_end_date', 'fy_label',
            'basic_salary', 'pf', 'perqs', 'bonus', 'pay_excl_esops', 'esops',
            'total_remuneration', 'options_granted', 'discount', 'fair_value',
            'aggregate_value', 'remuneration_status', 'comments'
        ])
        
        required = ['company_id', 'director_id', 'fy_end_date', 'fy_label']
        if not all(mapping.get(field) for field in required):
            raise CommandError(f"Director Remuneration sheet must have: {', '.join(required)}")
        
        created_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                company_id = self.safe_convert(row.get(mapping['company_id']), 'string')
                director_id = self.safe_convert(row.get(mapping['director_id']), 'string')
                fy_end_date = self.safe_convert(row.get(mapping['fy_end_date']), 'date')
                fy_label = self.safe_convert(row.get(mapping['fy_label']), 'string')
                
                if not all([company_id, director_id, fy_end_date, fy_label]):
                    self.log(2, f"Row {idx}: Skipped (missing required fields)")
                    skipped_count += 1
                    continue
                
                try:
                    company = Company.objects.get(company_id=company_id)
                    director = Director.objects.get(director_id=director_id, company=company)
                except (Company.DoesNotExist, Director.DoesNotExist):
                    self.log(2, f"Row {idx}: Company or Director not found, skipped")
                    skipped_count += 1
                    continue
                
                remuneration, created = DirectorRemuneration.objects.get_or_create(
                    company=company,
                    director=director,
                    fy_end_date=fy_end_date,
                    defaults={
                        'fy_label': fy_label,
                        'basic_salary': self.safe_convert(row.get(mapping.get('basic_salary')), 'float'),
                        'pf': self.safe_convert(row.get(mapping.get('pf')), 'float'),
                        'perqs': self.safe_convert(row.get(mapping.get('perqs')), 'float'),
                        'bonus': self.safe_convert(row.get(mapping.get('bonus')), 'float'),
                        'pay_excl_esops': self.safe_convert(row.get(mapping.get('pay_excl_esops')), 'float'),
                        'esops': self.safe_convert(row.get(mapping.get('esops')), 'float'),
                        'total_remuneration': self.safe_convert(row.get(mapping.get('total_remuneration')), 'float'),
                        'options_granted': self.safe_convert(row.get(mapping.get('options_granted')), 'float'),
                        'discount': self.safe_convert(row.get(mapping.get('discount')), 'float'),
                        'fair_value': self.safe_convert(row.get(mapping.get('fair_value')), 'float'),
                        'aggregate_value': self.safe_convert(row.get(mapping.get('aggregate_value')), 'float'),
                        'remuneration_status': self.safe_convert(row.get(mapping.get('remuneration_status')), 'string'),
                        'comments': self.safe_convert(row.get(mapping.get('comments')), 'string'),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                self.log(2, f"Row {idx}: Error - {str(e)[:100]}")
                skipped_count += 1
        
        self.stats['director_remuneration'] = {'created': created_count, 'skipped': skipped_count}
        self.log(1, f"Director Remuneration: {created_count} created, {skipped_count} skipped")
    
    def load_financial_data(self, df):
        """Load company financial time series data from DataFrame."""
        self.log(1, "Loading Financial Time Series...")
        
        mapping = self.get_column_mapping(df, [
            'company_id', 'fy_end_date', 'fy_label', 'total_income', 'pat', 'roa',
            'employee_cost', 'mcap', 'employees'
        ])
        
        required = ['company_id', 'fy_end_date', 'fy_label']
        if not all(mapping.get(field) for field in required):
            raise CommandError(f"Financial sheet must have: {', '.join(required)}")
        
        created_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                company_id = self.safe_convert(row.get(mapping['company_id']), 'string')
                fy_end_date = self.safe_convert(row.get(mapping['fy_end_date']), 'date')
                fy_label = self.safe_convert(row.get(mapping['fy_label']), 'string')
                
                if not all([company_id, fy_end_date, fy_label]):
                    self.log(2, f"Row {idx}: Skipped (missing required fields)")
                    skipped_count += 1
                    continue
                
                try:
                    company = Company.objects.get(company_id=company_id)
                except Company.DoesNotExist:
                    self.log(2, f"Row {idx}: Company {company_id} not found, skipped")
                    skipped_count += 1
                    continue
                
                financials, created = CompanyFinancialTimeSeries.objects.get_or_create(
                    company=company,
                    fy_end_date=fy_end_date,
                    defaults={
                        'fy_label': fy_label,
                        'total_income': self.safe_convert(row.get(mapping.get('total_income')), 'float'),
                        'pat': self.safe_convert(row.get(mapping.get('pat')), 'float'),
                        'roa': self.safe_convert(row.get(mapping.get('roa')), 'float'),
                        'employee_cost': self.safe_convert(row.get(mapping.get('employee_cost')), 'float'),
                        'mcap': self.safe_convert(row.get(mapping.get('mcap')), 'float'),
                        'employees': self.safe_convert(row.get(mapping.get('employees')), 'int'),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                self.log(2, f"Row {idx}: Error - {str(e)[:100]}")
                skipped_count += 1
        
        self.stats['financial'] = {'created': created_count, 'skipped': skipped_count}
        self.log(1, f"Financial Time Series: {created_count} created, {skipped_count} skipped")
    
    def load_peer_comparisons(self, df):
        """Load peer comparison data from DataFrame."""
        self.log(1, "Loading Peer Comparisons...")
        
        mapping = self.get_column_mapping(df, [
            'company_id', 'peer_company_id', 'peer_position', 'salary_to_median_emp_pay'
        ])
        
        required = ['company_id', 'peer_company_id', 'peer_position']
        if not all(mapping.get(field) for field in required):
            raise CommandError(f"Peer Comparisons sheet must have: {', '.join(required)}")
        
        created_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                company_id = self.safe_convert(row.get(mapping['company_id']), 'string')
                peer_company_id = self.safe_convert(row.get(mapping['peer_company_id']), 'string')
                peer_position = self.safe_convert(row.get(mapping['peer_position']), 'int')
                
                if not all([company_id, peer_company_id, peer_position]):
                    self.log(2, f"Row {idx}: Skipped (missing required fields)")
                    skipped_count += 1
                    continue
                
                try:
                    company = Company.objects.get(company_id=company_id)
                    peer_company = Company.objects.get(company_id=peer_company_id)
                except Company.DoesNotExist:
                    self.log(2, f"Row {idx}: Company not found, skipped")
                    skipped_count += 1
                    continue
                
                peer_comp, created = PeerComparison.objects.get_or_create(
                    company=company,
                    peer_company=peer_company,
                    peer_position=peer_position,
                    defaults={
                        'salary_to_median_emp_pay': self.safe_convert(
                            row.get(mapping.get('salary_to_median_emp_pay')), 'float'
                        ),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                self.log(2, f"Row {idx}: Error - {str(e)[:100]}")
                skipped_count += 1
        
        self.stats['peer_comparisons'] = {'created': created_count, 'skipped': skipped_count}
        self.log(1, f"Peer Comparisons: {created_count} created, {skipped_count} skipped")
    
    def load_file(self, sheet_name=None):
        """Load data from Excel file."""
        if not os.path.exists(self.filepath):
            raise CommandError(f"File not found: {self.filepath}")
        
        self.log(1, f"Reading: {self.filepath}")
        xls = pd.ExcelFile(self.filepath)
        sheets = xls.sheet_names
        self.log(1, f"Found sheets: {', '.join(sheets)}")
        
        sheets_to_load = [sheet_name] if sheet_name else sheets
        
        for sheet in sheets_to_load:
            if sheet not in sheets:
                self.log(1, f"⚠️  Sheet '{sheet}' not found, skipping")
                continue
            
            df = pd.read_excel(self.filepath, sheet_name=sheet)
            self.log(1, f"\nSheet: '{sheet}' ({len(df)} rows, {len(df.columns)} columns)")
            
            sheet_lower = sheet.lower().strip()
            
            # Check for consolidated Dir Consol sheet first
            if 'dir consol' in sheet_lower or 'dir_consol' in sheet_lower:
                self.load_dir_consol_sheet(df)
            elif 'company' in sheet_lower and 'director' not in sheet_lower:
                self.load_companies(df)
            elif 'director' in sheet_lower and 'remuneration' not in sheet_lower:
                self.load_directors(df)
            elif 'remuneration' in sheet_lower or 'compensation' in sheet_lower:
                self.load_director_remuneration(df)
            elif 'financial' in sheet_lower or 'finance' in sheet_lower:
                self.load_financial_data(df)
            elif 'peer' in sheet_lower:
                self.load_peer_comparisons(df)
            else:
                self.log(1, f"⚠️  Unknown sheet type: '{sheet}', skipping")


class Command(BaseCommand):
    help = "Load data from Excel file into the database with flexible column mapping"

    def add_arguments(self, parser):
        parser.add_argument(
            'filepath',
            type=str,
            nargs='?',
            default='data/data.xlsx',
            help='Path to Excel file (default: data/data.xlsx)'
        )
        parser.add_argument(
            '--sheet',
            type=str,
            help='Specific sheet to load (if not specified, loads all sheets)'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        filepath = options['filepath']
        sheet_name = options.get('sheet')
        verbosity = options.get('verbosity', 1)
        
        try:
            loader = ExcelDataLoader(filepath, verbosity=verbosity)
            loader.load_file(sheet_name=sheet_name)
            
            self.stdout.write(self.style.SUCCESS('\n✅ Data loading completed!'))
            
            for sheet, stats in loader.stats.items():
                if isinstance(stats, dict) and 'created' in stats:
                    created = stats.get('created', 0)
                    skipped = stats.get('skipped', 0)
                    self.stdout.write(f"   {sheet}: {created} created, {skipped} skipped")
                elif sheet == 'dir_consol':
                    self.stdout.write(f"\n   Dir Consol Breakdown:")
                    for key, val in stats.items():
                        self.stdout.write(f"     {key}: {val}")
                
        except CommandError as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            sys.exit(1)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Unexpected error: {str(e)}'))
            import traceback
            traceback.print_exc()
            sys.exit(1)
