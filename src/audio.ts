export class RaceAudio {
  private context: AudioContext | null = null;

  enable(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  tone(kind: 'start' | 'round' | 'match', muted: boolean): void {
    if (muted || !this.context) return;
    const frequencies = kind === 'start' ? [330, 440] : kind === 'round' ? [520, 390] : [440, 554, 659];
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context?.createOscillator();
      const gain = this.context?.createGain();
      if (!oscillator || !gain || !this.context) return;
      const start = this.context.currentTime + index * 0.08;
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.08);
    });
  }

  close(): void {
    if (this.context) void this.context.close();
    this.context = null;
  }
}
