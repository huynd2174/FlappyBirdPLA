import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

import { GameCtrl } from './GameCtrl';

@ccclass('Ground')
export class Ground extends Component {
    @property({
        type: GameCtrl,
        tooltip: 'Game controller has speed',
    })
    public gameCtrl: GameCtrl | null = null;

    @property({
        type: Node,
        tooltip: 'Ground 1 is here',
    })
    public ground1: Node | null = null;

    @property({
        type: Node,
        tooltip: 'Ground 2 is here',
    })
    public ground2: Node | null = null;

    @property({
        type: Node,
        tooltip: 'Ground 3 is here',
    })
    public ground3: Node | null = null;

    @property
    public gameSpeed = 0;

    public groundWidth1 = 0;
    public groundWidth2 = 0;
    public groundWidth3 = 0;

    public tempStartLocation1 = new Vec3();
    public tempStartLocation2 = new Vec3();
    public tempStartLocation3 = new Vec3();

    onLoad() {
        this.startUp();
    }

    startUp() {
        if (!this.ground1 || !this.ground2 || !this.ground3) {
            console.warn('[Ground] Hãy kéo thả đủ Ground1/2/3 vào Inspector.');
            return;
        }

        this.groundWidth1 = this.ground1.getComponent(UITransform)?.width ?? 0;
        this.groundWidth2 = this.ground2.getComponent(UITransform)?.width ?? 0;
        this.groundWidth3 = this.ground3.getComponent(UITransform)?.width ?? 0;

        // Chuẩn hóa vị trí ban đầu theo chiều rộng của từng ground segment.
        this.tempStartLocation1.set(0, this.ground1.position.y, this.ground1.position.z);
        this.tempStartLocation2.set(this.groundWidth1, this.ground2.position.y, this.ground2.position.z);
        this.tempStartLocation3.set(
            this.groundWidth1 + this.groundWidth2,
            this.ground3.position.y,
            this.ground3.position.z
        );

        this.ground1.setPosition(this.tempStartLocation1);
        this.ground2.setPosition(this.tempStartLocation2);
        this.ground3.setPosition(this.tempStartLocation3);
    }

    update(deltaTime: number) {
        if (!this.ground1 || !this.ground2 || !this.ground3) return;
        if (this.gameCtrl) {
            this.gameSpeed = this.gameCtrl.speed;
        }

        this.tempStartLocation1.set(this.ground1.position);
        this.tempStartLocation2.set(this.ground2.position);
        this.tempStartLocation3.set(this.ground3.position);

        // get the speed and subtract from x
        this.tempStartLocation1.x -= this.gameSpeed * deltaTime;
        this.tempStartLocation2.x -= this.gameSpeed * deltaTime;
        this.tempStartLocation3.x -= this.gameSpeed * deltaTime;

        if (this.tempStartLocation1.x <= 0 - this.groundWidth1) {
            this.tempStartLocation1.x = Math.max(this.tempStartLocation2.x, this.tempStartLocation3.x) + this.groundWidth1;
        }

        if (this.tempStartLocation2.x <= 0 - this.groundWidth2) {
            this.tempStartLocation2.x = Math.max(this.tempStartLocation1.x, this.tempStartLocation3.x) + this.groundWidth2;
        }

        if (this.tempStartLocation3.x <= 0 - this.groundWidth3) {
            this.tempStartLocation3.x = Math.max(this.tempStartLocation1.x, this.tempStartLocation2.x) + this.groundWidth3;
        }

        this.ground1.setPosition(this.tempStartLocation1);
        this.ground2.setPosition(this.tempStartLocation2);
        this.ground3.setPosition(this.tempStartLocation3);
    }
}


