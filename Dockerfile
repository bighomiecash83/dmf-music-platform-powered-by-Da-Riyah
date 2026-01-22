FROM alpine:3.19

WORKDIR /app

COPY README.md ./

CMD ["sh", "-c", "echo \"Build container ready\" && sleep infinity"]
