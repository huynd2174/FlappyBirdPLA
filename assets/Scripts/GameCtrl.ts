import {
    _decorator,
    CCFloat,
    CCInteger,
    Component,
    director,
    Node,
    find,
    Contact2DType,
    Collider2D,
    IPhysics2DContact,
    tween,
    Tween,
    Vec3,
    PhysicsSystem2D,
    Vec2,
    UIOpacity,
} from 'cc';
import { Ground } from './Ground';
import { Results } from './Results';
import { Bird } from './Bird';
import { PipePool } from './PipePool';
import { BirdAudio } from './BirdAudio';    
const { ccclass, property } = _decorator;

@ccclass('GameCtrl')
export class GameCtrl extends Component {
    @property({
        type: Ground,
        tooltip: 'this is ground',
    })
    public ground: Ground | null = null;

    @property({
        type: Results,
        tooltip: 'this is results',
    })
    public results: Results | null = null;
    @property({
        type: Bird,
        tooltip: 'this is bird',
    })
    public bird: Bird | null = null;

    @property({
        type: PipePool,
        tooltip: 'this is pipe pool',
    })
    public pipeQueue: PipePool | null = null;

    @property({
        type: Node,
        tooltip: 'start ui message',
    })
    public startUI: Node | null = null;

    @property({
        type: CCFloat,
        tooltip: 'Độ nhấp nhô StartUI theo trục Y (màn chờ)',
    })
    public startUIBobAmount = 14;

    @property({
        type: CCFloat,
        tooltip: 'Nửa chu kỳ nhấp nhô StartUI (giây)',
    })
    public startUIBobHalfPeriod = 0.65;

    private _startUIIdlePos: Vec3 | null = null;

    @property({
        type: CCInteger,
        tooltip: 'ground move speed',
    })
    public speed = 300;
    private readonly defaultGroundSpeed = 300;

    @property({
        type: CCInteger,
        tooltip:
            'Ground scroll speed at wait screen (Get Ready). 0 = đất đứng yên; ≈ defaultGroundSpeed = giống Flappy idle (bird đứng, đất cuộn).',
    })
    public idleGroundSpeed = 300;

    @property({
        type: BirdAudio,
        tooltip: 'this is bird audio',
    })
    public clip: BirdAudio | null = null;

    @property({
        type: Node,
        tooltip: 'Node phủ trắng toàn màn để lóe khi va chạm',
    })
    public hitFlash: Node | null = null;

    @property({
        type: CCFloat,
        tooltip: 'Độ mạnh flash va chạm (0-255)',
    })
    public hitFlashAlpha = 150;

    @property({
        type: CCFloat,
        tooltip: 'Thời gian lóe vào (giây)',
    })
    public hitFlashIn = 0.05;

    @property({
        type: CCFloat,
        tooltip: 'Thời gian lóe tắt (giây)',
    })
    public hitFlashOut = 0.08;

    @property({
        type: CCInteger,
        tooltip: 'pipe move speed',
    })
    public pipeSpeed = 200;
    private readonly defaultPipeSpeed = 200;

    public isOver = true;
    /** Trạng thái chim đang rơi sau khi va chạm ống/trần (chờ chạm đất mới game over). */
    private _isDying = false;
    /** Sibling index gốc của chim trước khi đưa lên front. */
    private _birdSavedSiblingIndex: number | null = null;

    onLoad() {
        this.speed = this.idleGroundSpeed;
        this.pipeSpeed = 0;
        this.resetHitFlash();
        if (!this.pipeQueue) {
            this.pipeQueue = find('PipePool')?.getComponent(PipePool) ?? null;
        }
        this.initListener();
        this.contactGroundPipe();
        this.bird?.resetBird();
        this.results?.resetScore();
        if (this.startUI) {
            this.startUI.active = true;
            this.scheduleOnce(() => {
                this.playStartUIMotion();
                this.bird?.playIdleMotion();
            }, 0);
        } else {
            this.scheduleOnce(() => this.bird?.playIdleMotion(), 0);
        }
        this.isOver = true;
        this.freezeWaitScreen();
    }

    initListener() {
        this.node.on(Node.EventType.TOUCH_START, () => {
            if (this.isOver === true) {
                if (this.startUI?.active) {
                    this.resetWorld();
                    this.startGame();
                    // Tap đầu tiên: bắt đầu game và flap ngay.
                    this.bird?.fly();
                    this.clip?.onAudioQueue(0);
                }
                // Ở màn Game Over: KHÔNG restart bằng tap màn hình (chỉ nút Try_Again).
                return;
            }

            if (this.isOver === false && !this._isDying) {
                this.bird?.fly();
                this.clip?.onAudioQueue(0);
            }
        });
    }

    startGame() {
        this.isOver = false;
        this.bird?.stopIdleMotion(true);
        if (this.bird) {
            this.bird.hitSomething = false;
        }
        this.unfreezePlay();
        this.speed = this.defaultGroundSpeed;
        this.pipeSpeed = this.defaultPipeSpeed;
        if (this.ground) {
            this.ground.gameSpeed = this.defaultGroundSpeed;
        }
        this.results?.hideResults();
        if (this.startUI) {
            this.stopStartUIMotion();
            this.startUI.active = false;
        }
        director.resume();
    }

    gameOver() {
        if (this.isOver) return;

        this.isOver = true;
        this._isDying = false;
        // KHÔNG restore sibling index ở đây — giữ chim hiện ở trước ống
        // Chỉ restore khi resetWorld() để chơi lại
        // Đóng băng gameplay nhưng KHÔNG pause director để tween UI game over vẫn chạy.
        this.speed = 0;
        this.pipeSpeed = 0;
        if (this.ground) {
            this.ground.gameSpeed = 0;
        }
        const phy = PhysicsSystem2D.instance;
        if (phy) {
            phy.enable = false;
        }
        if (this.bird?.rb && this.bird.rb.enabled) {
            this.bird.rb.linearVelocity = new Vec2(0, 0);
            this.bird.rb.angularVelocity = 0;
        }
        this.clip?.onAudioQueue(3);
        this.results?.showResults();
    }

    /**
     * Chim va chạm ống/trần: dừng cuộn, cho chim rơi tự do xuống đất.
     * Không gọi gameOver ngay — chờ chim chạm đất mới kết thúc.
     */
    private _startDying() {
        if (this._isDying || this.isOver) return;
        this._isDying = true;

        // Dừng ống + đất cuộn
        this.speed = 0;
        this.pipeSpeed = 0;
        if (this.ground) {
            this.ground.gameSpeed = 0;
        }

        // Đưa chim lên trước ống (sibling index cao nhất) để không bị ống che
        if (this.bird) {
            const parent = this.bird.node.parent;
            if (parent) {
                this._birdSavedSiblingIndex = this.bird.node.getSiblingIndex();
                this.bird.node.setSiblingIndex(parent.children.length - 1);
            }
        }

        // GIỮ collider bật — để physics vẫn phát hiện chạm đất
        // Khi rơi qua ống, dùng contact.disabled trong onBeginContact thay thế

        // Cho chim rơi thẳng xuống (vận tốc ngang = 0, giữ gravity)
        if (this.bird?.rb && this.bird.rb.enabled) {
            this.bird.rb.linearVelocity = new Vec2(0, 0);
        }

        // Dừng animation vỗ cánh (chim chết)
        if (this.bird?.birdAnimation) {
            this.bird.birdAnimation.stop();
        }
    }

    /** Khôi phục sibling index ban đầu cho chim. */
    private _restoreBirdSiblingIndex() {
        if (this._birdSavedSiblingIndex !== null && this.bird) {
            const parent = this.bird.node.parent;
            if (parent) {
                const max = parent.children.length - 1;
                const idx = Math.min(Math.max(0, this._birdSavedSiblingIndex), max);
                this.bird.node.setSiblingIndex(idx);
            }
            this._birdSavedSiblingIndex = null;
        }
    }

    /** Reset chim / điểm / ống nhưng chưa chạy game (để hiện StartUI). */
    resetWorld() {
        this._isDying = false;
        this._restoreBirdSiblingIndex();
        this.resetHitFlash();

        this.results?.resetScore();
        this.bird?.resetBird();
        this.pipeQueue?.reset();
    }

    /** Sau game over: ẩn Results, hiện StartUI, pause — giống lần đầu vào game. */
    returnToStartScreen() {
        director.resume();
        this.freezeWaitScreen();
        this.results?.hideResults();
        this.resetWorld();
        if (this.startUI) {
            this.startUI.active = true;
            this.scheduleOnce(() => {
                this.playStartUIMotion();
                this.bird?.playIdleMotion();
            }, 0);
        } else {
            this.scheduleOnce(() => this.bird?.playIdleMotion(), 0);
        }
        this.isOver = true;
        this.freezeWaitScreen();
    }

    /** Màn chờ: đất vẫn cuộn (cảm giác “tiến về trước”), ống đứng yên, physics tắt. */
    private freezeWaitScreen() {
        this.speed = this.idleGroundSpeed;
        this.pipeSpeed = 0;
        if (this.ground) {
            this.ground.gameSpeed = this.idleGroundSpeed;
        }
        const phy = PhysicsSystem2D.instance;
        if (phy) {
            phy.enable = false;
        }
        this.bird?.setWaitPhysicsFrozen(true);
    }

    private unfreezePlay() {
        this.bird?.setWaitPhysicsFrozen(false);
        const phy = PhysicsSystem2D.instance;
        if (phy) {
            phy.enable = true;
        }
    }

    /** Nhấp nhô nhẹ cho màn chờ — tự chạy khi hiện StartUI. */
    private playStartUIMotion() {
        if (!this.startUI?.active) return;
        this.stopStartUIMotion();

        const n = this.startUI;
        this._startUIIdlePos = n.position.clone();
        const base = this._startUIIdlePos;
        const x = base.x;
        const z = base.z;
        const up = base.y + this.startUIBobAmount;
        const down = base.y - this.startUIBobAmount;
        const half = Math.max(0.08, this.startUIBobHalfPeriod);

        tween(n)
            .to(half, { position: new Vec3(x, up, z) }, { easing: 'quadInOut' })
            .to(half, { position: new Vec3(x, down, z) }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private stopStartUIMotion() {
        if (!this.startUI) return;
        Tween.stopAllByTarget(this.startUI);
        if (this._startUIIdlePos) {
            this.startUI.setPosition(this._startUIIdlePos);
            this._startUIIdlePos = null;
        }
    }

    resetGame() {
        this.resetWorld();
        this.startGame();
    }

    passPipe() {
        if (!this.isOver) {
            this.results?.addScore();
            this.clip?.onAudioQueue(1);
        }
    }

    createPipe() {
        if (!this.pipeQueue) {
            this.pipeQueue = find('PipePool')?.getComponent(PipePool) ?? null;
        }
        this.pipeQueue?.addPool();
    }

    contactGroundPipe() {
        const collider = this.bird?.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (!selfCollider || !otherCollider || !contact) return;

        const isGround = this.isGroundCollider(otherCollider);

        if (isGround) {
            // Chạm đất
            this.snapBirdToGround(selfCollider, otherCollider);
            if (this.bird) this.bird.hitSomething = true;

            if (this._isDying) {
                // Đang rơi sau va chạm ống → chạm đất → game over
                // Dừng vật lý chim để nó nằm yên trên mặt đất
                if (this.bird?.rb && this.bird.rb.enabled) {
                    this.bird.rb.linearVelocity = new Vec2(0, 0);
                    this.bird.rb.angularVelocity = 0;
                }
                this.clip?.onAudioQueue(2);
                this.gameOver();
            } else if (!this.isOver) {
                // Chạm đất trực tiếp (không qua ống) → game over ngay
                this.playHitFlash();
                this.clip?.onAudioQueue(2);
                this.gameOver();
            }
        } else {
            // Va chạm ống hoặc trần
            if (this._isDying) {
                // Đang rơi → tắt phản hồi va chạm để chim xuyên qua ống
                contact.disabled = true;
                return;
            }
            if (this.bird) this.bird.hitSomething = true;
            this.playHitFlash();
            this.clip?.onAudioQueue(2);
            this._startDying();
        }
    }

    /** Lóe trắng rất ngắn khi va chạm. */
    private playHitFlash() {
        if (!this.hitFlash) return;
        this.hitFlash.active = true;
        const op = this.hitFlash.getComponent(UIOpacity) ?? this.hitFlash.addComponent(UIOpacity);
        const alpha = Math.max(0, Math.min(255, this.hitFlashAlpha));
        const tin = Math.max(0.01, this.hitFlashIn);
        const tout = Math.max(0.01, this.hitFlashOut);
        Tween.stopAllByTarget(op);
        op.opacity = 0;
        tween(op)
            .to(tin, { opacity: alpha })
            .to(tout, { opacity: 0 })
            .start();
    }

    private resetHitFlash() {
        if (!this.hitFlash) return;
        this.hitFlash.active = true;
        const op = this.hitFlash.getComponent(UIOpacity) ?? this.hitFlash.addComponent(UIOpacity);
        Tween.stopAllByTarget(op);
        op.opacity = 0;
    }

    private isGroundCollider(collider: Collider2D): boolean {
        return collider.node.name.toLowerCase().includes('ground');
    }

    /** Khi chạm đất, kéo chim lên đúng mép trên collider để không bị lún/treo. */
    private snapBirdToGround(selfCollider: Collider2D, groundCollider: Collider2D) {
        const birdAabb = selfCollider.worldAABB;
        const groundAabb = groundCollider.worldAABB;
        if (!birdAabb || !groundAabb || !this.bird) return;

        const birdBottom = birdAabb.y;
        const groundTop = groundAabb.y + groundAabb.height;
        const deltaY = groundTop - birdBottom;
        if (deltaY <= 0) return;

        const p = this.bird.node.position.clone();
        this.bird.node.setPosition(p.x, p.y + deltaY, p.z);
    }

    birdStruck() {
        if (this.bird?.hitSomething === true && !this._isDying) {
            this.gameOver();
        }
    }

    update(dt: number) {
        if (this.isOver === false && !this._isDying) {
            this.birdStruck();
        }
    }

    onDestroy() {
        this.stopStartUIMotion();
        this.resetHitFlash();
        this.unfreezePlay();
        this._restoreBirdSiblingIndex();
        this.node.off(Node.EventType.TOUCH_START);
        const collider = this.bird?.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}


