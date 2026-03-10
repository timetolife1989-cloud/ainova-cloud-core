import { describe, it, expect } from 'vitest';
import { generatePdfHtml } from '@/lib/export/pdf';

describe('PDF Export', () => {
  it('should generate valid HTML with title and rows', () => {
    const html = generatePdfHtml({
      title: 'Test Report',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ],
      rows: [
        { name: 'Item 1', value: 100 },
        { name: 'Item 2', value: 200 },
      ],
    });

    expect(html).toContain('Test Report');
    expect(html).toContain('Item 1');
    expect(html).toContain('200');
    expect(html).toContain('<table>');
  });

  it('should escape HTML in values', () => {
    const html = generatePdfHtml({
      title: 'XSS Test',
      columns: [{ key: 'name', label: 'Name' }],
      rows: [{ name: '<script>alert("xss")</script>' }],
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should support locale parameter', () => {
    const html = generatePdfHtml({
      title: 'Bericht',
      columns: [{ key: 'a', label: 'A' }],
      rows: [{ a: 1 }],
      locale: 'de',
    });

    expect(html).toContain('lang="de"');
    expect(html).toContain('Zeilen');
  });
});
