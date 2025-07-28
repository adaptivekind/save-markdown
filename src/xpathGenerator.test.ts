/**
 * Tests for xpathGenerator module
 */

import {
  generateXPath,
  validateXPath,
  getElementByXPath,
  generateXPathVariations,
} from './xpathGenerator';

describe('xpathGenerator', () => {
  beforeEach(() => {
    // Clear the document body for each test
    document.body.innerHTML = '';
  });

  describe('generateXPath', () => {
    it('should generate XPath using ID when available', () => {
      const element = document.createElement('div');
      element.id = 'unique-id';
      document.body.appendChild(element);

      const xpath = generateXPath(element);
      expect(xpath).toBe('//*[@id="unique-id"]');
    });

    it('should generate position-based XPath for elements without ID', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const xpath = generateXPath(child);
      expect(xpath).toBe('/html/body/div/span');
    });

    it('should include class attributes in XPath', () => {
      const element = document.createElement('div');
      element.className = 'class1 class2';
      document.body.appendChild(element);

      const xpath = generateXPath(element);
      expect(xpath).toBe('/html/body/div[@class="class1 class2"]');
    });

    it('should normalize multiple spaces in class names', () => {
      const element = document.createElement('div');
      element.className = 'class1    class2   class3';
      document.body.appendChild(element);

      const xpath = generateXPath(element);
      expect(xpath).toBe('/html/body/div[@class="class1 class2 class3"]');
    });

    it('should include position index for siblings of same tag', () => {
      const parent = document.createElement('div');
      const firstChild = document.createElement('span');
      const secondChild = document.createElement('span');
      const thirdChild = document.createElement('span');

      parent.appendChild(firstChild);
      parent.appendChild(secondChild);
      parent.appendChild(thirdChild);
      document.body.appendChild(parent);

      expect(generateXPath(firstChild)).toBe('/html/body/div/span[1]');
      expect(generateXPath(secondChild)).toBe('/html/body/div/span[2]');
      expect(generateXPath(thirdChild)).toBe('/html/body/div/span[3]');
    });

    it('should not include position index for single child', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const xpath = generateXPath(child);
      expect(xpath).toBe('/html/body/div/span');
    });

    it('should handle complex nested structure', () => {
      document.body.innerHTML = `
        <div class="container">
          <article>
            <header class="post-header">
              <h1>Title</h1>
            </header>
            <div class="content">
              <p>First paragraph</p>
              <p class="highlight">Second paragraph</p>
            </div>
          </article>
        </div>
      `;

      const highlightParagraph = document.querySelector(
        '.highlight',
      ) as HTMLElement;
      const xpath = generateXPath(highlightParagraph);

      expect(xpath).toBe(
        '/html/body/div[@class="container"][1]/article/div[@class="content"]/p[@class="highlight"][2]',
      );
    });

    it('should handle elements with mixed sibling types', () => {
      const parent = document.createElement('div');
      const span1 = document.createElement('span');
      const divElement = document.createElement('div');
      const span2 = document.createElement('span');

      parent.appendChild(span1);
      parent.appendChild(divElement);
      parent.appendChild(span2);
      document.body.appendChild(parent);

      expect(generateXPath(span1)).toBe('/html/body/div[1]/span[1]');
      expect(generateXPath(divElement)).toBe('/html/body/div[1]/div');
      expect(generateXPath(span2)).toBe('/html/body/div[1]/span[2]');
    });
  });

  describe('validateXPath', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="test-container">
          <p class="paragraph">Test content</p>
          <span>Another element</span>
        </div>
      `;
    });

    it('should return true for valid XPath expressions', () => {
      expect(validateXPath('//*[@id="test-container"]')).toBe(true);
      expect(validateXPath('//p[@class="paragraph"]')).toBe(true);
      expect(validateXPath('/html/body/div/span')).toBe(true);
    });

    it('should return false for invalid XPath expressions', () => {
      expect(validateXPath('//*[@invalid syntax')).toBe(false);
      expect(validateXPath('//[')).toBe(false);
      expect(validateXPath('//*[invalid(')).toBe(false);
    });

    it('should return true for XPath that finds no elements', () => {
      // Valid XPath syntax but no matching elements
      expect(validateXPath('//*[@id="non-existent"]')).toBe(true);
      expect(validateXPath('//nonexistent')).toBe(true);
    });
  });

  describe('getElementByXPath', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="main-container">
          <header class="site-header">
            <h1>Site Title</h1>
            <nav>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <article class="post">
              <h2>Article Title</h2>
              <p>Article content</p>
            </article>
          </main>
        </div>
      `;
    });

    it('should return correct element for valid XPath', () => {
      const element = getElementByXPath('//*[@id="main-container"]');
      expect(element).toBeTruthy();
      expect(element?.id).toBe('main-container');
      expect(element?.tagName.toLowerCase()).toBe('div');
    });

    it('should return correct element for class-based XPath', () => {
      const element = getElementByXPath('//header[@class="site-header"]');
      expect(element).toBeTruthy();
      expect(element?.className).toBe('site-header');
      expect(element?.tagName.toLowerCase()).toBe('header');
    });

    it('should return correct element for position-based XPath', () => {
      const element = getElementByXPath('//nav/ul/li[2]/a');
      expect(element).toBeTruthy();
      expect(element?.textContent).toBe('About');
      expect(element?.getAttribute('href')).toBe('#about');
    });

    it('should return null for non-existent elements', () => {
      const element = getElementByXPath('//*[@id="non-existent"]');
      expect(element).toBeNull();
    });

    it('should return null for invalid XPath', () => {
      const element = getElementByXPath('invalid-xpath');
      expect(element).toBeNull();
    });

    it('should return first matching element when multiple matches exist', () => {
      const element = getElementByXPath('//li');
      expect(element).toBeTruthy();
      expect(element?.textContent).toBe('Home'); // First li element
    });
  });

  describe('generateXPathVariations', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="container main-content">
          <article id="article-123" class="post featured">
            <h2 class="title">Test Article Title</h2>
            <p class="content">Short content</p>
            <p class="content">This is a very long content that exceeds fifty characters and should not be used in text-based xpath</p>
          </article>
        </div>
      `;
    });

    it('should generate multiple variations for element with ID and classes', () => {
      const article = document.getElementById('article-123') as HTMLElement;
      const variations = generateXPathVariations(article);

      expect(variations).toContain('//*[@id="article-123"]');
      expect(variations).toContain(
        '//article[contains(@class, "post") and contains(@class, "featured")]',
      );
      expect(variations.length).toBeGreaterThan(1);
    });

    it('should include text-based XPath for elements with short text content', () => {
      const title = document.querySelector('.title') as HTMLElement;
      const variations = generateXPathVariations(title);

      expect(variations).toContain(
        '//h2[contains(text(), "Test Article Title")]',
      );
      expect(variations.length).toBeGreaterThan(1);
    });

    it('should not include text-based XPath for elements with long text content', () => {
      const longContent = document.querySelectorAll(
        '.content',
      )[1] as HTMLElement;
      const variations = generateXPathVariations(longContent);

      const textBasedVariation = variations.find(v =>
        v.includes('contains(text()'),
      );
      expect(textBasedVariation).toBeUndefined();
    });

    it('should include class-based XPath for elements with classes', () => {
      const container = document.querySelector('.container') as HTMLElement;
      const variations = generateXPathVariations(container);

      expect(variations).toContain(
        '//div[contains(@class, "container") and contains(@class, "main-content")]',
      );
    });

    it('should remove duplicate variations', () => {
      const elementWithId = document.getElementById(
        'article-123',
      ) as HTMLElement;
      const variations = generateXPathVariations(elementWithId);

      // Should not have duplicate ID-based variations
      const idVariations = variations.filter(v =>
        v.includes('@id="article-123"'),
      );
      expect(idVariations.length).toBe(1);
    });

    it('should generate basic XPath for elements without special attributes', () => {
      const plainDiv = document.createElement('div');
      document.body.appendChild(plainDiv);

      const variations = generateXPathVariations(plainDiv);
      expect(variations.length).toBe(1);
      expect(variations[0]).toMatch(/^\/html\/body\/div/);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle elements with special characters in class names', () => {
      const element = document.createElement('div');
      element.className =
        'class-with-dashes class_with_underscores class.with.dots';
      document.body.appendChild(element);

      const xpath = generateXPath(element);
      expect(xpath).toBe(
        '/html/body/div[@class="class-with-dashes class_with_underscores class.with.dots"]',
      );
    });

    it('should handle elements with quotes in attributes', () => {
      const element = document.createElement('div');
      element.id = 'id-with-"quotes"';
      document.body.appendChild(element);

      const xpath = generateXPath(element);
      expect(xpath).toBe('//*[@id="id-with-\\"quotes\\""]');
    });

    it('should handle deeply nested elements', () => {
      let current = document.body;
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = `level-${i}`;
        current.appendChild(div);
        current = div;
      }

      const deepElement = current;
      const xpath = generateXPath(deepElement);

      expect(xpath).toContain('level-9');
      expect(xpath.split('/').length).toBeGreaterThan(10);
    });

    it('should handle SVG elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      );
      svg.appendChild(circle);
      document.body.appendChild(svg);

      const xpath = generateXPath(circle as unknown as HTMLElement);
      expect(xpath).toBe('/html/body/svg/circle');
    });
  });

  describe('integration tests', () => {
    it('should generate XPath that can be used to find the same element', () => {
      document.body.innerHTML = `
        <div class="wrapper">
          <section id="main-section">
            <article class="post">
              <h2>Title</h2>
              <div class="meta">
                <span class="author">John Doe</span>
                <time datetime="2024-01-15">January 15, 2024</time>
              </div>
              <p>Content paragraph 1</p>
              <p>Content paragraph 2</p>
            </article>
          </section>
        </div>
      `;

      // Test various elements
      const elements = [
        document.getElementById('main-section'),
        document.querySelector('.author'),
        document.querySelector('time'),
        document.querySelectorAll('p')[1], // Second paragraph
      ];

      elements.forEach(element => {
        if (element) {
          const xpath = generateXPath(element as HTMLElement);
          const foundElement = getElementByXPath(xpath);
          expect(foundElement).toBe(element);
        }
      });
    });

    it('should generate unique XPaths for sibling elements', () => {
      document.body.innerHTML = `
        <ul class="menu">
          <li class="item">Item 1</li>
          <li class="item">Item 2</li>
          <li class="item">Item 3</li>
        </ul>
      `;

      const items = Array.from(
        document.querySelectorAll('.item'),
      ) as HTMLElement[];
      const xpaths = items.map(item => generateXPath(item));

      // All XPaths should be different
      expect(new Set(xpaths).size).toBe(3);

      // Each XPath should find the correct element
      xpaths.forEach((xpath, index) => {
        const foundElement = getElementByXPath(xpath);
        expect(foundElement).toBe(items[index]);
      });
    });
  });
});
