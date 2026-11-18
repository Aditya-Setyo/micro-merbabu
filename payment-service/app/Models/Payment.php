<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\PaymentOtp;

class Payment extends Model
{
    protected $fillable = [
        'booking_id',
        'booking_code',
        'customer_email',
        'payment_code',
        'amount',
        'status',
        'payment_method',
        'virtual_account_number',
        'gateway_reference',
        'failure_reason',
        'expires_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function otps(): HasMany
    {
        return $this->hasMany(PaymentOtp::class);
    }
}
