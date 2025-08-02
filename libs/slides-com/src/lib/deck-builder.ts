import type {
  DeckDefinition,
  SlideContent,
  ContentBlock,
  TextBlock,
  CodeBlock,
  ImageBlock,
  IframeBlock,
  TableBlock,
  ThemeColor,
  ThemeFont,
  Transition,
} from './types.js';

export interface DeckTheme {
  colors?: {
    primary?: string;
    accent?: string;
    text?: string;
    textLight?: string;
    background?: string;
  };
}

export interface DeckBuilderConfig {
  title: string;
  description?: string;
  theme?: DeckTheme;
  themeColor?: ThemeColor;
  themeFont?: ThemeFont;
  transition?: Transition;
  width?: number;
  height?: number;
  visibility?: 'all' | 'self' | 'team';
  loop?: boolean;
  slideNumber?: boolean;
}

export class DeckBuilder {
  private config: DeckBuilderConfig;
  private slides: (SlideContent | SlideContent[])[] = [];

  constructor(config: DeckBuilderConfig) {
    this.config = config;
  }

  addSlide(slide: SlideContent): this {
    this.slides.push(slide);
    return this;
  }

  addVerticalSlides(slides: SlideContent[]): this {
    this.slides.push(slides);
    return this;
  }

  addHtmlSlide(
    html: string,
    options?: Omit<SlideContent, 'html'>
  ): this {
    this.slides.push({
      ...options,
      html,
    });
    return this;
  }

  addMarkdownSlide(
    markdown: string,
    options?: Omit<SlideContent, 'markdown'>
  ): this {
    this.slides.push({
      ...options,
      markdown,
    });
    return this;
  }

  addBlockSlide(
    blocks: ContentBlock[],
    options?: Omit<SlideContent, 'blocks'>
  ): this {
    this.slides.push({
      ...options,
      blocks,
    });
    return this;
  }

  build(): DeckDefinition {
    return {
      title: this.config.title,
      description: this.config.description,
      'theme-color': this.config.themeColor,
      'theme-font': this.config.themeFont,
      transition: this.config.transition,
      width: this.config.width,
      height: this.config.height,
      visibility: this.config.visibility,
      loop: this.config.loop,
      'slide-number': this.config.slideNumber,
      slides: this.slides,
    };
  }

  // Helper methods for common slide patterns

  addTitleSlide(
    title: string,
    subtitle?: string,
    options?: Omit<SlideContent, 'blocks'>
  ): this {
    const blocks: TextBlock[] = [
      {
        type: 'text',
        value: title,
        format: 'h1',
        align: 'center',
      },
    ];

    if (subtitle) {
      blocks.push({
        type: 'text',
        value: subtitle,
        format: 'h2',
        align: 'center',
      });
    }

    return this.addBlockSlide(blocks, options);
  }

  addChapterSlide(
    title: string,
    subtitle?: string,
    backgroundColor?: string,
    titleColor?: string,
    subtitleColor?: string
  ): this {
    const blocks: TextBlock[] = [];

    if (subtitle) {
      blocks.push({
        type: 'text',
        value: subtitle,
        format: 'h2',
        align: 'center',
        color: subtitleColor,
      });
    }

    blocks.push({
      type: 'text',
      value: title,
      format: 'h1',
      align: 'center',
      color: titleColor,
    });

    return this.addBlockSlide(blocks, {
      'background-color': backgroundColor,
    });
  }

  addCodeSlide(
    code: string,
    language?: string,
    title?: string,
    options?: Omit<SlideContent, 'blocks'>
  ): this {
    const blocks: ContentBlock[] = [];

    if (title) {
      blocks.push({
        type: 'text',
        value: title,
        format: 'h1',
        align: 'center',
      } as TextBlock);
    }

    blocks.push({
      type: 'code',
      value: code,
      language,
      'line-numbers': true,
    } as CodeBlock);

    return this.addBlockSlide(blocks, options);
  }

  addImageSlide(
    imageUrl: string,
    title?: string,
    options?: Omit<SlideContent, 'blocks'>
  ): this {
    const blocks: ContentBlock[] = [];

    if (title) {
      blocks.push({
        type: 'text',
        value: title,
        format: 'h1',
        align: 'center',
      } as TextBlock);
    }

    blocks.push({
      type: 'image',
      value: imageUrl,
    } as ImageBlock);

    return this.addBlockSlide(blocks, options);
  }

  addListSlide(
    title: string,
    items: string[],
    options?: Omit<SlideContent, 'blocks'>
  ): this {
    const blocks: TextBlock[] = [
      {
        type: 'text',
        value: title,
        format: 'h1',
        align: 'center',
      },
    ];

    items.forEach((item) => {
      blocks.push({
        type: 'text',
        value: item,
        format: 'p',
        align: 'left',
      });
    });

    return this.addBlockSlide(blocks, options);
  }
}

// Block helper functions

export function textBlock(
  value: string,
  options?: Omit<TextBlock, 'type' | 'value'>
): TextBlock {
  return {
    type: 'text',
    value,
    ...options,
  };
}

export function codeBlock(
  value: string,
  options?: Omit<CodeBlock, 'type' | 'value'>
): CodeBlock {
  return {
    type: 'code',
    value,
    ...options,
  };
}

export function imageBlock(
  value: string,
  options?: Omit<ImageBlock, 'type' | 'value'>
): ImageBlock {
  return {
    type: 'image',
    value,
    ...options,
  };
}

export function iframeBlock(
  value: string,
  options?: Omit<IframeBlock, 'type' | 'value'>
): IframeBlock {
  return {
    type: 'iframe',
    value,
    ...options,
  };
}

export function tableBlock(
  data: any[][],
  options?: Omit<TableBlock, 'type' | 'data'>
): TableBlock {
  return {
    type: 'table',
    data,
    ...options,
  };
}