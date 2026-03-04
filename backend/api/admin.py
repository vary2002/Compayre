from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from .models import Company, Director, DirectorRemuneration, CompanyFinancials

User = get_user_model()


@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    """
    Admin interface for CustomUser model.
    Extends Django's default UserAdmin with subscription and role information.
    """
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'company_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Subscription', {'fields': ('subscription_type',)}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )
    
    list_display = ('username', 'email', 'get_full_name', 'subscription_type', 'is_staff', 'created_at')
    list_filter = ('is_staff', 'is_superuser', 'subscription_type', 'created_at')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'company_name')
    ordering = ('-created_at',)
    
    readonly_fields = ('created_at', 'updated_at', 'last_login', 'date_joined')

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    get_full_name.short_description = 'Full Name'


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('company_code', 'company_name', 'bse_scrip_code', 'sector', 'industry', 'no_of_employees')
    list_filter = ('sector', 'industry')
    search_fields = ('company_code', 'company_name', 'bse_scrip_code')
    ordering = ('company_name',)


@admin.register(Director)
class DirectorAdmin(admin.ModelAdmin):
    list_display = ('director_code', 'director_name', 'company', 'din', 'designation', 'director_category', 'gender', 'key_flag')
    list_filter = ('director_category', 'gender', 'promoter_status')
    search_fields = ('director_code', 'director_name', 'din')
    ordering = ('director_name',)
    raw_id_fields = ('company',)


@admin.register(DirectorRemuneration)
class DirectorRemunerationAdmin(admin.ModelAdmin):
    list_display = ('director', 'financial_year', 'total_remuneration', 'basic_salary', 'bonus_commission')
    list_filter = ('financial_year',)
    search_fields = ('director__director_name', 'director__director_code')
    ordering = ('director', '-financial_year')
    raw_id_fields = ('director',)


@admin.register(CompanyFinancials)
class CompanyFinancialsAdmin(admin.ModelAdmin):
    list_display = ('company', 'financial_year', 'total_income', 'pat', 'roa', 'employee_cost', 'mcap')
    list_filter = ('financial_year',)
    search_fields = ('company__company_name', 'company__company_code')
    ordering = ('company', '-financial_year')
    raw_id_fields = ('company',)
