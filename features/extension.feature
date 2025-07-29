Feature: Save Markdown Extension E2E
  As a user of the Save Markdown extension
  I want to create save rules and automatically save markdown content
  So that I can capture web content as markdown files
  
  Scenario: Manually save markdown for default suggested rules
    Given I have the extension loaded in the browser
    When I open the extension options page
    And I enable the status window
    And I save the options
    And I navigate to the test page
    And I click the save rule button
    Then the status window should be visible
    And the status window should show a success message
    And a markdown file should be saved
    And the markdown file should contain:
      | # Introduction                          |
      | ## Features                             |
      | **Bold text**                           |
      | *Italic text*                           |
      | `Inline code`                           |
      | [External links](https://example.com)   |
      | > This is a blockquote                  |
  
  Scenario: Add save rule for default suggested rule and then save on reload
    Given I have the extension loaded in the browser
    When I open the extension options page
    And I enable the status window
    And I save the options
    And I navigate to the test page
    And I enable auto save for the suggested rule
    Then a markdown file should be saved
    When I reload the page
    Then a markdown file should be saved
    And the markdown file should contain:
      | # Introduction                          |
