export function enableDrag(dom: HTMLElement) {
  dom.style.cursor = "move";
  let drawing = false;
  let startX: number, startY: number;
  let originLeft: number, originTop: number;
  dom.onmousedown = function (event) {
    drawing = true;
    startX = event.clientX;
    startY = event.clientY;
    originLeft = dom.offsetLeft;
    originTop = dom.offsetTop;
    console.log(startX, startY);
  };

  dom.onmousemove = function (event) {
    if (!drawing) return;
    const currentX = event.clientX;
    const currentY = event.clientY;
    const left = currentX - startX + originLeft;
    const top = currentY - startY + originTop;
    dom.style.left = left + "px";
    dom.style.top = top + "px";
  };

  dom.onmouseup = function () {
    drawing = false;
  };
}

export function disableDrag(dom: HTMLElement) {
  dom.style.cursor = "default";
  dom.onmousedown = null;
  dom.onmousemove = null;
  dom.onmouseup = null;
}

export function activeDivEdit(dom: HTMLElement) {
  dom.contentEditable = "true";
  dom.removeAttribute("canmove");
  dom.style.cursor = "default";
  setTimeout(() => {
    dom.focus();
  }, 10);
}
