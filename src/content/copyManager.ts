export default class CopyManager {
  private _lastTarget: HTMLElement | undefined;
  private _lastMask: HTMLElement | undefined;
  private _lastTargetClass: string | null = null;
  private onMouseMove = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target && target !== this._lastTarget) {
      const mask = document.createElement("span");
      const maskWith = target.offsetWidth;
      const maskHeight = target.offsetHeight;
      const rect = target.getBoundingClientRect();
      const top = rect.top;
      const left = rect.left;
      mask.setAttribute(
        "style",
        `position:fixed;background:rgba(255,0,0,0.5);width:${maskWith}px;height:${maskHeight}px;left:${left}px;top:${top}px;display:inline-block;z-index:9999999;pointer-events:none`
      );

      if (this._lastTarget) {
        if (this._lastTargetClass) {
          this._lastTarget.className = this._lastTargetClass;
        } else {
          this._lastTarget.removeAttribute("class");
        }
      }

      this._lastTargetClass = target.className || "";

      target.className += " copyCursor";

      this._lastMask && document.body.removeChild(this._lastMask);
      document.body.appendChild(mask);
      this._lastTarget = target;
      this._lastMask = mask;
    }
  };

  loadImage(url: string) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.send();

    return new Promise((resolve) => {
      xhr.onload = function () {
        resolve(this.response);
      };
    });
  }

  copyElement = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target == this._lastTarget) {
      // 这里区分图片、普通文本、canvas
      if (target instanceof HTMLImageElement) {
        const src = target.src;
        target.style.cursor = "wait";
        const res = (await this.loadImage(src)) as any;
        const url = URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        const lastFilePath = src.split("/")[src.split("/").length - 1];
        const fileName = lastFilePath.replace(/\?.*/, "");
        a.download = fileName;
        a.dispatchEvent(new MouseEvent("click"));
        URL.revokeObjectURL(url);
      } else if (target instanceof HTMLCanvasElement) {
        const dataURl = target.toDataURL();
        const a = document.createElement("a");
        a.href = dataURl;
        a.download = "toolkit_" + Date.now() + ".png";
        a.click();
      }
      const innerText = target.innerText;
      if (innerText) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(innerText).then((res) => {
            if (!this._lastMask) return;
            this._lastMask.style.background = "rgba(0,255,0,0.3)";
          });
        } else {
          // 创建text area
          const textArea = document.createElement("textarea");
          textArea.value = innerText;
          // 使text area不在viewport，同时设置不可见
          textArea.style.position = "absolute";
          textArea.style.opacity = "0";
          textArea.style.left = "0";
          textArea.style.top = "0";
          this._lastMask?.appendChild(textArea);
          textArea.focus();
          textArea.select();
          // 执行复制命令并移除文本框
          document.execCommand("copy");
          textArea.remove();
          if (!this._lastMask) return;
          this._lastMask.style.background = "rgba(0,255,0,0.3)";
        }
      }
    }
  };

  open() {
    document.body.addEventListener("mousemove", this.onMouseMove, false);
    document.body.addEventListener("click", this.copyElement, false);
  }

  close() {
    if (this._lastMask) {
      document.body.removeChild(this._lastMask);
      this._lastMask = undefined;
    }

    if (this._lastTarget) {
      if (this._lastTargetClass) {
        this._lastTarget.className = this._lastTargetClass;
      } else {
        this._lastTarget.removeAttribute("class");
      }
      this._lastTarget = undefined;
    }

    document.body.removeEventListener("mousemove", this.onMouseMove, false);
    document.body.removeEventListener("click", this.copyElement, false);
  }
}
