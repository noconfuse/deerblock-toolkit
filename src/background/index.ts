import { STORAGEKEY } from "@/scripts/contants";

const getCopyConfig = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGEKEY.IS_COPY_OPEN], (result) => {
      const isCopyOpen = result[STORAGEKEY.IS_COPY_OPEN] || false;
      resolve(isCopyOpen);
    });
  });
};

const getCropConfig = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGEKEY.IS_CROP_OPEN], (result) => {
      const isCropOpen = result[STORAGEKEY.IS_CROP_OPEN] || false;
      resolve(isCropOpen);
    });
  });
};
const getPickerConfig = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGEKEY.IS_PICK_COLOR], (result) => {
      const res = result[STORAGEKEY.IS_PICK_COLOR] || false;
      resolve(res);
    });
  });
};

// 监听事件，处理各种任务
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const { type, data } = request;
  if (type === "cropCurrentPage") {
    cropScreen(data.rect);
  }
  if (type === "changeCopyStatus") {
    chrome.storage.local.set({
      [STORAGEKEY.IS_COPY_OPEN]: !!data,
    });
  }
  if (type === "changeCropStatus") {
    chrome.storage.local.set({
      [STORAGEKEY.IS_CROP_OPEN]: !!data,
    });
  }
  if (type === "changePickerStatus") {
    chrome.storage.local.set({
      [STORAGEKEY.IS_PICK_COLOR]: !!data,
    });
  }

  sendResponse(`background copy that ${type}`);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-crop") {
    getCropConfig().then((can) => {
      if (can) {
        sendMessageToContent({
          type: "openCrop",
          data: null,
        });
      }
    });
  }
  if (command === "open-copy") {
    getCopyConfig().then((can) => {
      if (can) {
        debugger;
        sendMessageToContent({
          type: "openCopy",
          data: null,
        });
      }
    });
  }

  if (command === "open-picker") {
    getPickerConfig().then((can) => {
      if (can) {
        sendMessageToContent({
          type: "openPicker",
          data: null,
        });
      }
    });
  }
});

function sendMessageToContent(message: MessageObj) {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    (tabs) => {
      const tabId = tabs[0].id;
      if (!tabId) return;
      chrome.tabs.sendMessage(tabId, message, (response) => {
        console.log(response);
      });
    }
  );
}

function cropScreen(rect: cropOption) {
  chrome.windows.getCurrent((win) => {
    chrome.tabs.captureVisibleTab(win.id, {}, (dataUrl) => {
      sendMessageToContent({
        type: "cropDone",
        data: {
          dataUrl,
          cropRect: rect,
        },
      });
    });
  });
}
