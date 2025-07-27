/**
 * Element debug box module for displaying debug information about selected elements
 */

import {
  calculateDebugBoxPosition,
  DebugBoxDimensions,
} from './elementDebugBoxPositioning';
import { isDebugModeEnabled } from './pageDebugBox';
import { generateXPath } from './xpathGenerator';

let elementDebugBox: HTMLElement | null = null;

/**
 * Creates and displays an element debug box for the given element
 */
export function createElementDebugBox(element: HTMLElement): void {
  if (!isDebugModeEnabled()) return;

  removeElementDebugBox();

  elementDebugBox = document.createElement('div');
  elementDebugBox.id = 'markdown-capture-element-debug';
  elementDebugBox.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 5px;
    border: 1px solid #00ff00;
    border-radius: 3px;
    z-index: 10002;
    max-width: 500px;
    word-wrap: break-word;
    white-space: pre-wrap;
    pointer-events: none;
  `;

  const rect = element.getBoundingClientRect();
  const xpath = generateXPath(element);

  elementDebugBox.textContent = `Tag: ${element.tagName.toLowerCase()}\nXPath: ${xpath}`;

  // Position the debug box using the positioning module
  const dimensions: DebugBoxDimensions = {
    width: 500, // max-width from CSS
    height: 60, // Approximate height
    margin: 5,
  };

  const position = calculateDebugBoxPosition(rect, dimensions);

  elementDebugBox.style.left = `${position.left}px`;
  elementDebugBox.style.top = `${position.top}px`;

  document.body.appendChild(elementDebugBox);
}

/**
 * Removes the element debug box if it exists
 */
export function removeElementDebugBox(): void {
  if (elementDebugBox) {
    elementDebugBox.remove();
    elementDebugBox = null;
  }
}

/**
 * Checks if the element debug box is currently displayed
 */
export function isElementDebugBoxVisible(): boolean {
  return elementDebugBox !== null;
}

/**
 * Gets the current element debug box element (for collision detection)
 */
export function getElementDebugBoxElement(): HTMLElement | null {
  return elementDebugBox;
}
