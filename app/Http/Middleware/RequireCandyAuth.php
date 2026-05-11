<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireCandyAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if ((bool) $request->session()->get('candy_authenticated', false)) {
            return $next($request);
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Session login sudah habis. Silakan login ulang.',
            ], 401);
        }

        return redirect()->guest(route('login'));
    }
}
