from django.contrib.admin.apps import AdminConfig


class ReshaAdminConfig(AdminConfig):
    default_site = "config.admin_site.ReshaAdminSite"
