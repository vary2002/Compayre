from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserActivityLog, Company, Director, DirectorRemuneration, CompanyFinancialTimeSeries, PeerComparison

User = get_user_model()


class CustomUserSerializer(serializers.ModelSerializer):
    """
    Serializer for CustomUser model.
    Includes role information and subscription details.
    """
    access_level = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'first_name', 'last_name',
            'phone_number', 'company_name', 'designation', 'role', 'subscription_type',
            'access_level', 'is_staff', 'is_superuser', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_access_level(self, obj):
        return obj.role

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates password requirements (alphanumeric, min 8 chars),
    phone number (10 digits), and text fields (no numbers).
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Must be at least 8 characters with letters and numbers"
    )
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number', 'company_name',
            'designation'
        ]

    def validate_first_name(self, value):
        """Validate that first name has no numeric characters."""
        if value and any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "First name cannot contain numbers."
            )
        return value

    def validate_last_name(self, value):
        """Validate that last name has no numeric characters."""
        if value and any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "Last name cannot contain numbers."
            )
        return value

    def validate_phone_number(self, value):
        """Validate phone number is 10 digits."""
        if value:
            digits_only = ''.join(filter(str.isdigit, value))
            if len(digits_only) != 10:
                raise serializers.ValidationError(
                    "Phone number must be 10 digits."
                )
        return value

    def validate_company_name(self, value):
        """Validate that company name has no numeric characters."""
        if value and any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "Company name cannot contain numbers."
            )
        return value

    def validate_designation(self, value):
        """Validate that designation has no numeric characters."""
        if value and any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "Designation cannot contain numbers."
            )
        return value

    def validate_password(self, value):
        """Validate password: min 8 characters with letters, numbers, and special characters allowed."""
        # Check for at least one letter
        has_letter = any(char.isalpha() for char in value)
        # Check for at least one digit
        has_digit = any(char.isdigit() for char in value)

        if not (has_letter and has_digit):
            raise serializers.ValidationError(
                "Password must be at least 8 characters and contain both letters and numbers."
            )
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Passwords do not match."}
            )
        
        # Check email uniqueness
        email = data.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                {"email": "This email address is already registered with another account. Please use a different email address."}
            )
        
        # Check phone number uniqueness (only if provided)
        phone_number = data.get('phone_number')
        if phone_number and phone_number.strip():
            if User.objects.filter(phone_number=phone_number).exists():
                raise serializers.ValidationError(
                    {"phone_number": "This phone number is already registered with another account. Please use a different phone number or leave it blank."}
                )
        
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Use email as username for Django's internal field
        email = validated_data.get('email')
        validated_data['username'] = email  # Set username to email for Django compatibility
        
        user = User(**validated_data)
        user.set_password(password)
        user.role = 'user'  # Default role for new users
        user.subscription_type = 'user'  # Default subscription
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extended JWT token serializer.
    Uses email for authentication instead of username.
    Includes user role, access level, and subscription info in the token payload.
    """
    username = serializers.EmailField()  # Renamed to email for clarity, but keep username for compatibility
    
    def validate(self, attrs):
        """Authenticate using email and password."""
        email = attrs.get('username')  # Frontend sends 'username' but it's actually email
        password = attrs.get('password')
        
        # Find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "No active account found with the given credentials"
            )
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError(
                "No active account found with the given credentials"
            )
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError(
                "User account is inactive"
            )
        
        # Call parent's token generation
        refresh = self.get_token(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.email,  # Return email as username
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.get_full_name() or user.email,
                'role': user.role,
                'subscription_type': user.subscription_type,
                'access_level': user.role,
                'company_name': user.company_name,
                'phone_number': user.phone_number,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            }
        }
        
        return data
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['full_name'] = user.get_full_name()
        token['role'] = user.role
        token['subscription_type'] = user.subscription_type
        token['access_level'] = user.role
        token['company_name'] = user.company_name
        token['is_admin'] = user.is_staff or user.is_superuser
        token['is_superuser'] = user.is_superuser
        
        return token

class UserActivityLogSerializer(serializers.ModelSerializer):
    """
    Serializer for UserActivityLog model.
    Includes nested user information.
    """
    user = serializers.SerializerMethodField()

    class Meta:
        model = UserActivityLog
        fields = ['id', 'user', 'activity_type', 'description', 'ip_address', 'user_agent', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
        }


# --- Data Model Serializers ---

class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for Company model.
    """
    class Meta:
        model = Company
        fields = ['company_id', 'name', 'sector', 'industry', 'index', 'employees', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class DirectorSerializer(serializers.ModelSerializer):
    """
    Serializer for Director model.
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Director
        fields = [
            'director_id', 'name', 'company', 'company_name', 'designation', 'category',
            'qualification', 'dob', 'promoter_status', 'gender', 'appointment_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DirectorRemunerationSerializer(serializers.ModelSerializer):
    """
    Serializer for DirectorRemuneration model.
    """
    director_name = serializers.CharField(source='director.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = DirectorRemuneration
        fields = [
            'id', 'company', 'company_name', 'director', 'director_name', 'fy_end_date', 'fy_label',
            'basic_salary', 'pf', 'perqs', 'bonus', 'pay_excl_esops', 'esops', 'total_remuneration',
            'options_granted', 'discount', 'fair_value', 'aggregate_value', 'remuneration_status',
            'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompanyFinancialTimeSeriesSerializer(serializers.ModelSerializer):
    """
    Serializer for CompanyFinancialTimeSeries model.
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CompanyFinancialTimeSeries
        fields = [
            'id', 'company', 'company_name', 'fy_end_date', 'fy_label',
            'total_income', 'pat', 'roa', 'employee_cost', 'mcap', 'employees',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PeerComparisonSerializer(serializers.ModelSerializer):
    """
    Serializer for PeerComparison model.
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    peer_company_name = serializers.CharField(source='peer_company.name', read_only=True)
    
    class Meta:
        model = PeerComparison
        fields = [
            'id', 'company', 'company_name', 'peer_company', 'peer_company_name',
            'peer_position', 'salary_to_median_emp_pay', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Nested serializers for detailed company information

class CompanyDetailedSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Company with related data.
    """
    financial_timeseries = CompanyFinancialTimeSeriesSerializer(many=True, read_only=True)
    directors = DirectorSerializer(many=True, read_only=True)
    peer_comparisons = PeerComparisonSerializer(many=True, read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'company_id', 'name', 'sector', 'industry', 'index', 'employees',
            'financial_timeseries', 'directors', 'peer_comparisons', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DirectorDetailedSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Director with remuneration data.
    """
    remunerations = DirectorRemunerationSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Director
        fields = [
            'director_id', 'name', 'company', 'company_name', 'designation', 'category',
            'qualification', 'dob', 'promoter_status', 'gender', 'appointment_date',
            'remunerations', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
