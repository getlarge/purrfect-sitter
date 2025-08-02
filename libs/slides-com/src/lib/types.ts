/**
 * slides.com Define API TypeScript Types
 * Based on https://slides.com/developers#define-api
 */

// Common properties for all block types
export interface BaseBlock {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  class?: string;
  'animation-type'?:
    | 'fade-in'
    | 'fade-out'
    | 'slide-up'
    | 'slide-down'
    | 'slide-right'
    | 'slide-left'
    | 'scale-up'
    | 'scale-down';
  'animation-trigger'?: 'auto' | 'click' | 'hover';
  'animation-duration'?: number;
  'animation-delay'?: number;
  [key: `data-${string}`]: any;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  value: string;
  format?: 'h1' | 'h2' | 'h3' | 'p' | 'pre';
  align?: 'left' | 'center' | 'right' | 'justify';
  padding?: number;
  color?: string;
  'font-size'?: string;
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  value: string;
  language?: string;
  'word-wrap'?: boolean;
  'line-numbers'?: boolean | string;
  theme?: string;
  height?: number;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  value: string; // URL
}

export interface IframeBlock extends BaseBlock {
  type: 'iframe';
  value: string; // HTTPS URL
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  data?: any[][];
  html?: string;
  padding?: number;
  'text-color'?: string;
  'border-width'?: number;
  'border-color'?: string;
}

export type ContentBlock = TextBlock | CodeBlock | ImageBlock | IframeBlock | TableBlock;

export interface SlideContent {
  id?: string;
  markdown?: string;
  html?: string;
  blocks?: ContentBlock[];
  'background-color'?: string;
  'background-image'?: string;
  'background-size'?: 'cover' | 'contain';
  'background-video'?: string;
  notes?: string;
}

export interface DeckDefinition {
  id?: string;
  title: string;
  description?: string;
  slides: (SlideContent | SlideContent[])[];
  'theme-color'?: string;
  'theme-font'?: string;
  transition?: string;
  width?: number;
  height?: number;
  visibility?: 'all' | 'self' | 'team';
  loop?: boolean;
  'slide-number'?: boolean;
}

// Theme presets
export const THEME_COLORS = {
  black: 'black',
  white: 'white',
  'white-blue': 'white-blue',
  beige: 'beige',
  sky: 'sky',
  simple: 'simple',
  serif: 'serif',
  blood: 'blood',
  night: 'night',
  moon: 'moon',
  solarized: 'solarized',
} as const;

export const THEME_FONTS = {
  montserrat: 'montserrat',
  overpass: 'overpass',
  'overpass-2': 'overpass-2',
  asul: 'asul',
  merriweather: 'merriweather',
  'abril-fatface': 'abril-fatface',
  'dela-gothic-one': 'dela-gothic-one',
  'changa-one': 'changa-one',
  josefin: 'josefin',
  quicksand: 'quicksand',
  comfortaa: 'comfortaa',
  'news-cycle': 'news-cycle',
  palatino: 'palatino',
  raleway: 'raleway',
  'open-sans': 'open-sans',
  impact: 'impact',
  lato: 'lato',
  prompt: 'prompt',
  rubik: 'rubik',
  'helvetica-neue': 'helvetica-neue',
  'source-sans-pro': 'source-sans-pro',
} as const;

export const TRANSITIONS = {
  slide: 'slide',
  fade: 'fade',
  convex: 'convex',
  concave: 'concave',
  zoom: 'zoom',
  linear: 'linear',
  none: 'none',
} as const;

export type ThemeColor = typeof THEME_COLORS[keyof typeof THEME_COLORS];
export type ThemeFont = typeof THEME_FONTS[keyof typeof THEME_FONTS];
export type Transition = typeof TRANSITIONS[keyof typeof TRANSITIONS];