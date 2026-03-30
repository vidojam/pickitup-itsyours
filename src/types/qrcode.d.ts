declare module "qrcode" {
  export type QRCodeToDataURLOptions = {
    margin?: number;
    width?: number;
  };

  const QRCode: {
    toDataURL(input: string, options?: QRCodeToDataURLOptions): Promise<string>;
  };

  export default QRCode;
}