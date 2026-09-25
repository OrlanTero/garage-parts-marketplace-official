<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Authenticated user's address book — labeled delivery addresses,
 * each optionally pinned on the map. Exactly one default per user.
 */
class AddressController extends Controller
{
    /** GET /addresses — my address book, default first. */
    public function index(Request $request)
    {
        $addresses = Address::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get();

        return AddressResource::collection($addresses);
    }

    /** POST /addresses — add an entry (first entry becomes default). */
    public function store(Request $request): JsonResponse
    {
        $data = $this->rules($request);

        $userId = $request->user()->id;
        $isFirst = !Address::where('user_id', $userId)->exists();

        $address = DB::transaction(function () use ($data, $userId, $isFirst) {
            $makeDefault = $isFirst || ($data['is_default'] ?? false);
            if ($makeDefault) {
                Address::where('user_id', $userId)->update(['is_default' => false]);
            }

            return Address::create([
                ...$data,
                'user_id' => $userId,
                'is_default' => $makeDefault,
            ]);
        });

        return (new AddressResource($address))->response()->setStatusCode(201);
    }

    /** PUT /addresses/{address} — edit own entry. */
    public function update(Request $request, Address $address): AddressResource
    {
        $this->ensureOwner($request, $address);
        $data = $this->rules($request);

        DB::transaction(function () use ($request, $address, $data) {
            if (!empty($data['is_default'])) {
                Address::where('user_id', $request->user()->id)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }
            unset($data['is_default']);
            $address->update($data);
        });

        // Never leave the book without a default while entries exist.
        if (!Address::where('user_id', $request->user()->id)->where('is_default', true)->exists()) {
            $address->forceFill(['is_default' => true])->save();
        }

        return new AddressResource($address->refresh());
    }

    /** DELETE /addresses/{address} — remove own entry. */
    public function destroy(Request $request, Address $address): JsonResponse
    {
        $this->ensureOwner($request, $address);

        $wasDefault = (bool) $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $next = Address::where('user_id', $request->user()->id)->latest('updated_at')->first();
            $next?->forceFill(['is_default' => true])->save();
        }

        return response()->json(['message' => 'Address deleted.']);
    }

    /** POST /addresses/{address}/default — make default. */
    public function makeDefault(Request $request, Address $address): AddressResource
    {
        $this->ensureOwner($request, $address);

        DB::transaction(function () use ($request, $address) {
            Address::where('user_id', $request->user()->id)->update(['is_default' => false]);
            $address->forceFill(['is_default' => true])->save();
        });

        return new AddressResource($address->refresh());
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'label' => ['required', 'string', 'max:30'],
            'recipient_name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line' => ['required', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:30'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'landmark' => ['nullable', 'string', 'max:500'],
            'is_default' => ['sometimes', 'boolean'],
        ]);
    }

    private function ensureOwner(Request $request, Address $address): void
    {
        if ((int) $address->user_id !== (int) $request->user()->id) {
            abort(403, 'You can only manage your own addresses.');
        }
    }
}
