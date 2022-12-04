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
