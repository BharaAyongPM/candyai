<?php

return [
    'base_url' => rtrim(env('ENOWXAI_BASE_URL', 'http://192.168.100.75:1430'), '/'),
    'api_key' => env('ENOWXAI_API_KEY'),
    'default_chat_model' => env('ENOWXAI_DEFAULT_CHAT_MODEL', 'claude-sonnet-4.5'),
    'default_image_model' => env('ENOWXAI_DEFAULT_IMAGE_MODEL', 'canva-image'),
    'default_max_tokens' => (int) env('ENOWXAI_DEFAULT_MAX_TOKENS', 12000),
    'max_tokens' => (int) env('ENOWXAI_MAX_TOKENS', 32000),
    'stream_upstream' => filter_var(env('ENOWXAI_STREAM_UPSTREAM', false), FILTER_VALIDATE_BOOL),
    'request_timeout' => (int) env('ENOWXAI_REQUEST_TIMEOUT', 600),
    'auth_username' => env('CANDY_AUTH_USERNAME', 'ziezie'),
    'auth_password' => env('CANDY_AUTH_PASSWORD', 'purnamustika'),
];
