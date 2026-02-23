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
    """Company metadata."""
    company_id = models.CharField(max_length=32, primary_key=True)
    name = models.CharField(max_length=255, db_index=True)
    sector = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    industry = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    index = models.CharField(max_length=64, blank=True, null=True)
    employees = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['sector']),
            models.Index(fields=['industry']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.company_id})"


class Director(models.Model):
    """Director information (a director can work at multiple companies)."""
    id = models.AutoField(primary_key=True)
    director_id = models.CharField(max_length=32, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='directors')
    
    appointment_date = models.DateField(blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=128, blank=True, null=True)
    qualification = models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    promoter_status = models.CharField(max_length=64, blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('director_id', 'company')
        ordering = ['name']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} - {self.company.name}"


class DirectorRemuneration(models.Model):
    """Director salary/compensation time-series data (one row per director per year)."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='director_remunerations')
    director = models.ForeignKey(Director, on_delete=models.CASCADE, related_name='remunerations')
    fy_end_date = models.DateField(db_index=True)
    fy_label = models.CharField(max_length=16)

    # Flexible remuneration fields
    basic_salary = models.FloatField(blank=True, null=True)
    pf = models.FloatField(blank=True, null=True)
    perqs = models.FloatField(blank=True, null=True)
    bonus = models.FloatField(blank=True, null=True)
    pay_excl_esops = models.FloatField(blank=True, null=True)
    esops = models.FloatField(blank=True, null=True)
    total_remuneration = models.FloatField(blank=True, null=True)
    options_granted = models.FloatField(blank=True, null=True)
    discount = models.FloatField(blank=True, null=True)
    fair_value = models.FloatField(blank=True, null=True)
    aggregate_value = models.FloatField(blank=True, null=True)
    remuneration_status = models.CharField(max_length=256, blank=True, null=True)
    comments = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("company", "director", "fy_end_date")
        ordering = ['-fy_end_date']
        indexes = [
            models.Index(fields=['company', 'fy_end_date']),
            models.Index(fields=['director', 'fy_end_date']),
        ]

    def __str__(self):
        return f"{self.director} - {self.fy_label}"


class CompanyFinancialTimeSeries(models.Model):
    """Financial metrics time-series (one row per company per year)."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_timeseries')
    fy_end_date = models.DateField(db_index=True)
    fy_label = models.CharField(max_length=16)

    total_income = models.FloatField(blank=True, null=True)
    pat = models.FloatField(blank=True, null=True)
    roa = models.FloatField(blank=True, null=True)
    employee_cost = models.FloatField(blank=True, null=True)
    mcap = models.FloatField(blank=True, null=True)
    employees = models.IntegerField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("company", "fy_end_date")
        verbose_name_plural = "Company Financial Time Series"
        ordering = ['-fy_end_date']
        indexes = [
            models.Index(fields=['company', 'fy_end_date']),
        ]

    def __str__(self):
        return f"{self.company} - {self.fy_label}"


class PeerComparison(models.Model):
    """Peer company comparisons for benchmarking."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='peer_comparisons')
    peer_company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='compared_in')
    peer_position = models.IntegerField(help_text="Peer position: 1, 2, 3, 4, or 5")
    salary_to_median_emp_pay = models.FloatField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('company', 'peer_company', 'peer_position')
        ordering = ['company', 'peer_position']
        indexes = [
            models.Index(fields=['company']),
        ]

    def __str__(self):
        return f"{self.company} Peer {self.peer_position}: {self.peer_company}"
