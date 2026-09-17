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

class PartCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Part $part)
    {
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('user.' . $this->part->seller_id),
            new PrivateChannel('App.Models.User.' . $this->part->seller_id),
        ];

        // Only broadcast to public marketplace channel if active/published
        if ($this->part->status->value === 'active' || $this->part->status === 'active') {
            $channels[] = new Channel('marketplace.parts');
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'part.created';
    }

    public function broadcastWith(): array
    {
        return [
            'part' => (new PartResource($this->part->loadMissing(['seller:id,name', 'media'])))->resolve(),
        ];
    }
}
