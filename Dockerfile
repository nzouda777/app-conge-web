FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Quelle interface est construite : `agent` (personnel, PWA) ou `admin`
# (console d'administration). Les deux partent du MÊME code source et
# produisent deux images distinctes, servies sur deux noms d'hôte — ce qui
# isole leurs cookies de session.
ARG APP_SURFACE=agent
ENV APP_SURFACE=$APP_SURFACE

# Vite fige les variables VITE_* dans le bundle au moment du build.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# L'interface d'administration sort sous `admin.html` (point d'entrée distinct).
# nginx sert `index.html` : on renomme, et on retire les fichiers de PWA — une
# console d'administration n'a pas vocation à être installée sur un écran
# d'accueil, ni à conserver quoi que ce soit en cache.
RUN if [ "$APP_SURFACE" = "admin" ]; then \
      mv dist/admin.html dist/index.html && \
      rm -f dist/manifest.webmanifest dist/sw.js dist/offline.html && \
      rm -rf dist/icons; \
    fi

FROM nginx:1.27-alpine AS runtime
ARG APP_SURFACE=agent
ARG VITE_API_URL=/api
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Gardé hors de conf.d/ pour que le `include conf.d/*.conf` de nginx ne le
# charge pas comme un bloc http égaré — il est inclus explicitement par
# location.
COPY security-headers.conf /etc/nginx/security-headers.conf

# La politique de contenu doit autoriser l'origine que l'interface appelle
# réellement. En production elle est relative (/api, même origine) : le
# marqueur disparaît et la politique reste stricte. En développement, l'API
# est sur un autre port, donc une autre origine : son adresse est inscrite
# dans `connect-src`, faute de quoi le navigateur bloque chaque appel avant
# même qu'il parte.
RUN case "$VITE_API_URL" in       http*) ORIGIN=$(printf '%s' "$VITE_API_URL" | cut -d/ -f1-3) ;;       *)     ORIGIN="" ;;     esac;     sed -i "s|__API_ORIGIN__|$ORIGIN|" /etc/nginx/security-headers.conf;     echo "connect-src autorise : 'self' $ORIGIN"

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
