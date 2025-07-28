/**
 * Element debug box module for displaying debug information about selected elements
 */

import { isDebugModeEnabled } from './debugPage';
import { generateXPath } from './xpathGenerator';

interface Position {
  left: number;
  top: number;
}

interface DebugBoxDimensions {
  width: number;
  height: number;
  margin: number;
}

let elementDebugBox: HTMLElement | null = null;

/**
 * Calculates the optimal position for an element debug box relative to an element
 * Tries positions in order: above, below, right, inside top-right
 */
function calculateDebugBoxPosition(
  elementRect: DOMRect,
  dimensions: DebugBoxDimensions,
): Position {
  const { width: boxWidth, height: boxHeight, margin } = dimensions;

  // Check available space in all directions
  const spaceAbove = elementRect.top;
  const spaceBelow = window.innerHeight - elementRect.bottom;
  const spaceRight = window.innerWidth - elementRect.right;

  let left: number, top: number;

  // Try positioning above first
  if (spaceAbove >= boxHeight + margin) {
    left = elementRect.left + window.scrollX;
    top = elementRect.top + window.scrollY - boxHeight - margin;
  }
  // Try positioning below
  else if (spaceBelow >= boxHeight + margin) {
    left = elementRect.left + window.scrollX;
    top = elementRect.bottom + window.scrollY + margin;
  }
  // Try positioning to the right
  else if (spaceRight >= boxWidth + margin) {
    left = elementRect.right + window.scrollX + margin;
    top = elementRect.top + window.scrollY;
  }
  // Fallback: position inside element at top-right
  else {
    left = elementRect.right + window.scrollX - boxWidth - margin;
    top = elementRect.top + window.scrollY + margin;

    // Ensure it doesn't go outside the element bounds
    if (left < elementRect.left + window.scrollX) {
      left = elementRect.left + window.scrollX + margin;
    }
  }

  return { left, top };
}

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
