import { _decorator, AudioClip, AudioSource, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BirdAudio')
export class BirdAudio extends Component {
    @property({
        type: [AudioClip],
    })
    public clips: AudioClip[] = [];

    @property({
        type: AudioSource,
    })
    public audioSource: AudioSource | null = null;

    onAudioQueue(index: number) {
        if (!this.audioSource) return;
        if (index < 0 || index >= this.clips.length) return;

        const clip: AudioClip = this.clips[index];
        this.audioSource.playOneShot(clip);
    }
}

