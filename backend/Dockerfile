FROM alpine:latest

ARG PB_VERSION=0.29.3

RUN apk add --no-cache unzip ca-certificates

# PocketBase holen
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && chmod +x /pb/pocketbase

# Arbeitsverzeichnis -> pb_data wird hier erzeugt
WORKDIR /pb

# Migrations in das Image legen
# (Dein Ordner sollte z. B. 1756629673_collections_snapshot.js enthalten)
COPY ./pb_migrations /pb/pb_migrations

# Laufzeit: nur noch Server starten
EXPOSE 8080
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]