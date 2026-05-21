FROM python:3.12-slim

RUN if ! getent group www-data >/dev/null; then \
        groupadd -r www-data; \
    fi && \
    if ! id -u www-data >/dev/null 2>&1; then \
        useradd -r -g www-data www-data; \
    fi
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    procps \
    tesseract-ocr \
    poppler-utils \
    libreoffice-nogui \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/logs /app/media && python manage.py collectstatic --noinput
RUN chown -R www-data:www-data /app
RUN chown www-data:www-data /app/logs /app/media
USER www-data
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-", "--error-logfile", "-", "core.wsgi:application"]
