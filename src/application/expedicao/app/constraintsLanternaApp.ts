/** Chrome/Android expõe `torch` no track; o DOM lib do TS ainda não tipa isso. */
export function constraintsLanternaApp(ligar: boolean): MediaTrackConstraints {
  return {
    advanced: [{ torch: ligar } as MediaTrackConstraintSet],
  } as unknown as MediaTrackConstraints
}
