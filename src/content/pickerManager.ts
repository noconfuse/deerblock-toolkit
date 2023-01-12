import { copyToClipBoard, rgbaToHexColor } from "@/scripts/utils";
import { sendMessageToBg } from "../scripts/messageUtil";

class PickerManager {
  private _canvas: HTMLCanvasElement;
  private _canvasCtx: CanvasRenderingContext2D;
  private _canvasThumbnail: HTMLElement;
  private _dpr = window.devicePixelRatio;
  private _scale = 6; //放大倍数
  private _thumbnailWidth = 80;
  private _thumbnailHeight = 80;
  private _isPicking = false;

  constructor() {
    this._canvasThumbnail = document.createElement("div");
    this._canvasThumbnail.setAttribute(
      "style",
      `position:fixed;width:${this._thumbnailWidth}px;height:${this._thumbnailHeight}px;border-radius:50%;transform:translate(-50%, -50%);z-index:9999999;overflow:hidden`
    );
    this._canvas = document.createElement("canvas");
    const ctx = this._canvas.getContext("2d") as CanvasRenderingContext2D;
    this._canvasCtx = ctx;
  }
  private async init() {
    const res = await this.waitForCropDone();
    const { dataUrl } = res;
    const image = new Image();
    image.src = dataUrl;
    image.onload = () => {
      this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._canvas.width = image.naturalWidth / this._dpr;
      this._canvas.height = image.naturalHeight / this._dpr;
      this._canvas.style.width = image.naturalWidth / this._dpr + "px";
      this._canvas.style.height = image.naturalHeight / this._dpr + "px";
      this._canvas.style.position = "absolute";
      this._canvas.style.transform = `scale(${this._scale})`;

      this._canvasCtx.drawImage(
        image,
        0,
        0,
        this._canvas.width,
        this._canvas.height
      );
      this._canvasThumbnail.appendChild(this._canvas);
      this._canvas.onclick = this.pickerColor;
    };
  }
  private waitForCropDone() {
    sendMessageToBg({
      type: "cropCurrentPage",
      data: {},
    });
    return new Promise<imgClipOptions>((resolve) => {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const { type, data } = request;
        sendResponse("cropScreen copy that");
        if (type === "cropDone") {
          resolve(data);
        }
      });
    });
  }
  private onMouseMove = (event: MouseEvent) => {
    if (!this._isPicking) {
      document.body.appendChild(this._canvasThumbnail);
      this._isPicking = true;
    }
    const x = event.clientX;
    const y = event.clientY;
    this._canvasThumbnail.style.left = x + "px";
    this._canvasThumbnail.style.top = y + "px";
    const canvasOffsetX = -x + this._thumbnailWidth / 2 / this._scale;
    const canvasOffsetY = -y + this._thumbnailHeight / 2 / this._scale;
    this._canvas.style.left = canvasOffsetX + "px";
    this._canvas.style.top = canvasOffsetY + "px";
    this._canvas.style.transformOrigin = `${-canvasOffsetX}px ${-canvasOffsetY}px`;
  };
  private pickerColor = (event: MouseEvent) => {
    const offsetX = event.offsetX;
    const offsetY = event.offsetY;
    const px = this._canvasCtx.getImageData(offsetX, offsetY, 1, 1).data;
    const [r, g, b] = px;
    const rgbaStr = rgbaToHexColor([r, g, b]);

    copyToClipBoard(rgbaStr);
    this.close();
  };

  async open() {
    this.init();

    //TODO 修改鼠标样式

    document.body.addEventListener("mousemove", this.onMouseMove, false);
  }
  close() {
    this._isPicking = false;
    this._canvas.parentNode?.removeChild(this._canvas);
    this._canvasThumbnail.parentNode?.removeChild(this._canvasThumbnail);
    document.body.removeEventListener("mousemove", this.onMouseMove, false);
  }
}

export default PickerManager;
