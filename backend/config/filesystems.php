<?php

return [

    'default' => env('FILESYSTEM_DISK', 'public'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => false,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // AWS Elastic File System (EFS)
        // Set FILESYSTEM_DISK=efs to enable AWS EFS storage.
        // Mounts via NFS/Access Point (e.g. /mnt/efs, /var/www/html/storage/app/public, or local mount path)
        'efs' => [
            'driver' => 'local',
            'root' => env('AWS_EFS_MOUNT_PATH', storage_path('app/public')),
            'url' => env('AWS_EFS_URL', env('APP_URL').'/storage'),
            'visibility' => 'public',
            'throw' => false,
            'filesystem_id' => env('AWS_EFS_FILESYSTEM_ID', 'fs-09f27049f75b949db'),
            'arn' => env('AWS_EFS_ARN', 'arn:aws:elasticfilesystem:ap-southeast-2:285150348650:file-system/fs-09f27049f75b949db'),
            'access_point_arn' => env('AWS_EFS_ACCESS_POINT_ARN', 'arn:aws:elasticfilesystem:ap-southeast-2:285150348650:access-point/fsap-042f0d387ab010679'),
            'dns' => env('AWS_EFS_DNS', 'fs-09f27049f75b949db.efs.ap-southeast-2.amazonaws.com'),
            'region' => env('AWS_EFS_REGION', 'ap-southeast-2'),
        ],

        // AWS S3 or S3-compatible (MinIO, DigitalOcean Spaces, etc.)
        // Set FILESYSTEM_DISK=s3 + AWS_* vars to enable.
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
