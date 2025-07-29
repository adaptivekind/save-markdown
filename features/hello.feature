Feature: Basic test
  As a developer
  I want to verify basic functionality
  So that I can ensure tests are working

  Scenario: Hello equals Hello
    Given I have the word "Hello"
    When I compare it to "Hello"
    Then they should be equal