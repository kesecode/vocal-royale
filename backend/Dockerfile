FROM alpine:latest

ARG PB_VERSION=0.29.3

RUN apk add --no-cache unzip ca-certificates curl

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && chmod +x /pb/pocketbase

WORKDIR /pb
COPY ./pb_migrations /pb/pb_migrations
COPY ./startup.sh /pb/startup.sh
RUN chmod +x /pb/startup.sh

EXPOSE 8090

ENTRYPOINT ["/pb/startup.sh"]