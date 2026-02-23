FROM python:3.12-slim

RUN if ! getent group www-data >/dev/null; then \
        groupadd -r www-data; \
    fi && \
    if ! id -u www-data >/dev/null 2>&1; then \
        useradd -r -g www-data www-data; \
    fi
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc procps && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN mkdir -p /app/logs && python manage.py collectstatic --noinput
RUN chown -R www-data:www-data /app
RUN chown www-data:www-data /app/logs
EXPOSE 8000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "/app/logs/access.log", "--error-logfile", "/app/logs/error.log", "core.wsgi:application"]
