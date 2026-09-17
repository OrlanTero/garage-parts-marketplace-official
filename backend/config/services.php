<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services — OAuth (Socialite)
    |--------------------------------------------------------------------------
    | Providers enabled for session-module OAuth login.
    | Add more (apple, facebook, github, ...) by appending entries here
    | + allowlisting them in OAuthController::ALLOWED.
    */

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/api/v1/auth/oauth/google/callback'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', env('APP_URL').'/api/v1/auth/oauth/facebook/callback'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI', env('APP_URL').'/api/v1/auth/oauth/github/callback'),
    ],

];
