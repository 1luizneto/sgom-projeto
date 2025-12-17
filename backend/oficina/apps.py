from django.apps import AppConfig

class OficinaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'oficina'

    def ready(self):
        import oficina.signals  