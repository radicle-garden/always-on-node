FROM node:alpine AS build

ADD . /app
WORKDIR /app

RUN rm -rf /app/node_modules
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm run build

FROM nginx:stable
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html