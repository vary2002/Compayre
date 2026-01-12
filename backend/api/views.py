from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils.deprecation import MiddlewareMixin
from django.db.models import Q

from .serializers import (
    CustomUserSerializer, UserRegistrationSerializer,
    CustomTokenObtainPairSerializer, UserActivityLogSerializer
)
from .permissions import IsAdmin, HasDataAccess
from .models import UserActivityLog

User = get_user_model()


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Extended token obtain view that includes role and subscription info.
    Also logs the login activity.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # Get email from request (sent as 'username' for compatibility)
        email = request.data.get('username')
        
        # Log successful login
        if response.status_code == 200 and email:
            try:
                user = User.objects.get(email=email)
                UserActivityLog.objects.create(
                    user=user,
                    activity_type='login',
                    description=f'User logged in',
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            except User.DoesNotExist:
                pass
        else:
            # Log failed login attempt
            if email:
                try:
                    user = User.objects.get(email=email)
                    UserActivityLog.objects.create(
                        user=user,
                        activity_type='error',
                        description='Failed login attempt',
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')
                    )
                except User.DoesNotExist:
                    pass
        
        return response


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    - Admins can manage all users and their subscriptions
    - Users can view and edit their own profile
    """
    queryset = User.objects.all()
    serializer_class = CustomUserSerializer

    def get_permissions(self):
        if self.action == 'create' or self.action == 'register':
            permission_classes = [AllowAny]
        elif self.action in ['update', 'partial_update']:
            # Users can only update themselves unless they're admin
            permission_classes = [IsAuthenticated]
        elif self.action in ['destroy', 'list']:
            # Only admins can delete or list users
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Regular users only see themselves
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """
        Register a new user.
        Returns the new user's profile (subscription defaults to 'user').
        Also logs the registration activity.
        """
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Log registration
            UserActivityLog.objects.create(
                user=user,
                activity_type='registration',
                description='New user registered',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            user_serializer = CustomUserSerializer(user)
            return Response(user_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get the current user's profile.
        """
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout the current user.
        Logs the logout activity.
        """
        user = request.user
        
        # Log logout
        UserActivityLog.objects.create(
            user=user,
            activity_type='logout',
            description='User logged out',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response(
            {'detail': 'Successfully logged out.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin])
    def set_role(self, request, pk=None):
        """
        Admin action to change a user's role (user, subscriber, or admin).
        """
        user = self.get_object()
        role = request.data.get('role')
        
        if role not in dict(User.ROLE_CHOICES):
            return Response(
                {'error': f'Invalid role. Must be one of: {list(dict(User.ROLE_CHOICES).keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_role = user.role
        user.role = role
        user.subscription_type = role  # Keep subscription_type in sync
        
        # If promoting to admin, set is_staff
        if role == 'admin':
            user.is_staff = True
        elif old_role == 'admin' and role != 'admin':
            # Only remove is_staff if user wasn't already superuser
            if not user.is_superuser:
                user.is_staff = False
        
        user.save()
        
        # Log role change
        UserActivityLog.objects.create(
            user=user,
            activity_type='profile_update',
            description=f'User role changed from {old_role} to {role}',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        serializer = CustomUserSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin])
    def set_subscription(self, request, pk=None):
        """
        Admin action to change a user's subscription level.
        Alias for set_role for backwards compatibility.
        """
        user = self.get_object()
        subscription_type = request.data.get('subscription_type')
        
        if subscription_type not in dict(User.SUBSCRIPTION_CHOICES):
            return Response(
                {'error': f'Invalid subscription type. Must be one of: {list(dict(User.SUBSCRIPTION_CHOICES).keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.subscription_type = subscription_type
        user.role = subscription_type  # Keep role in sync
        user.save()
        serializer = CustomUserSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin])
    def set_admin(self, request, pk=None):
        """
        Admin action to promote/demote a user to/from admin.
        """
        user = self.get_object()
        is_staff = request.data.get('is_staff', False)
        
        user.is_staff = is_staff
        user.save()
        serializer = CustomUserSerializer(user)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        Override update to ensure users can only edit their own profile.
        """
        user = self.get_object()
        
        # Regular users can only update themselves
        if not request.user.is_staff and request.user.id != user.id:
            return Response(
                {'error': 'You can only edit your own profile.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Prevent regular users from changing their own subscription or admin status
        if not request.user.is_staff:
            request.data.pop('subscription_type', None)
            request.data.pop('is_staff', None)
        
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['get'], permission_classes=[IsAdmin])
    def selections(self, request, pk=None):
        """
        Get the company and director selections made by a user.
        """
        user = self.get_object()
        
        # Try to get user selections from a UserSelection model if it exists
        # For now, return empty structure - this can be expanded based on your data model
        selections = {
            'companies': [],
            'directors': []
        }
        
        # If you have a UserSelection model or similar, fetch from there
        try:
            from .models import UserSelection
            user_selections = UserSelection.objects.filter(user=user)
            
            companies = user_selections.filter(selection_type='company').values('company_id', 'company__name')
            directors = user_selections.filter(selection_type='director').values('director_id', 'director__name')
            
            selections['companies'] = [
                {'id': c['company_id'], 'name': c['company__name']} 
                for c in companies
            ]
            selections['directors'] = [
                {'id': d['director_id'], 'name': d['director__name']} 
                for d in directors
            ]
        except ImportError:
            # Model doesn't exist yet, return empty
            pass
        
        return Response(selections)


class UserActivityLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and logging user activity.
    - Admins can view all logs (GET)
    - Authenticated users can log their own selections (POST to log_selection)
    """
    queryset = UserActivityLog.objects.all().order_by('-timestamp')
    serializer_class = UserActivityLogSerializer
    
    def get_permissions(self):
        """Allow authenticated users to log selections, admins to view logs."""
        if self.action == 'log_selection':
            return [IsAuthenticated()]
        else:
            return [IsAdmin()]

    def get_queryset(self):
        """Get activity logs with optional search and user_id filtering."""
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', '')
        user_id = self.request.query_params.get('user_id', '')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        elif search:
            queryset = queryset.filter(
                Q(user__email__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)
            )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list to return paginated results."""
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def log_selection(self, request):
        """
        Log a user's company or director selection.
        Called by frontend when user makes selections in dashboard.
        """
        activity_type = request.data.get('activity_type', 'selection')
        description = request.data.get('description', 'User made a selection')
        
        UserActivityLog.objects.create(
            user=request.user,
            activity_type=activity_type,
            description=description,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response(
            {'detail': 'Activity logged successfully'},
            status=status.HTTP_201_CREATED
        )

