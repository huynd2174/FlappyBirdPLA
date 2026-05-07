import { _decorator, Camera, Component, Rect, ResolutionPolicy, find, view } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ResponsiveView')
export class ResponsiveView extends Component {
    private readonly designWidth = 640;
    private readonly designHeight = 960;

    @property({
        type: Camera,
        tooltip: 'Camera gameplay cần letterbox theo tỉ lệ thiết kế',
    })
    public targetCamera: Camera | null = null;

    private readonly onResize = () => {
        view.setDesignResolutionSize(
            this.designWidth,
            this.designHeight,
            // Game dọc kiểu Flappy: giữ chiều cao cố định để tránh hở đen trên/dưới.
            ResolutionPolicy.FIXED_HEIGHT
        );

        this.applyCameraViewport();
    };

    onLoad() {
        if (!this.targetCamera) {
            this.targetCamera =
                find('Canvas/Camera')?.getComponent(Camera) ??
                find('Camera')?.getComponent(Camera) ??
                null;
        }
        this.onResize();
        view.on('canvas-resize', this.onResize, this);
    }

    onDestroy() {
        view.off('canvas-resize', this.onResize, this);
    }

    private applyCameraViewport() {
        if (!this.targetCamera) return;

        const frame = view.getFrameSize();
        if (frame.width <= 0 || frame.height <= 0) return;

        const screenAspect = frame.width / frame.height;
        const designAspect = this.designWidth / this.designHeight;

        // Chỉ letterbox khi màn hình quá rộng (web landscape).
        // Mobile dọc giữ full viewport như cũ.
        if (screenAspect > designAspect) {
            // Màn hình rộng: giữ full height, thu hẹp width và căn giữa (2 viền đen hai bên).
            const w = designAspect / screenAspect;
            const x = (1 - w) * 0.5;
            this.targetCamera.rect = new Rect(x, 0, w, 1);
        } else {
            this.targetCamera.rect = new Rect(0, 0, 1, 1);
        }
    }
}
