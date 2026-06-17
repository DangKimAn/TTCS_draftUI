export function getTimesheetPeriod(date: Date): { month: number; year: number } {
  const d = date.getDate();
  const m = date.getMonth() + 1; // 1-12
  const y = date.getFullYear();

  // Chu kỳ: Từ ngày 17 tháng (X-1) đến ngày 16 tháng X sẽ được tính vào Bảng công Tháng X.
  // Do đó, nếu ngày hiện tại >= 17, nó đã bắt đầu chu kỳ của Bảng công Tháng X+1.
  if (d >= 17) {
    if (m === 12) {
      return { month: 1, year: y + 1 };
    }
    return { month: m + 1, year: y };
  }

  // Nếu <= 16, nó vẫn nằm trong khoảng cuối của Bảng công Tháng X hiện tại.
  return { month: m, year: y };
}
