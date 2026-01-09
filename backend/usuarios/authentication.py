from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        print(f"--- TENTATIVA DE LOGIN ---")
        print(f"Buscando usuário: {username}")
        
        if username is None:
            return None
            
        try:
            # Tenta encontrar usuário por CPF (username) OU Email
            user = User.objects.get(Q(username=username) | Q(email=username))
            print(f"Usuário encontrado: {user.username} (Email: {user.email})")
        except User.DoesNotExist:
            print("Usuário NÃO encontrado no banco.")
            return None
        except User.MultipleObjectsReturned:
            print("Múltiplos usuários encontrados. Pegando o primeiro.")
            user = User.objects.filter(Q(username=username) | Q(email=username)).order_by('id').first()

        # Verifica a senha
        if user.check_password(password):
            print("Senha CORRETA.")
            if self.user_can_authenticate(user):
                print("Usuário ativo. Login autorizado.")
                return user
            else:
                print("Usuário inativo.")
        else:
            print("Senha INCORRETA.")
            
        return None