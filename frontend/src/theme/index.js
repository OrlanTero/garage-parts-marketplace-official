import { theme } from './tokens.js'

/**
 * Theme is CSS-variable driven — no runtime provider needed.
 * Import this file once at the app root so variables are always present.
 * JS consumers can still read `theme` tokens for canvas/SVG.
 */

export { theme }
export default theme
