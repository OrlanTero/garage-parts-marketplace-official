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

class PartSold implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Part $part)
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
        return 'part.sold';
    }

    public function broadcastWith(): array
    {
        return [
            'part' => (new PartResource($this->part->loadMissing(['seller:id,name', 'media'])))->resolve(),
            'sold_at' => $this->part->sold_at,
        ];
    }
}
