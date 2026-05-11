<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">

        <title>Login - Candy AI</title>

        @vite(['resources/css/app.css'])
    </head>
    <body class="candy-theme">
        <main class="login-page">
            <section class="login-panel">
                <div class="login-brand">
                    <img class="brand-mark" src="/candy/1e2a3216-0dfb-4f6e-8533-4505b5704205.png" alt="Candy AI">
                    <div>
                        <h1>Candy AI</h1>
                        <p>Pink companion workspace.</p>
                    </div>
                </div>

                <form class="login-form" method="POST" action="{{ route('login.store') }}">
                    @csrf

                    <label class="field">
                        <span>Username</span>
                        <input type="text" name="username" value="{{ old('username') }}" autocomplete="username" autofocus required>
                    </label>

                    <label class="field">
                        <span>Password</span>
                        <input type="password" name="password" autocomplete="current-password" required>
                    </label>

                    @error('username')
                        <div class="login-error">{{ $message }}</div>
                    @enderror

                    <button class="login-button" type="submit">Login</button>
                </form>
            </section>

            <aside class="login-hero">
                <img src="/candy/4fbfa249-583b-42b0-927b-f9dde29ebb6e.png" alt="Candy">
                <div>
                    <span>Candy desk</span>
                    <strong>Smart. Playful. Unstoppable.</strong>
                </div>
            </aside>
        </main>
    </body>
</html>
