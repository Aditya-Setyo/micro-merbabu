<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'va_number',
        'amount',
        'status',
    ];

    public function otps()
    {
        return $this->hasMany(PaymentOtp::class);
    }
}
