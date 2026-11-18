<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('booking_id');
            $table->string('va_number')->unique();
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['PENDING', 'SUCCESS', 'EXPIRED', 'FAILED'])->default('PENDING');
            $table->timestamps();
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
