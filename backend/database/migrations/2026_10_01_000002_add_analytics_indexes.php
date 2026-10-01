<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Analytics & reporting hot-path indexes. The analytics overview,
     * car-transaction desk, and fulfillment filters all range-scan
     * created_at and filter on lifecycle columns. Defensive: only adds
     * indexes that don't already exist (older migrations covered some).
     */
    public function up(): void
    {
        $this->ensureIndexes('orders', [
            'created_at' => ['created_at'],
            'item_type' => ['item_type'],
            'payment_status' => ['payment_status'],
            'proof_status' => ['proof_status'],
            'status_created' => ['status', 'created_at'],
            'item_type_status' => ['item_type', 'status'],
        ]);

        $this->ensureIndexes('users', [
            'role' => ['role'],
        ]);
    }

    public function down(): void
    {
        $this->dropIndexes('orders', [
            'created_at' => ['created_at'],
            'item_type' => ['item_type'],
            'payment_status' => ['payment_status'],
            'proof_status' => ['proof_status'],
            'status_created' => ['status', 'created_at'],
            'item_type_status' => ['item_type', 'status'],
        ]);

        $this->dropIndexes('users', [
            'role' => ['role'],
        ]);
    }

    private function existingIndexNames(string $table): array
    {
        try {
            return collect(Schema::getIndexes($table))->pluck('name')->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function ensureIndexes(string $table, array $indexes): void
    {
        $existing = $this->existingIndexNames($table);
        // Match by indexed columns as well — names vary across drivers.
        $covered = [];
        try {
            foreach (Schema::getIndexes($table) as $index) {
                $covered[implode(',', (array) ($index['columns'] ?? []))] = true;
            }
        } catch (\Throwable) {
        }

        Schema::table($table, function (Blueprint $table) use ($indexes, $existing, $covered) {
            foreach ($indexes as $name => $columns) {
                $key = implode(',', $columns);
                if (in_array($name, $existing, true) || isset($covered[$key])) {
                    continue;
                }
                $table->index($columns, $name);
            }
        });
    }

    private function dropIndexes(string $table, array $indexes): void
    {
        $existing = $this->existingIndexNames($table);
        Schema::table($table, function (Blueprint $table) use ($indexes, $existing) {
            foreach ($indexes as $name => $columns) {
                if (in_array($name, $existing, true)) {
                    $table->dropIndex($name);
                }
            }
        });
    }
};
