FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    build-essential libpq-dev curl \
    libfontconfig1 libgraphite2-3 libharfbuzz0b libicu76 libssl3t64 zlib1g \
    fonts-dejavu-extra && \
    rm -rf /var/lib/apt/lists/*

# tectonic — самодостаточный TeX/LaTeX-движок, нужен для генерации PDF
# (см. https://tectonic-typesetting.github.io/book/latest/getting-started/install.html)
RUN cd /usr/local/bin && \
    curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh && \
    chmod +x /usr/local/bin/tectonic

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY tex_templates /app/tex_templates

EXPOSE 8000
