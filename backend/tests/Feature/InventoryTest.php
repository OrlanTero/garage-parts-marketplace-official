<?php

namespace Tests\Feature;

use App\Models\Part;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user): void
    {
        $this->withToken($user->createToken('t')->plainTextToken);
    }

    private function seller(): User
    {
        return User::factory()->create(['role' => 'parts_seller']);
    }

    private function makePart(User $seller, array $overrides = []): Part
    {
        return Part::create(array_merge([
            'seller_id' => $seller->id,
            'title' => 'Test Turbo',
            'category' => 'engine',
            'price' => 50000.00,
            'quantity' => 10,
            'status' => 'active',
            'published_at' => now(),
        ], $overrides));
    }

    public function test_supplier_crud_is_owner_scoped(): void
    {
        $seller = $this->seller();
        $stranger = $this->seller();

        $this->as($seller);
        $created = $this->postJson('/api/v1/seller/suppliers', [
            'name' => 'Tokyo Surplus',
            'lead_time_days' => 14,
        ])->assertStatus(201)->json('data');

        $this->as($stranger);
        $this->getJson("/api/v1/seller/suppliers/{$created['id']}")->assertStatus(403);
        $this->deleteJson("/api/v1/seller/suppliers/{$created['id']}")->assertStatus(403);
    }

    public function test_warehouse_and_bin_hierarchy(): void
    {
        $seller = $this->seller();
        $this->as($seller);

        $warehouse = $this->postJson('/api/v1/seller/warehouses', [
            'name' => 'Main Depot',
            'code' => 'MAIN',
        ])->assertStatus(201)->assertJsonPath('data.is_default', true)->json('data');

        // Second warehouse is not default.
        $this->postJson('/api/v1/seller/warehouses', ['name' => 'Annex', 'code' => 'ANX'])
            ->assertStatus(201)->assertJsonPath('data.is_default', false);

        $bin = $this->postJson("/api/v1/seller/warehouses/{$warehouse['id']}/bins", [
            'code' => 'A-01', 'zone' => 'A', 'rack' => '01', 'shelf' => '02',
        ])->assertStatus(201)->json('data');

        $this->assertEquals('MAIN / Z:A / R:01 / S:02 / A-01', $bin['path']);

        $this->getJson('/api/v1/seller/warehouses')->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_stock_receipt_and_issue_update_quantity_and_ledger(): void
    {
        $seller = $this->seller();
        $part = $this->makePart($seller);
        $this->as($seller);

        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'receipt', 'quantity' => 5, 'reference' => 'PO-1', 'reason' => 'Supplier delivery',
        ])->assertStatus(201)->assertJsonPath('data.quantity_after', 15);

        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'issue', 'quantity' => 3, 'reason' => 'Walk-in sale',
        ])->assertStatus(201)->assertJsonPath('data.quantity_after', 12);

        // Over-issue is rejected, stock untouched.
        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'issue', 'quantity' => 99,
        ])->assertStatus(422);

        $this->assertDatabaseHas('parts', ['id' => $part->id, 'quantity' => 12]);
        $this->assertEquals(2, StockMovement::where('part_id', $part->id)->count());
    }

    public function test_transfer_moves_stock_between_warehouses(): void
    {
        $seller = $this->seller();
        $part = $this->makePart($seller);
        $this->as($seller);

        $from = $this->postJson('/api/v1/seller/warehouses', ['name' => 'A', 'code' => 'A'])->json('data');
        $to = $this->postJson('/api/v1/seller/warehouses', ['name' => 'B', 'code' => 'B'])->json('data');

        $this->postJson("/api/v1/seller/parts/{$part->id}/transfer", [
            'quantity' => 4,
            'from_warehouse_id' => $from['id'],
            'to_warehouse_id' => $to['id'],
            'reason' => 'Rebalance',
        ])->assertStatus(201);

        $this->assertDatabaseHas('parts', ['id' => $part->id, 'quantity' => 10]);
        $this->assertDatabaseHas('stock_movements', ['part_id' => $part->id, 'type' => 'transfer_out', 'quantity_change' => -4]);
        $this->assertDatabaseHas('stock_movements', ['part_id' => $part->id, 'type' => 'transfer_in', 'quantity_change' => 4]);
    }

    public function test_reservation_affects_available_not_on_hand(): void
    {
        $seller = $this->seller();
        $part = $this->makePart($seller);
        $this->as($seller);

        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'reservation', 'quantity' => 4,
        ])->assertStatus(201);

        // Over-reservation rejected.
        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'reservation', 'quantity' => 7,
        ])->assertStatus(422);

        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'release', 'quantity' => 1,
        ])->assertStatus(201);

        $this->assertDatabaseHas('parts', ['id' => $part->id, 'quantity' => 10, 'reserved_quantity' => 3]);
    }

    public function test_cycle_count_sets_absolute_quantity(): void
    {
        $seller = $this->seller();
        $part = $this->makePart($seller);
        $this->as($seller);

        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'count', 'counted_quantity' => 7, 'reason' => 'Cycle count A-01',
        ])->assertStatus(201)
            ->assertJsonPath('data.quantity_change', -3)
            ->assertJsonPath('data.quantity_after', 7);
    }

    public function test_low_stock_report_flags_reorder_lines(): void
    {
        $seller = $this->seller();
        $this->makePart($seller, ['quantity' => 2, 'reorder_point' => 5, 'max_stock' => 20]);
        $this->makePart($seller, ['quantity' => 50, 'reorder_point' => 5]);
        $this->as($seller);

        $response = $this->getJson('/api/v1/seller/inventory/low-stock')->assertStatus(200);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('low', $response->json('data.0.severity'));
        $this->assertEquals(18, $response->json('data.0.suggested_order'));
    }

    public function test_supplier_linking_and_relations_and_serials(): void
    {
        $seller = $this->seller();
        $part = $this->makePart($seller);
        $alt = $this->makePart($seller, ['title' => 'Alt Turbo']);
        $this->as($seller);

        $supplier = $this->postJson('/api/v1/seller/suppliers', ['name' => 'S1'])->json('data');

        $this->postJson("/api/v1/seller/parts/{$part->id}/suppliers", [
            'supplier_id' => $supplier['id'],
            'supplier_sku' => 'S1-T',
            'cost_price' => 30000,
            'moq' => 2,
            'is_preferred' => true,
        ])->assertStatus(201);

        $this->postJson("/api/v1/seller/parts/{$part->id}/relations", [
            'related_part_id' => $alt->id,
            'relation_type' => 'substitute',
        ])->assertStatus(201);

        // Self-relation rejected.
        $this->postJson("/api/v1/seller/parts/{$part->id}/relations", [
            'related_part_id' => $part->id,
            'relation_type' => 'compatible',
        ])->assertStatus(422);

        $this->postJson("/api/v1/seller/parts/{$part->id}/serials", [
            'serials' => ['SN-1', 'SN-2'],
        ])->assertStatus(201);

        $this->getJson("/api/v1/seller/parts/{$part->id}/relations")->assertStatus(200)->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/seller/parts/{$part->id}/serials")->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_catalog_search_finds_by_mpn_and_supplier_sku(): void
    {
        $seller = $this->seller();
        $part = $this->makePart($seller, ['mpn' => 'GAR-XYZ-1', 'barcode' => 'GPM-0001']);
        $this->as($seller);

        $supplier = $this->postJson('/api/v1/seller/suppliers', ['name' => 'S1'])->json('data');
        $this->postJson("/api/v1/seller/parts/{$part->id}/suppliers", [
            'supplier_id' => $supplier['id'], 'supplier_sku' => 'SUP-999',
        ])->assertStatus(201);

        $this->getJson('/api/v1/seller/catalog/search?q=GAR-XYZ')
            ->assertStatus(200)->assertJsonCount(1, 'data.data');
        $this->getJson('/api/v1/seller/catalog/search?q=SUP-999')
            ->assertStatus(200)->assertJsonCount(1, 'data.data');
    }

    public function test_cross_owner_inventory_is_forbidden(): void
    {
        $seller = $this->seller();
        $stranger = $this->seller();
        $part = $this->makePart($seller);
        $this->as($stranger);

        $this->postJson("/api/v1/seller/parts/{$part->id}/stock-movements", [
            'type' => 'receipt', 'quantity' => 1,
        ])->assertStatus(403);
    }

    public function test_admin_can_scope_inventory_to_any_seller(): void
    {
        $seller = $this->seller();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->makePart($seller, ['quantity' => 3, 'reorder_point' => 5]);
        $this->as($admin);

        // Admin's own scope is empty, but seller scope resolves.
        $this->getJson('/api/v1/seller/inventory/low-stock')
            ->assertStatus(200)->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/seller/inventory/low-stock?seller_id={$seller->id}")
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/seller/inventory/summary?seller_id={$seller->id}")
            ->assertStatus(200)->assertJsonPath('data.parts_tracked', 1);

        // Non-admins cannot use the override.
        $stranger = $this->seller();
        $this->as($stranger);
        $this->getJson("/api/v1/seller/inventory/low-stock?seller_id={$seller->id}")
            ->assertStatus(200)->assertJsonCount(0, 'data');
    }
}
