from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    UserViewSet, CustomTokenObtainPairView, UserActivityLogViewSet,
    CompanyViewSet, DirectorViewSet, DirectorRemunerationViewSet,
    CompanyFinancialTimeSeriesViewSet, PeerComparisonViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'activity-logs', UserActivityLogViewSet, basename='activity-log')
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'directors', DirectorViewSet, basename='director')
router.register(r'director-remuneration', DirectorRemunerationViewSet, basename='director-remuneration')
router.register(r'financial-timeseries', CompanyFinancialTimeSeriesViewSet, basename='financial-timeseries')
router.register(r'peer-comparisons', PeerComparisonViewSet, basename='peer-comparison')

urlpatterns = [
    path('', include(router.urls)),
    
    # JWT Token endpoints
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
