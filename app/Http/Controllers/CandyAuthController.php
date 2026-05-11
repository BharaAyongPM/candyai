<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CandyAuthController extends Controller
{
    public function show(Request $request): View|RedirectResponse
    {
        if ((bool) $request->session()->get('candy_authenticated', false)) {
            return redirect()->route('candy.home');
        }

        return view('login');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (! $this->validCredentials($credentials['username'], $credentials['password'])) {
            return back()
                ->withErrors(['username' => 'Username atau password salah.'])
                ->onlyInput('username');
        }

        $request->session()->regenerate();
        $request->session()->put('candy_authenticated', true);
        $request->session()->put('candy_username', $credentials['username']);

        return redirect()->intended(route('candy.home'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->session()->forget(['candy_authenticated', 'candy_username']);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    private function validCredentials(string $username, string $password): bool
    {
        return hash_equals((string) config('candy.auth_username'), $username)
            && hash_equals((string) config('candy.auth_password'), $password);
    }
}
