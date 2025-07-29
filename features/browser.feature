Feature: Browser page testing
  As a developer
  I want to open test pages in a browser
  So that I can verify page content and behavior

  Scenario: Open test page and verify title
    Given I open the test page in a browser
    When I check the page title
    Then the title should be "Test Page for Markdown Extension"