import { _decorator, CCFloat, Component, tween, Tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Chuyển động nhẹ cho màn Get Ready / StartUI (playable-friendly, chỉ tween).
 * Gắn vào node StartUI (hoặc node chứa message).
 */
@ccclass('StartUIMotion')
export class StartUIMotion extends Component {
    @property({
        type: CCFloat,
        tooltip: 'Độ nhấp nhô theo trục Y (px)',
    })
    public bobAmount = 14;

    @property({
        type: CCFloat,
        tooltip: 'Nửa chu kỳ nhấp nhô (giây)',
    })
    public bobHalfPeriod = 0.65;

    private _base = new Vec3();
    private _running: Tween<Node> | null = null;

    onEnable() {
        this._base.set(this.node.position);
        this.node.setPosition(this._base);
        this._stopTween();

        const x = this._base.x;
        const z = this._base.z;
        const up = this._base.y + this.bobAmount;
        const down = this._base.y - this.bobAmount;

        this._running = tween(this.node)
            .to(this.bobHalfPeriod, { position: new Vec3(x, up, z) }, { easing: 'quadInOut' })
            .to(this.bobHalfPeriod, { position: new Vec3(x, down, z) }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start() as Tween<Node>;
    }

    onDisable() {
        this._stopTween();
        this.node.setPosition(this._base);
    }

    private _stopTween() {
        if (this._running) {
            this._running.stop();
            this._running = null;
        }
        Tween.stopAllByTarget(this.node);
    }
}
