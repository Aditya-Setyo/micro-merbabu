<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FaultInjectionController extends Controller
{
    // POST /api/fault-inject/enable { "type": "latency" atau "error" }
    public function enable(Request $request)
    {
        $request->validate(['type' => 'required|in:latency,error']);
        Cache::put('fault_injection', $request->type, 3600);
        return response()->json([
            'success' => true,
            'message' => 'Fault injection aktif: ' . $request->type,
            'type' => $request->type,
        ]);
    }

    // POST /api/fault-inject/disable
    public function disable()
    {
        Cache::forget('fault_injection');
        return response()->json(['success' => true, 'message' => 'Fault injection dimatikan']);
    }

    // GET /api/fault-inject/status
    public function status()
    {
        return response()->json([
            'success' => true,
            'fault_injection' => Cache::get('fault_injection', 'none'),
        ]);
    }
}
