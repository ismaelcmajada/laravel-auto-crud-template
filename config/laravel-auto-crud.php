<?php

return [
    'timezone' => 'Atlantic/Canary',

    'web' => [
        'enabled' => true,
        'prefix' => 'laravel-auto-crud',
        'middleware' => ['web'],
        'protected_middleware' => ['auth', 'checkForbiddenActions'],
    ],

    'api' => [
        'enabled' => false,
        'prefix' => 'api/laravel-auto-crud',
        'middleware' => ['forceJsonResponse', 'api', 'auth:sanctum', 'checkForbiddenActions'],
        'public_middleware' => null,
    ],
];
