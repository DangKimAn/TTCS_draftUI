export class LeaveApplicationDto {
  leaveApplicationID: string;
  senderID: string;
  reviewerID: string | null;
  typeLeaveID: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  reason: string;
  status: string;
  reasonReject: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}
