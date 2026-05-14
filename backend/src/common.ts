export interface IResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
  metadata?: any; // Dùng cho phân trang, v.v.
}