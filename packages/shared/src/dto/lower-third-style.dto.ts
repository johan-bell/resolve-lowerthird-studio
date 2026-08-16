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

import type { Anchor, LayoutVariant } from '../layout/plan';

export interface LowerThirdStyle {
  /** Which of the named looks to draw. */
  layout: LayoutVariant;
  fontFamily: string;
  /** Weight of the name; the subtitle sits a step lighter. */
  fontWeight: number;
  fontSize: number;
  subtitleFontSize: number;
  foregroundHex: string;
  backgroundHex: string;
  /** Used by the layouts that carry a colour accent. */
  accentHex: string;
  /** Corner radius of the panels, in project pixels. 0 is square. */
  cornerRadius: number;
  /** Which part of the block is pinned, and to which frame edge. */
  anchor: Anchor;
  /** Distance from the anchored edge, as a fraction of frame width. */
  offsetX: number;
  /** Distance from the anchored edge, as a fraction of frame height. */
  offsetY: number;
  padding: PaddingConstraints;
}
