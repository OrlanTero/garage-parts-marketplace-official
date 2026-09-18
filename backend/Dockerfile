# Production Dockerfile for Garage Parts Marketplace API
# Multi-stage optimized PHP 8.2-FPM + Nginx on Alpine Linux

FROM php:8.2-fpm-alpine

# Set working directory
WORKDIR /var/www/html

# Install system dependencies and PHP extensions required for Laravel 11/12, MySQL PDO, GD, Zip, BCMath, and Opcache
RUN apk add --no-cache \
    nginx \
    curl \
    git \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    ca-certificates \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo pdo_mysql gd zip bcmath opcache

# Install latest stable Composer binary
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configure PHP production opcache and memory settings
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.enable_cli=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.interned_strings_buffer=8" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.revalidate_freq=2" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.fast_shutdown=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "memory_limit=-1" >> /usr/local/etc/php/conf.d/docker-php-ext-memory.ini

# Copy composer manifest files first for caching layers
COPY composer.json composer.lock* ./

# Set Composer environment variables for non-root CI build and unlimited memory
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1

# Install composer dependencies without dev packages
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress

# Copy application source code
COPY . .

# Finish composer autoload dump and optimization
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Ensure proper storage directories and permissions
RUN mkdir -p storage/framework/sessions \
             storage/framework/views \
             storage/framework/cache \
             storage/app/public \
             bootstrap/cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Copy Nginx configuration and entrypoint script
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose HTTP port for Render / Koyeb / Docker
EXPOSE 80 10000

# Execute entrypoint
CMD ["/usr/local/bin/docker-entrypoint.sh"]
