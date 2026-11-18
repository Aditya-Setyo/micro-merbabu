<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyQuota extends Model
{
    protected $fillable = [
        'hiking_route_id',
        'booking_date',
        'quota_total',
        'quota_used',
    ];

    protected $casts = [
        'booking_date' => 'date',
    ];

    public function route()
    {
        return $this->belongsTo(HikingRoute::class, 'hiking_route_id');
    }

    public function getQuotaAvailableAttribute()
    {
        return max(0, $this->quota_total - $this->quota_used);
    }
}
