FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Static files will be mounted from the frontend build via a shared volume
# (see docker-compose.yml: frontend_dist volume)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
