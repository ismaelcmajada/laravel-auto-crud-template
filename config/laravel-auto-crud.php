<?php

return [
    'timezone' => 'Atlantic/Canary',

    /*
     * Número máximo de resultados que devuelve el autocompletado server-side
     * (/laravel-auto-crud/{model}/load-autocomplete-items).
     */
    'autocomplete_limit' => 6,

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
