<?php

namespace App\Http\Controllers;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class CandyProxyController extends Controller
{
    public function settings(): JsonResponse
    {
        return response()->json([
            'baseUrl' => config('candy.base_url'),
            'gatewayLabel' => config('candy.gateway_label'),
            'hasApiKey' => filled(config('candy.api_key')),
            'defaultChatModel' => config('candy.default_chat_model'),
            'defaultImageModel' => config('candy.default_image_model'),
            'defaultMaxTokens' => config('candy.default_max_tokens'),
            'maxTokens' => config('candy.max_tokens'),
        ]);
    }

    public function models(): JsonResponse
    {
        if ($error = $this->missingApiKey()) {
            return $error;
        }

        $response = Http::acceptJson()
            ->withToken($this->apiKey())
            ->timeout(30)
            ->get($this->url('/v1/models'));

        return response()->json($response->json(), $response->status());
    }

    public function chat(Request $request): JsonResponse|StreamedResponse
    {
        if ($error = $this->missingApiKey()) {
            return $error;
        }

        $maxTokens = (int) config('candy.max_tokens', 32000);

        $validated = $request->validate([
            'model' => ['required', 'string', 'max:160'],
            'system' => ['nullable', 'string', 'max:12000'],
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'in:user,assistant,system'],
            'messages.*.content' => ['required'],
            'messages.*.content.*.type' => ['nullable', 'string', 'in:text,image_url'],
            'messages.*.content.*.text' => ['nullable', 'string', 'max:120000'],
            'messages.*.content.*.image_url.url' => ['nullable', 'string', 'max:5000000'],
            'reasoning_effort' => ['nullable', 'in:low,medium,high,max'],
            'max_tokens' => ['nullable', 'integer', 'min:128', 'max:'.$maxTokens],
        ]);

        $messages = $this->chatMessagesWithPersona(
            $validated['messages'],
            trim((string) ($validated['system'] ?? '')),
        );

        $payload = [
            'model' => $validated['model'],
            'messages' => $messages,
        ];

        if (! empty($validated['reasoning_effort'])) {
            $payload['reasoning_effort'] = $validated['reasoning_effort'];
        }

        $payload['max_tokens'] = $validated['max_tokens'] ?? config('candy.default_max_tokens');

        return $this->proxyText('/v1/chat/completions', $payload);
    }

    public function responses(Request $request): JsonResponse|StreamedResponse
    {
        if ($error = $this->missingApiKey()) {
            return $error;
        }

        $maxTokens = (int) config('candy.max_tokens', 32000);

        $validated = $request->validate([
            'model' => ['required', 'string', 'max:160'],
            'instructions' => ['nullable', 'string', 'max:12000'],
            'input' => ['required', 'string'],
            'reasoning_effort' => ['nullable', 'in:low,medium,high,max'],
            'max_output_tokens' => ['nullable', 'integer', 'min:128', 'max:'.$maxTokens],
        ]);

        $payload = [
            'model' => $validated['model'],
            'instructions' => $this->instructionsWithPersona($validated['instructions'] ?? ''),
            'input' => $validated['input'],
        ];

        if (! empty($validated['reasoning_effort'])) {
            $payload['reasoning_effort'] = $validated['reasoning_effort'];
        }

        $payload['max_output_tokens'] = $validated['max_output_tokens'] ?? config('candy.default_max_tokens');

        return $this->proxyText('/v1/responses', $payload);
    }

    public function images(Request $request): JsonResponse
    {
        if ($error = $this->missingApiKey()) {
            return $error;
        }

        $validated = $request->validate([
            'model' => ['required', 'string', 'max:160'],
            'prompt' => ['required', 'string', 'max:8000'],
            'size' => ['nullable', 'string', 'max:32'],
            'n' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $payload = [
            'model' => $validated['model'],
            'prompt' => $validated['prompt'],
            'size' => $validated['size'] ?? '1024x1024',
            'n' => $validated['n'] ?? 1,
        ];

        $response = Http::acceptJson()
            ->asJson()
            ->withToken($this->apiKey())
            ->timeout(180)
            ->post($this->url('/v1/images/generations'), $payload);

        return response()->json($response->json(), $response->status());
    }

    private function stream(string $path, array $payload): StreamedResponse
    {
        $payload['stream'] = true;

        return response()->stream(function () use ($path, $payload): void {
            @set_time_limit(0);

            try {
                $client = new Client([
                    'connect_timeout' => 20,
                    'read_timeout' => 0,
                    'timeout' => 0,
                    'http_errors' => false,
                ]);

                $upstream = $client->post($this->url($path), [
                    'headers' => [
                        'Accept' => 'text/event-stream',
                        'Authorization' => 'Bearer '.$this->apiKey(),
                        'Content-Type' => 'application/json',
                    ],
                    'json' => $payload,
                    'stream' => true,
                ]);

                if ($upstream->getStatusCode() >= 400) {
                    $body = (string) $upstream->getBody();
                    $this->sendEvent('error', [
                        'message' => $body !== '' ? $body : 'Upstream request failed.',
                        'status' => $upstream->getStatusCode(),
                    ]);

                    return;
                }

                $body = $upstream->getBody();

                while (! $body->eof()) {
                    if (connection_aborted()) {
                        return;
                    }

                    try {
                        $chunk = $body->read(8192);
                    } catch (RuntimeException $exception) {
                        $this->sendEvent('error', [
                            'message' => 'Koneksi streaming dari server AI terputus sebelum respons selesai. Teks yang tampil mungkin belum lengkap, silakan kirim ulang pertanyaan.',
                            'detail' => app()->hasDebugModeEnabled() ? $exception->getMessage() : null,
                        ]);

                        return;
                    }

                    if ($chunk === '') {
                        usleep(10000);

                        continue;
                    }

                    echo $chunk;
                    $this->flush();
                }
            } catch (GuzzleException $exception) {
                $this->sendEvent('error', [
                    'message' => $exception->getMessage(),
                ]);
            } catch (Throwable $exception) {
                $this->sendEvent('error', [
                    'message' => 'Proxy gagal membaca respons AI: '.$exception->getMessage(),
                ]);
            }
        }, 200, $this->streamHeaders());
    }

    private function proxyText(string $path, array $payload): StreamedResponse
    {
        if (config('candy.stream_upstream')) {
            return $this->stream($path, $payload);
        }

        return $this->completeAsStream($path, $payload);
    }

    private function completeAsStream(string $path, array $payload): StreamedResponse
    {
        $payload['stream'] = false;

        return response()->stream(function () use ($path, $payload): void {
            @set_time_limit(0);

            try {
                $response = Http::acceptJson()
                    ->asJson()
                    ->withToken($this->apiKey())
                    ->timeout((int) config('candy.request_timeout', 600))
                    ->post($this->url($path), $payload);

                if ($response->failed()) {
                    $this->sendEvent('error', [
                        'message' => $this->errorMessage($response->json(), $response->body()),
                        'status' => $response->status(),
                    ]);

                    return;
                }

                $json = $response->json();

                if (! is_array($json)) {
                    $this->sendEvent('error', [
                        'message' => 'Server AI mengembalikan respons kosong atau bukan JSON.',
                    ]);

                    return;
                }

                $this->sendEvent('message', $json);
                $this->sendDone();
            } catch (Throwable $exception) {
                $this->sendEvent('error', [
                    'message' => 'Proxy gagal membaca respons AI: '.$exception->getMessage(),
                ]);
            }
        }, 200, $this->streamHeaders());
    }

    private function sendEvent(string $event, array $payload): void
    {
        echo 'event: '.$event."\n";
        echo 'data: '.json_encode($payload)."\n\n";
        $this->flush();
    }

    private function sendDone(): void
    {
        echo "data: [DONE]\n\n";
        $this->flush();
    }

    private function streamHeaders(): array
    {
        return [
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'Content-Type' => 'text/event-stream',
            'X-Accel-Buffering' => 'no',
        ];
    }

    private function errorMessage(mixed $json, string $body): string
    {
        if (is_array($json)) {
            $message = data_get($json, 'error.message')
                ?? data_get($json, 'message')
                ?? json_encode($json);

            return is_string($message) && $message !== '' ? $message : 'Upstream request failed.';
        }

        return $body !== '' ? $body : 'Upstream request failed.';
    }

    private function flush(): void
    {
        if (ob_get_level() > 0) {
            ob_flush();
        }

        flush();
    }

    private function url(string $path): string
    {
        return config('candy.base_url').$path;
    }

    private function chatMessagesWithPersona(array $messages, string $system): array
    {
        $persona = $this->persona();
        $systemParts = [$persona];

        if ($system !== '') {
            $systemParts[] = 'Instruksi tambahan pengguna aplikasi: '.$system;
        }

        array_unshift($messages, [
            'role' => 'system',
            'content' => implode("\n\n", $systemParts),
        ]);

        return $messages;
    }

    private function instructionsWithPersona(string $instructions): string
    {
        $instructions = trim($instructions);

        if ($instructions === '') {
            return $this->persona();
        }

        return $this->persona()."\n\nInstruksi tambahan pengguna aplikasi: ".$instructions;
    }

    private function persona(): string
    {
        return trim((string) config('candy.persona'));
    }

    private function apiKey(): string
    {
        return (string) config('candy.api_key');
    }

    private function missingApiKey(): ?JsonResponse
    {
        if (filled(config('candy.api_key'))) {
            return null;
        }

        return response()->json([
            'message' => 'CANDY_AI_API_KEY belum diisi di .env.',
        ], 422);
    }
}
