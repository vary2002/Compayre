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
    Uses email as the primary login credential instead of username.
    
    Extends Django's AbstractUser to add subscription tiers that map to
    the pricing levels in the Compayre platform:
    - free (Personal): Limited access
    - user: Standard user access
    - paid_subscriber: Premium access
    - admin: Admin access (via is_staff)
    - superuser: Full access (via is_superuser)
    """
    
    # Email is unique and required for login
    email = models.EmailField(unique=True, blank=False)

    # USER ROLE CHOICES
    ROLE_CHOICES = [
        ('user', 'User'),
        ('subscriber', 'Subscriber'),
        ('admin', 'Admin'),
    ]

    # SUBSCRIPTION CHOICES (for backwards compatibility)
    SUBSCRIPTION_CHOICES = [
        ('user', 'User'),
        ('subscriber', 'Subscriber'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='user',
        help_text="User role: user, subscriber, or admin"
    )

    subscription_type = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_CHOICES,
        default='user',
        help_text="Subscription tier: user, subscriber, or admin"
    )

    # Additional user profile information
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        unique=True,
        help_text="User's 10-digit phone number (unique, optional)."
    )

    company_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="The company or organization associated with this user."
    )

    designation = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="User's job designation/title."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['is_staff']),
            models.Index(fields=['is_superuser']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_access_level_display()})"

    def get_access_level_display(self):
        """Return human-readable access level name."""
        if self.is_superuser:
            return 'Django Superuser'
        elif self.is_staff:
            return 'Admin'
        return dict(self.ROLE_CHOICES).get(self.role, 'User')

    def has_data_access(self, data_type):
        """
        Check if user has access to a specific data type based on role/subscription.
        
        Args:
            data_type (str): One of 'market_trends', 'company_pay', 
                           'director_pay', 'transparency', 'projections'
        
        Returns:
            bool: True if user can access this data type
        """
        if self.is_superuser or self.is_staff:
            return True

        # User (free): Market trends, Company pay data
        if self.role == 'user':
            return data_type in ['market_trends', 'company_pay']

        # Paid Subscriber: All features except admin features
        if self.role == 'paid_subscriber':
            return data_type in [
                'market_trends', 'company_pay', 'director_pay',
                'salary_comparison', 'transparency_index', 'projections'
            ]

        return False


class UserActivityLog(models.Model):
    """
    Logs user activities for tracking and audit purposes.
    Records login, logout, and other important user actions.
    """
    
    ACTIVITY_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('registration', 'Registration'),
        ('password_change', 'Password Change'),
        ('profile_update', 'Profile Update'),
        ('data_access', 'Data Access'),
        ('error', 'Error'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activity_logs')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
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
        return f"{self.user.username} - {self.activity_type} at {self.timestamp}"
