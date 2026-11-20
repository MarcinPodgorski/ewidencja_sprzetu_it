# nginx z konfiguracją reverse proxy dla aplikacji (docker-compose.yml, usługa „nginx”).
# Konfiguracja jest wbudowana w obraz, a nie montowana z dysku: po `git pull` zmieniony plik
# przebuduje obraz i `docker compose up -d --build` od razu go wczyta (zamontowanego pliku
# compose nie przeładowuje).
FROM nginx:stable-alpine
COPY sprzet-it.conf /etc/nginx/conf.d/default.conf
