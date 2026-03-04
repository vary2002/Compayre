"""
Compayre API Views - Fresh build with all required endpoints.

Maintains authentication and subscription/roles system from previous build.
Data endpoints are ready and waiting for your requirements.

Architecture:
- Authentication endpoints: Token obtain/refresh, user registration
- User endpoints: Profile management, activity logging
- Data endpoints: Companies, Directors, Remuneration, Financial data, Peer comparisons
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db import OperationalError
from django.db.models import Q, Avg
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .serializers import (
    CustomUserSerializer, UserRegistrationSerializer,
    CustomTokenObtainPairSerializer, UserActivityLogSerializer,
    CompanySerializer, DirectorSerializer, DirectorRemunerationSerializer,
    CompanyFinancialsSerializer
)
from .permissions import IsAdmin, IsSubscriberOrAdmin
from .models import (
    CustomUser, UserActivityLog, Company, Director, DirectorRemuneration,
    CompanyFinancials, DR_YEAR_MODELS, CF_YEAR_MODELS
)

User = get_user_model()

# Number of financial years to return for chart/display endpoints.
# Changing this single value updates all by_company and by_director queries.
CHART_YEARS = 5


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Extended token obtain view that includes role and subscription info.
    Logs login activity.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        email = request.data.get('username')  # Frontend sends email as 'username'
        
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


# ============================================================================
# USER MANAGEMENT VIEWS
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    - Public: registration
    - Users: view/edit own profile
    - Admins: manage all users
    """
    queryset = User.objects.all()
    serializer_class = CustomUserSerializer

    def get_permissions(self):
        if self.action in ['create', 'register']:
            return [AllowAny()]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated()]
        elif self.action in ['destroy', 'list']:
            return [IsAdmin()]
        else:
            return [IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Register a new user."""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
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
        """Get current user profile."""
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """Logout current user."""
        user = request.user
        UserActivityLog.objects.create(
            user=user,
            activity_type='logout',
            description='User logged out',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        return Response({'detail': 'Logged out successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin], url_path='set_subscription')
    def set_subscription(self, request, pk=None):
        """Admin endpoint to set user subscription type."""
        user = self.get_object()
        subscription_type = request.data.get('subscription_type')
        
        if not subscription_type:
            return Response(
                {'error': 'subscription_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate subscription type
        valid_types = ['user', 'subscriber', 'admin']
        if subscription_type not in valid_types:
            return Response(
                {'error': f'Invalid subscription_type. Must be one of: {valid_types}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update subscription
        old_subscription = user.subscription_type
        user.subscription_type = subscription_type
        user.role = subscription_type  # Keep role in sync with subscription_type
        user.save()
        
        # Log the activity
        UserActivityLog.objects.create(
            user=user,
            activity_type='profile_update',
            description=f'Subscription updated from {old_subscription} to {subscription_type} by admin {request.user.username}',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        serializer = CustomUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserActivityLogViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and creating user activity logs."""
    serializer_class = UserActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activity_type', 'user']
    search_fields = ['description']
    ordering_fields = ['timestamp', 'activity_type']
    ordering = ['-timestamp']

    def get_queryset(self):
        # Users can only see their own logs, admins can see all
        if self.request.user.is_staff:
            return UserActivityLog.objects.all()
        return UserActivityLog.objects.filter(user=self.request.user)
    
    # Disable update and delete methods
    def update(self, request, *args, **kwargs):
        return Response({'detail': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def partial_update(self, request, *args, **kwargs):
        return Response({'detail': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='log-selection')
    def log_selection(self, request):
        """Log user selection activity (companies or directors)."""
        activity_type = request.data.get('activity_type')
        description = request.data.get('description', '')
        
        if activity_type not in ['selection_companies', 'selection_directors']:
            return Response(
                {'error': 'Invalid activity_type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            UserActivityLog.objects.create(
                user=request.user,
                activity_type=activity_type,
                description=description,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        except OperationalError:
            # SQLite lock contention — log is non-critical, don't surface as 500
            pass
        
        return Response({'detail': 'Activity logged'}, status=status.HTTP_201_CREATED)


# ============================================================================
# DATA VIEWS - COMPANIES
# ============================================================================

class CompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for companies.
    - List all companies (paginated)
    - Filter by sector, industry
    - Search by name
    - Get company details
    
    REQUIRES: Subscriber or Admin role
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsSubscriberOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sector', 'industry', 'index_name']
    search_fields = ['company_name', 'company_code']
    ordering_fields = ['company_name', 'no_of_employees']
    ordering = ['company_name']
    pagination_class = None  # Will use DEFAULT from settings

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get companies as dropdown list (id, name only)."""
        companies = Company.objects.values('id', 'company_code', 'company_name').order_by('company_name')
        return Response(companies)

    @action(detail=False, methods=['get'])
    def sectors(self, request):
        """Get all unique sectors."""
        sectors = Company.objects.filter(
            sector__isnull=False
        ).values_list('sector', flat=True).distinct().order_by('sector')
        return Response({'sectors': list(sectors)})

    @action(detail=False, methods=['get'])
    def industries(self, request):
        """Get all unique industries."""
        industries = Company.objects.filter(
            industry__isnull=False
        ).values_list('industry', flat=True).distinct().order_by('industry')
        return Response({'industries': list(industries)})

    @action(detail=False, methods=['get'])
    def peer_compensation(self, request):
        """
        Return avg director total_remuneration for a company and its peers
        in the latest available financial year.

        Query param: company_code
        Response: { financial_year, bars: [{ name, avg_compensation, is_subject }] }
        """
        company_code = request.query_params.get('company_code')
        if not company_code:
            return Response({'error': 'company_code parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subject = Company.objects.get(company_code=company_code)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

        # Resolve peer BSE codes → Company objects
        peer_bse_codes = [
            subject.peer_1_comp, subject.peer_2_comp, subject.peer_3_comp,
            subject.peer_4_comp, subject.peer_5_comp,
        ]
        peer_bse_codes = [c for c in peer_bse_codes if c]
        peer_companies = list(Company.objects.filter(bse_scrip_code__in=peer_bse_codes))

        # Use the latest year in the registry
        latest_fy = sorted(DR_YEAR_MODELS.keys())[-1]
        dr_model = DR_YEAR_MODELS[latest_fy]

        def avg_comp(company):
            result = dr_model.objects.filter(
                director__company=company,
                total_remuneration__isnull=False,
            ).aggregate(avg=Avg('total_remuneration'))
            return float(result['avg']) if result['avg'] is not None else None

        bars = []
        subject_avg = avg_comp(subject)
        if subject_avg is not None:
            bars.append({'name': subject.company_name, 'avg_compensation': round(subject_avg), 'is_subject': True})

        for peer in peer_companies:
            avg = avg_comp(peer)
            if avg is not None:
                bars.append({'name': peer.company_name, 'avg_compensation': round(avg), 'is_subject': False})

        # Sort by compensation descending so the chart reads naturally
        bars.sort(key=lambda x: x['avg_compensation'], reverse=True)

        return Response({'financial_year': latest_fy, 'bars': bars})


# ============================================================================
# DATA VIEWS - DIRECTORS
# ============================================================================

class DirectorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for directors.
    - List all directors
    - Filter by company, category
    - Search by name
    - Get directors by company
    
    REQUIRES: Subscriber or Admin role
    """
    queryset = Director.objects.all()
    serializer_class = DirectorSerializer
    permission_classes = [IsSubscriberOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['company', 'director_category']
    search_fields = ['director_name', 'director_code', 'din']
    ordering_fields = ['director_name', 'appointment_date']
    ordering = ['director_name']
    pagination_class = None

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get directors as dropdown list."""
        company_id = request.query_params.get('company_id')
        
        query = Director.objects.values('id', 'director_code', 'director_name', 'din', 'company__company_name')
        if company_id:
            query = query.filter(company_id=company_id)
        
        query = query.order_by('director_name')
        return Response(query)

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        """Get all directors for a specific company."""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(company_code=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        directors = Director.objects.filter(company=company).order_by('director_name')
        serializer = self.get_serializer(directors, many=True)
        
        return Response({
            'company': {'id': company.id, 'company_code': company.company_code, 'name': company.company_name},
            'directors': serializer.data
        })


# ============================================================================
# DATA VIEWS - DIRECTOR REMUNERATION
# ============================================================================

class DirectorRemunerationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for director remuneration/compensation data.
    - List all remuneration records
    - Filter by director, company, fiscal year
    - Get remuneration time-series for a director
    - Get remuneration data for a company
    
    REQUIRES: Subscriber or Admin role
    """
    queryset = DirectorRemuneration.objects.all()
    serializer_class = DirectorRemunerationSerializer
    permission_classes = [IsSubscriberOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['director', 'financial_year']
    search_fields = ['director__director_name', 'director__company__company_name']
    ordering_fields = ['financial_year', 'total_remuneration']
    ordering = ['-financial_year']
    pagination_class = None

    @action(detail=False, methods=['get'])
    def by_director(self, request):
        """Get all remuneration records for a specific director."""
        director_id = request.query_params.get('director_id')
        company_id = request.query_params.get('company_id')
        
        if not director_id:
            return Response(
                {'error': 'director_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Query per-year tables (latest years first via reversed sorted keys)
        active_fys = sorted(DR_YEAR_MODELS.keys())  # ['FY12' ... 'FY16']
        all_records = []
        for fy in reversed(active_fys):
            model = DR_YEAR_MODELS[fy]
            qs = model.objects.filter(director_id=director_id).select_related('director__company')
            if company_id:
                qs = qs.filter(director__company_id=company_id)
            all_records.extend(list(qs))
        serializer = self.get_serializer(all_records, many=True)
        
        return Response({
            'director_id': director_id,
            'remuneration_data': serializer.data
        })

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        """Get all director remuneration records for a specific company."""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(company_code=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Query per-year tables (latest years first via reversed sorted keys)
        active_fys = sorted(DR_YEAR_MODELS.keys())  # ['FY12' ... 'FY16']
        all_records = []
        for fy in reversed(active_fys):
            model = DR_YEAR_MODELS[fy]
            all_records.extend(list(
                model.objects.filter(director__company=company).select_related('director__company')
            ))
        serializer = self.get_serializer(all_records, many=True)
        
        return Response({
            'company': {'id': company.id, 'company_code': company.company_code, 'name': company.company_name},
            'remuneration_data': serializer.data
        })


# ============================================================================
# DATA VIEWS - FINANCIAL DATA
# ============================================================================

class CompanyFinancialsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for company financials time-series data.
    - List all financial records
    - Filter by company, financial year
    - Get financial data for specific company
    - Compare financial metrics across companies

    REQUIRES: Subscriber or Admin role
    """
    queryset = CompanyFinancials.objects.all()
    serializer_class = CompanyFinancialsSerializer
    permission_classes = [IsSubscriberOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['company', 'financial_year']
    search_fields = ['company__company_name']
    ordering_fields = ['financial_year', 'total_income', 'pat']
    ordering = ['-financial_year']
    pagination_class = None

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        """Get financial data for a specific company."""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(company_code=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Query per-year tables (latest years first via reversed sorted keys)
        active_fys = sorted(CF_YEAR_MODELS.keys())  # ['FY12' ... 'FY16']
        all_records = []
        for fy in reversed(active_fys):
            model = CF_YEAR_MODELS[fy]
            all_records.extend(list(
                model.objects.filter(company=company).select_related('company')
            ))
        serializer = self.get_serializer(all_records, many=True)
        
        return Response({
            'company': {'id': company.id, 'company_code': company.company_code, 'name': company.company_name},
            'financial_data': serializer.data
        })

    @action(detail=False, methods=['get'])
    def comparison(self, request):
        """Compare a specific metric across multiple companies."""
        company_ids = request.query_params.getlist('company_ids')
        metric = request.query_params.get('metric', 'total_income')
        
        if not company_ids:
            return Response(
                {'error': 'company_ids parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate metric is a valid field
        valid_metrics = ['total_income', 'pat', 'roa', 'employee_cost', 'mcap']
        if metric not in valid_metrics:
            return Response(
                {'error': f'Invalid metric. Must be one of: {", ".join(valid_metrics)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        financial = CompanyFinancials.objects.filter(
            company_id__in=company_ids
        ).order_by('company_id', '-financial_year')
        
        # Build comparison data
        comparison_data = {}
        for record in financial:
            if record.company_id not in comparison_data:
                comparison_data[record.company_id] = []
            
            comparison_data[record.company_id].append({
                'financial_year': record.financial_year,
                metric: getattr(record, metric, None)
            })
        
        return Response({
            'metric': metric,
            'comparison_data': comparison_data
        })


# Peer comparison data is now stored inline on the Company model
# (peer_1_comp … peer_5_comp fields) — no separate PeerComparison ViewSet needed.
