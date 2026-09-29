<?php

namespace App\Services;

class PiiSecurityService
{
    public const REDACTED_PHONE = '[Phone Number Redacted for Safety]';
    public const REDACTED_EMAIL = '[Email Address Redacted for Safety]';
    public const REDACTED_LINK = '[External Link Redacted for Safety]';
    public const REDACTED_CONTACT = '[Contact Info Redacted for Safety]';
    public const REDACTED_PAYMENT = '[Payment Info Redacted for Safety]';

    /**
     * Sanitize input text by redacting personal identifying information.
     *
     * @param string $text
     * @return array{sanitized: string, is_redacted: bool, detected_types: array<string>}
     */
    public function sanitize(string $text): array
    {
        $original = $text;
        $detectedTypes = [];

        // 1. Redact Emails
        $emailPattern = '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i';
        if (preg_match($emailPattern, $text)) {
            $text = preg_replace($emailPattern, self::REDACTED_EMAIL, $text);
            $detectedTypes[] = 'email';
        }

        // 2. Redact URLs & External Links
        $urlPatterns = [
            '/\bhttps?:\/\/[^\s<>()]+/i',
            '/\bftp:\/\/[^\s<>()]+/i',
            '/\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>()]*)?/i',
            '/\b(?:t\.me|wa\.me|viber\.com|fb\.me|m\.me|facebook\.com|instagram\.com|tiktok\.com|bit\.ly)\/[a-zA-Z0-9._?=&%+-]+/i',
        ];

        foreach ($urlPatterns as $pattern) {
            if (preg_match($pattern, $text)) {
                $text = preg_replace($pattern, self::REDACTED_LINK, $text);
                $detectedTypes[] = 'url';
            }
        }

        // 3. Redact Social Messaging / Direct Handles (e.g., "telegram: @john", "viber: 0917...", "whatsapp: 639...")
        $socialPattern = '/\b(?:viber|telegram|whatsapp|wa|tg|messenger|wechat|signal|skype)\s*[:=–-]?\s*[@]?[a-zA-Z0-9._+-]{3,}\b/i';
        if (preg_match($socialPattern, $text)) {
            $text = preg_replace($socialPattern, self::REDACTED_CONTACT, $text);
            $detectedTypes[] = 'social_handle';
        }

        // 4. Redact Payment Cards (13 to 19 digit card numbers with optional dashes/spaces)
        $cardPattern = '/\b(?:\d[ -]?){13,19}\b/';
        if (preg_match_all($cardPattern, $text, $matches)) {
            foreach ($matches[0] as $match) {
                $digits = preg_replace('/\D/', '', $match);
                if (strlen($digits) >= 13 && strlen($digits) <= 19 && $this->looksLikeCardNumber($digits)) {
                    $text = str_replace($match, self::REDACTED_PAYMENT, $text);
                    $detectedTypes[] = 'payment_card';
                }
            }
        }

        // 5. Redact Phone Numbers (PH Mobile, Landline, and International numbers)
        $phonePatterns = [
            // PH Mobile with country code or prefix: +639..., 639..., 09... (with optional spaces, dots, or dashes)
            '/(?:\+63|63|0)[\s.-]?9[\s.-]?(?:\d[\s.-]?){8}\d/i',
            // PH Landline: (02) 8123-4567, 02-8123-4567, +63 2 8123 4567, (032) 123-4567
            '/(?:\+63[\s.-]?)?\(?0?\d{1,3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/',
            // General International formatted phone numbers with +
            '/\+\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{3,4}/',
        ];

        foreach ($phonePatterns as $pattern) {
            if (preg_match_all($pattern, $text, $matches)) {
                foreach ($matches[0] as $match) {
                    // Avoid replacing already-redacted bracket tags or simple short numbers (like model years 2024 or prices)
                    if (str_contains($match, '[') || str_contains($match, ']')) {
                        continue;
                    }
                    $digitsOnly = preg_replace('/\D/', '', $match);
                    if (strlen($digitsOnly) >= 7) {
                        $text = str_replace($match, self::REDACTED_PHONE, $text);
                        $detectedTypes[] = 'phone';
                    }
                }
            }
        }

        $detectedTypes = array_values(array_unique($detectedTypes));
        $isRedacted = $text !== $original;

        return [
            'sanitized' => $text,
            'is_redacted' => $isRedacted,
            'detected_types' => $detectedTypes,
        ];
    }

    /**
     * Check if a digit sequence matches common payment card patterns (Visa, MC, Amex, Discover).
     */
    private function looksLikeCardNumber(string $digits): bool
    {
        $len = strlen($digits);
        if ($len < 13 || $len > 19) {
            return false;
        }

        // Visa: 4... (13, 16, 19)
        // Mastercard: 51-55 or 2221-2720 (16)
        // Amex: 34, 37 (15)
        // Discover: 6011, 65, 644-649 (16)
        $first1 = substr($digits, 0, 1);
        $first2 = (int) substr($digits, 0, 2);
        $first4 = (int) substr($digits, 0, 4);

        if ($first1 === '4') return true;
        if (($first2 >= 51 && $first2 <= 55) || ($first4 >= 2221 && $first4 <= 2720)) return true;
        if ($first2 === 34 || $first2 === 37) return true;
        if ($first4 === 6011 || $first2 === 65) return true;

        // Generic 16-digit number sequence
        return $len === 16;
    }
}
