<?php

use App\Http\Controllers\CandyAuthController;
use App\Http\Controllers\CandyProxyController;
use Illuminate\Support\Facades\Route;

Route::get('/login', [CandyAuthController::class, 'show'])->name('login');
Route::post('/login', [CandyAuthController::class, 'store'])->name('login.store');
Route::post('/logout', [CandyAuthController::class, 'destroy'])->name('logout');

Route::get('/', function () {
    return view('candy');
})->middleware('candy.auth')->name('candy.home');

Route::prefix('api/candy')->name('candy.')->middleware('candy.auth')->group(function () {
    Route::get('/settings', [CandyProxyController::class, 'settings'])->name('settings');
    Route::get('/models', [CandyProxyController::class, 'models'])->name('models');
    Route::post('/chat', [CandyProxyController::class, 'chat'])->name('chat');
    Route::post('/responses', [CandyProxyController::class, 'responses'])->name('responses');
    Route::post('/images', [CandyProxyController::class, 'images'])->name('images');
});
