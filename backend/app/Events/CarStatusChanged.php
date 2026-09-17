<?php

namespace App\Events;

use App\Http\Resources\CarResource;
use App\Models\Car;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CarStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Car $car, public string $previousStatus)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('marketplace.cars'),
            new Channel('cars.' . $this->car->id),
            new PrivateChannel('user.' . $this->car->seller_id),
            new PrivateChannel('App.Models.User.' . $this->car->seller_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'car.status_changed';
    }

    public function broadcastWith(): array
    {
        return [
            'car' => (new CarResource($this->car->loadMissing(['seller:id,name', 'media'])))->resolve(),
            'previous_status' => $this->previousStatus,
            'status' => $this->car->status->value ?? $this->car->status,
        ];
    }
}
