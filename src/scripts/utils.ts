export function getPxColor(imageData: ImageData, locations: number[][]) {
  let color = [];
  // 有多宽，就是一排有多少个像素点
  const width = imageData.width;
  // 颜色混合之后再返回
  color = locations.reduce<Array<number>>((preVal, currVal, index) => {
    const x = locations[index][0];
    const y = locations[index][1];
    if (index === 0) {
      preVal[0] = imageData.data[(y * width + x) * 4];
      preVal[1] = imageData.data[(y * width + x) * 4 + 1];
      preVal[2] = imageData.data[(y * width + x) * 4 + 2];
      preVal[3] = imageData.data[(y * width + x) * 4 + 3];
    } else {
      preVal[0] = Math.round(
        preVal[0] + (imageData.data[(y * width + x) * 4] - preVal[0]) * 0.5
      );
      preVal[1] = Math.round(
        preVal[0] + (imageData.data[(y * width + x) * 4 + 1] - preVal[0]) * 0.5
      );
      preVal[2] = Math.round(
        preVal[0] + (imageData.data[(y * width + x) * 4 + 2] - preVal[0]) * 0.5
      );
      preVal[3] = Math.round(
        preVal[0] + (imageData.data[(y * width + x) * 4 + 3] - preVal[0]) * 0.5
      );
    }
    return preVal;
  }, []);

  return color;
}
export function setPxColor(
  imageData: ImageData,
  x: number,
  y: number,
  color: number[]
) {
  imageData.data[(y * imageData.width + x) * 4] = color[0];
  imageData.data[(y * imageData.width + x) * 4 + 1] = color[1];
  imageData.data[(y * imageData.width + x) * 4 + 2] = color[2];
  imageData.data[(y * imageData.width + x) * 4 + 3] = color[3];
}

export function copyToClipBoard(str: string, callback?: () => void) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(str).then((res) => {
      callback && callback();
    });
  } else {
    // 创建text area
    const textArea = document.createElement("textarea");
    textArea.value = str;
    // 使text area不在viewport，同时设置不可见
    textArea.style.position = "absolute";
    textArea.style.opacity = "0";
    textArea.style.left = "0";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    // 执行复制命令并移除文本框
    document.execCommand("copy");
    textArea.remove();
    callback && callback();
  }
}

/**
 * rgba色 转 16进制颜色转
 * @param rgbaArray
 * @param alphaMaxVal 一般这里就是1或者255 默认以1为基准 如果最大值是255 就写255
 * @returns {*[]}
 */
export function rgbaToHexColor(rgbaArray: Array<number>, alphaMaxVal = 1) {
  //补位警号
  return (
    "#" +
    rgbaArray
      .map((chanel, index) => {
        let hexNum = "";
        if (index === 3) {
          //这是alpha通道
          hexNum = Number(Math.round((chanel * 255) / alphaMaxVal)).toString(
            16
          );
        } else {
          //普通通道直接转换
          hexNum = Number(chanel).toString(16);
        }
        return hexNum.length === 1 ? "0" + hexNum : hexNum; //这里解决了部分通道数字小于10的情况进行补位
      })
      .join("")
  );
}
