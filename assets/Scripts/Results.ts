import { _decorator, Component, Label, Node, director } from 'cc';
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

    public maxScore = 0;
    public currentScore = 0;

    onLoad() {
        this.maxScore = Number(localStorage.getItem('flappy_high_score') ?? 0);
        this.updateScore(0);
        this.hideResults();
    }

    updateScore(num: number) {
        this.currentScore = num;

        if (this.scoreLabel) {
            this.scoreLabel.string = '' + this.currentScore;
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
            this.highScore.string = 'High Score: ' + this.maxScore;
            this.highScore.node.active = true;
        }

        this.node.active = true;
        if (this.resultEnd) {
            this.resultEnd.node.active = true;
        }
        if (this.gameOverImage) {
            this.gameOverImage.active = true;
        }
    }

    hideResults() {
        if (this.highScore) {
            this.highScore.node.active = false;
        }
        if (this.resultEnd) {
            this.resultEnd.node.active = false;
        }
        if (this.gameOverImage) {
            this.gameOverImage.active = false;
        }
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
}


