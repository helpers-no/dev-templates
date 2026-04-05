# filename: templates/python-basic-webserver-database/Dockerfile
# Docker image for the Python Flask web application with PostgreSQL

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["python", "app/app.py"]
