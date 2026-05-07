import {
    _decorator,
    Animation,
    AnimationClip,
    CCFloat,
    Component,
    RigidBody2D,
    Tween,
    Vec2,
    Vec3,
} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Bird')
export class Bird extends Component {
    @property({
        type: CCFloat,
        tooltip: 'jump impulse velocity (px/s) - càng cao bay càng mạnh',
    })
    public jumpForce = 450;

    @property({
        type: CCFloat,
        tooltip: 'góc ngẩng lên tối đa khi đang bay lên (deg)',
    })
    public maxUpAngle = 25;

    @property({
        type: CCFloat,
        tooltip: 'góc chúi xuống tối đa khi rơi (deg, số âm)',
    })
    public maxDownAngle = -85;

    @property({
        type: CCFloat,
        tooltip: 'tốc độ xoay chim theo vận tốc',
    })
    public rotateLerp = 8;

    @property({
        type: CCFloat,
        tooltip: 'Độ nhấp nhô Y khi màn chờ (bob tại chỗ — đất cuộn tạo cảm giác tiến về trước)',
    })
    public idleBobAmount = 12;

    @property({
        type: CCFloat,
        tooltip: 'Bán trục ngang quỹ đạo idle (mặc định 0 — đứng tại chỗ giống Flappy idle)',
    })
    public idleBobAmountX = 0;

    @property({
        type: CCFloat,
        tooltip: 'Nửa sóng (giây): một cực đại→cực tiểu; chu kỳ sóng đầy = 2× giá trị này',
    })
    public idleBobHalfPeriod = 0.65;

    @property({
        tooltip:
            'Bật → quỹ đạo elip lơ lửng (nếu idleBobAmountX > 0). Tắt → bob thẳng đứng tại chỗ.',
    })
    public idleHoverEllipse = false;

    @property({
        type: CCFloat,
        tooltip:
            'Idle sóng sin: độ nghiêng Z cực đại (deg). Mặc định nhỏ — chỉ là “gật” mõm theo nhịp bay, không xoay trục.',
    })
    public idleTiltWaveDeg = 6;

    @property({
        type: CCFloat,
        tooltip: 'Thời gian làm mượt khi bắt đầu idle (giây). Cao hơn = vào sóng êm hơn.',
    })
    public idleSmoothInTime = 0.22;

    @property({
        tooltip:
            'Màn chờ: đưa chim lên cuối danh sách con của parent để vẽ đè lên UI/phông cùng lớp',
    })
    public idleBringToFront = true;

    public birdAnimation: Animation | null = null;
    public rb: RigidBody2D | null = null;
    public birdLocation: Vec3 = new Vec3(-80, 0, 0);
    public hitSomething = false;

    private _idleBobBase: Vec3 | null = null;
    private _idleAnimClipName: string | null = null;
    private _idleSavedSiblingIndex: number | null = null;
    /** Bob sóng sin (không tween hai đỉnh — tránh cảm giác “xoay quanh trục”). */
    private _idleWaveDriving = false;
    private _idleWavePhase = 0;
    private _idleWaveWeight = 0;
    /** RigidBody tắt khi màn chờ để không rơi do gravity / physics vẫn step. */
    private _waitPhysicsFrozen = false;

    onLoad() {
        this.rb = this.getComponent(RigidBody2D);
        this.birdAnimation = this.getComponent(Animation);
        // Màn chờ mặc định: tắt rigidbody ngay để không rơi trước GameCtrl.freezeWaitScreen / tween bob.
        if (this.rb) {
            this.rb.linearVelocity = new Vec2(0, 0);
            this.rb.angularVelocity = 0;
            this.rb.enabled = false;
            this._waitPhysicsFrozen = true;
        }
        this.resetBird();
    }

    onDestroy() {
        this.stopIdleMotion(false);
        if (this.rb && this._waitPhysicsFrozen) {
            this.rb.enabled = true;
            this._waitPhysicsFrozen = false;
        }
    }

    /**
     * Màn chờ: tắt RigidBody2D để không bị gravity khi world physics vẫn step.
     * PauseSimulation đôi khi không đủ hoặc thứ tự script khiến chim rơi trước khi pause.
     */
    setWaitPhysicsFrozen(frozen: boolean) {
        if (!this.rb) return;
        if (frozen) {
            if (!this._waitPhysicsFrozen) {
                this.rb.linearVelocity = new Vec2(0, 0);
                this.rb.angularVelocity = 0;
                this.rb.enabled = false;
                this._waitPhysicsFrozen = true;
            }
        } else if (this._waitPhysicsFrozen) {
            this.rb.enabled = true;
            this._waitPhysicsFrozen = false;
            this.rb.linearVelocity = new Vec2(0, 0);
            this.rb.angularVelocity = 0;
        }
    }

    /** Bob sóng sin chéo (XY + tilt đồng pha) + vỗ cánh; có thể đưa lên trước trong parent. */
    playIdleMotion() {
        this.stopIdleMotion(false);

        const base = this.node.position.clone();
        this._idleBobBase = base.clone();
        this._idleWavePhase = 0;
        this._idleWaveWeight = 0;
        this._idleWaveDriving = true;

        if (this.idleBringToFront) {
            const parent = this.node.parent;
            if (parent) {
                this._idleSavedSiblingIndex = this.node.getSiblingIndex();
                this.node.setSiblingIndex(parent.children.length - 1);
            }
        }

        const clipName = this._resolveBirdClipName();
        if (this.birdAnimation && clipName) {
            this._idleAnimClipName = clipName;
            this.birdAnimation.play(clipName);
            const state = this.birdAnimation.getState(clipName);
            if (state) {
                state.wrapMode = AnimationClip.WrapMode.Loop;
            }
        }
    }

    /**
     * Dừng bob / animation chờ.
     * @param restorePosition true: đặt lại vị trí neo bob khi thoát chờ.
     */
    stopIdleMotion(restorePosition = true) {
        this._idleWaveDriving = false;
        this._idleWaveWeight = 0;
        Tween.stopAllByTarget(this.node);

        if (this._idleSavedSiblingIndex !== null) {
            const parent = this.node.parent;
            if (parent) {
                const max = parent.children.length - 1;
                const idx = Math.min(Math.max(0, this._idleSavedSiblingIndex), max);
                this.node.setSiblingIndex(idx);
            }
            this._idleSavedSiblingIndex = null;
        }

        this.node.setRotationFromEuler(0, 0, 0);

        if (this.birdAnimation && this._idleAnimClipName) {
            const state = this.birdAnimation.getState(this._idleAnimClipName);
            if (state) {
                state.wrapMode = AnimationClip.WrapMode.Normal;
            }
            this.birdAnimation.stop();
        }

        if (restorePosition && this._idleBobBase) {
            this.node.setPosition(this._idleBobBase);
        }

        this._idleBobBase = null;
        this._idleAnimClipName = null;
    }

    resetBird() {
        this.stopIdleMotion(false);
        this.hitSomething = false;
        this.birdLocation = new Vec3(-80, 0, 0);
        this.node.setPosition(this.birdLocation);
        this.node.setRotationFromEuler(0, 0, 0);

        if (this.rb) {
            // Luôn bật lại RigidBody (có thể bị tắt khi dying)
            this.rb.enabled = true;
            this.rb.linearVelocity = new Vec2(0, 0);
            this.rb.angularVelocity = 0;
        }
    }

    fly() {
        if (!this.rb || !this.rb.enabled) return;

        this.rb.linearVelocity = new Vec2(0, this.jumpForce / 100);

        const clipName = this._resolveBirdClipName();
        if (this.birdAnimation && clipName) {
            this.birdAnimation.stop();
            this.birdAnimation.play(clipName);
            const state = this.birdAnimation.getState(clipName);
            if (state) {
                state.wrapMode = AnimationClip.WrapMode.Normal;
            }
        }
    }

    update(dt: number) {
        if (this._idleWaveDriving && this._idleBobBase) {
            const half = Math.max(0.08, this.idleBobHalfPeriod);
            const period = half * 2;
            const omega = (Math.PI * 2) / period;
            this._idleWavePhase += dt * omega;

            const smoothT = Math.max(0.01, this.idleSmoothInTime);
            this._idleWaveWeight = Math.min(1, this._idleWaveWeight + dt / smoothT);
            const w = this._idleWaveWeight * this._idleWaveWeight * (3 - 2 * this._idleWaveWeight);

            const s = Math.sin(this._idleWavePhase);
            const c = Math.cos(this._idleWavePhase);
            const b = this._idleBobBase;

            let ox: number;
            let oy: number;
            if (this.idleHoverEllipse) {
                ox = this.idleBobAmountX * c;
                oy = this.idleBobAmount * s;
            } else {
                ox = this.idleBobAmountX * s;
                oy = this.idleBobAmount * s;
            }

            this.node.setPosition(b.x + ox * w, b.y + oy * w, b.z);
            const targetTilt = this.idleTiltWaveDeg * c * w;
            const currentTilt = this.node.eulerAngles.z;
            const nextTilt = currentTilt + (targetTilt - currentTilt) * Math.min(1, 10 * dt);
            this.node.setRotationFromEuler(0, 0, nextTilt);
            return;
        }

        if (!this.rb?.enabled) return;

        const vy = this.rb.linearVelocity.y;
        const targetAngle =
            vy > 0
                ? Math.min(this.maxUpAngle, vy * 6)
                : Math.max(this.maxDownAngle, vy * 6);

        const current = this.node.eulerAngles.z;
        const next = current + (targetAngle - current) * Math.min(1, this.rotateLerp * dt);
        this.node.setRotationFromEuler(0, 0, next);
    }

    private _resolveBirdClipName(): string | null {
        const anim = this.birdAnimation;
        if (!anim) return null;
        const def = anim.defaultClip;
        if (def) return def.name;
        const clips = anim.clips;
        if (clips?.length) return clips[0].name;
        return null;
    }
}
