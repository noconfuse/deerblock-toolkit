import CopyManager from "./copyManager";
import CropScreen from "./cropScreen";

let currentIns: CropScreen | CopyManager;

let cropScreen: CropScreen | null = null;
let copyIns: CopyManager | null = null;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const { type, data } = request;
  sendResponse("content copy that");
  if (type === "openCrop") {
    if (!cropScreen) {
      cropScreen = new CropScreen();
    } else {
      cropScreen.close();
    }
    cropScreen.open();
  }
  if (type === "openCopy") {
    if (!copyIns) {
      copyIns = new CopyManager();
    }
    copyIns.open();
  }
});

function injectCustomJs(jsPath: string) {
  jsPath = jsPath || "js/inject.js";
  const temp: HTMLScriptElement = document.createElement("script");
  temp.setAttribute("type", "text/javascript");
  temp.src = chrome.extension.getURL(jsPath);
  temp.onload = function () {
    document.head.removeChild(temp);
  };
  document.head.appendChild(temp);
}

document.addEventListener("keydown", function (event) {
  if (event.code == "Escape") {
    cropScreen?.close();
    cropScreen = null;

    copyIns?.close();
    copyIns = null;
  }
});
