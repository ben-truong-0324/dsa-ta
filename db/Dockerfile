# db/Dockerfile
FROM postgres:15

ENV POSTGRES_USER=dsa_ta
ENV POSTGRES_PASSWORD=dsa_ta
ENV POSTGRES_DB=dsa_ta_db

COPY init.sql /docker-entrypoint-initdb.d/
