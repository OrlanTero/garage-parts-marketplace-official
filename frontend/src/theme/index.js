import { theme } from './tokens.js'

/**
 * Theme is CSS-variable driven — no runtime provider needed.
 * Global CSS lives in src/styles/index.css (imported once in main.jsx).
 * JS consumers can still read `theme` tokens for canvas/SVG.
 */

export { theme }
export default theme
