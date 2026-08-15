/** Box-sizing rules the auto-scaling preview and the Fusion comp both obey. */
export interface PaddingConstraints {
  /** Horizontal padding either side of the text, in project pixels. */
  x: number;
  /** Vertical padding above and below the text block, in project pixels. */
  y: number;
  /** Background never shrinks below this width. */
  minWidth: number;
  /** Background never grows past this width; text wraps instead. */
  maxWidth: number;
}

export interface LowerThirdStyle {
  fontFamily: string;
  fontSize: number;
  subtitleFontSize: number;
  foregroundHex: string;
  backgroundHex: string;
  padding: PaddingConstraints;
}
