# syntax=docker/dockerfile:1

# ---- deps ------------------------------------------------------------------
# Wheels are built into a venv here so the runtime stage needs no toolchain.
FROM python:3.12-slim AS deps
WORKDIR /app

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# ---- runtime ---------------------------------------------------------------
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl tini \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 10001 agri

COPY --from=deps /opt/venv /opt/venv
COPY app ./app

USER agri
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=4s --start-period=15s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
