#!/bin/sh
set -e

echo "=== Garage Parts Marketplace — Production Backend Container Startup ==="

# 1. Update Nginx listening port if $PORT environment variable is provided (Render / Koyeb)
PORT="${PORT:-80}"
echo "Configuring Nginx to listen on port: $PORT"
sed -i "s/listen 80 default_server;/listen $PORT default_server;/g" /etc/nginx/nginx.conf
sed -i "s/listen \[::\]:80 default_server;/listen [::]:$PORT default_server;/g" /etc/nginx/nginx.conf

# 2. Ensure storage and bootstrap permissions
mkdir -p /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/framework/cache \
         /var/www/html/storage/app/public \
         /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 3. Create storage symlink
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

# 6. Start PHP-FPM in background
echo "Starting PHP-FPM..."
php-fpm -D

# 7. Start Nginx in foreground
echo "Starting Nginx web server on port $PORT..."
exec nginx -g "daemon off;"
