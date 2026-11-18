<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyQuota;
use App\Models\HikingRoute;
use Illuminate\Http\Request;

class HikingRouteController extends Controller
{
    public function index()
    {
        $routes = HikingRoute::where('is_active', true)
            ->orderBy('id')
            ->get([
                'id',
                'name',
                'basecamp',
                'location',
                'description',
                'rules',
                'ticket_price',
                'is_active'
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Data jalur pendakian berhasil diambil.',
            'data' => $routes
        ]);
    }

    /**
     * Menampilkan detail satu jalur.
     */
    public function show($id)
    {
        $route = HikingRoute::where('is_active', true)
            ->find($id);

        if (!$route) {
            return response()->json([
                'success' => false,
                'message' => 'Jalur pendakian tidak ditemukan.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $route
        ]);
    }

    /**
     * Mengecek kuota jalur pada tanggal tertentu.
     */
    public function quota(Request $request, $id)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d|after_or_equal:today'
        ]);

        $route = HikingRoute::where('is_active', true)
            ->find($id);

        if (!$route) {
            return response()->json([
                'success' => false,
                'message' => 'Jalur pendakian tidak ditemukan.'
            ], 404);
        }

        $quota = DailyQuota::where('hiking_route_id', $route->id)
            ->where('booking_date', $validated['date'])
            ->first();

        $quotaTotal = $quota?->quota_total ?? 300;
        $quotaUsed = $quota?->quota_used ?? 0;

        return response()->json([
            'success' => true,
            'message' => 'Informasi kuota berhasil diambil.',
            'data' => [
                'route_id' => $route->id,
                'route_name' => $route->name,
                'booking_date' => $validated['date'],
                'quota_total' => $quotaTotal,
                'quota_used' => $quotaUsed,
                'quota_remaining' => max(0, $quotaTotal - $quotaUsed),
                'is_available' => $quotaUsed < $quotaTotal
            ]
        ]);
    }
}
