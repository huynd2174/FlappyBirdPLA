import { _decorator, Component, Label, Node, director, tween, Tween, UIOpacity, Vec3, find } from 'cc';
import { GameCtrl } from './GameCtrl';
const { ccclass, property } = _decorator;

@ccclass('Results')
export class Results extends Component {
    @property({
        type: Label,
        tooltip: 'Current score label',
    })
    public scoreLabel: Label | null = null;

    @property({
        type: Label,
        tooltip: 'Top score label',
    })
    public highScore: Label | null = null;

    @property({
        type: Label,
        tooltip: 'Result popup score label',
    })
    public resultEnd: Label | null = null;

    @property({
        type: Node,
        tooltip: 'Game Over image node',
    })
    public gameOverImage: Node | null = null;

    @property({
        type: GameCtrl,
        tooltip: 'Kéo node GameCtrl: Try Again quay về màn Start (không reload scene).',
    })
    public gameCtrl: GameCtrl | null = null;

    @property({
        type: Node,
        tooltip: 'Node board điểm game over (ví dụ: ScoreBoard)',
    })
    public scoreBoard: Node | null = null;

    @property({
        type: Node,
        tooltip: 'Nút/label Try Again',
    })
    public tryAgainButton: Node | null = null;

    public maxScore = 0;
    public currentScore = 0;
    private _titleBasePos: Vec3 | null = null;
    private _boardBaseScale: Vec3 | null = null;
    private _tryAgainBasePos: Vec3 | null = null;

    onLoad() {
        if (!this.gameCtrl) {
            this.gameCtrl =
                find('GameCtrl')?.getComponent(GameCtrl) ??
                find('Canvas/GameCtrl')?.getComponent(GameCtrl) ??
                null;
        }
        if (!this.tryAgainButton) {
            this.tryAgainButton = this.node.getChildByName('Try_Again');
        }
        this.maxScore = Number(localStorage.getItem('flappy_high_score') ?? 0);
        this.updateScore(0);
        this.hideResults();
    }

    updateScore(num: number) {
        this.currentScore = num;

        if (this.scoreLabel) {
            this.scoreLabel.string = '' + this.currentScore;
        }
        if (this.resultEnd) {
            this.resultEnd.string = '' + this.currentScore;
        }
    }

    resetScore() {
        this.updateScore(0);
        this.hideResults();
    }

    addScore() {
        this.updateScore(this.currentScore + 1);
    }

    showResults() {
        this.maxScore = Math.max(this.maxScore, this.currentScore);
        localStorage.setItem('flappy_high_score', `${this.maxScore}`);

        if (this.highScore) {
            this.highScore.string = '' + this.maxScore;
            this.highScore.node.active = true;
        }
        if (this.resultEnd) {
            this.resultEnd.string = '' + this.currentScore;
            this.resultEnd.node.active = true;
        }

        this.node.active = true;
        if (this.gameOverImage) {
            this.gameOverImage.active = true;
        }
        if (this.scoreBoard) {
            this.scoreBoard.active = true;
        }
        if (this.tryAgainButton) {
            this.tryAgainButton.active = true;
            this.tryAgainButton.off(Node.EventType.TOUCH_END, this.onClickTryAgain, this);
            this.tryAgainButton.on(Node.EventType.TOUCH_END, this.onClickTryAgain, this);
        }
        // Ẩn HUD score khi đã vào board game over.
        if (this.scoreLabel) {
            this.scoreLabel.node.active = false;
        }
        this.playShowAnimation();
    }

    hideResults() {
        // Màn chơi: hiện HUD score.
        if (this.scoreLabel) {
            this.scoreLabel.node.active = true;
        }
        if (this.highScore) {
            this.highScore.node.active = false;
        }
        if (this.resultEnd) {
            this.resultEnd.node.active = false;
        }
        if (this.gameOverImage) {
            this.gameOverImage.active = false;
        }
        if (this.scoreBoard) {
            this.scoreBoard.active = false;
        }
        if (this.tryAgainButton) {
            this.tryAgainButton.off(Node.EventType.TOUCH_END, this.onClickTryAgain, this);
            this.tryAgainButton.active = false;
        }
        this.resetAnimState();
    }

    private playShowAnimation() {
        if (this.gameOverImage) {
            const n = this.gameOverImage;
            Tween.stopAllByTarget(n);
            const base = this._titleBasePos ?? n.position.clone();
            this._titleBasePos = base.clone();
            n.setPosition(base.x, base.y + 36, base.z);
            const op = this.ensureOpacity(n);
            Tween.stopAllByTarget(op);
            op.opacity = 0;
            tween(n).to(0.18, { position: base }, { easing: 'quadOut' }).start();
            tween(op).to(0.14, { opacity: 255 }).start();
        }

        if (this.scoreBoard) {
            const n = this.scoreBoard;
            Tween.stopAllByTarget(n);
            const base = this._boardBaseScale ?? n.scale.clone();
            this._boardBaseScale = base.clone();
            n.setScale(base.clone().multiplyScalar(0.72));
            const op = this.ensureOpacity(n);
            Tween.stopAllByTarget(op);
            op.opacity = 0;
            tween(n)
                .delay(0.06)
                .to(0.22, { scale: base.clone().multiplyScalar(1.06) }, { easing: 'backOut' })
                .to(0.08, { scale: base }, { easing: 'quadOut' })
                .start();
            tween(op).delay(0.06).to(0.12, { opacity: 255 }).start();
        }

        if (this.tryAgainButton) {
            const n = this.tryAgainButton;
            Tween.stopAllByTarget(n);
            const base = this._tryAgainBasePos ?? n.position.clone();
            this._tryAgainBasePos = base.clone();
            n.setPosition(base.x, base.y - 18, base.z);
            const op = this.ensureOpacity(n);
            Tween.stopAllByTarget(op);
            op.opacity = 0;
            tween(n).delay(0.16).to(0.14, { position: base }, { easing: 'quadOut' }).start();
            tween(op).delay(0.16).to(0.12, { opacity: 255 }).start();
        }
    }

    private resetAnimState() {
        if (this.gameOverImage) {
            const n = this.gameOverImage;
            Tween.stopAllByTarget(n);
            if (this._titleBasePos) n.setPosition(this._titleBasePos);
            this.ensureOpacity(n).opacity = 255;
        }
        if (this.scoreBoard) {
            const n = this.scoreBoard;
            Tween.stopAllByTarget(n);
            if (this._boardBaseScale) n.setScale(this._boardBaseScale);
            this.ensureOpacity(n).opacity = 255;
        }
        if (this.tryAgainButton) {
            const n = this.tryAgainButton;
            Tween.stopAllByTarget(n);
            if (this._tryAgainBasePos) n.setPosition(this._tryAgainBasePos);
            this.ensureOpacity(n).opacity = 255;
        }
    }

    private ensureOpacity(node: Node): UIOpacity {
        return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    }

    onClickTryAgain() {
        if (this.gameCtrl) {
            this.gameCtrl.returnToStartScreen();
            return;
        }
        const sceneName = director.getScene()?.name;
        if (sceneName) {
            director.loadScene(sceneName);
        }
    }

    onDestroy() {
        if (this.tryAgainButton) {
            this.tryAgainButton.off(Node.EventType.TOUCH_END, this.onClickTryAgain, this);
        }
    }
}


