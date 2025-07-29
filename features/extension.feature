@extension
Feature: Save Markdown Extension E2E
  As a user of the Save Markdown extension
  I want to create save rules and automatically save markdown content
  So that I can capture web content as markdown files
  
  # Note: Extension tests run in headed mode due to Chrome extension limitations in headless mode

  @extension
  Scenario: Create save rule and save markdown when page is visited
    Given I have the extension loaded in the browser
    When I open the extension options page
    And I add a new suggested rule with the following details:
      | name   | Test Article Rule              |
      | domain | *                              |
      | xpath  | //article[@id="main-content"]  |
    And I enable the status window
    And I save the options
    And I navigate to the test page
    And I click the save rule button
    Then the status window should be visible
    And the status window should show a success message
    And a markdown file should be created
    And the markdown content should contain:
      | # Introduction                          |
      | ## Features                             |
      | **Bold text**                           |
      | *Italic text*                           |
      | `Inline code`                           |
      | [External links](https://example.com)   |
      | > This is a blockquote                  |
