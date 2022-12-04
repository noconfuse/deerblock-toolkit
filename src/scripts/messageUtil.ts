export function sendMessageToBg(
  message: MessageObj,
  callback?: (res: string) => void
) {
  chrome.runtime.sendMessage(message, function (response) {
    console.log(response);
    callback && callback(response);
  });
}
