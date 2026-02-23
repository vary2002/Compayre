from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission class for Admin-only endpoints.
    Allows access only if user is staff or superuser.
    """
    message = "Admin access required."

    def has_permission(self, request, view):
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))


class IsSubscriberOrAdmin(permissions.BasePermission):
    """
    Permission class for Subscriber and Admin users only.
    Regular users without subscription cannot access.
    """
    message = "You are not subscribed for this service."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Allow access if user role is 'subscriber' or 'admin', or if they're staff/superuser
        return request.user.role in ['subscriber', 'admin'] or request.user.is_staff or request.user.is_superuser


class IsAdvancedOrAdmin(permissions.BasePermission):
    """
    Permission for Advanced subscription or Admin users.
    """
    message = "Advanced subscription or Admin access required."

    def has_permission(self, request, view):
        if not request.user:
            return False
        return request.user.role in ['admin', 'advanced']


class IsBasicOrHigher(permissions.BasePermission):
    """
    Permission for Basic subscription or higher (including Advanced and Admin).
    """
    message = "Basic subscription or higher required."

    def has_permission(self, request, view):
        if not request.user:
            return False
        return request.user.subscription_type in ['basic', 'advanced'] or request.user.is_staff


class HasDataAccess(permissions.BasePermission):
    """
    Permission class that checks if user has access to a specific data type.
    Expects the view to define a 'required_data_type' attribute.
    """
    message = "You do not have access to this data."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Views should define this attribute
        data_type = getattr(view, 'required_data_type', None)
        if data_type:
            return request.user.has_data_access(data_type)
        
        return True
