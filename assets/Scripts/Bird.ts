import { _decorator, Animation, CCFloat, Component, RigidBody2D, Vec2, Vec3 } from 'cc';
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

    public birdAnimation: Animation | null = null;
    public rb: RigidBody2D | null = null;
    public birdLocation: Vec3 = new Vec3();
    public hitSomething = false;

    onLoad() {
        this.rb = this.getComponent(RigidBody2D);
        this.birdAnimation = this.getComponent(Animation);
        this.resetBird();
    }

    resetBird() {
        this.hitSomething = false;
        this.birdLocation = new Vec3(0, 0, 0);
        this.node.setPosition(this.birdLocation);
        this.node.setRotationFromEuler(0, 0, 0);

        if (this.rb) {
            this.rb.linearVelocity = new Vec2(0, 0);
            this.rb.angularVelocity = 0;
        }
    }

    fly() {
        if (!this.rb) return;

        this.rb.linearVelocity = new Vec2(0, this.jumpForce / 100);

        this.birdAnimation?.stop();
        this.birdAnimation?.play();
    }

    update(dt: number) {
        if (!this.rb) return;

        const vy = this.rb.linearVelocity.y;
        const targetAngle =
            vy > 0
                ? Math.min(this.maxUpAngle, vy * 6)
                : Math.max(this.maxDownAngle, vy * 6);

        const current = this.node.eulerAngles.z;
        const next = current + (targetAngle - current) * Math.min(1, this.rotateLerp * dt);
        this.node.setRotationFromEuler(0, 0, next);
    }
}
