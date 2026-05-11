<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_home_redirects_to_login_when_not_authenticated(): void
    {
        $response = $this->get('/');

        $response->assertRedirect('/login');
    }

    public function test_user_can_login_and_open_home(): void
    {
        config([
            'candy.auth_username' => 'ziezie',
            'candy.auth_password' => 'purnamustika',
        ]);

        $this->post('/login', [
            'username' => 'ziezie',
            'password' => 'purnamustika',
        ])->assertRedirect('/');

        $this->withSession(['candy_authenticated' => true])
            ->get('/')
            ->assertOk();
    }
}
