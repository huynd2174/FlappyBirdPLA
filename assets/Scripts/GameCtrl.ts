import {
    _decorator,
    CCInteger,
    Component,
    director,
    Node,
    find,
    Contact2DType,
    Collider2D,
    IPhysics2DContact
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
        type: CCInteger,
        tooltip: 'ground move speed',
    })
    public speed = 300;
    private readonly defaultGroundSpeed = 300;

    @property({
        type: BirdAudio,
        tooltip: 'this is bird audio',
    })
    public clip: BirdAudio | null = null;

    @property({
        type: CCInteger,
        tooltip: 'pipe move speed',
    })
    public pipeSpeed = 200;
    private readonly defaultPipeSpeed = 200;

    public isOver = true;

    onLoad() {
        if (!this.pipeQueue) {
            this.pipeQueue = find('PipePool')?.getComponent(PipePool) ?? null;
        }
        this.initListener();
        this.contactGroundPipe();
        this.bird?.resetBird();
        this.results?.resetScore();
        if (this.startUI) {
            this.startUI.active = true;
        }
        this.isOver = true;
        director.pause();
    }

    initListener() {
        this.node.on(Node.EventType.TOUCH_START, () => {
            if (this.isOver === true) {
                if (this.startUI?.active) {
                    this.resetWorld();
                    this.startGame();
                } else {
                    this.returnToStartScreen();
                }
            }

            if (this.isOver === false) {
                this.bird?.fly();
                this.clip?.onAudioQueue(0);
            }
        });
    }

    startGame() {
        this.isOver = false;
        if (this.bird) {
            this.bird.hitSomething = false;
        }
        this.speed = this.defaultGroundSpeed;
        this.pipeSpeed = this.defaultPipeSpeed;
        this.results?.hideResults();
        if (this.startUI) {
            this.startUI.active = false;
        }
        director.resume();
    }

    gameOver() {
        if (this.isOver) return;

        this.isOver = true;
        this.clip?.onAudioQueue(3);
        this.results?.showResults();
        director.pause();
    }

    /** Reset chim / điểm / ống nhưng chưa chạy game (để hiện StartUI). */
    resetWorld() {
        this.results?.resetScore();
        this.bird?.resetBird();
        this.pipeQueue?.reset();
    }

    /** Sau game over: ẩn Results, hiện StartUI, pause — giống lần đầu vào game. */
    returnToStartScreen() {
        this.results?.hideResults();
        this.resetWorld();
        if (this.startUI) {
            this.startUI.active = true;
        }
        this.isOver = true;
        director.pause();
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
        if (this.bird) {
            this.bird.hitSomething = true;
        }
        this.clip?.onAudioQueue(2);
    }

    birdStruck() {
        if (this.bird?.hitSomething === true) {
            this.gameOver();
        }
    }

    update() {
        if (this.isOver === false) {
            this.birdStruck();
        }
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START);
        const collider = this.bird?.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}


