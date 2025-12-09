# backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Variáveis de ambiente para Python não gerar .pyc e logs serem imediatos
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Instala dependências do sistema necessárias para o Postgres
RUN apt-get update && apt-get install -y libpq-dev gcc

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o projeto
COPY . .

# Expõe a porta (apenas documentação, o compose que define)
EXPOSE 8000

# Comando padrão
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]