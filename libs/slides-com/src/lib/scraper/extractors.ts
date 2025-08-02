/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page, ElementHandle } from 'playwright';
import type {
  ContentBlock,
  TextBlock,
  CodeBlock,
  ImageBlock,
  IframeBlock,
  TableBlock,
  BaseBlock,
  SlideContent,
} from '../types.js';

export abstract class ContentExtractor {
  constructor(protected page: Page) {}

  abstract canHandle(element: ElementHandle): Promise<boolean>;
  abstract extract(element: ElementHandle): Promise<ContentBlock>;
}

export class ElementDetector {
  static readonly SELECTORS = {
    slides: '.reveal .slides section',
    currentSlide: '.reveal .slides section.present',
    textElements: 'h1, h2, h3, p, div:not(.hljs):not(pre)',
    codeBlocks: '.hljs, pre code, .code-block, pre',
    images: 'img',
    iframes: 'iframe',
    tables: 'table',
    backgrounds: '[data-background-color], [data-background-image]',
    speakerNotes: '.speaker-notes, aside.notes',
  } as const;

  async findContentElements(page: Page): Promise<ElementHandle[]> {
    const currentSlide = await page.$(ElementDetector.SELECTORS.currentSlide);
    if (!currentSlide) return [];

    // Get direct children that are likely content blocks
    const elements = await currentSlide.$$(
      'h1, h2, h3, p, pre, .hljs, img, iframe, table, div.fragment, div[data-block-type]'
    );

    // Filter out nested elements to avoid duplicates
    const uniqueElements: ElementHandle[] = [];
    for (const element of elements) {
      const isNested = await this.isNestedInOtherElement(element, elements);
      if (!isNested) {
        uniqueElements.push(element);
      }
    }

    return uniqueElements;
  }

  private async isNestedInOtherElement(
    element: ElementHandle,
    allElements: ElementHandle[]
  ): Promise<boolean> {
    for (const otherElement of allElements) {
      if (element === otherElement) continue;

      const isNested = await otherElement.evaluate((parent, child) => {
        return parent.contains(child);
      }, element);

      if (isNested) return true;
    }
    return false;
  }
}

export class StyleExtractor {
  static async extractElementStyles(
    element: ElementHandle<Element>
  ): Promise<Partial<BaseBlock>> {
    return await element.evaluate((el) => {
      const rect = el.getBoundingClientRect();

      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        'animation-type': el.getAttribute('data-animation') as any,
        'animation-delay': parseInt(
          el.getAttribute('data-animation-delay') || '0'
        ),
        class: el.className || undefined,
      };
    });
  }

  static async extractSlideBackground(
    page: Page
  ): Promise<Partial<SlideContent>> {
    return await page.evaluate(() => {
      const currentSlide = document.querySelector(
        '.reveal .slides section.present'
      );
      if (!currentSlide) return {};

      return {
        'background-color':
          currentSlide.getAttribute('data-background-color') || undefined,
        'background-image':
          currentSlide.getAttribute('data-background-image') || undefined,
        'background-size':
          (currentSlide.getAttribute('data-background-size') as any) ||
          undefined,
      };
    });
  }
}

export class TextExtractor extends ContentExtractor {
  async canHandle(element: ElementHandle<Element>): Promise<boolean> {
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    const hasCodeParent = await element.evaluate((el) => {
      return !!el.closest('pre, .hljs, code');
    });

    return (
      ['h1', 'h2', 'h3', 'p', 'div', 'span'].includes(tagName) && !hasCodeParent
    );
  }

  async extract(element: ElementHandle<Element>): Promise<TextBlock> {
    const baseStyles = await StyleExtractor.extractElementStyles(element);

    const textData = await element.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const computedStyle = window.getComputedStyle(el);

      let value = el.textContent || '';

      const strong = el.querySelectorAll('strong, b');
      const em = el.querySelectorAll('em, i');
      const code = el.querySelectorAll('code');

      strong.forEach((s) => {
        const text = s.textContent;
        if (text) value = value.replace(text, `**${text}**`);
      });

      em.forEach((e) => {
        const text = e.textContent;
        if (text) value = value.replace(text, `*${text}*`);
      });

      code.forEach((c) => {
        const text = c.textContent;
        if (text) value = value.replace(text, `\`${text}\``);
      });

      // Determine format from tag name
      let format: 'h1' | 'h2' | 'h3' | 'p' | 'pre' = 'p';
      if (['h1', 'h2', 'h3', 'pre'].includes(tagName)) {
        format = tagName as any;
      }

      const textAlign = computedStyle.textAlign;
      let align: 'left' | 'center' | 'right' | 'justify' = 'left';
      if (['center', 'right', 'justify'].includes(textAlign)) {
        align = textAlign as any;
      }

      const color = computedStyle.color;
      const fontSize = computedStyle.fontSize;

      return {
        value: value.trim(),
        format,
        align,
        color: color !== 'rgb(0, 0, 0)' ? color : undefined,
        'font-size': fontSize !== '16px' ? fontSize : undefined,
      };
    });

    return {
      type: 'text',
      ...baseStyles,
      ...textData,
    };
  }
}

export class CodeExtractor extends ContentExtractor {
  async canHandle(element: ElementHandle<Element>): Promise<boolean> {
    return await element.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      return (
        tagName === 'pre' ||
        el.classList.contains('hljs') ||
        el.classList.contains('code-block') ||
        !!el.querySelector('code')
      );
    });
  }

  async extract(element: ElementHandle<Element>): Promise<CodeBlock> {
    const baseStyles = await StyleExtractor.extractElementStyles(element);

    const codeData = await element.evaluate((el) => {
      const codeElement = el.querySelector('code') || el;
      const value = codeElement.textContent || '';

      let language: string | undefined;
      const classList = Array.from(codeElement.classList);
      const langClass = classList.find(
        (cls) =>
          cls.startsWith('language-') ||
          cls.startsWith('hljs-') ||
          cls.match(
            /^(js|javascript|ts|typescript|python|java|cpp|c|html|css|json|yaml|bash|shell)$/
          )
      );

      if (langClass) {
        language = langClass.replace(/^(language-|hljs-)/, '');
      }

      const hasLineNumbers = !!el.querySelector('.line-numbers, .hljs-ln');

      let theme: string | undefined;
      if (el.classList.contains('hljs')) {
        const themeClasses = [
          'monokai',
          'github',
          'vs',
          'atom-one-dark',
          'solarized-light',
          'solarized-dark',
        ];
        theme = themeClasses.find((t) => el.classList.contains(t));
      }

      return {
        value: value.trim(),
        language,
        'line-numbers': hasLineNumbers,
        theme,
        'word-wrap': true, // Default for slides.com
      };
    });

    return {
      type: 'code',
      ...baseStyles,
      ...codeData,
    };
  }
}

export class ImageExtractor extends ContentExtractor {
  async canHandle(element: ElementHandle<Element>): Promise<boolean> {
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    return tagName === 'img';
  }

  async extract(element: ElementHandle<Element>): Promise<ImageBlock> {
    const baseStyles = await StyleExtractor.extractElementStyles(element);

    const imageData = await element.evaluate((el: HTMLImageElement) => {
      return {
        value: el.src,
        alt: el.alt || undefined,
      };
    });

    return {
      type: 'image',
      ...baseStyles,
      ...imageData,
    };
  }
}

export class IframeExtractor extends ContentExtractor {
  async canHandle(element: ElementHandle<Element>): Promise<boolean> {
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    return tagName === 'iframe';
  }

  async extract(element: ElementHandle<Element>): Promise<IframeBlock> {
    const baseStyles = await StyleExtractor.extractElementStyles(element);

    const iframeData = await element.evaluate((el: HTMLIFrameElement) => {
      return {
        value: el.src,
      };
    });

    return {
      type: 'iframe',
      ...baseStyles,
      ...iframeData,
    };
  }
}

export class TableExtractor extends ContentExtractor {
  async canHandle(element: ElementHandle<Element>): Promise<boolean> {
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    return tagName === 'table';
  }

  async extract(element: ElementHandle<Element>): Promise<TableBlock> {
    const baseStyles = await StyleExtractor.extractElementStyles(element);

    const tableData = await element.evaluate((el: HTMLTableElement) => {
      const data: any[][] = [];
      const rows = Array.from(el.querySelectorAll('tr'));

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        const rowData = cells.map((cell) => cell.textContent?.trim() || '');
        if (rowData.length > 0) {
          data.push(rowData);
        }
      });

      const computedStyle = window.getComputedStyle(el);
      const borderWidth = parseInt(computedStyle.borderWidth) || 0;
      const borderColor = computedStyle.borderColor;

      return {
        data,
        'border-width': borderWidth > 0 ? borderWidth : undefined,
        'border-color':
          borderColor !== 'rgb(0, 0, 0)' ? borderColor : undefined,
      };
    });

    return {
      type: 'table',
      ...baseStyles,
      ...tableData,
    };
  }
}
