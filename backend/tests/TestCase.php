<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Each simulated HTTP request runs on the same app instance in PHPUnit,
     * which leaks the authenticated user (and other singleton state) from
     * one request into the next. Flushing guards makes every request start
     * clean — mirrors how real (Postman/browser) requests behave.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        $this->app->make('auth')->forgetGuards();

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}