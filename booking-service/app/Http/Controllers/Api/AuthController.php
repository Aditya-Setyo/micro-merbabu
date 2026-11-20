<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|alpha_dash|unique:users,username',
            'email' => 'required|email|unique:users,email',
            'password' => [
                'required',
                'confirmed',
                \Illuminate\Validation\Rules\Password::min(8)
            ],
            'nik' => 'required|string|size:16|unique:users,nik',
            'identity_file' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'birth_date' => 'required|date|before:today',
            'phone' => 'required|string|max:20',
            'emergency_phone' => 'required|string|max:20',
            'gender' => 'required|in:Laki-laki,Perempuan',
            'weight' => 'required|numeric|min:1|max:300',
            'height' => 'required|numeric|min:1|max:250',
            'province' => 'required|string',
            'city' => 'required|string',
            'district' => 'required|string',
            'village' => 'required|string',
            'address' => 'required|string',
        ]);

        $path = $request->file('identity_file')->store('identities', 'local');

        // Bikin ID_Code otomatis, misal MB-XXXXXX, unik
        do {
            $idCode = 'MB-' . Str::upper(Str::random(6));
        } while (User::where('id_code', $idCode)->exists());

        try {
            $user = User::create([
                'name' => $validated['name'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'id_code' => $idCode,
                'nik' => $validated['nik'],
                'identity_type' => 'KTP',
                'identity_file' => $path,
                'birth_date' => $validated['birth_date'],
                'phone' => $validated['phone'],
                'emergency_phone' => $validated['emergency_phone'],
                'gender' => $validated['gender'],
                'weight' => $validated['weight'],
                'height' => $validated['height'],
                'province' => $validated['province'],
                'city' => $validated['city'],
                'district' => $validated['district'],
                'village' => $validated['village'],
                'address' => $validated['address'],
                'role' => 'hiker',
                'verification_status' => 'PENDING',
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Storage::disk('local')->delete($path);
            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil. Simpan ID_Code kamu untuk booking rombongan.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'id_code' => $user->id_code,
                'verification_status' => $user->verification_status,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->login)
            ->orWhere('email', $request->login)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Username/email atau password salah.'
            ], 401);
        }

        if ($user->role !== 'hiker') {
            return response()->json([
                'success' => false,
                'message' => 'Akun ini tidak dapat login sebagai pendaki.'
            ], 403);
        }

        if ($user->verification_status !== 'VERIFIED') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum diverifikasi petugas.'
            ], 403);
        }

        $token = $user->createToken('hiker-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'token' => $token,
            'data' => $user
        ]);
    }

    public function profile(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()
        ]);
    }

    // =====================================================
    // BARU: CARI USER VIA ID_Code UNTUK BOOKING ROMBONGAN
    // Dipakai frontend BookingPage: GET /api/users/by-id-code/{id_code}
    // Ketua ketik ID_Code anggota, backend ambil data dari registrasi
    // =====================================================
    public function byIdCode($id_code)
    {
        // ID_Code di DB kamu: id_code, format MB-XXXXXX (6 karakter random)
        // Trim + uppercase biar MB-abc123 tetap ketemu MB-ABC123
        $code = strtoupper(trim($id_code));

        $user = User::where('id_code', $code)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'ID_Code tidak ditemukan di data registrasi. Cek lagi ID_Code anggota.'
            ], 404);
        }

        // Hanya yang sudah VERIFIED yang boleh ikut rombongan
        // Kalau masih PENDING, tolak biar tidak lolos ke booking
        if ($user->verification_status !== 'VERIFIED') {
            return response()->json([
                'success' => false,
                'message' => 'Akun dengan ID_Code ini belum diverifikasi petugas.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'id_code' => $user->id_code,
                'nik' => $user->nik,
                'phone' => $user->phone,
                'emergency_phone' => $user->emergency_phone,
                'address' => $user->address,
                'birth_date' => $user->birth_date,
                'gender' => $user->gender,
                'weight' => $user->weight,
                'height' => $user->height,
                'verification_status' => $user->verification_status,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.'
        ]);
    }
}
