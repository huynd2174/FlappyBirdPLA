import { _decorator, CCFloat, Component, find, Node, screen, Size, UITransform, Vec3 } from 'cc';
import { GameCtrl } from './GameCtrl';
const { ccclass, property } = _decorator;

@ccclass('Pipes')
export class Pipes extends Component {
    @property({
        type: Node,
        tooltip: 'Top Pipe',
    })
    public topPipe: Node | null = null;

    @property({
        type: Node,
        tooltip: 'Bottom Pipe',
    })
    public bottomPipe: Node | null = null;

    @property({
        type: CCFloat,
        tooltip: 'Khoảng cách ngang giữa các cụm ống (px). Càng nhỏ ống càng dày.',
    })
    public spawnSpacing = 240;

    @property({
        type: CCFloat,
        tooltip: 'topHeight tối thiểu (đẩy bộ ống xuống thấp). Random rộng = ống cao thấp đa dạng.',
    })
    public topHeightMin = 120;

    @property({
        type: CCFloat,
        tooltip: 'topHeight tối đa (đẩy bộ ống lên cao). Random rộng = ống cao thấp đa dạng.',
    })
    public topHeightMax = 440;

    @property({
        type: CCFloat,
        tooltip: 'Khoảng hở dọc CỐ ĐỊNH giữa 2 ống (đơn vị tutorial, sẽ nhân *10). Càng nhỏ càng khó.',
    })
    public gap = 80;

    @property({
        type: CCFloat,
        tooltip: 'Khoảng đệm trước khi destroy ống đã ra khỏi màn hình. Càng lớn càng mượt.',
    })
    public destroyMargin = 120;

    public game: GameCtrl | null = null;

    public tempStartLocationUp: Vec3 = new Vec3(0, 0, 0);
    public tempStartLocationDown: Vec3 = new Vec3(0, 0, 0);
    public scene: Size = screen.windowSize;

    public pipeSpeed = 0;
    public tempSpeed = 0;
    public isPass = false;
    public spawnedNext = false;

    private random = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
    };

    onLoad() {
        if (!this.game) {
            this.game = find('GameCtrl')?.getComponent(GameCtrl) ?? null;
        }
        this.pipeSpeed = this.game?.pipeSpeed ?? 0;
        this.initPos();
        this.isPass = false;
        this.spawnedNext = false;
    }

    initPos() {
        if (!this.topPipe || !this.bottomPipe) return;

        const topW = this.topPipe.getComponent(UITransform)?.width ?? 0;

        this.tempStartLocationUp.x = topW + this.scene.width / 2;
        this.tempStartLocationDown.x = topW + this.scene.width / 2;

        const topHeight = this.random(this.topHeightMin, this.topHeightMax);

        this.tempStartLocationUp.y = topHeight;
        this.tempStartLocationDown.y = topHeight - this.gap * 10;

        this.bottomPipe.setPosition(this.tempStartLocationDown);
        this.topPipe.setPosition(this.tempStartLocationUp);
    }

    update(deltaTime: number) {
        if (!this.topPipe || !this.bottomPipe) return;

        this.tempSpeed = this.game?.pipeSpeed ?? this.pipeSpeed;

        this.tempStartLocationUp.set(this.topPipe.position);
        this.tempStartLocationDown.set(this.bottomPipe.position);

        this.tempStartLocationUp.x -= this.tempSpeed * deltaTime;
        this.tempStartLocationDown.x -= this.tempSpeed * deltaTime;

        this.topPipe.setPosition(this.tempStartLocationUp);
        this.bottomPipe.setPosition(this.tempStartLocationDown);

        const topW = this.topPipe.getComponent(UITransform)?.width ?? 0;
        const spawnX = topW + this.scene.width / 2;
        const spawnTrigger = spawnX - this.spawnSpacing;

        if (!this.spawnedNext && this.topPipe.position.x <= spawnTrigger) {
            this.spawnedNext = true;
            this.game?.createPipe();
        }

        const birdX = this.game?.bird?.node.position.x ?? 0;
        const pipeRightEdgeX = this.topPipe.position.x + topW * 0.5;
        if (!this.isPass && pipeRightEdgeX <= birdX) {
            this.isPass = true;
            this.game?.passPipe();
        }

        if (this.topPipe.position.x < 0 - (this.scene.width / 2 + topW + this.destroyMargin)) {
            this.node.destroy();
        }
    }
}
