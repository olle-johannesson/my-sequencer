// =============================================================================
// Platform detection — thin wrapper around bowser. Anything that needs to
// branch on browser/OS pulls from here rather than parsing the UA itself.
// =============================================================================
//
// iOS-specific notes that drive most of the flags below:
//  - All browsers on iOS are WebKit underneath (Apple App Store rule).
//    So `isIOS` is the meaningful check, not `isSafari`.
//  - When getUserMedia is active, iOS routes audio output to the same physical
//    device as the input — there's no API knob to decouple them. UI that lets
//    the user pick an input source needs to communicate this.
// =============================================================================

import Bowser from 'bowser'

const parser = Bowser.getParser(navigator.userAgent)

export const isIOS = parser.getOSName(true) === 'ios'
  // iPadOS 13+ pretends to be macOS in the UA. Bowser misses this; check
  // touch-points to catch it.
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const isMobile = parser.getPlatformType(true) === 'mobile' || isIOS

export const isSafari = parser.getBrowserName(true) === 'safari'

export {parser as bowser}
