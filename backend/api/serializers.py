from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
        return obj.get_access_level_display()

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
            'designation', 'role'
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
        """Validate password is alphanumeric with min 8 characters."""
        # Check for at least one letter
        has_letter = any(char.isalpha() for char in value)
        # Check for at least one digit
        has_digit = any(char.isdigit() for char in value)
        # Check that it only contains alphanumeric characters
        is_alphanumeric = value.isalnum()

        if not (has_letter and has_digit and is_alphanumeric):
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
                {"email": "A user with this email address already exists."}
            )
        
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Set username as email
        validated_data['username'] = validated_data.get('email').split('@')[0]
        
        user = User(**validated_data)
        user.set_password(password)
        user.role = 'user'  # Default role for new users
        user.subscription_type = 'user'  # Default subscription
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extended JWT token serializer.
    Includes user role, access level, and subscription info in the token payload.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['full_name'] = user.get_full_name()
        token['role'] = user.role
        token['subscription_type'] = user.subscription_type
        token['access_level'] = user.get_access_level_display()
        token['company_name'] = user.company_name
        token['is_admin'] = user.is_staff or user.is_superuser
        token['is_superuser'] = user.is_superuser
        
        return token
