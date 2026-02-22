FROM python:3.12-slim
RUN groupadd -r www-data && useradd -r -g www-data www-data
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chown -R www-data:www-data /app
RUN mkdir -p /app/logs && chown www-data:www-data /app/logs
USER www-data
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "/app/logs/access.log", "--error-logfile", "/app/logs/error.log", "core.wsgi:application"]
