class CtxCommandManager {
  private _commandStack: ICtxCommand[] = [];
  private _initCommandStack: ICtxCommand[] = []; // 初始命令栈，一直都会在
  public addInitCommand(cmd: () => void) {
    this._initCommandStack.push(cmd);
  }
  public addCommand(cmd: () => void) {
    this._commandStack.push(cmd);
  }

  get commandStack() {
    return this._commandStack;
  }

  undo() {
    this._commandStack.pop();
    this.excuteInit();
    this.excuteExtra();
  }
  excuteExtra() {
    let index = 0;
    while (index < this._commandStack.length) {
      this._commandStack[index]();
      index++;
    }
  }
  excuteInit() {
    let index = 0;
    while (index < this._initCommandStack.length) {
      this._initCommandStack[index]();
      index++;
    }
  }
  clear() {
    this._commandStack = [];
  }
}
export default CtxCommandManager;

export class ContextCommand {
  private _context: CanvasRenderingContext2D;
  private _canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("error when get 2d context");
    }
    this._canvas = canvas;
    this._context = context;
  }
  drawArrow(paths: VEC2[], fillStyle: string) {
    this._context.beginPath();
    this._context.lineWidth = 1;
    this._context.fillStyle = fillStyle;
    this._context.moveTo(paths[0].x, paths[0].y);
    let index = 1;
    while (index < paths.length) {
      this._context.lineTo(paths[index].x, paths[index].y);
      index++;
    }
    this._context.closePath();
    this._context.fill();
  }
  drawPath(paths: VEC2[], lineWidth: number, color: string) {
    if (!this._context) return;
    this._context.lineCap = "round";
    this._context.lineJoin = "round";
    this._context.lineWidth = lineWidth;
    this._context.strokeStyle = color;
    this._context.beginPath();
    this._context.moveTo(paths[0].x, paths[0].y);
    let index = 1;
    while (index < paths.length) {
      this._context.lineTo(paths[index].x, paths[index].y);
      this._context.stroke();
      index++;
    }
  }
  drawRect(startPoint: VEC2, endPoint: VEC2, lineWidth: number, color: string) {
    if (!this._context) return;
    this._context.lineCap = "round";
    this._context.lineJoin = "round";
    this._context.lineWidth = lineWidth;
    this._context.strokeStyle = color;
    this._context.beginPath();
    this._context.moveTo(startPoint.x, startPoint.y);
    this._context.lineTo(endPoint.x, startPoint.y);
    this._context.lineTo(endPoint.x, endPoint.y);
    this._context.lineTo(startPoint.x, endPoint.y);
    this._context.closePath();
    this._context.stroke();
  }
  drawEllipse(
    center: VEC2,
    radiusX: number,
    radiusY: number,
    lineWidth: number,
    strokeStyle: string
  ) {
    if (!this._context) return;
    this._context.save();
    if (this._context.ellipse) {
      this._context.beginPath();
      this._context.ellipse(
        center.x,
        center.y,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2
      );
    } else {
      const r = radiusX > radiusY ? radiusX : radiusY;
      const ratioX = radiusX / r;
      const ratioY = radiusY / r;
      this._context.scale(ratioX, ratioY);
      this._context.beginPath();
      this._context.moveTo((center.x + center.y) / ratioX, center.y / ratioY);
      this._context.arc(
        center.x / ratioX,
        center.y / ratioY,
        r,
        0,
        2 * Math.PI
      );
      this._context.closePath();
    }
    this._context.lineWidth = lineWidth;
    this._context.strokeStyle = strokeStyle;
    this._context.stroke();
    this._context.restore();
  }
  /**
   * 一次性绘制马赛克
   * @param paths 马赛克轨迹
   * @param mosaicCanvas 马赛克canvas
   * @param lineWidth 绘制宽度
   */
  drawMosaic(paths: VEC2[], mosicImageData: ImageData, lineWidth: number) {
    let tempCanvas: any = document.createElement("canvas");
    tempCanvas.width = this._canvas.width;
    tempCanvas.height = this._canvas.height;
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) {
      throw new Error("drawMosaic:error when get 2d context");
    }
    tempContext.putImageData(mosicImageData, 0, 0);
    tempContext.globalCompositeOperation = "destination-in";
    tempContext.lineCap = "round";
    tempContext.lineJoin = "round";
    tempContext.lineWidth = lineWidth;
    tempContext.beginPath();
    tempContext.moveTo(paths[0].x, paths[0].y);
    let index = 1;
    while (index < paths.length) {
      tempContext.lineTo(paths[index].x, paths[index].y);
      index++;
    }
    tempContext.stroke();
    tempContext.closePath();
    this._context.drawImage(tempCanvas, 0, 0);
    tempCanvas = null;
  }
  putImageData(imageData: ImageData) {
    this._context.putImageData(imageData, 0, 0);
  }
  clear() {
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }
}

export class DivCommand {
  private _containerDiv: HTMLElement;
  constructor(el: HTMLElement) {
    this._containerDiv = el;
  }

  drawText(dom: HTMLElement, position?: VEC2, text?: string) {
    const domId = dom.getAttribute("data-id");
    if (!domId) return;
    const originText = this._containerDiv.querySelector(
      `div[data-id='${domId}']`
    ) as HTMLElement;
    if (originText) {
      if (position) {
        originText.style.left = position.x + "px";
        originText.style.top = position.y + "px";
      }
      if (text) {
        originText.innerText = text;
      }
      return;
    }
    if (position) {
      dom.style.left = position.x + "px";
      dom.style.top = position.y + "px";
    }
    if (text) {
      dom.innerText = text;
    }

    this._containerDiv.appendChild(dom);
    // return;
    // const { fontSize, color } = style;

    // const input = document.createElement("div");

    // const inputHeight = fontSize + 10;
    // const padding = 5;
    // input.setAttribute(
    //   "style",
    //   `position:absolute;left:${position.x}px;top:${position.y}px;padding:${padding}px 8px;caret-color:${color};font-size:${fontSize}px;color:${color};user-select:none;line-height:${inputHeight}px;min-height:${inputHeight}px`
    // );
    // input.setAttribute("data-id", domID);
    // input.innerText = text;
    // let originText = "";
    // input.ondblclick = () => {
    //   if (!input) return;
    //   input.contentEditable = "true";
    //   input.removeAttribute("canmove");
    //   input.style.cursor = "default";
    //   setTimeout(() => {
    //     if (!input) return;
    //     input.focus();
    //   }, 10);
    // };

    // input.onfocus = () => {
    //   if (!input) return;
    //   //记录存在input处于focus状态
    //   originText = input.innerText;
    //   this._hasFocus = true;
    // };

    // input.onblur = (event) => {
    //   const input = event.target as HTMLElement;
    //   const currentText = input.innerText;
    //   input.contentEditable = "false";
    //   input.style.border = "none";
    //   input.style.cursor = "move";
    //   input.setAttribute("canmove", "true");
    //   if (originText !== currentText) {
    //     const left = parseInt(input.style.left);
    //     const top = parseInt(input.style.top);
    //     ctxCommandManager.addCommand(
    //       this.drawText.bind(this, { x: left, y: top }, indexID, currentText, {
    //         fontSize: this._fontSize,
    //         color: this._storkeStyle,
    //       })
    //     );
    //   }
    // };
    // this._childDoms.push(input);
    // this._containerDiv.appendChild(input);
  }

  moveText(domID: string, position: VEC2) {
    const input = this._containerDiv.querySelector<HTMLElement>(
      `div[data-id="${domID}"]`
    );
    if (!input) {
      console.error(`domId:${domID} not found`);
      return;
    }
    input.style.left = position.x + "px";
    input.style.top = position.y + "px";
  }
}
