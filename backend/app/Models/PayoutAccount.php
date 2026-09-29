<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayoutAccount extends Model
{
    use HasFactory;

    public const CHANNELS = ['bank', 'gcash', 'maya'];

    protected $fillable = [
        'user_id',
        'label',
        'channel',
        'account_name',
        'account_number',
        'bank_name',
        'is_default',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(PayoutWithdrawal::class);
    }

    public function maskedNumber(): string
    {
        $num = (string) $this->account_number;
        if (strlen($num) <= 4) {
            return $num;
        }

        return '•••• ' . substr($num, -4);
    }
}
