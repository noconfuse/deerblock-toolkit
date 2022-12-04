import { STORAGEKEY } from "@/scripts/contants";
import { sendMessageToBg } from "../scripts/messageUtil";
import RichCanvas from "./richCanvas";
import {
  fontSizeOptions,
  lineWidths,
  styleColors,
  toolbarConfig,
} from "./toolbarConfig";

class CropScreen {
  private rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private cropBoard: HTMLElement | null = null;
  private cropArea: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private richCanvas: RichCanvas | undefined;
  private selecting = false;
  private bodyWidth: number;
  private bodyHeight: number;
  private toolBarConfig: toolBarOption[] = toolbarConfig;
  private resizeHandler: { remove(): void } | undefined;
  private dragHandler: { remove(): void } | undefined;
  private dpr = window.devicePixelRatio;
  constructor() {
    this.bodyWidth = document.body.offsetWidth;
    this.bodyHeight = document.body.offsetHeight;
  }

  // 初始化截图黑色背景蒙版
  initCropBg() {
    const cropBoard = document.createElement("div");
    const cropBoardStyle =
      "position:fixed;width:100vw;height:100vh;top:0;left:0;z-index:999999;background:rgba(0,0,0,0.5)";
    cropBoard.setAttribute("style", cropBoardStyle);
    document.body.appendChild(cropBoard);
    this.cropBoard = cropBoard;
    // 添加选框事件
    let startX: number, startY: number;

    cropBoard.onmousedown = (event) => {
      if (event.button !== 0) return;
      startX = event.clientX;
      startY = event.clientY;
      this.rect.x = startX;
      this.rect.y = startY;
      this.selecting = true;
      this.createCropArea([startX, startY]);
    };

    cropBoard.onmousemove = (event) => {
      if (!this.selecting) return;
      if (!this.cropArea) return;
      if (event.button !== 0) return;
      const endX = event.clientX;
      const endY = event.clientY;
      const offsetX = endX - startX;
      const offsetY = endY - startY;

      this.rect.width = offsetX;
      this.rect.height = offsetY;
      if (this.rect.width < 0) {
        this.rect.width *= -1;
        this.rect.x = endX;
      }
      if (this.rect.height < 0) {
        this.rect.height *= -1;
        this.rect.y = endY;
      }

      this.cropArea.style.left = this.rect.x + "px";
      this.cropArea.style.top = this.rect.y + "px";
      this.cropArea.style.width = this.rect.width + "px";
      this.cropArea.style.height = this.rect.height + "px";
    };

    cropBoard.onmouseup = (event) => {
      if (event.button !== 0) return;
      this.selecting = false;
      if (this.cropArea) {
        this.createToolbar();
        cropBoard.style.pointerEvents = "none";
        this.dragHandler = this.initDrag();
        this.resizeHandler = this.initResize();
      }
    };
  }

  waitForCropDone() {
    sendMessageToBg({
      type: "cropCurrentPage",
      data: {
        rect: {
          x: this.rect.x * this.dpr,
          y: this.rect.y * this.dpr,
          width: this.dpr * this.rect.width,
          height: this.dpr * this.rect.height,
        },
      },
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

  createToolbar() {
    if (!this.toolbar) {
      this.toolbar = document.createElement("div");
      let lastBtn: HTMLElement, lastOptionItem: HTMLElement;

      for (let i = 0; i < this.toolBarConfig.length; i++) {
        const operateBtn = document.createElement("span");
        const config = this.toolBarConfig[i];
        operateBtn.innerHTML = config.iconCode;
        operateBtn.setAttribute(
          "style",
          "width:30px;height:30px;display:inline-block;text-align:center;line-height:30px;cursor:default;position:relative;user-select:none"
        );
        operateBtn.setAttribute("class", "iconfont");
        operateBtn.setAttribute("data-type", config.type);
        if (config.type == "revoke") {
          operateBtn.style.color = "gray";
          operateBtn.style.pointerEvents = "none";
        }
        const optionItem = this.createToolbarOption(
          config,
          (type, styleRecord) => {
            this.richCanvas?.resetStyle(styleRecord);
          }
        );
        operateBtn.appendChild(optionItem);
        this.toolbar.appendChild(operateBtn);

        operateBtn.onmousedown = (event) => {
          event.stopPropagation();
        };

        operateBtn.onclick = () => {
          if (!this.richCanvas) {
            if (!this.cropArea) return;
            this.dragHandler?.remove();
            this.resizeHandler?.remove();
            this.richCanvas = new RichCanvas({
              el: this.cropArea,
              rect: this.rect,
              beforeDraw: this.waitForCropDone.bind(this),
              onDrawed: this.onDrawed.bind(this),
            });
          }

          this.addEvents(config.type);

          if (!config.subMenuType) return; // 非绘制命令

          if (lastBtn) {
            lastBtn.style.color = "inherit";
          }
          operateBtn.style.color = "green";
          lastBtn = operateBtn;
          if (lastOptionItem) {
            lastOptionItem.style.display = "none";
          }
          optionItem.style.display = "flex";
          lastOptionItem = optionItem;
        };
      }
    }

    this.toolbar.setAttribute(
      "style",
      `display:flex;justify-content:flex-end;gap:10px;align-items:center;z-index:999999;position:absolute;right:0;top:calc(100% + 10px);background:#1e1e1e;color:#fff;padding: 5px 10px;border-radius:5px`
    );

    this.cropArea?.append(this.toolbar);
  }

  onDrawed(hasDraw: boolean) {
    if (!this.cropArea) return;
    const revokeBtn = this.cropArea.querySelector(
      'span[data-type="revoke"]'
    ) as HTMLElement;
    if (!revokeBtn) return;
    if (hasDraw) {
      revokeBtn.style.color = "white";
      revokeBtn.style.pointerEvents = "auto";
    } else {
      revokeBtn.style.color = "gray";
      revokeBtn.style.pointerEvents = "none";
    }
  }

  getToolbarStyleRecord() {
    let record: any = {};
    try {
      record = JSON.parse(
        localStorage.getItem(STORAGEKEY.STYLE_RECORD) || "{}"
      );
    } catch (error) {
      console.log(error);
    }
    return record;
  }

  //创建功能按钮的可配置项
  createToolbarOption(
    config: toolBarOption,
    onClickOptionItem: (
      eventType: string,
      param: { lineIndex: number; fontIndex: number; colorIndex: number }
    ) => void
  ) {
    const type = config.subMenuType;
    const optionWrapper = document.createElement("div");

    const record: any = this.getToolbarStyleRecord();

    let styleRecord = { lineIndex: 0, fontIndex: 0, colorIndex: 0 };

    if (record[config.type]) {
      styleRecord = record[config.type];
    } else {
      record[config.type] = styleRecord;
      localStorage.setItem(STORAGEKEY.STYLE_RECORD, JSON.stringify(record));
    }

    const { lineIndex, fontIndex, colorIndex } = styleRecord;

    if ([1, 2].includes(type)) {
      let lastDot: HTMLElement;
      lineWidths.map((width, index) => {
        const span = document.createElement("span");
        const dot = document.createElement("span");
        span.onclick = (event) => {
          event.stopPropagation();
          styleRecord.lineIndex = index;
          const record = this.getToolbarStyleRecord();
          record[config.type] = styleRecord;
          localStorage.setItem(STORAGEKEY.STYLE_RECORD, JSON.stringify(record));
          onClickOptionItem(config.type, styleRecord);
          if (lastDot) {
            lastDot.style.background = "gray";
          }
          dot.style.background = "white";
          lastDot = dot;
        };

        dot.setAttribute(
          "style",
          `width:${width}px;height:${width}px;display:inline-block;border-radius:50%;background:gray`
        );
        span.setAttribute(
          "style",
          "width:20px;height:20px;display:inline-flex;justify-content:center;align-items:center"
        );
        span.appendChild(dot);
        optionWrapper.appendChild(span);

        if (index == lineIndex) {
          dot.style.background = "white";
          lastDot = dot;
        }
      });
    }

    if ([3].includes(type)) {
      const selectDiv = document.createElement("div");
      const textSpan = document.createElement("span");
      selectDiv.appendChild(textSpan);
      const optionContainer = document.createElement("div");
      fontSizeOptions.forEach((option, index) => {
        const optionDiv = document.createElement("div");
        optionDiv.innerText = option.label;
        optionDiv.setAttribute("value", option.value + "");
        optionDiv.onclick = (event) => {
          event.stopPropagation();
          styleRecord.fontIndex = index;
          const record = this.getToolbarStyleRecord();
          record[config.type] = styleRecord;
          localStorage.setItem(STORAGEKEY.STYLE_RECORD, JSON.stringify(record));
          onClickOptionItem(config.type, styleRecord);
          optionContainer.style.display = "none";
          textSpan.innerText = option.label + "";
        };
        optionContainer.appendChild(optionDiv);

        if (index == fontIndex) {
          textSpan.innerText = option.label + "";
        }
      });

      selectDiv.onclick = (event) => {
        console.log(optionContainer);
        event.stopPropagation();
        optionContainer.style.display = "block";
      };

      optionContainer.setAttribute(
        "style",
        "width:100%;position:absolute;top:calc(100% + 10px);background:#1e1e1e;color:white;display:none;border-radius:4px;padding:10px 0"
      );
      selectDiv.setAttribute(
        "style",
        "width:90px;height:20px;line-height:20px;font-size:14px;background:#fff;color:black;text-align:center;position:relative"
      );

      selectDiv.appendChild(optionContainer);

      optionWrapper.appendChild(selectDiv);
    }

    if ([1, 3].includes(type)) {
      let lastOption: HTMLElement;
      styleColors.map((color, index) => {
        const span = document.createElement("span");
        span.onclick = (event) => {
          event.stopPropagation();
          styleRecord.colorIndex = index;
          const record = this.getToolbarStyleRecord();
          record[config.type] = styleRecord;
          localStorage.setItem(STORAGEKEY.STYLE_RECORD, JSON.stringify(record));
          onClickOptionItem(config.type, styleRecord);
          if (lastOption) {
            lastOption.style.border = "none";
          }
          span.style.border = "1px solid white";
          lastOption = span;
        };
        span.setAttribute(
          "style",
          `background:${color};width:20px;height:20px;display:inline-block`
        );
        optionWrapper.appendChild(span);

        if (index == colorIndex) {
          span.style.border = "1px solid white";
          lastOption = span;
        }
      });
    }

    optionWrapper.setAttribute(
      "style",
      "position:absolute;display:none;padding:5px 10px;border-radius:5px;background:#1e1e1e;justify-content:space-around;gap:10px;align-items:center;top:calc(100% + 20px);left:50%;transform:translateX(-50%);"
    );
    //添加三角箭头
    const triangle = document.createElement("span");
    triangle.setAttribute("class", "iconfont");
    triangle.innerHTML = "&#xe736";
    triangle.setAttribute(
      "style",
      "position:absolute;bottom:108%;color:#1e1e1e;height:17px;width:20px"
    );
    optionWrapper.appendChild(triangle);

    return optionWrapper;
  }

  createCropArea(initPosition: number[]) {
    if (!this.cropBoard) return;
    this.cropBoard.style.background = "transparent";
    const [left, top] = initPosition;
    if (!this.cropArea) {
      this.cropArea = document.createElement("div");
      document.body.appendChild(this.cropArea);

      const pointW = document.createElement("span");
      const pointE = document.createElement("span");
      const pointN = document.createElement("span");
      const pointS = document.createElement("span");
      const pointSW = document.createElement("span");
      const pointSE = document.createElement("span");
      const pointNW = document.createElement("span");
      const pointNE = document.createElement("span");

      pointW.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;left:-3px;top:50%;margin-top:-3px;cursor:ew-resize;background-color:#39f"
      );
      pointE.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;right:-3px;top:50%;margin-top:-3px;cursor:ew-resize;background-color:#39f"
      );
      pointN.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;left:50%;top:-3px;margin-left:-3px;cursor:ns-resize;background-color:#39f"
      );
      pointS.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;left:50%;bottom:-3px;margin-left:-3px;cursor:ns-resize;background-color:#39f"
      );
      pointSW.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;left:-3px;bottom:-3px;cursor:nesw-resize;background-color:#39f"
      );
      pointSE.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;right:-3px;bottom:-3px;cursor:nwse-resize;background-color:#39f"
      );
      pointNW.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;left:-3px;top:-3px;cursor:nwse-resize;background-color:#39f"
      );
      pointNE.setAttribute(
        "style",
        "position:absolute;width:6px;height:6px;display:inline-block;right:-3px;top:-3px;cursor:nesw-resize;background-color:#39f"
      );

      pointE.setAttribute("data-resize-action", "e");
      pointW.setAttribute("data-resize-action", "w");
      pointN.setAttribute("data-resize-action", "n");
      pointS.setAttribute("data-resize-action", "s");
      pointNW.setAttribute("data-resize-action", "nw");
      pointNE.setAttribute("data-resize-action", "ne");
      pointSW.setAttribute("data-resize-action", "sw");
      pointSE.setAttribute("data-resize-action", "se");

      this.cropArea.appendChild(pointE);
      this.cropArea.appendChild(pointW);
      this.cropArea.appendChild(pointN);
      this.cropArea.appendChild(pointS);
      this.cropArea.appendChild(pointNE);
      this.cropArea.appendChild(pointNW);
      this.cropArea.appendChild(pointSE);
      this.cropArea.appendChild(pointSW);
    }

    this.cropArea.setAttribute(
      "style",
      `outline:9999px solid rgba(0,0,0,0.5);left:${left}px;top:${top}px;width:0;height:0;position:fixed;z-index:999999;pointer-events:none`
    );
  }

  initDrag() {
    if (!this.cropArea) return;
    let startX: number, startY: number;
    let originLeft: number, originTop: number;
    let canMove = false;
    this.cropArea.style.cursor = "move";
    this.cropArea.style.pointerEvents = "auto";

    const onMouseDown = (event: MouseEvent) => {
      if (!this.cropArea) return;
      const target = event.target;
      if (target !== this.cropArea) return;
      canMove = true;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = parseFloat(this.cropArea.style.left);
      originTop = parseFloat(this.cropArea.style.top);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!this.cropArea) return;
      if (!canMove) return;
      const currentX = event.clientX;
      const currentY = event.clientY;
      let left = currentX - startX + originLeft;
      let top = currentY - startY + originTop;
      console.log(left, top, "left top");
      if (left < 0) left = 0;
      if (top < 0) top = 0;

      if (left + parseFloat(this.cropArea.style.width) > this.bodyWidth) {
        left = this.bodyWidth - parseFloat(this.cropArea.style.width);
      }

      if (top + parseFloat(this.cropArea.style.height) > this.bodyHeight) {
        top = this.bodyHeight - parseFloat(this.cropArea.style.height);
      }

      this.cropArea.style.left = left + "px";
      this.cropArea.style.top = top + "px";
      this.rect.x = left;
      this.rect.y = top;
    };

    const onMouseUp = () => {
      canMove = false;
    };

    document.body.addEventListener("mousedown", onMouseDown);
    document.body.addEventListener("mousemove", onMouseMove);
    document.body.addEventListener("mouseup", onMouseUp);

    return {
      remove: () => {
        document.body.removeEventListener("mousedown", onMouseDown);
        document.body.removeEventListener("mousemove", onMouseMove);
        document.body.removeEventListener("mouseup", onMouseUp);
        if (!this.cropArea) return;
        this.cropArea.style.cursor = "default";
      },
    };
  }

  initResize() {
    let weFactor: number,
      nsFactor = 0;
    let startX: number,
      startY = 0;
    let canResize = false;
    let originRect: Rect;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const resizeAction = target.getAttribute("data-resize-action");

      switch (resizeAction) {
        case "w":
          weFactor = -1;
          nsFactor = 0;
          break;
        case "e":
          weFactor = 1;
          nsFactor = 0;
          break;
        case "n":
          weFactor = 0;
          nsFactor = 1;
          break;
        case "s":
          weFactor = 0;
          nsFactor = -1;
          break;
        case "nw":
          weFactor = -1;
          nsFactor = 1;
          break;
        case "ne":
          weFactor = 1;
          nsFactor = 1;
          break;
        case "sw":
          weFactor = -1;
          nsFactor = -1;
          break;
        case "se":
          weFactor = 1;
          nsFactor = -1;
          break;
        default:
          return;
      }
      event.stopPropagation();
      event.preventDefault();
      canResize = true;
      startX = event.clientX;
      startY = event.clientY;
      originRect = JSON.parse(JSON.stringify(this.rect));
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!canResize) return;
      if (!this.cropArea) return;
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const weOffset = mouseX - startX;
      const nsOffset = mouseY - startY;

      if (nsFactor < 0) {
        this.rect.height = originRect.height + nsOffset;
      }
      if (nsFactor > 0) {
        this.rect.y = originRect.y + nsOffset;
        this.rect.height = originRect.height - nsOffset;
      }

      if (weFactor > 0) {
        this.rect.width = originRect.width + weOffset;
      }
      if (weFactor < 0) {
        this.rect.x = originRect.x + weOffset;
        this.rect.width = originRect.width - weOffset;
      }

      if (this.rect.width < 0) {
        this.rect.width *= -1;
        this.rect.x = mouseX;
      }

      if (this.rect.height < 0) {
        this.rect.height *= -1;
        this.rect.y = mouseY;
      }

      this.cropArea.style.left = this.rect.x + "px";
      this.cropArea.style.top = this.rect.y + "px";
      this.cropArea.style.width = this.rect.width + "px";
      this.cropArea.style.height = this.rect.height + "px";
    };

    const onMouseUp = (event: MouseEvent) => {
      canResize = false;
    };
    document.body.addEventListener("mousedown", onMouseDown);
    document.body.addEventListener("mousemove", onMouseMove);
    document.body.addEventListener("mouseup", onMouseUp);
    return {
      remove: () => {
        document.body.removeEventListener("mousedown", onMouseDown);
        document.body.removeEventListener("mousemove", onMouseMove);
        document.body.removeEventListener("mouseup", onMouseUp);
        const resizeSpan = this.cropArea?.querySelectorAll(
          "span[data-resize-action]"
        );
        resizeSpan?.forEach((span) => {
          span.parentNode?.removeChild(span);
        });
      },
    };
  }

  addEvents(type: string) {
    if (!this.richCanvas) return;
    let record: any = {};
    try {
      record = JSON.parse(
        localStorage.getItem(STORAGEKEY.STYLE_RECORD) || "{}"
      );
      const styleRecord = record[type];
      this.richCanvas.resetStyle(styleRecord);
    } catch (error) {
      console.log(error);
    }
    switch (type) {
      case "squre":
        this.richCanvas.addRectDrawEvent();
        break;
      case "circle":
        this.richCanvas.addEllipseDrawEvent();
        break;
      case "arrow":
        this.richCanvas.addArrowDrawEvent();
        break;
      case "brush":
        this.richCanvas.addBrushDrawEvent();
        break;
      case "mosaic":
        this.richCanvas.addMosaicDrawEvent();
        break;
      case "text":
        this.richCanvas.addTextDrawEvent();
        break;
      case "revoke":
        this.richCanvas.revoke();
        return;
      case "download":
        this.download();
        return;
      case "cancel":
        this.destroy();
        return;
      case "confirm":
        this.confirm();
        return;
      default:
        break;
    }
  }

  confirm() {
    this.waitForCropDone().then((res) => {
      const { dataUrl, cropRect } = res;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = this.rect.width;
      canvas.height = this.rect.height;
      const image = new Image();
      image.src = dataUrl;
      image.onload = () => {
        if (!context) return;
        context.drawImage(
          image,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
        canvas.toBlob((data) => {
          const item: any = {};
          if (data?.type) {
            item[data?.type] = data;
            navigator.clipboard.write([new window.ClipboardItem(item)]);
          }
          this.destroy();
        }, "image/png");
      };
    });
  }

  download() {
    this.waitForCropDone().then((res) => {
      const { dataUrl, cropRect } = res;
      const downloadCanvas = document.createElement("canvas");
      const context = downloadCanvas.getContext("2d");
      downloadCanvas.width = this.rect.width;
      downloadCanvas.height = this.rect.height;
      const image = new Image();
      image.src = dataUrl;
      image.onload = () => {
        if (!context) return;
        context.drawImage(
          image,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          downloadCanvas.width,
          downloadCanvas.height
        );
        const imageUrl = downloadCanvas.toDataURL();
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = "toolkit_" + Date.now() + ".png";
        a.click();
        this.destroy();
      };
    });
  }

  open() {
    this.initCropBg();
  }

  destroy() {
    if (this.cropArea) {
      document.body.removeChild(this.cropArea);
      this.cropArea = null;
    }
    if (this.cropBoard) {
      document.body.removeChild(this.cropBoard);
      this.cropBoard = null;
    }

    if (this.richCanvas) {
      this.richCanvas = undefined;
    }
  }
  //关闭截图功能
  close() {
    this.destroy();
  }
}

export default CropScreen;
