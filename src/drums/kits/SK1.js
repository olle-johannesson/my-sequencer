// Casio SK-1 kit manifest. Lo-fi toy keyboard, 8-bit PCM samples — perfect
// for crunchy beats. Six core slots live in src/drums/samples/SK1; four
// extras are pulled from the CR78+MA101 folder where they happen to be
// shelved (under "SK1 ..." names) so we can reach more magenta classes.
//
//   slot          source file                                  notes
//   ──────────────────────────────────────────────────────────────────────────
//   kick          SK1/kick.wav
//   snare         SK1/snare.wav
//   snare2        CR78 + MA101/SK1 SNR3.wav                    alt SK1 snare
//   hihatClosed   SK1/hihatClosed.wav
//   hihatOpen     SK1/hihatOpen.wav
//   ride          CR78 + MA101/SK1 COWBELL2.wav                cowbell as ride
//   crash         CR78 + MA101/SK1 SYNDRUM.wav                 synth-drum as crash
//   tomHigh       SK1/tomHigh.wav
//   tomMid        CR78 + MA101/SK1 TOM1.wav                    bonus tom layer
//   tomLow        SK1/tomLow.wav
//
// Not provided (handled by DRUM_FALLBACK_CHAIN):
//   hihatPedal → hihatClosed (no SK1 pedal hat in the library)

export const SK1 = {
  name: 'Casio SK-1',
  drums: {
    kick:        () => import('../samples/SK1/kick.wav?url'),
    snare:       () => import('../samples/SK1/snare.wav?url'),
    snare2:      () => import('../samples/CR78 + MA101/SK1 SNR3.wav?url'),
    hihatClosed: () => import('../samples/SK1/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/SK1/hihatOpen.wav?url'),
    ride:        () => import('../samples/CR78 + MA101/SK1 COWBELL2.wav?url'),
    crash:       () => import('../samples/CR78 + MA101/SK1 SYNDRUM.wav?url'),
    tomHigh:     () => import('../samples/SK1/tomHigh.wav?url'),
    tomMid:      () => import('../samples/CR78 + MA101/SK1 TOM1.wav?url'),
    tomLow:      () => import('../samples/SK1/tomLow.wav?url'),
  },
}
