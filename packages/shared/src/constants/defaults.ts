import type { LowerThirdStyle } from '../dto/lower-third-style.dto';

export const DEFAULT_STYLE: LowerThirdStyle = {
  fontFamily: 'Helvetica Neue',
  fontSize: 48,
  subtitleFontSize: 30,
  foregroundHex: '#FFFFFF',
  backgroundHex: '#0F1115',
  padding: { x: 32, y: 16, minWidth: 240, maxWidth: 1280 },
};

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const isHexColor = (value: string): boolean => HEX_COLOR_PATTERN.test(value);
