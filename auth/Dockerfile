FROM python:3.11-slim-buster

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY src src

ENTRYPOINT ["python", "src/auth.py"]