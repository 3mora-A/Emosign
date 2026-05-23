<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $remember = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            $request->session()->regenerate();

            $redirect = auth()->user()->role === 'admin'
                ? '/admin/dashboard'
                : '/upload';

            if ($request->expectsJson()) {
                // Determine message based on user's preferred language or app locale
                $locale = auth()->user()->preferred_language ?? app()->getLocale();
                $message = $locale === 'en' ? 'Signed in successfully.' : 'تم تسجيل الدخول بنجاح.';

                return response()->json([
                    'ok' => true,
                    'message' => $message,
                    'redirect' => $redirect,
                ]);
            }

            return redirect()->intended($redirect);
        }

        if ($request->expectsJson()) {
            $locale = app()->getLocale();
            $message = $locale === 'en' ? 'Invalid login credentials.' : 'بيانات الدخول غير صحيحة.';
            
            return response()->json([
                'ok' => false,
                'message' => $message,
            ], 422);
        }

        return back()->with('error', 'بيانات الدخول غير صحيحة.');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'redirect' => '/login',
            ]);
        }

        return redirect('/login');
    }
}
