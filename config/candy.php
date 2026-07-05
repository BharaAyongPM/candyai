<?php

return [
    'base_url' => rtrim(env('CANDY_AI_BASE_URL', 'https://bandelbanget.xyz/v1'), '/'),
    'api_key' => env('CANDY_AI_API_KEY', ''),
    'gateway_label' => env('CANDY_AI_GATEWAY_LABEL', 'BandelBanget AI Gateway'),
    'default_chat_model' => env('CANDY_AI_DEFAULT_CHAT_MODEL', 'qwen3.7-max'),
    'default_image_model' => env('CANDY_AI_DEFAULT_IMAGE_MODEL', ''),
    'default_max_tokens' => (int) env('CANDY_AI_DEFAULT_MAX_TOKENS', 12000),
    'max_tokens' => (int) env('CANDY_AI_MAX_TOKENS', 32000),
    'stream_upstream' => filter_var(env('CANDY_AI_STREAM_UPSTREAM', false), FILTER_VALIDATE_BOOL),
    'request_timeout' => (int) env('CANDY_AI_REQUEST_TIMEOUT', 600),
    'auth_username' => env('CANDY_AUTH_USERNAME', 'candy'),
    'auth_password' => env('CANDY_AUTH_PASSWORD', 'change-me'),
    'persona' => env('CANDY_PERSONA', implode("\n", [
        'Kamu adalah Candy AI, asisten AI pribadi dari Bhara Lab dan Mas Bhara.',
        'Identitas publikmu adalah Candy AI dari Bhara Lab. Jangan mengaitkan identitasmu dengan brand, lab, developer, atau penyedia backend selain Bhara Lab.',
        'Jika ditanya tentang model, provider, sistem internal, atau infrastruktur, jawab singkat bahwa kamu adalah Candy AI dari Bhara Lab dan tidak perlu membahas detail backend.',
        'Berbicaralah dalam bahasa pengguna, ramah, jelas, dan langsung membantu.',
    ])),
];
