Feature: Extension Toggle in Popup
  As a user of the Save Markdown extension
  I want to toggle the extension functionality on and off from the popup
  So that I can quickly enable or disable the extension without going to options

  Scenario: Toggle extension off from popup
    Given I have the extension loaded in the browser
    And I have enabled the status window
    When I open the extension popup
    And I toggle the extension off
    And I navigate to the test page
    Then no suggested save rules should appear
    And the extension should be inactive
    And the debug panel should not be visible
    And the status panel should not be visible

  Scenario: Toggle extension on from popup when disabled
    Given I have the extension loaded in the browser
    And I have enabled the status window
    And the extension is toggled off
    When I open the extension popup
    And I toggle the extension on
    And I navigate to the test page
    Then suggested save rules should appear
    And I can click the save rule button
    And a markdown file should be saved

  Scenario: Extension toggle state persists across popup opens
    Given I have the extension loaded in the browser
    And I have enabled the status window
    When I open the extension popup
    And I toggle the extension off
    And I close the popup
    And I open the extension popup again
    Then the extension toggle should be in the off state