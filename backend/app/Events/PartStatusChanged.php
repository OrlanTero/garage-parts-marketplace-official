<?php

namespace App\Events;

use App\Http\Resources\PartResource;
use App\Models\Part;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PartStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Part $part, public string $previousStatus)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('marketplace.parts'),
            new Channel('parts.' . $this->part->id),
            new PrivateChannel('user.' . $this->part->seller_id),
            new PrivateChannel('App.Models.User.' . $this->part->seller_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'part.status_changed';
    }

    public function broadcastWith(): array
    {
        return [
            'part' => (new PartResource($this->part->loadMissing(['seller:id,name', 'media'])))->resolve(),
            'previous_status' => $this->previousStatus,
            'status' => $this->part->status->value ?? $this->part->status,
        ];
    }
}
