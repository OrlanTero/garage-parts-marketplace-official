<?php

namespace App\Services;

use App\Models\Bin;
use App\Models\Part;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Inventory ledger core (§2–§3).
 * Every on-hand change flows through here so parts.quantity stays an exact
 * cache of the movement history, and every transaction records
 * who/what/when/where/quantity/reason.
 */
class InventoryService
{
    /**
     * Resolve whose inventory is being operated on.
     * - Sellers: always their own.
     * - Admins: explicit ?seller_id= for auditing, otherwise the house
     *   garage (GAP Valenzuela Main) — the sole parts catalog owner.
     */
    public function ownerScope(User $user, mixed $sellerId = null): int
    {
        if (!empty($sellerId) && $user->isAdmin()) {
            return (int) $sellerId;
        }
        if ($user->isAdmin() && ($house = User::house())) {
            return (int) $house->id;
        }
        return (int) $user->id;
    }

    /**
     * Record one movement and sync part quantities.
     *
     * $data: type, quantity (positive int; signed change derived, except
     *   `adjustment` which takes `quantity_change`, and `count` which takes
     *   `counted_quantity`), warehouse_id?, bin_id?, unit_cost?, reference?, reason?
     */
    public function move(User $user, Part $part, array $data): StockMovement
    {
        $this->ensureOwner($user, $part);

        $type = $data['type'];
        $warehouse = $this->resolveWarehouse($user, $data['warehouse_id'] ?? null);
        $bin = $this->resolveBin($user, $warehouse, $data['bin_id'] ?? null);

        return DB::transaction(function () use ($user, $part, $data, $type, $warehouse, $bin) {
            $part = Part::whereKey($part->id)->lockForUpdate()->first() ?? $part;

            $onHand = (int) $part->quantity;
            $reserved = (int) $part->reserved_quantity;

            [$change, $newOnHand, $newReserved] = $this->apply($type, $data, $onHand, $reserved);

            $part->forceFill([
                'quantity' => $newOnHand,
                'reserved_quantity' => $newReserved,
            ])->save();

            return StockMovement::create([
                'part_id' => $part->id,
                'warehouse_id' => $warehouse?->id,
                'bin_id' => $bin?->id,
                'type' => $type,
                'quantity_change' => $change,
                'quantity_after' => $newOnHand,
                'unit_cost' => $data['unit_cost'] ?? null,
                'reference' => $data['reference'] ?? null,
                'reason' => $data['reason'] ?? null,
                'user_id' => $user->id,
            ]);
        });
    }

    /**
     * Transfer n units between two warehouses (paired out/in movements).
     */
    public function transfer(User $user, Part $part, array $data): array
    {
        $qty = (int) ($data['quantity'] ?? 0);
        if ($qty < 1) {
            throw ValidationException::withMessages(['quantity' => ['Transfer quantity must be at least 1.']]);
        }

        $out = $this->move($user, $part, [
            ...$data,
            'type' => 'transfer_out',
            'quantity' => $qty,
            'warehouse_id' => $data['from_warehouse_id'] ?? null,
            'bin_id' => $data['from_bin_id'] ?? null,
        ]);

        $in = $this->move($user, $part->refresh(), [
            ...$data,
            'type' => 'transfer_in',
            'quantity' => $qty,
            'warehouse_id' => $data['to_warehouse_id'] ?? null,
            'bin_id' => $data['to_bin_id'] ?? null,
        ]);

        return [$out, $in];
    }

    /**
     * @return array{int,int,int} [signedChange, newOnHand, newReserved]
     *
     * @throws ValidationException on negative stock / over-reservation.
     */
    private function apply(string $type, array $data, int $onHand, int $reserved): array
    {
        $fail = fn (string $field, string $msg) => throw ValidationException::withMessages([$field => [$msg]]);

        switch ($type) {
            case 'receipt':
            case 'transfer_in':
            case 'return':
                $n = (int) ($data['quantity'] ?? 0);
                if ($n < 1) {
                    $fail('quantity', 'Quantity must be at least 1.');
                }

                return [$n, $onHand + $n, $reserved];

            case 'issue':
            case 'transfer_out':
            case 'consumption':
            case 'damage':
                $n = (int) ($data['quantity'] ?? 0);
                if ($n < 1) {
                    $fail('quantity', 'Quantity must be at least 1.');
                }
                if ($n > $onHand) {
                    $fail('quantity', "Insufficient on-hand stock ({$onHand} available).");
                }

                return [-$n, $onHand - $n, $reserved];

            case 'adjustment':
                $change = (int) ($data['quantity_change'] ?? 0);
                if ($change === 0) {
                    $fail('quantity_change', 'Adjustment change cannot be zero.');
                }
                if ($onHand + $change < 0) {
                    $fail('quantity_change', "Adjustment would drive stock negative ({$onHand} on hand).");
                }

                return [$change, $onHand + $change, $reserved];

            case 'count':
                // Blind cycle count: absolute counted quantity, variance derived.
                if (!array_key_exists('counted_quantity', $data)) {
                    $fail('counted_quantity', 'Counted quantity is required for cycle counts.');
                }
                $counted = max(0, (int) $data['counted_quantity']);

                return [$counted - $onHand, $counted, $reserved];

            case 'reservation':
                $n = (int) ($data['quantity'] ?? 0);
                if ($n < 1) {
                    $fail('quantity', 'Quantity must be at least 1.');
                }
                if ($n > $onHand - $reserved) {
                    $fail('quantity', 'Not enough available stock to reserve.');
                }

                return [0, $onHand, $reserved + $n];

            case 'release':
                $n = (int) ($data['quantity'] ?? 0);
                if ($n < 1) {
                    $fail('quantity', 'Quantity must be at least 1.');
                }

                return [0, $onHand, max(0, $reserved - $n)];

            default:
                $fail('type', 'Unknown movement type.');
        }
    }

    private function ensureOwner(User $user, Part $part): void
    {
        if ((int) $part->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only manage inventory for your own parts.');
        }
    }

    private function resolveWarehouse(User $user, mixed $id): ?Warehouse
    {
        if (empty($id)) {
            return null;
        }
        $warehouse = Warehouse::find($id);
        if (!$warehouse || ((int) $warehouse->owner_id !== (int) $user->id && !$user->isAdmin())) {
            throw ValidationException::withMessages(['warehouse_id' => ['Unknown warehouse.']]);
        }

        return $warehouse;
    }

    private function resolveBin(User $user, ?Warehouse $warehouse, mixed $id): ?Bin
    {
        if (empty($id)) {
            return null;
        }
        $bin = Bin::find($id);
        if (!$bin || ($warehouse && (int) $bin->warehouse_id !== (int) $warehouse->id)) {
            throw ValidationException::withMessages(['bin_id' => ['Bin does not belong to the selected warehouse.']]);
        }

        return $bin;
    }
}
