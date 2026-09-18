#!/bin/sh
set -e

echo "=== Garage Parts Marketplace — Production Backend Container Startup ==="

# 1. Update Nginx listening port if $PORT environment variable is provided (Render / Koyeb)
PORT="${PORT:-80}"
echo "Configuring Nginx to listen on port: $PORT"
sed -i "s/listen 80 default_server;/listen $PORT default_server;/g" /etc/nginx/nginx.conf
sed -i "s/listen \[::\]:80 default_server;/listen [::]:$PORT default_server;/g" /etc/nginx/nginx.conf

# 2. Clean any stale cache files and ensure storage and bootstrap directories exist
rm -f /var/www/html/bootstrap/cache/*.php
mkdir -p /var/www/html/storage/logs \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/framework/cache \
         /var/www/html/storage/app/public \
         /var/www/html/bootstrap/cache

touch /var/www/html/storage/logs/laravel.log

# 3. Discover packages and create storage symlink
php artisan package:discover --ansi || true
php artisan storage:link --force || true

# 4. Optional Auto-Migration and Seeding (if enabled via env)
if [ "$AUTO_MIGRATE" = "true" ] || [ "$AUTO_MIGRATE" = "1" ]; then
    echo "Running database migrations..."
    php artisan migrate --force || echo "Migration warning: check database connection."
fi

if [ "$AUTO_SEED" = "true" ] || [ "$AUTO_SEED" = "1" ]; then
    echo "Running database seeders..."
    php artisan db:seed --force || echo "Seeding warning: check database records."
fi

# 5. Optimize Laravel caches for production
if [ "$APP_ENV" = "production" ]; then
    echo "Caching Laravel configuration and routes..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# 6. Final ownership & permissions fix right before starting web & php processes
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache

# 7. Start PHP-FPM in background
echo "Starting PHP-FPM..."
php-fpm -D

# 8. Start Nginx in foreground
echo "Starting Nginx web server on port $PORT..."
exec nginx -g "daemon off;"
