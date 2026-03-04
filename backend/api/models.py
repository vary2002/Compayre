"""
Compayre Models - Clean rebuild for fresh PostgreSQL deployment

Models:
- CustomUser: Email-based auth with roles (user, subscriber, admin)
- Company: Company metadata
- Director: Director information
- DirectorRemuneration: Director salary time-series
- CompanyFinancialTimeSeries: Financial metrics time-series
- PeerComparison: Peer company comparisons
- UserActivityLog: User activity tracking
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# ============================================================================
# AUTHENTICATION & USER MANAGEMENT
# ============================================================================

class CustomUser(AbstractUser):
    """
    Custom user with email-based login and role-based access control.
    Three roles: user (free), subscriber (paid), admin (access admin panel).
    Admin users can access admin panel but see same frontend data as non-subscribers.
    """
    
    email = models.EmailField(unique=True, blank=False)

    ROLE_CHOICES = [
        ('user', 'User'),
        ('subscriber', 'Subscriber'),
        ('admin', 'Admin'),
    ]

    SUBSCRIPTION_CHOICES = [
        ('user', 'User'),
        ('subscriber', 'Subscriber'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_CHOICES, default='user')

    phone_number = models.CharField(max_length=20, blank=True, null=True, unique=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_staff']),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    def is_admin(self):
        """Check if user can access admin panel"""
        return self.is_staff or self.is_superuser or self.role == 'admin'

    def is_subscriber(self):
        """Check if user is paid subscriber"""
        return self.role == 'subscriber'


class UserActivityLog(models.Model):
    """Logs user activities for audit tracking."""
    
    ACTIVITY_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('registration', 'Registration'),
        ('password_change', 'Password Change'),
        ('profile_update', 'Profile Update'),
        ('data_access', 'Data Access'),
        ('selection_companies', 'Selection - Companies'),
        ('selection_directors', 'Selection - Directors'),
        ('error', 'Error'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activity_logs')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['activity_type', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.activity_type}"


# ============================================================================
# DATA MODELS - Company, Director, Financial Data
# ============================================================================

class Company(models.Model):
    """
    Company metadata.
    company_code: human-readable unique identifier (e.g. iias-c-00001)
    Peer compensation values are stored inline (peer_1_comp … peer_5_comp).
    """
    id = models.BigAutoField(primary_key=True)
    company_code = models.CharField(max_length=20, unique=True)          # e.g. iias-c-00001
    company_name = models.TextField()
    bse_scrip_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    sector = models.TextField(blank=True, null=True, db_index=True)
    industry = models.TextField(blank=True, null=True, db_index=True)
    index_name = models.TextField(blank=True, null=True)                 # Stock index e.g. Nifty 50
    no_of_employees = models.IntegerField(blank=True, null=True)
    salary_to_median_employee_pay = models.DecimalField(
        max_digits=20, decimal_places=4, blank=True, null=True
    )
    peer_1_comp = models.TextField(blank=True, null=True)
    peer_2_comp = models.TextField(blank=True, null=True)
    peer_3_comp = models.TextField(blank=True, null=True)
    peer_4_comp = models.TextField(blank=True, null=True)
    peer_5_comp = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['company_name']
        indexes = [
            models.Index(fields=['company_code']),
            models.Index(fields=['sector']),
            models.Index(fields=['industry']),
            models.Index(fields=['company_name']),
        ]

    def __str__(self):
        return f"{self.company_name} ({self.company_code})"


class Director(models.Model):
    """
    Director information linked to a company.
    director_code: human-readable unique identifier (e.g. iias-d-000001)
    din: Director Identification Number (unique when provided).
    """
    id = models.BigAutoField(primary_key=True)
    director_code = models.CharField(max_length=25, unique=True)         # e.g. iias-d-000001
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='directors')
    director_name = models.TextField()
    din = models.CharField(max_length=20, unique=True, blank=True, null=True)
    designation = models.TextField(blank=True, null=True)
    director_category = models.TextField(blank=True, null=True)
    qualification = models.TextField(blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    promoter_status = models.TextField(blank=True, null=True)            # Promoter / Non-promoter
    role = models.TextField(blank=True, null=True)
    appointment_date = models.DateField(blank=True, null=True)
    gender = models.TextField(blank=True, null=True)
    key_flag = models.BooleanField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['director_name']
        indexes = [
            models.Index(fields=['director_code']),
            models.Index(fields=['company']),
            models.Index(fields=['director_name']),
            models.Index(fields=['din']),
        ]

    def __str__(self):
        return f"{self.director_name} — {self.company.company_name}"


class DirectorRemuneration(models.Model):
    """
    Director remuneration time-series (one row per director per financial year).
    financial_year stores the FY label, e.g. 'FY22', '2022', etc.
    """
    id = models.BigAutoField(primary_key=True)
    director = models.ForeignKey(Director, on_delete=models.CASCADE, related_name='remunerations')
    financial_year = models.CharField(max_length=10)                     # e.g. FY22, 2022

    basic_salary = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    pf_retirement = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    perquisites_allowances = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    bonus_commission = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    pay_excl_esops = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    esops = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    total_remuneration = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    options_granted = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    discount = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    fair_value = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    aggregate_value = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    comments = models.TextField(blank=True, null=True)
    remuneration_status = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('director', 'financial_year')
        ordering = ['-financial_year']
        indexes = [
            models.Index(fields=['director', 'financial_year']),
        ]

    def __str__(self):
        return f"{self.director.director_name} — {self.financial_year}"


class CompanyFinancials(models.Model):
    """
    Company financial metrics time-series (one row per company per financial year).
    financial_year stores the FY label, e.g. 'FY22', '2022', etc.
    """
    id = models.BigAutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financials')
    financial_year = models.CharField(max_length=10)                     # e.g. FY22, 2022

    total_income = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    pat = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    roa = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    employee_cost = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    mcap = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('company', 'financial_year')
        verbose_name_plural = 'Company Financials'
        ordering = ['-financial_year']
        indexes = [
            models.Index(fields=['company', 'financial_year']),
        ]

    def __str__(self):
        return f"{self.company.company_name} — {self.financial_year}"


# ============================================================================
# PER-YEAR TABLE MODELS
# One physical table per financial year for both remuneration and financials.
# Naming convention:
#   api_director_remuneration_fy{nn}   (e.g. api_director_remuneration_fy16)
#   api_company_financials_fy{nn}      (e.g. api_company_financials_fy16)
#
# To add a new year (e.g. FY17):
#   1. Add DirectorRemunerationFY17 / CompanyFinancialsFY17 classes below
#   2. Add entries to DR_YEAR_MODELS / CF_YEAR_MODELS at the bottom
#   3. Run: python manage.py makemigrations && python manage.py migrate
#   4. Ingest new year's data
#   5. Update DATASET_LATEST_FY in views.py to 'FY17'
# ============================================================================

class DirectorRemunerationBase(models.Model):
    """Abstract base shared by all per-year director remuneration tables."""
    director = models.ForeignKey(
        Director, on_delete=models.CASCADE, related_name='+'
    )
    financial_year = models.CharField(max_length=10)
    basic_salary = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    pf_retirement = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    perquisites_allowances = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    bonus_commission = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    pay_excl_esops = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    esops = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    total_remuneration = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    options_granted = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    discount = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    fair_value = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    aggregate_value = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    comments = models.TextField(blank=True, null=True)
    remuneration_status = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.director.director_name} — {self.financial_year}"


class CompanyFinancialsBase(models.Model):
    """Abstract base shared by all per-year company financials tables."""
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='+'
    )
    financial_year = models.CharField(max_length=10)
    total_income = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    pat = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    roa = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    employee_cost = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    mcap = models.DecimalField(max_digits=20, decimal_places=4, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.company.company_name} — {self.financial_year}"


# --- Per-year Director Remuneration tables ---

class DirectorRemunerationFY12(DirectorRemunerationBase):
    class Meta:
        db_table = 'api_director_remuneration_fy12'
        unique_together = ('director', 'financial_year')
        ordering = ['-financial_year']


class DirectorRemunerationFY13(DirectorRemunerationBase):
    class Meta:
        db_table = 'api_director_remuneration_fy13'
        unique_together = ('director', 'financial_year')
        ordering = ['-financial_year']


class DirectorRemunerationFY14(DirectorRemunerationBase):
    class Meta:
        db_table = 'api_director_remuneration_fy14'
        unique_together = ('director', 'financial_year')
        ordering = ['-financial_year']


class DirectorRemunerationFY15(DirectorRemunerationBase):
    class Meta:
        db_table = 'api_director_remuneration_fy15'
        unique_together = ('director', 'financial_year')
        ordering = ['-financial_year']


class DirectorRemunerationFY16(DirectorRemunerationBase):
    class Meta:
        db_table = 'api_director_remuneration_fy16'
        unique_together = ('director', 'financial_year')
        ordering = ['-financial_year']


# --- Per-year Company Financials tables ---

class CompanyFinancialsFY12(CompanyFinancialsBase):
    class Meta:
        db_table = 'api_company_financials_fy12'
        unique_together = ('company', 'financial_year')
        ordering = ['-financial_year']
        verbose_name_plural = 'Company Financials FY12'


class CompanyFinancialsFY13(CompanyFinancialsBase):
    class Meta:
        db_table = 'api_company_financials_fy13'
        unique_together = ('company', 'financial_year')
        ordering = ['-financial_year']
        verbose_name_plural = 'Company Financials FY13'


class CompanyFinancialsFY14(CompanyFinancialsBase):
    class Meta:
        db_table = 'api_company_financials_fy14'
        unique_together = ('company', 'financial_year')
        ordering = ['-financial_year']
        verbose_name_plural = 'Company Financials FY14'


class CompanyFinancialsFY15(CompanyFinancialsBase):
    class Meta:
        db_table = 'api_company_financials_fy15'
        unique_together = ('company', 'financial_year')
        ordering = ['-financial_year']
        verbose_name_plural = 'Company Financials FY15'


class CompanyFinancialsFY16(CompanyFinancialsBase):
    class Meta:
        db_table = 'api_company_financials_fy16'
        unique_together = ('company', 'financial_year')
        ordering = ['-financial_year']
        verbose_name_plural = 'Company Financials FY16'


# ============================================================================
# YEAR MODEL REGISTRIES
# Single source of truth: FY label → concrete model class.
# Views and management commands use these to know which tables exist.
# ============================================================================

DR_YEAR_MODELS: dict = {
    'FY12': DirectorRemunerationFY12,
    'FY13': DirectorRemunerationFY13,
    'FY14': DirectorRemunerationFY14,
    'FY15': DirectorRemunerationFY15,
    'FY16': DirectorRemunerationFY16,
}

CF_YEAR_MODELS: dict = {
    'FY12': CompanyFinancialsFY12,
    'FY13': CompanyFinancialsFY13,
    'FY14': CompanyFinancialsFY14,
    'FY15': CompanyFinancialsFY15,
    'FY16': CompanyFinancialsFY16,
}
