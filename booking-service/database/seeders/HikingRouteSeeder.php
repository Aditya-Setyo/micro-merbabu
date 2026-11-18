<?php

namespace Database\Seeders;


use Illuminate\Database\Seeder;
use App\Models\HikingRoute;

class HikingRouteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $routes = [
            [
                'name' => 'Jalur Selo',
                'basecamp' => 'Basecamp Selo',
                'location' => 'Boyolali',
                'description' => 'Jalur pendakian melalui wilayah Selo.',
                'ticket_price' => 0, // masukan tarif resmi dari pengelola jika sudah ada
            ],
            [
                'name' => 'Jalur Suwanting',
                'basecamp' => 'Basecamp Suwanting',
                'location' => 'Magelang',
                'description' => 'Jalur pendakian melalui Suwanting.',
                'ticket_price' => 0,
            ],
            [
                'name' => 'Jalur Wekas',
                'basecamp' => 'Basecamp Wekas',
                'location' => 'Magelang',
                'description' => 'Jalur pendakian melalui Wekas.',
                'ticket_price' => 0,
            ],
            [
                'name' => 'Jalur Thekelan',
                'basecamp' => 'Basecamp Thekelan',
                'location' => 'Semarang',
                'description' => 'Jalur pendakian melalui Thekelan.',
                'ticket_price' => 0,
            ],
            [
                'name' => 'Jalur Cuntel',
                'basecamp' => 'Basecamp Cuntel',
                'location' => 'Semarang',
                'description' => 'Jalur pendakian melalui Cuntel.',
                'ticket_price' => 0,
            ],
        ];

        foreach ($routes as $route) {
            HikingRoute::updateOrCreate(
                ['name' => $route['name']],
                array_merge($route, [
                    'is_active' => true,
                ])
            );
        }
    }
}
