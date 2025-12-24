from django.db import models

from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# --- Normalized Data Models for Ingestion ---

class Company(models.Model):
    """
    Stores company metadata. Use BSE Scrip Code as primary key if available.
    """
    company_id = models.CharField(max_length=32, primary_key=True)  # BSE Scrip Code or fallback
    name = models.CharField(max_length=255)
    sector = models.CharField(max_length=128, blank=True, null=True)
    industry = models.CharField(max_length=128, blank=True, null=True)
    index = models.CharField(max_length=64, blank=True, null=True)
    # Add other meta fields as needed

    def __str__(self):
        return f"{self.company_id} - {self.name}"


class Director(models.Model):
    """
    Stores director metadata. Use DIN as primary key if available.
    """
    director_id = models.CharField(max_length=32, primary_key=True)  # DIN or fallback
    name = models.CharField(max_length=255)
    appointment_date = models.DateField(blank=True, null=True)
    # Fallback key fields for missing DIN
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.director_id} - {self.name}"


class DirectorRemuneration(models.Model):
    """
    Time-series remuneration for directors (one row per director per year).
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    director = models.ForeignKey(Director, on_delete=models.CASCADE)
    fy_end_date = models.DateField()
    fy_label = models.CharField(max_length=16)  # e.g., FY2016

    # Remuneration fields (add/adjust as per your columns)
    basic_salary = models.FloatField(blank=True, null=True)
    pf = models.FloatField(blank=True, null=True)
    perqs = models.FloatField(blank=True, null=True)
    bonus = models.FloatField(blank=True, null=True)
    pay_excl_esops = models.FloatField(blank=True, null=True)
    esops = models.FloatField(blank=True, null=True)
    total_remuneration = models.FloatField(blank=True, null=True)
    options_granted = models.FloatField(blank=True, null=True)
    remuneration_status = models.CharField(max_length=256, blank=True, null=True)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("company", "director", "fy_end_date")

    def __str__(self):
        return f"{self.director} {self.fy_label}"


class CompanyFinancialTimeSeries(models.Model):
    """
    Time-series company financials (one row per company per year).
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    fy_end_date = models.DateField()
    fy_label = models.CharField(max_length=16)

    total_income = models.FloatField(blank=True, null=True)
    pat = models.FloatField(blank=True, null=True)
    roa = models.FloatField(blank=True, null=True)
    employee_cost = models.FloatField(blank=True, null=True)
    mcap = models.FloatField(blank=True, null=True)
    employees = models.IntegerField(blank=True, null=True)

    class Meta:
        unique_together = ("company", "fy_end_date")

    def __str__(self):
        return f"{self.company} {self.fy_label}"


class CustomUser(AbstractUser):
    """
    Custom User model with role-based access control.
    
    Extends Django's AbstractUser to add subscription tiers that map to
    the pricing levels in the Compayre platform:
    - Personal (Free): Limited access
    - Basic: Extended access
    - Advanced: Full access
    
    The is_staff flag is used to designate Admin users who have control
    over data uploads, user management, and the data entry dashboard.
    """

    # ROLES / SUBSCRIPTION LEVELS
    SUBSCRIPTION_CHOICES = [
        ('free', 'Personal (Free)'),
        ('basic', 'Basic'),
        ('advanced', 'Advanced'),
    ]

    subscription_type = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_CHOICES,
        default='free',
        help_text="Determines the level of data access for the user."
    )

    # Optional: Additional user profile information
    company_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="The company or organization associated with this user."
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="User's phone number."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription_type']),
            models.Index(fields=['is_staff']),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def role(self):
        """
        Helper property to return the effective role for frontend logic.
        
        Admins (is_staff or is_superuser) override subscription levels.
        Returns:
            str: One of 'admin', 'advanced', 'basic', or 'free'
        """
        if self.is_staff or self.is_superuser:
            return 'admin'
        return self.subscription_type

    def get_role_display(self):
        """Return human-readable role name."""
        if self.is_staff or self.is_superuser:
            return 'Admin'
        return dict(self.SUBSCRIPTION_CHOICES).get(self.subscription_type, 'Unknown')

    def has_data_access(self, data_type):
        """
        Check if user has access to a specific data type.
        
        Args:
            data_type (str): One of 'market_trends', 'company_pay', 
                           'director_pay', 'transparency', 'projections'
        
        Returns:
            bool: True if user can access this data type
        """
        if self.is_staff or self.is_superuser:
            return True

        # Personal (Free): Market trends, Company pay data
        if self.subscription_type == 'free':
            return data_type in ['market_trends', 'company_pay']

        # Basic: + Director pay, Salary comparison
        if self.subscription_type == 'basic':
            return data_type in ['market_trends', 'company_pay', 'director_pay', 'salary_comparison']

        # Advanced: All features
        if self.subscription_type == 'advanced':
            return data_type in [
                'market_trends', 'company_pay', 'director_pay',
                'salary_comparison', 'transparency_index', 'projections'
            ]

        return False
