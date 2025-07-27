import {
  htmlToMarkdown,
  wrapWithMetadata,
  type CaptureMetadata,
} from './htmlToMarkdown';

// Mock Node constants for testing
Object.assign(globalThis, {
  Node: {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  },
});

// Mock DOM elements for testing
function createElement(
  tagName: string,
  attributes: Record<string, string> = {},
  textContent = '',
  parentElement: HTMLElement | null = null,
): HTMLElement {
  const element = {
    tagName: tagName.toUpperCase(),
    nodeType: 1, // Node.ELEMENT_NODE
    getAttribute: (name: string) => attributes[name] || null,
    parentElement,
    childNodes: textContent
      ? [{ nodeType: 3, textContent }] // Node.TEXT_NODE
      : [],
    querySelectorAll: jest.fn().mockReturnValue([]),
  } as unknown as HTMLElement;

  return element;
}

describe('htmlToMarkdown', () => {
  describe('basic text conversion', () => {
    it('should convert plain text', () => {
      const element = createElement('div', {}, 'Hello world');
      const result = htmlToMarkdown(element);
      expect(result).toBe('Hello world');
    });

    it('should handle empty elements', () => {
      const element = createElement('div');
      const result = htmlToMarkdown(element);
      expect(result).toBe('');
    });
  });

  describe('heading conversions', () => {
    it('should convert h1 elements', () => {
      const element = createElement('h1', {}, 'Main Title');
      const result = htmlToMarkdown(element);
      expect(result).toBe('# Main Title\n\n');
    });

    it('should convert h2 elements', () => {
      const element = createElement('h2', {}, 'Subtitle');
      const result = htmlToMarkdown(element);
      expect(result).toBe('## Subtitle\n\n');
    });

    it('should convert h3 elements', () => {
      const element = createElement('h3', {}, 'Section');
      const result = htmlToMarkdown(element);
      expect(result).toBe('### Section\n\n');
    });

    it('should convert h4 elements', () => {
      const element = createElement('h4', {}, 'Subsection');
      const result = htmlToMarkdown(element);
      expect(result).toBe('#### Subsection\n\n');
    });

    it('should convert h5 elements', () => {
      const element = createElement('h5', {}, 'Minor heading');
      const result = htmlToMarkdown(element);
      expect(result).toBe('##### Minor heading\n\n');
    });

    it('should convert h6 elements', () => {
      const element = createElement('h6', {}, 'Smallest heading');
      const result = htmlToMarkdown(element);
      expect(result).toBe('###### Smallest heading\n\n');
    });
  });

  describe('paragraph and text formatting', () => {
    it('should convert paragraph elements', () => {
      const element = createElement('p', {}, 'This is a paragraph.');
      const result = htmlToMarkdown(element);
      expect(result).toBe('This is a paragraph.\n\n');
    });

    it('should convert strong/bold elements', () => {
      const element = createElement('strong', {}, 'bold text');
      const result = htmlToMarkdown(element);
      expect(result).toBe('**bold text**');
    });

    it('should convert b elements', () => {
      const element = createElement('b', {}, 'bold text');
      const result = htmlToMarkdown(element);
      expect(result).toBe('**bold text**');
    });

    it('should convert em/italic elements', () => {
      const element = createElement('em', {}, 'italic text');
      const result = htmlToMarkdown(element);
      expect(result).toBe('*italic text*');
    });

    it('should convert i elements', () => {
      const element = createElement('i', {}, 'italic text');
      const result = htmlToMarkdown(element);
      expect(result).toBe('*italic text*');
    });

    it('should convert inline code elements', () => {
      const element = createElement('code', {}, 'console.log()');
      const result = htmlToMarkdown(element);
      expect(result).toBe('`console.log()`');
    });

    it('should convert pre/code blocks', () => {
      const element = createElement(
        'pre',
        {},
        'function test() {\n  return true;\n}',
      );
      const result = htmlToMarkdown(element);
      expect(result).toBe('```\nfunction test() {\n  return true;\n}\n```\n\n');
    });
  });

  describe('link and image conversions', () => {
    it('should convert links with href', () => {
      const element = createElement(
        'a',
        { href: 'https://example.com' },
        'Example Link',
      );
      const result = htmlToMarkdown(element);
      expect(result).toBe('[Example Link](https://example.com)');
    });

    it('should handle links without href', () => {
      const element = createElement('a', {}, 'No Link');
      const result = htmlToMarkdown(element);
      expect(result).toBe('No Link');
    });

    it('should convert images with src and alt', () => {
      const element = createElement('img', {
        src: 'https://example.com/image.jpg',
        alt: 'Example Image',
      });
      const result = htmlToMarkdown(element);
      expect(result).toBe('![Example Image](https://example.com/image.jpg)');
    });

    it('should convert images with src but no alt', () => {
      const element = createElement('img', {
        src: 'https://example.com/image.jpg',
      });
      const result = htmlToMarkdown(element);
      expect(result).toBe('![](https://example.com/image.jpg)');
    });

    it('should handle images without src', () => {
      const element = createElement('img', { alt: 'Broken Image' });
      const result = htmlToMarkdown(element);
      expect(result).toBe('');
    });
  });

  describe('list conversions', () => {
    it('should convert unordered lists', () => {
      const element = createElement('ul');
      const result = htmlToMarkdown(element);
      expect(result).toBe('\n');
    });

    it('should convert ordered lists', () => {
      const element = createElement('ol');
      const result = htmlToMarkdown(element);
      expect(result).toBe('\n');
    });

    it('should convert unordered list items', () => {
      const parentUl = createElement('ul');
      const element = createElement('li', {}, 'List item', parentUl);
      const result = htmlToMarkdown(element);
      expect(result).toBe('- List item\n');
    });

    it('should convert ordered list items', () => {
      const parentOl = createElement('ol');
      const element = createElement('li', {}, 'Numbered item', parentOl);
      const result = htmlToMarkdown(element);
      expect(result).toBe('1. Numbered item\n');
    });
  });

  describe('special elements', () => {
    it('should convert blockquotes', () => {
      const element = createElement('blockquote', {}, 'This is a quote');
      const result = htmlToMarkdown(element);
      expect(result).toBe('> This is a quote\n\n');
    });

    it('should convert line breaks', () => {
      const element = createElement('br');
      const result = htmlToMarkdown(element);
      expect(result).toBe('\n');
    });

    it('should convert horizontal rules', () => {
      const element = createElement('hr');
      const result = htmlToMarkdown(element);
      expect(result).toBe('---\n\n');
    });

    it('should handle unknown elements by returning content', () => {
      const element = createElement('span', {}, 'Some text');
      const result = htmlToMarkdown(element);
      expect(result).toBe('Some text');
    });
  });

  describe('table conversions', () => {
    it('should convert simple tables', () => {
      const table = createElement('table');
      const row1 = createElement('tr');
      const row2 = createElement('tr');

      // Mock querySelectorAll for the table
      table.querySelectorAll = jest.fn().mockImplementation(selector => {
        if (selector === 'tr') {
          return [row1, row2];
        }
        return [];
      });

      // Mock querySelectorAll for rows
      row1.querySelectorAll = jest
        .fn()
        .mockReturnValue([
          createElement('th', {}, 'Header 1'),
          createElement('th', {}, 'Header 2'),
        ]);

      row2.querySelectorAll = jest
        .fn()
        .mockReturnValue([
          createElement('td', {}, 'Cell 1'),
          createElement('td', {}, 'Cell 2'),
        ]);

      const result = htmlToMarkdown(table);
      expect(result).toBe(
        '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n\n',
      );
    });

    it('should handle empty tables', () => {
      const table = createElement('table');
      table.querySelectorAll = jest.fn().mockReturnValue([]);

      const result = htmlToMarkdown(table);
      expect(result).toBe('');
    });
  });
});

describe('wrapWithMetadata', () => {
  let mockToISOString: jest.SpyInstance;

  beforeAll(() => {
    // Mock Date for consistent test results
    mockToISOString = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-15T10:30:45.123Z');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should wrap content with metadata', () => {
    const content = 'This is some markdown content.';
    const metadata: CaptureMetadata = {
      url: 'https://example.com/page',
      title: 'Example Page',
    };

    const result = wrapWithMetadata(content, metadata);

    expect(result).toBe(`<!-- Captured from: https://example.com/page -->
<!-- Date: 2024-01-15T10:30:45.123Z -->
<!-- Title: Example Page -->

# Example Page

This is some markdown content.

---
*Captured with Markdown Capture extension*`);
  });

  it('should use provided date when specified', () => {
    // Temporarily restore the original toISOString for this test
    mockToISOString.mockRestore();

    const content = 'Content with custom date.';
    const customDate = new Date('2023-12-25T00:00:00.000Z');
    const metadata: CaptureMetadata = {
      url: 'https://test.com',
      title: 'Test Page',
      date: customDate,
    };

    const result = wrapWithMetadata(content, metadata);

    expect(result).toContain('<!-- Date: 2023-12-25T00:00:00.000Z -->');
    expect(result).toContain('# Test Page');
    expect(result).toContain('Content with custom date.');

    // Restore the mock for other tests
    mockToISOString = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-15T10:30:45.123Z');
  });

  it('should handle empty content', () => {
    const metadata: CaptureMetadata = {
      url: 'https://empty.com',
      title: 'Empty Page',
    };

    const result = wrapWithMetadata('', metadata);

    expect(result).toBe(`<!-- Captured from: https://empty.com -->
<!-- Date: 2024-01-15T10:30:45.123Z -->
<!-- Title: Empty Page -->

# Empty Page



---
*Captured with Markdown Capture extension*`);
  });

  it('should handle special characters in title and URL', () => {
    const content = 'Special content.';
    const metadata: CaptureMetadata = {
      url: 'https://example.com/path?param=value&other=123',
      title: 'Page with "quotes" & special characters',
    };

    const result = wrapWithMetadata(content, metadata);

    expect(result).toContain(
      '<!-- Captured from: https://example.com/path?param=value&other=123 -->',
    );
    expect(result).toContain(
      '<!-- Title: Page with "quotes" & special characters -->',
    );
    expect(result).toContain('# Page with "quotes" & special characters');
  });

  it('should handle multiline content', () => {
    const content = `Line 1
Line 2

Paragraph 2`;
    const metadata: CaptureMetadata = {
      url: 'https://multiline.com',
      title: 'Multiline Content',
    };

    const result = wrapWithMetadata(content, metadata);

    expect(result).toContain(`# Multiline Content

Line 1
Line 2

Paragraph 2

---`);
  });
});

describe('integration tests', () => {
  it('should convert and wrap HTML content end-to-end', () => {
    // Create a mock element with nested content
    const element = {
      tagName: 'DIV',
      nodeType: 1,
      getAttribute: () => null,
      parentElement: null,
      childNodes: [
        createElement('h1', {}, 'Article Title'),
        createElement('p', {}, 'First paragraph.'),
        createElement('p', {}, 'Second paragraph.'),
      ],
      querySelectorAll: jest.fn().mockReturnValue([]),
    } as unknown as HTMLElement;

    const markdown = htmlToMarkdown(element);
    const metadata: CaptureMetadata = {
      url: 'https://blog.example.com/article',
      title: 'Blog Article',
    };

    const result = wrapWithMetadata(markdown, metadata);

    expect(result).toContain(
      '<!-- Captured from: https://blog.example.com/article -->',
    );
    expect(result).toContain('# Blog Article');
    expect(result).toContain('*Captured with Markdown Capture extension*');
  });
});
