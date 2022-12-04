import { activeDivEdit } from "@/scripts/domUtils";
import { getPxColor, setPxColor } from "@/scripts/utils";
import CtxCommandManager, {
  ContextCommand,
  DivCommand,
} from "./ctxCommandManager";
import { fontSizeOptions, lineWidths, styleColors } from "./toolbarConfig";

type CanvasOptions = {
  el: HTMLElement;
  rect: Rect;
  beforeDraw(): Promise<imgClipOptions>;
  onDrawed(hasDraw: boolean): void;
};

const ctxCommandManager = new CtxCommandManager();

class RichCanvas implements ICanvasWrapped {
  private _canvas: HTMLCanvasElement;
  private _floorCanvas: HTMLCanvasElement;
  private _drawCanvas: HTMLCanvasElement; //用户直接绘制上面，每次绘制完转到_canvas，然后清空
  private _mosicCanvas: HTMLCanvasElement; // 绘制马赛克轨迹
  private _floorContext: CanvasRenderingContext2D;
  private _context: CanvasRenderingContext2D;
  private _mosicContext: CanvasRenderingContext2D;
  private _drawContext: CanvasRenderingContext2D;
  private _originImageData: ImageData | null = null;
  private _mosicImageData: ImageData | null = null;
  private _lineWidth = 4;
  private _storkeStyle = "red";
  private _fillStyle = "red";
  private _fontSize = 14;
  private _canOperate = false;
  private _dpr = window.devicePixelRatio;
  private _containerDiv: HTMLElement;
  private _hasFocus = false;
  private _inputIndex = 0; // 文本框的索引
  private _beforeDraw: () => Promise<imgClipOptions>;
  private _contextCommand: ContextCommand;
  private _drawContextCommand: ContextCommand;
  private _mosicContextCommand: ContextCommand;
  private _containerDivCommand: DivCommand;
  private _onDrawed: (hasDraw: boolean) => void = (b) => {
    console.log(b);
  };
  constructor(options: CanvasOptions) {
    const { rect, el } = options;
    this._mosicCanvas = document.createElement("canvas");
    this._canvas = document.createElement("canvas");
    this._drawCanvas = document.createElement("canvas");
    this._floorCanvas = document.createElement("canvas");

    this._mosicCanvas.setAttribute("id", "mosicCanvas");
    this._canvas.setAttribute("id", "canvas");
    this._drawCanvas.setAttribute("id", "drawCanvas");
    this._floorCanvas.setAttribute("id", "floorCanvas");

    this._floorCanvas.style.width =
      this._mosicCanvas.style.width =
      this._drawCanvas.style.width =
      this._canvas.style.width =
        rect.width + "px";
    this._floorCanvas.style.height =
      this._mosicCanvas.style.height =
      this._drawCanvas.style.height =
      this._canvas.style.height =
        rect.height + "px";

    this._floorCanvas.style.position =
      this._mosicCanvas.style.position =
      this._drawCanvas.style.position =
      this._canvas.style.position =
        "absolute";

    this._floorCanvas.style.left =
      this._mosicCanvas.style.left =
      this._drawCanvas.style.left =
      this._canvas.style.left =
        "0";

    this._floorCanvas.width =
      this._drawCanvas.width =
      this._mosicCanvas.width =
      this._canvas.width =
        rect.width * this._dpr;
    this._floorCanvas.height =
      this._drawCanvas.height =
      this._mosicCanvas.height =
      this._canvas.height =
        rect.height * this._dpr;

    const context = this._canvas.getContext("2d");
    const mosicContext = this._mosicCanvas.getContext("2d");
    const drawContext = this._drawCanvas.getContext("2d");
    const floorContext = this._floorCanvas.getContext("2d");
    if (!context || !mosicContext || !drawContext || !floorContext) {
      throw new Error("error when get 2d context");
    }

    this._context = context;
    this._mosicContext = mosicContext;
    this._drawContext = drawContext;
    this._floorContext = floorContext;

    this._beforeDraw = options.beforeDraw;
    this._onDrawed = options.onDrawed;

    this._containerDiv = el;

    this._containerDiv.appendChild(this._floorCanvas);
    this._containerDiv.appendChild(this._mosicCanvas);
    this._containerDiv.appendChild(this._canvas);
    this._containerDiv.appendChild(this._drawCanvas);

    this._contextCommand = new ContextCommand(this._canvas);
    this._drawContextCommand = new ContextCommand(this._drawCanvas);
    this._mosicContextCommand = new ContextCommand(this._mosicCanvas);
    this._containerDivCommand = new DivCommand(this._containerDiv);
  }

  private async beforeDraw() {
    if (this._canOperate) return;
    const { dataUrl, cropRect } = await this._beforeDraw();
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.src = dataUrl;
      image.onload = () => {
        this._floorContext.drawImage(
          image,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          this._floorCanvas.width,
          this._floorCanvas.height
        );

        this.initImageData();

        resolve();
      };
    });
    this._canOperate = true;
  }

  initImageData() {
    const newImageData = this._floorContext.createImageData(
      this._canvas.width,
      this._canvas.height
    );

    this._originImageData = this._floorContext.getImageData(
      0,
      0,
      this._canvas.width,
      this._canvas.height
    );

    //制作马赛克像素图
    const size = 10;
    for (let i = 0; i < this._originImageData.width / size; i++) {
      for (let j = 0; j < this._originImageData.height / size; j++) {
        //从每一块中随机取出五个像素点的颜色
        const locations = new Array(5)
          .fill(null)
          .map((x) => [
            i * size + Math.floor(Math.random() * size),
            j * size + Math.floor(Math.random() * size),
          ]);
        const color = getPxColor(this._originImageData, locations);
        for (let m = 0; m < size; m++) {
          for (let n = 0; n < size; n++) {
            setPxColor(newImageData, i * size + m, j * size + n, color);
          }
        }
      }
    }
    this._mosicImageData = newImageData;
  }

  revoke() {
    this._contextCommand.clear();
    this._mosicContextCommand.clear();
    const allInputText = this._containerDiv.querySelectorAll("div[data-id]");
    allInputText.forEach((input) => {
      input.parentNode?.removeChild(input);
    });
    ctxCommandManager.undo();
    this._onDrawed(!!ctxCommandManager.commandStack.length);
  }

  async addBrushDrawEvent() {
    await this.beforeDraw();
    this.removeAllEvents();
    let drawing = false;

    let paths: VEC2[] = [];

    this._drawCanvas.onmousedown = (event) => {
      this.disableTextEvent();
      drawing = true;
      const startX = event.offsetX * this._dpr;
      const startY = event.offsetY * this._dpr;
      this._drawContext.lineCap = "round";
      this._drawContext.lineJoin = "round";
      this._drawContext.lineWidth = this._lineWidth;
      this._drawContext.strokeStyle = this._storkeStyle;
      this._drawContext.beginPath();
      this._drawContext.moveTo(startX, startY);
      paths = [{ x: startX, y: startY }];
    };

    this._drawCanvas.onmousemove = (event) => {
      if (!this._drawContext || !drawing) return;
      const x = event.offsetX * this._dpr;
      const y = event.offsetY * this._dpr;
      this._drawContext.lineTo(x, y);
      this._drawContext.stroke();
      paths.push({ x: x, y: y });
    };

    this._drawCanvas.onmouseup = () => {
      this.enableTextEvent();
      drawing = false;
      this._contextCommand.drawPath(
        [...paths],
        this._lineWidth,
        this._fillStyle
      );
      this.addCommand(
        this._contextCommand.drawPath.bind(
          this._contextCommand,
          [...paths],
          this._lineWidth,
          this._fillStyle
        )
      );

      this._drawContextCommand.clear();
    };
  }
  async addArrowDrawEvent() {
    await this.beforeDraw();
    this.removeAllEvents();
    let drawing = false;
    let startX: number, startY: number;
    //TODO 调整箭头大小
    const edgeAngle = 25; //箭头顶点角度/2
    let edgeLength = this._lineWidth * 2; //箭头长度
    let paths: VEC2[] = [];

    this._drawCanvas.onmousedown = (event) => {
      this.disableTextEvent();
      drawing = true;
      startX = event.offsetX * this._dpr;
      startY = event.offsetY * this._dpr;
    };
    this._drawCanvas.onmousemove = (event) => {
      if (!drawing || !this._drawContext) return;
      const endPointX = event.offsetX * this._dpr;
      const endPointY = event.offsetY * this._dpr;

      const distanceX = endPointX - startX;
      const distanceY = endPointY - startY;

      const distance = Math.pow(
        distanceX * distanceX + distanceY * distanceY,
        0.5
      );

      if (distance < 20) {
        edgeLength = this._lineWidth * 0.4;
      } else if (distance < 50) {
        edgeLength = this._lineWidth;
      } else {
        edgeLength = this._lineWidth * 2;
      }

      //距离x轴角度
      const angle =
        (Math.atan2(endPointY - startY, endPointX - startX) / Math.PI) * 180;

      //计算得到箭头左右两侧的点坐标
      const arrowLeftPointX =
        endPointX -
        Math.cos((Math.PI / 180) * (angle - edgeAngle)) * edgeLength;
      const arrowLeftPointY =
        endPointY -
        Math.sin((Math.PI / 180) * (angle - edgeAngle)) * edgeLength;
      const arrowRightPointX =
        endPointX -
        Math.cos((Math.PI / 180) * (angle + edgeAngle)) * edgeLength;
      const arrowRightPointY =
        endPointY -
        Math.sin((Math.PI / 180) * (angle + edgeAngle)) * edgeLength;

      //计算得到箭头和直线重合两个点
      const minPointX = (arrowLeftPointX + arrowRightPointX) / 2;
      const minPointY = (arrowLeftPointY + arrowRightPointY) / 2;
      const arrowBottomLeftX = (arrowLeftPointX + minPointX) / 2;
      const arrowBottomLeftY = (arrowLeftPointY + minPointY) / 2;
      const arrowBottomRightX = (arrowRightPointX + minPointX) / 2;
      const arrowBottomRightY = (arrowRightPointY + minPointY) / 2;

      paths = [
        {
          x: startX,
          y: startY,
        },
        {
          x: arrowBottomLeftX,
          y: arrowBottomLeftY,
        },
        {
          x: arrowLeftPointX,
          y: arrowLeftPointY,
        },
        {
          x: endPointX,
          y: endPointY,
        },
        {
          x: arrowRightPointX,
          y: arrowRightPointY,
        },
        {
          x: arrowBottomRightX,
          y: arrowBottomRightY,
        },
      ];
      this._drawContextCommand.clear();
      this._drawContextCommand.drawArrow(paths, this._fillStyle);
    };

    this._drawCanvas.onmouseup = () => {
      this.enableTextEvent();
      drawing = false;
      if (!this._context) return;
      this._contextCommand.drawArrow(paths, this._fillStyle);
      this.addCommand(
        this._contextCommand.drawArrow.bind(
          this._contextCommand,
          paths,
          this._fillStyle
        )
      );
      this._drawContextCommand.clear();
    };
  }
  async addRectDrawEvent() {
    await this.beforeDraw();
    this.removeAllEvents();
    let startX: number, startY: number;
    let endX: number, endY: number;
    let drawing = false;
    this._drawCanvas.onmousedown = (event) => {
      drawing = true;
      this.disableTextEvent();
      startX = event.offsetX * this._dpr;
      startY = event.offsetY * this._dpr;
    };

    this._drawCanvas.onmousemove = (event) => {
      if (!drawing) return;
      endX = event.offsetX * this._dpr;
      endY = event.offsetY * this._dpr;
      this._drawContextCommand.clear();
      this._drawContextCommand.drawRect(
        { x: startX, y: startY },
        { x: endX, y: endY },
        this._lineWidth,
        this._storkeStyle
      );
    };

    this._drawCanvas.onmouseup = (event) => {
      this.enableTextEvent();
      if (!drawing) return;
      drawing = false;
      endX = event.offsetX * this._dpr;
      endY = event.offsetY * this._dpr;
      this._contextCommand.drawRect(
        { x: startX, y: startY },
        { x: endX, y: endY },
        this._lineWidth,
        this._storkeStyle
      );
      this._drawContextCommand.clear();

      this.addCommand(
        this._contextCommand.drawRect.bind(
          this._contextCommand,
          { x: startX, y: startY },
          { x: endX, y: endY },
          this._lineWidth,
          this._storkeStyle
        )
      );
    };
  }
  async addEllipseDrawEvent() {
    await this.beforeDraw();
    this.removeAllEvents();
    let startX: number, startY: number;
    let endX: number, endY: number;
    let drawing = false;
    this._drawCanvas.onmousedown = (event) => {
      this.disableTextEvent();
      drawing = true;
      startX = event.offsetX * this._dpr;
      startY = event.offsetY * this._dpr;
    };
    this._drawCanvas.onmousemove = (event) => {
      if (!drawing) return;
      endX = event.offsetX * this._dpr;
      endY = event.offsetY * this._dpr;
      this._drawContextCommand.clear();
      this._drawContextCommand.drawEllipse(
        { x: (startX + endX) / 2, y: (startY + endY) / 2 },
        Math.abs(endX - startX) / 2,
        Math.abs(endY - startY) / 2,
        this._lineWidth,
        this._storkeStyle
      );
    };
    this._drawCanvas.onmouseup = (event) => {
      this.enableTextEvent();
      if (!drawing) return;
      drawing = false;
      endX = event.offsetX * this._dpr;
      endY = event.offsetY * this._dpr;
      this._contextCommand.drawEllipse(
        { x: (startX + endX) / 2, y: (startY + endY) / 2 },
        Math.abs(endX - startX) / 2,
        Math.abs(endY - startY) / 2,
        this._lineWidth,
        this._storkeStyle
      );
      this._drawContextCommand.clear();
      this.addCommand(
        this._contextCommand.drawEllipse.bind<this, any, void>(
          this,
          { x: (startX + endX) / 2, y: (startY + endY) / 2 },
          Math.abs(endX - startX) / 2,
          Math.abs(endY - startY) / 2,
          this._lineWidth,
          this._storkeStyle
        )
      );
    };
  }
  async addMosaicDrawEvent() {
    await this.beforeDraw();
    this.removeAllEvents();
    let drawing = false;

    let paths: VEC2[] = [];
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this._mosicCanvas.width;
    tempCanvas.height = this._mosicCanvas.height;
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) return;
    if (!this._originImageData) return;

    this._drawCanvas.onmousedown = (event) => {
      this.disableTextEvent();
      drawing = true;
      this._drawContext.save();
      tempContext.lineCap = "round";
      tempContext.lineJoin = "round";
      tempContext.lineWidth = this._lineWidth;
      tempContext.beginPath();
      tempContext.moveTo(event.offsetX * this._dpr, event.offsetY * this._dpr);
      paths = [
        {
          x: event.offsetX * this._dpr,
          y: event.offsetY * this._dpr,
        },
      ];
    };

    this._drawCanvas.onmousemove = (event) => {
      if (!drawing || !this._mosicImageData) return;
      tempContext.lineTo(event.offsetX * this._dpr, event.offsetY * this._dpr);
      tempContext.stroke();
      this._drawContextCommand.clear();
      this._drawContext.globalCompositeOperation = "source-over";
      this._drawContext.putImageData(this._mosicImageData, 0, 0);
      this._drawContext.globalCompositeOperation = "destination-in";
      this._drawContext.drawImage(tempCanvas, 0, 0);
      paths.push({
        x: event.offsetX * this._dpr,
        y: event.offsetY * this._dpr,
      });
    };

    this._drawCanvas.onmouseup = () => {
      this.enableTextEvent();
      drawing = false;
      this._drawContext.restore();
      if (!this._mosicImageData) return;
      this._mosicContextCommand.drawMosaic(
        paths,
        this._mosicImageData,
        this._lineWidth
      );
      this._drawContextCommand.clear();
      tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      this.addCommand(
        this._mosicContextCommand.drawMosaic.bind<ContextCommand, any, void>(
          this._mosicContextCommand,
          paths,
          this._mosicImageData,
          this._lineWidth
        )
      );
    };
  }
  async addTextDrawEvent() {
    await this.beforeDraw();
    this.removeAllEvents();
    const padding = 5;

    this._drawCanvas.onmousedown = (event) => {
      if (this._hasFocus) {
        this._hasFocus = false;
        return;
      }

      const inputHeight = this._fontSize + 10;
      const color = this._storkeStyle;

      const inputWrapper = document.createElement("div");
      const startX = event.offsetX;
      const startY = event.offsetY;

      const left = startX - padding - 2;
      const top = startY - inputHeight / 2;
      let originText = "";

      inputWrapper.onfocus = (event) => {
        this._hasFocus = true;
        const target = event.target as HTMLElement;
        originText = target.innerText;
      };

      inputWrapper.onblur = (event) => {
        const input = event.target as HTMLElement;
        input.contentEditable = "false";
        input.style.border = "none";
        input.style.cursor = "move";

        if (originText !== input.innerText) {
          this.addCommand(
            this._containerDivCommand.drawText.bind(
              this._containerDivCommand,
              inputWrapper,
              { x: left, y: top },
              input.innerText
            )
          );
        }
      };

      inputWrapper.setAttribute(
        "style",
        `position:absolute;left:${left}px;top:${top}px;padding:${padding}px 8px;caret-color:${color};font-size:${this._fontSize}px;color:${color};user-select:none;line-height:${inputHeight}px;min-height:${inputHeight}px;outline-color:black`
      );

      inputWrapper.setAttribute("data-id", this._inputIndex + "");
      this._inputIndex++;

      this._containerDiv.appendChild(inputWrapper);

      activeDivEdit(inputWrapper);
    };

    let startX: number, startY: number;
    let originLeft: number, originTop: number;
    let currentTarget: HTMLElement | null;
    this._containerDiv.onmousedown = (event) => {
      const target = event.target as HTMLElement;
      if (target.hasAttribute("data-id")) {
        currentTarget = target;
        startX = event.clientX;
        startY = event.clientY;
        originLeft = target.offsetLeft;
        originTop = target.offsetTop;
      }
    };

    this._containerDiv.onmousemove = (event) => {
      if (!currentTarget) return;
      currentTarget.style.left = event.clientX - startX + originLeft + "px";
      currentTarget.style.top = event.clientY - startY + originTop + "px";
    };

    this._containerDiv.onmouseup = (event) => {
      if (currentTarget) {
        const left = parseInt(currentTarget.style.left);
        const top = parseInt(currentTarget.style.top);
        this.addCommand(
          this._containerDivCommand.drawText.bind(
            this._containerDivCommand,
            currentTarget,
            { x: left, y: top }
          )
        );

        currentTarget = null;
      }

      this._containerDiv.ondblclick = (event) => {
        const currentTarget = event.target as HTMLElement;
        if (!currentTarget.hasAttribute("data-id")) {
          return;
        }
        activeDivEdit(currentTarget);
        this._hasFocus = true;
      };
    };
  }

  private disableTextEvent() {
    const allInputText =
      this._containerDiv.querySelectorAll<HTMLElement>("div[data-id]");
    allInputText.forEach((input) => {
      input.style.pointerEvents = "none";
    });
  }

  private enableTextEvent() {
    const allInputText =
      this._containerDiv.querySelectorAll<HTMLElement>("div[data-id]");
    allInputText.forEach((input) => {
      input.style.pointerEvents = "auto";
    });
  }

  private addCommand(fn: () => void) {
    ctxCommandManager.addCommand(fn);
    this._onDrawed(!!ctxCommandManager.commandStack.length);
  }

  private removeAllEvents() {
    this._drawCanvas.onmousedown = null;
    this._drawCanvas.onmousemove = null;
    this._drawCanvas.onmouseup = null;
  }

  // 清除当前绘制
  private clearCurrentDraw() {
    this._context?.clearRect(0, 0, this._canvas.width, this._canvas.height);
    ctxCommandManager.excuteInit();
    ctxCommandManager.excuteExtra();
  }

  //清除画布，只保留初始画面
  private clearDraw() {
    this._context?.clearRect(0, 0, this._canvas.width, this._canvas.height);
    ctxCommandManager.excuteInit();
  }

  resetStyle(styleRecord: {
    lineIndex: number;
    fontIndex: number;
    colorIndex: number;
  }) {
    // record = JSON.parse(
    //   localStorage.getItem(STORAGEKEY.STYLE_RECORD) || "{}"
    // );
    // const styleRecord = record[this._typeActived];
    this._lineWidth = lineWidths[styleRecord.lineIndex];
    this._storkeStyle = styleColors[styleRecord.colorIndex];
    this._fontSize = fontSizeOptions[styleRecord.fontIndex].value;
    this._fillStyle = styleColors[styleRecord.colorIndex];
  }
}

export default RichCanvas;
