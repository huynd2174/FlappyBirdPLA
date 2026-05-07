import { _decorator, Component, instantiate, Node, NodePool, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PipePool')
export class PipePool extends Component {
    @property({
        type: Prefab,
        tooltip: 'Pipe prefab',
    })
    public prefabPipes: Prefab | null = null;

    @property({
        type: Node,
        tooltip: 'Pool parent node',
    })
    public pipePoolHome: Node | null = null;

    public pool: NodePool = new NodePool();
    public createPipe: Node | null = null;

    onLoad() {
        this.initPool();
        this.addPool();
    }

    initPool() {
        if (!this.prefabPipes || !this.pipePoolHome) return;

        this.pipePoolHome.removeAllChildren();
        this.pool.clear();

        const initCount = 3;
        for (let i = 0; i < initCount; i++) {
            const newPipe = instantiate(this.prefabPipes);
            this.pool.put(newPipe);
        }
    }

    addPool() {
        if (!this.pipePoolHome || !this.prefabPipes) return;

        if (this.pool.size() > 0) {
            this.createPipe = this.pool.get();
        } else {
            this.createPipe = instantiate(this.prefabPipes);
        }

        this.createPipe.active = true;
        this.pipePoolHome.addChild(this.createPipe);
    }

    reset() {
        if (!this.pipePoolHome) return;
        this.pipePoolHome.removeAllChildren();
        this.pool.clear();
        this.initPool();
        this.addPool();
    }

    putPipe(pipe: Node) {
        if (!pipe) return;
        pipe.active = false;
        this.pool.put(pipe);
    }
}


