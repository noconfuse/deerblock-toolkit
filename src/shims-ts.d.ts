type MessageObj = {
  type: string;
  data: object | null | boolean;
};

type cropOption = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type imgClipOptions = {
  dataUrl: string;
  cropRect: cropOption;
};

type toolBarOption = {
  type: string;
  iconText: string;
  iconCode: string;
  subMenuType: number;
};

type VEC2 = {
  x: number;
  y: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface ICtxCommand {
  (): void;
}

interface ICanvasWrapped {
  addRectDrawEvent(): void;
  addEllipseDrawEvent(): void;
  addArrowDrawEvent(): void;
  addBrushDrawEvent(): void;
  addMosaicDrawEvent(): void;
  addTextDrawEvent(): void;
}
