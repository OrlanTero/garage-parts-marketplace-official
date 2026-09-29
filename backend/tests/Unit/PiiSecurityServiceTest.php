<?php

namespace Tests\Unit;

use App\Services\PiiSecurityService;
use PHPUnit\Framework\TestCase;

class PiiSecurityServiceTest extends TestCase
{
    private PiiSecurityService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PiiSecurityService();
    }

    public function test_safe_messages_are_not_modified(): void
    {
        $message = "Is the 2024 Honda Civic Type R still available? Can we negotiate on the price?";
        $result = $this->service->sanitize($message);

        $this->assertFalse($result['is_redacted']);
        $this->assertEquals($message, $result['sanitized']);
        $this->assertEmpty($result['detected_types']);
    }

    public function test_redacts_email_addresses(): void
    {
        $message = "Please email me at buyer@example.com for further inquiries.";
        $result = $this->service->sanitize($message);

        $this->assertTrue($result['is_redacted']);
        $this->assertStringContainsString(PiiSecurityService::REDACTED_EMAIL, $result['sanitized']);
        $this->assertStringNotContainsString('buyer@example.com', $result['sanitized']);
        $this->assertContains('email', $result['detected_types']);
    }

    public function test_redacts_philippine_mobile_numbers(): void
    {
        $samples = [
            "Call me at 0917-555-1234 regarding the turbocharger.",
            "Text 09181234567 directly.",
            "Reach me at +639171234567 or 639171234567.",
            "My number is 0917 123 4567.",
        ];

        foreach ($samples as $sample) {
            $result = $this->service->sanitize($sample);
            $this->assertTrue($result['is_redacted'], "Failed for: {$sample}");
            $this->assertStringContainsString(PiiSecurityService::REDACTED_PHONE, $result['sanitized']);
            $this->assertContains('phone', $result['detected_types']);
        }
    }

    public function test_redacts_external_urls_and_social_links(): void
    {
        $message = "Check out my profile at https://facebook.com/car_seller or t.me/carenthusiast";
        $result = $this->service->sanitize($message);

        $this->assertTrue($result['is_redacted']);
        $this->assertStringContainsString(PiiSecurityService::REDACTED_LINK, $result['sanitized']);
        $this->assertStringNotContainsString('https://facebook.com/car_seller', $result['sanitized']);
    }

    public function test_redacts_social_handles(): void
    {
        $message = "Message me on viber: 09171234567 or telegram: @turboking";
        $result = $this->service->sanitize($message);

        $this->assertTrue($result['is_redacted']);
        $this->assertTrue(
            str_contains($result['sanitized'], PiiSecurityService::REDACTED_CONTACT) ||
            str_contains($result['sanitized'], PiiSecurityService::REDACTED_PHONE)
        );
    }

    public function test_redacts_payment_cards(): void
    {
        $message = "Pay with my card 4111 2222 3333 4444 thanks";
        $result = $this->service->sanitize($message);

        $this->assertTrue($result['is_redacted']);
        $this->assertStringContainsString(PiiSecurityService::REDACTED_PAYMENT, $result['sanitized']);
        $this->assertStringNotContainsString('4111 2222 3333 4444', $result['sanitized']);
        $this->assertContains('payment_card', $result['detected_types']);
    }
}
