/**
 * Utilities for positioning element debug boxes relative to elements
 */

export interface Position {
  left: number;
  top: number;
}

export interface DebugBoxDimensions {
  width: number;
  height: number;
  margin: number;
}

/**
 * Calculates the optimal position for an element debug box relative to an element
 * Tries positions in order: above, below, right, inside top-right
 */
export function calculateDebugBoxPosition(
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
 * Checks if there's enough space in a given direction for the element debug box
 */
export function hasSpaceInDirection(
  elementRect: DOMRect,
  direction: 'above' | 'below' | 'right',
  requiredSpace: number,
): boolean {
  switch (direction) {
    case 'above':
      return elementRect.top >= requiredSpace;
    case 'below':
      return window.innerHeight - elementRect.bottom >= requiredSpace;
    case 'right':
      return window.innerWidth - elementRect.right >= requiredSpace;
    default:
      return false;
  }
}

/**
 * Gets the preferred position strategy for the element debug box based on available space
 */
export function getPreferredPositionStrategy(
  elementRect: DOMRect,
  dimensions: DebugBoxDimensions,
): 'above' | 'below' | 'right' | 'inside' {
  const { width: boxWidth, height: boxHeight, margin } = dimensions;

  if (hasSpaceInDirection(elementRect, 'above', boxHeight + margin)) {
    return 'above';
  }
  if (hasSpaceInDirection(elementRect, 'below', boxHeight + margin)) {
    return 'below';
  }
  if (hasSpaceInDirection(elementRect, 'right', boxWidth + margin)) {
    return 'right';
  }
  return 'inside';
}
