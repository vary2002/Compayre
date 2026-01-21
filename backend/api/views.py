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
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .serializers import (
    CustomUserSerializer, UserRegistrationSerializer,
    CustomTokenObtainPairSerializer, UserActivityLogSerializer,
    CompanySerializer, DirectorSerializer, DirectorRemunerationSerializer,
    CompanyFinancialTimeSeriesSerializer, PeerComparisonSerializer
)
from .permissions import IsAdmin
from .models import (
    CustomUser, UserActivityLog, Company, Director, DirectorRemuneration,
    CompanyFinancialTimeSeries, PeerComparison
)

User = get_user_model()


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


class UserActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing user activity logs (read-only)."""
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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def log_selection(self, request):
        """Log user selection activity (companies or directors)."""
        activity_type = request.data.get('activity_type')
        description = request.data.get('description', '')
        
        if activity_type not in ['selection_companies', 'selection_directors']:
            return Response(
                {'error': 'Invalid activity_type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        UserActivityLog.objects.create(
            user=request.user,
            activity_type=activity_type,
            description=description,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
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
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sector', 'industry', 'index']
    search_fields = ['name', 'company_id']
    ordering_fields = ['name', 'employees']
    ordering = ['name']
    pagination_class = None  # Will use DEFAULT from settings

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get companies as dropdown list (id, name only)."""
        companies = Company.objects.values('company_id', 'name').order_by('name')
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
    """
    queryset = Director.objects.all()
    serializer_class = DirectorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['company', 'category']
    search_fields = ['name', 'director_id']
    ordering_fields = ['name', 'appointment_date']
    ordering = ['name']
    pagination_class = None

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get directors as dropdown list."""
        company_id = request.query_params.get('company_id')
        
        query = Director.objects.values('director_id', 'name', 'company__name')
        if company_id:
            query = query.filter(company_id=company_id)
        
        query = query.order_by('name')
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
            company = Company.objects.get(company_id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        directors = Director.objects.filter(company=company).order_by('name')
        serializer = self.get_serializer(directors, many=True)
        
        return Response({
            'company': {'id': company.company_id, 'name': company.name},
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
    """
    queryset = DirectorRemuneration.objects.all()
    serializer_class = DirectorRemunerationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['company', 'director', 'fy_label']
    search_fields = ['director__name', 'company__name']
    ordering_fields = ['fy_end_date', 'total_remuneration']
    ordering = ['-fy_end_date']
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
        
        query = DirectorRemuneration.objects.filter(director_id=director_id)
        if company_id:
            query = query.filter(company_id=company_id)
        
        query = query.order_by('-fy_end_date')
        serializer = self.get_serializer(query, many=True)
        
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
            company = Company.objects.get(company_id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        remuneration = DirectorRemuneration.objects.filter(
            company=company
        ).order_by('-fy_end_date')
        serializer = self.get_serializer(remuneration, many=True)
        
        return Response({
            'company': {'id': company.company_id, 'name': company.name},
            'remuneration_data': serializer.data
        })


# ============================================================================
# DATA VIEWS - FINANCIAL DATA
# ============================================================================

class CompanyFinancialTimeSeriesViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for company financial time-series data.
    - List all financial records
    - Filter by company, fiscal year
    - Get financial data for specific company
    - Compare financial metrics across companies
    """
    queryset = CompanyFinancialTimeSeries.objects.all()
    serializer_class = CompanyFinancialTimeSeriesSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['company', 'fy_label']
    search_fields = ['company__name']
    ordering_fields = ['fy_end_date', 'total_income', 'pat']
    ordering = ['-fy_end_date']
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
            company = Company.objects.get(company_id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        financial = CompanyFinancialTimeSeries.objects.filter(
            company=company
        ).order_by('-fy_end_date')
        serializer = self.get_serializer(financial, many=True)
        
        return Response({
            'company': {'id': company.company_id, 'name': company.name},
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
        valid_metrics = ['total_income', 'pat', 'roa', 'employee_cost', 'mcap', 'employees']
        if metric not in valid_metrics:
            return Response(
                {'error': f'Invalid metric. Must be one of: {", ".join(valid_metrics)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        financial = CompanyFinancialTimeSeries.objects.filter(
            company_id__in=company_ids
        ).order_by('company_id', '-fy_end_date')
        
        # Build comparison data
        comparison_data = {}
        for record in financial:
            if record.company_id not in comparison_data:
                comparison_data[record.company_id] = []
            
            comparison_data[record.company_id].append({
                'fy_label': record.fy_label,
                'fy_end_date': record.fy_end_date,
                metric: getattr(record, metric, None)
            })
        
        return Response({
            'metric': metric,
            'comparison_data': comparison_data
        })


# ============================================================================
# DATA VIEWS - PEER COMPARISONS
# ============================================================================

class PeerComparisonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for peer company comparisons.
    - List all peer comparisons
    - Filter by company, peer position
    - Get peers for specific company
    """
    queryset = PeerComparison.objects.all()
    serializer_class = PeerComparisonSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['company', 'peer_position']
    ordering_fields = ['peer_position']
    ordering = ['peer_position']
    pagination_class = None

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        """Get all peer comparisons for a specific company."""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(company_id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        peers = PeerComparison.objects.filter(company=company).order_by('peer_position')
        serializer = self.get_serializer(peers, many=True)
        
        return Response({
            'company': {'id': company.company_id, 'name': company.name},
            'peers': serializer.data
        })
