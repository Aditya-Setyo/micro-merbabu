<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HikingRoute extends Model
{
    protected $fillable = [
        'name',
        'basecamp',
        'location',
        'description',
        'rules',
        'ticket_price',
        'is_active',
    ];

    public function quotas()
    {
        return $this->hasMany(DailyQuota::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
