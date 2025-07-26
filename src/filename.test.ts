import {
  generateFilename,
  generateDownloadPath,
  createFilenameVariables,
  type FilenameOptions,
} from './filename';

describe('filename utilities', () => {
  describe('createFilenameVariables', () => {
    beforeAll(() => {
      // Mock Date for consistent test results
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2024-01-15T10:30:45.123Z');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should create filename variables from title and URL', () => {
      const title = 'Test Page Title';
      const url = 'https://www.example.com/path/to/page';

      const variables = createFilenameVariables(title, url);

      expect(variables).toEqual({
        title: 'test-page-title',
        timestamp: '2024-01-15T10-30-45-123Z',
        domain: 'example-com',
        date: '2024-01-15',
      });
    });

    it('should handle titles with special characters', () => {
      const title = 'Test @ Page! With #Special$ Characters%';
      const url = 'https://example.com';

      const variables = createFilenameVariables(title, url);

      expect(variables.title).toBe('test-page-with-special-characters');
    });

    it('should handle URLs with www prefix', () => {
      const title = 'Test';
      const url = 'https://www.subdomain.example.com/path';

      const variables = createFilenameVariables(title, url);

      expect(variables.domain).toBe('subdomain-example-com');
    });

    it('should handle empty titles gracefully', () => {
      const title = '';
      const url = 'https://example.com';

      const variables = createFilenameVariables(title, url);

      expect(variables.title).toBe('');
    });
  });

  describe('generateFilename', () => {
    beforeAll(() => {
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2024-01-15T10:30:45.123Z');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should generate filename with default template', () => {
      const options: FilenameOptions = {
        template: '{title}_{timestamp}.md',
        title: 'My Test Page',
        url: 'https://example.com/page',
      };

      const filename = generateFilename(options);

      expect(filename).toBe('my-test-page_2024-01-15T10-30-45-123Z.md');
    });

    it('should handle all template variables', () => {
      const options: FilenameOptions = {
        template: '{date}_{domain}_{title}_{timestamp}.md',
        title: 'Page Title',
        url: 'https://www.example.com/test',
      };

      const filename = generateFilename(options);

      expect(filename).toBe(
        '2024-01-15_example-com_page-title_2024-01-15T10-30-45-123Z.md',
      );
    });

    it('should truncate long titles to maxTitleLength', () => {
      const options: FilenameOptions = {
        template: '{title}.md',
        title: 'This is a very long title that should be truncated',
        url: 'https://example.com',
        maxTitleLength: 10,
      };

      const filename = generateFilename(options);

      expect(filename).toBe('this-is-a-.md');
    });

    it('should use default maxTitleLength of 50', () => {
      const longTitle = 'a'.repeat(100); // 100 character title
      const options: FilenameOptions = {
        template: '{title}.md',
        title: longTitle,
        url: 'https://example.com',
      };

      const filename = generateFilename(options);

      expect(filename).toBe('a'.repeat(50) + '.md');
    });

    it('should handle templates without variables', () => {
      const options: FilenameOptions = {
        template: 'static-filename.md',
        title: 'Any Title',
        url: 'https://example.com',
      };

      const filename = generateFilename(options);

      expect(filename).toBe('static-filename.md');
    });

    it('should handle multiple occurrences of same variable', () => {
      const options: FilenameOptions = {
        template: '{title}-{title}-{title}.md',
        title: 'Test',
        url: 'https://example.com',
      };

      const filename = generateFilename(options);

      expect(filename).toBe('test-test-test.md');
    });
  });

  describe('generateDownloadPath', () => {
    it('should return filename for default Downloads directory', () => {
      const result = generateDownloadPath('~/Downloads', 'test.md');
      expect(result).toBe('test.md');
    });

    it('should return filename for empty directory', () => {
      const result = generateDownloadPath('', 'test.md');
      expect(result).toBe('test.md');
    });

    it('should handle subdirectory within Downloads', () => {
      const result = generateDownloadPath('~/Downloads/markdown', 'test.md');
      expect(result).toBe('markdown/test.md');
    });

    it('should convert custom directory to relative path', () => {
      const result = generateDownloadPath('~/Documents/captures', 'test.md');
      expect(result).toBe('Documents/captures/test.md');
    });

    it('should remove trailing slashes', () => {
      const result = generateDownloadPath('~/Documents/captures/', 'test.md');
      expect(result).toBe('Documents/captures/test.md');
    });

    it('should sanitize paths with directory traversal attempts', () => {
      const result = generateDownloadPath('../../../etc', 'test.md');
      expect(result).toBe('//etc/test.md');
    });

    it('should remove leading slashes from absolute paths', () => {
      const result = generateDownloadPath('/absolute/path', 'test.md');
      expect(result).toBe('absolute/path/test.md');
    });

    it('should handle complex path sanitization', () => {
      const result = generateDownloadPath(
        '/../Documents/../captures/../final',
        'test.md',
      );
      expect(result).toBe('/Documents//captures//final/test.md');
    });
  });

  describe('integration tests', () => {
    beforeAll(() => {
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2024-01-15T10:30:45.123Z');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should generate complete download path for typical use case', () => {
      const options: FilenameOptions = {
        template: '{title}_{timestamp}.md',
        title: 'GitHub - Example Repository',
        url: 'https://github.com/user/repo',
      };

      const filename = generateFilename(options);
      const downloadPath = generateDownloadPath(
        '~/Documents/captures',
        filename,
      );

      expect(downloadPath).toBe(
        'Documents/captures/github-example-repository_2024-01-15T10-30-45-123Z.md',
      );
    });

    it('should handle edge case with special characters and long path', () => {
      const options: FilenameOptions = {
        template: '{domain}_{date}_{title}.md',
        title: 'Special !@#$%^&*() Characters in Title',
        url: 'https://www.very-long-subdomain.example.com/path',
        maxTitleLength: 20,
      };

      const filename = generateFilename(options);
      const downloadPath = generateDownloadPath(
        '~/Downloads/markdown-captures',
        filename,
      );

      expect(downloadPath).toBe(
        'markdown-captures/very-long-subdomain-example-com_2024-01-15_special-characters-i.md',
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid URLs gracefully', () => {
      const options: FilenameOptions = {
        template: '{domain}_{title}.md',
        title: 'Test',
        url: 'not-a-valid-url',
      };

      const filename = generateFilename(options);

      expect(filename).toBe('unknown-domain_test.md');
    });

    it('should handle URLs without protocol', () => {
      const options: FilenameOptions = {
        template: '{domain}_{title}.md',
        title: 'Test',
        url: 'example.com/path',
      };

      const filename = generateFilename(options);

      expect(filename).toBe('unknown-domain_test.md');
    });
  });
});
