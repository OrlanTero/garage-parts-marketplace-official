<?php

namespace Database\Seeders;

use App\Models\Bin;
use App\Models\Part;
use App\Models\PartRelation;
use App\Models\PartSerial;
use App\Models\PartSupplier;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // House catalog only: every part lives under GAP Valenzuela Main.
        $gap = User::house();
        if (!$gap || Part::count() === 0) {
            return;
        }

        $this->seedHouseWarehouse($gap);
        $this->seedOwner($gap);
    }

    private function seedHouseWarehouse(User $owner): void
    {
        $warehouse = Warehouse::updateOrCreate(
            ['owner_id' => $owner->id, 'code' => 'GAP-MAIN'],
            [
                'name' => 'GAP Valenzuela Main Depot',
                'city' => 'Valenzuela',
                'address' => 'GAP Valenzuela Main, Valenzuela City, Metro Manila',
                'is_default' => true,
                'is_active' => true,
            ]
        );

        Warehouse::where('owner_id', $owner->id)
            ->where('id', '!=', $warehouse->id)
            ->update(['is_default' => false]);

        foreach ([
            ['GAP-A1', 'A', '01', '01'],
            ['GAP-A2', 'A', '01', '02'],
            ['GAP-B1', 'B', '02', '01'],
            ['GAP-C1', 'C', '03', '01'],
        ] as [$code, $zone, $rack, $shelf]) {
            Bin::updateOrCreate(
                ['warehouse_id' => $warehouse->id, 'code' => $code],
                ['zone' => $zone, 'rack' => $rack, 'shelf' => $shelf, 'is_active' => true]
            );
        }
    }

    private function seedOwner(User $owner): void
    {
        // Reuse the owner's default depot (GAP-MAIN for the house garage).
        $warehouse = Warehouse::where('owner_id', $owner->id)->where('is_default', true)->first()
            ?? Warehouse::updateOrCreate(
                ['owner_id' => $owner->id, 'code' => 'MAIN'],
                ['name' => 'Main Parts Depot', 'city' => 'Makati', 'is_default' => true, 'is_active' => true]
            );

        $bins = [];
        $existing = Bin::where('warehouse_id', $warehouse->id)->orderBy('code')->get();
        if ($existing->isNotEmpty()) {
            foreach ($existing as $bin) {
                $bins[$bin->code] = $bin;
            }
        } else {
            foreach ([
                ['A-01', 'A', '01', '01'],
                ['A-02', 'A', '01', '02'],
                ['B-01', 'B', '02', '01'],
            ] as [$code, $zone, $rack, $shelf]) {
                $bins[$code] = Bin::updateOrCreate(
                    ['warehouse_id' => $warehouse->id, 'code' => $code],
                    ['zone' => $zone, 'rack' => $rack, 'shelf' => $shelf, 'is_active' => true]
                );
            }
        }

        $supplier = Supplier::updateOrCreate(
            ['owner_id' => $owner->id, 'name' => 'Tokyo Surplus Direct'],
            [
                'contact_person' => 'Kenji Sato',
                'email' => 'orders@tokyo-surplus.example.jp',
                'phone' => '+81 90-0000-0000',
                'city' => 'Yokohama',
                'lead_time_days' => 14,
                'notes' => 'Primary JDM surplus consolidator.',
                'is_active' => true,
            ]
        );

        $parts = Part::where('seller_id', $owner->id)->limit(4)->get();
        $binCodes = array_keys($bins);

        foreach ($parts as $i => $part) {
            // Opening receipt into the depot.
            $receiptQty = 6 + $i * 2;
            $part->forceFill([
                'quantity' => $receiptQty,
                'reserved_quantity' => 0,
                'mpn' => $part->part_number ? $part->part_number . '-JP' : null,
                'uom' => 'pc',
                'barcode' => 'GPM-' . str_pad((string) $part->id, 8, '0', STR_PAD_LEFT),
                'lifecycle_status' => 'active',
                'min_stock' => 2,
                'max_stock' => 20,
                'reorder_point' => 3,
                'safety_stock' => 1,
                'specifications' => ['origin' => 'Japan surplus', 'warranty_months' => 6],
            ])->saveQuietly();

            StockMovement::create([
                'part_id' => $part->id,
                'warehouse_id' => $warehouse->id,
                'bin_id' => $bins[$binCodes[$i % count($binCodes)]]->id,
                'type' => 'receipt',
                'quantity_change' => $receiptQty,
                'quantity_after' => $receiptQty,
                'unit_cost' => (float) $part->price * 0.6,
                'reference' => 'PO-2026-OPEN',
                'reason' => 'Opening stock receipt',
                'user_id' => $owner->id,
            ]);

            PartSupplier::updateOrCreate(
                ['part_id' => $part->id, 'supplier_id' => $supplier->id],
                [
                    'supplier_sku' => 'TSD-' . ($part->part_number ?? $part->id),
                    'cost_price' => (float) $part->price * 0.6,
                    'lead_time_days' => 14,
                    'moq' => 2,
                    'is_preferred' => true,
                ]
            );

            // Two tracked serials on the first part.
            if ($i === 0) {
                foreach (['SN-0001', 'SN-0002'] as $serial) {
                    PartSerial::updateOrCreate(
                        ['part_id' => $part->id, 'serial' => $serial],
                        ['status' => 'in_stock', 'warehouse_id' => $warehouse->id]
                    );
                }
            }
        }

        // Cross-link the first two parts as substitutes (alternate parts).
        if ($parts->count() >= 2) {
            PartRelation::updateOrCreate(
                ['part_id' => $parts[0]->id, 'related_part_id' => $parts[1]->id, 'relation_type' => 'substitute'],
                ['quantity' => 1, 'notes' => 'Seeded alternate part']
            );
            PartRelation::updateOrCreate(
                ['part_id' => $parts[0]->id, 'related_part_id' => $parts[1]->id, 'relation_type' => 'compatible'],
                ['quantity' => 1]
            );
        }
    }
}
