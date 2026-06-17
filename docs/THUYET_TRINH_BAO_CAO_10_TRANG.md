# Luồng thuyết trình 10 phút và báo cáo 10 trang - Timesheet Pro

## 1. Luồng thuyết trình 10 phút

### Mục tiêu thuyết trình

Giới thiệu hệ thống Timesheet Pro như một giải pháp quản lý chấm công, bảng công tháng, nghỉ phép, phê duyệt và xuất báo cáo cho doanh nghiệp. Bài nói nên tập trung vào vấn đề thực tế, cách hệ thống giải quyết vấn đề, kiến trúc kỹ thuật và phần demo theo ba vai trò: nhân viên, quản lý và HR/Admin.

### Kịch bản theo thời gian

| Thời lượng | Nội dung | Gợi ý lời nói |
| --- | --- | --- |
| 0:00 - 0:45 | Mở đầu, giới thiệu đề tài | "Em xin trình bày đồ án Timesheet Pro, một hệ thống hỗ trợ doanh nghiệp quản lý chấm công, bảng công, nghỉ phép, thông báo và báo cáo lương theo vai trò." |
| 0:45 - 1:45 | Vấn đề thực tế | "Trong nhiều doanh nghiệp, dữ liệu chấm công, đơn nghỉ phép và bảng công thường bị phân tán. Nhân viên khó theo dõi công của mình, quản lý mất thời gian duyệt thủ công, HR khó tổng hợp dữ liệu chính xác." |
| 1:45 - 2:45 | Mục tiêu và phạm vi | "Hệ thống hướng tới ba nhóm người dùng chính: Employee, Manager và HR/Admin. Mỗi nhóm có quyền và màn hình riêng, giúp quy trình từ chấm công đến duyệt và xuất báo cáo được rõ ràng." |
| 2:45 - 4:00 | Kiến trúc tổng quan | "Frontend được xây dựng bằng React, Vite, TypeScript, Zustand và React Router. Backend dùng NestJS, Prisma ORM, PostgreSQL/Supabase, JWT và RBAC. API được chuẩn hóa bằng Swagger/OpenAPI." |
| 4:00 - 5:30 | Luồng nghiệp vụ chính | "Nhân viên đăng nhập, check-in/check-out, xem bảng công tháng, gửi yêu cầu chỉnh sửa công và gửi đơn nghỉ phép. Manager duyệt bảng công, duyệt nghỉ phép, xem nhân viên trong phòng ban. HR/Admin quản lý người dùng, loại nghỉ phép, xuất báo cáo công và payroll." |
| 5:30 - 7:30 | Demo hệ thống | Demo nhanh: đăng nhập nhân viên, chấm công, gửi nghỉ phép; chuyển manager để duyệt; chuyển HR để quản lý và xuất báo cáo. |
| 7:30 - 8:30 | Cơ sở dữ liệu và bảo mật | "Dữ liệu được thiết kế theo các bảng chính như users, roles, departments, monthly_timesheets, timesheet_entries, leave_applications, notifications và payrolls. Hệ thống dùng JWT, refresh token và kiểm soát quyền theo RBAC." |
| 8:30 - 9:20 | Kiểm thử và triển khai | "Đồ án có unit test, e2e test, smoke checklist, Dockerfile cho frontend/backend, docker-compose và tài liệu setup local. Swagger giúp kiểm tra API trực tiếp." |
| 9:20 - 10:00 | Kết luận, hướng phát triển | "Timesheet Pro đã hoàn thành các chức năng cốt lõi. Hướng phát triển tiếp theo là tích hợp payroll provider thật, hoàn thiện SSO production, mở rộng dashboard thống kê và bổ sung kiểm thử giao diện tự động." |

### Thứ tự demo đề xuất

1. Mở trang chủ và đăng nhập bằng tài khoản nhân viên `nv1@company.com`.
2. Vào khu vực chấm công, thực hiện check-in/check-out và xem lịch sử công.
3. Vào bảng công tháng, hiển thị trạng thái, cảnh báo và thao tác gửi bảng công.
4. Vào nghỉ phép, xem số ngày phép còn lại và gửi đơn nghỉ phép.
5. Đăng xuất, đăng nhập manager `manager.kt@company.com`, duyệt bảng công và đơn nghỉ phép.
6. Đăng xuất, đăng nhập HR/Admin `hr@company.com`, mở quản lý nhân viên, loại nghỉ phép và xuất báo cáo.
7. Mở Swagger tại `http://localhost:3000/api/docs` để chứng minh backend API.

### Câu kết ngắn

"Thông qua đồ án này, nhóm em đã xây dựng được một hệ thống quản lý công và nghỉ phép có phân quyền rõ ràng, dữ liệu tập trung, có khả năng mở rộng và phù hợp với quy trình vận hành cơ bản của doanh nghiệp."

---

## 2. Báo cáo 10 trang Word

> Gợi ý định dạng Word: Times New Roman 13, giãn dòng 1.3 hoặc 1.5, căn đều hai lề. Mỗi mốc `--- Trang X ---` có thể chèn Page Break trong Word.

--- Trang 1: Giới thiệu đề tài ---

# Hệ thống quản lý chấm công, bảng công và nghỉ phép Timesheet Pro

## 1. Lý do chọn đề tài

Trong môi trường doanh nghiệp, việc quản lý thời gian làm việc, bảng công, đơn nghỉ phép và báo cáo lương là một nghiệp vụ quan trọng. Nếu các quy trình này được thực hiện thủ công bằng giấy tờ hoặc file Excel rời rạc, doanh nghiệp dễ gặp các vấn đề như sai lệch dữ liệu, khó truy vết lịch sử, mất thời gian tổng hợp và thiếu minh bạch giữa nhân viên, quản lý và bộ phận nhân sự.

Timesheet Pro được xây dựng nhằm giải quyết những khó khăn trên bằng một hệ thống web tập trung. Hệ thống cho phép nhân viên chấm công, theo dõi bảng công tháng, gửi yêu cầu nghỉ phép và nhận thông báo. Quản lý có thể duyệt bảng công, duyệt đơn nghỉ phép và theo dõi dữ liệu của phòng ban. HR/Admin có thể quản lý nhân sự, quản lý loại nghỉ phép, xuất báo cáo công và dữ liệu payroll.

## 2. Mục tiêu của đề tài

Mục tiêu chính của đồ án là xây dựng một ứng dụng web có đầy đủ các chức năng cốt lõi cho quy trình quản lý công và nghỉ phép trong doanh nghiệp. Hệ thống cần đảm bảo các yêu cầu sau:

- Quản lý đăng nhập, xác thực và phân quyền người dùng.
- Hỗ trợ nhiều vai trò: nhân viên, quản lý và HR/Admin.
- Cho phép nhân viên check-in/check-out và xem lịch sử công.
- Tạo bảng công tháng, gửi bảng công và xử lý duyệt/từ chối.
- Cho phép nhân viên gửi đơn nghỉ phép và quản lý duyệt đơn.
- Hỗ trợ thông báo, cảnh báo và yêu cầu chỉnh sửa công.
- Cho phép HR/Admin quản lý người dùng, phòng ban, loại nghỉ phép và xuất báo cáo.
- Có kiến trúc rõ ràng, dễ mở rộng, có tài liệu API và kiểm thử.

## 3. Phạm vi thực hiện

Đồ án tập trung vào mô phỏng quy trình vận hành nội bộ của doanh nghiệp ở mức thực tế cơ bản. Các chức năng được triển khai gồm đăng nhập bằng tài khoản hệ thống, JWT authentication, refresh token, phân quyền theo vai trò, quản lý nhân viên, chấm công, bảng công tháng, nghỉ phép, thông báo, cảnh báo và payroll export. Hệ thống cũng có chuẩn bị cho Google/Microsoft SSO và email notification thông qua cấu hình môi trường, tuy nhiên phần tích hợp external payroll provider thật chưa nằm trong phạm vi hoàn chỉnh của đồ án.

--- Trang 2: Khảo sát hiện trạng và yêu cầu hệ thống ---

## 4. Bài toán thực tế

Trong quy trình truyền thống, nhân viên thường ghi nhận giờ làm bằng máy chấm công, biểu mẫu hoặc file riêng. Khi cần nghỉ phép, nhân viên gửi đơn qua email hoặc trao đổi trực tiếp. Quản lý phải kiểm tra thủ công từng đơn, đối chiếu dữ liệu công và xác nhận với HR. HR sau đó tiếp tục tổng hợp dữ liệu để phục vụ báo cáo và tính lương.

Quy trình này có nhiều hạn chế. Dữ liệu dễ bị trùng lặp hoặc thiếu nhất quán. Nhân viên không biết chính xác trạng thái đơn nghỉ phép hoặc bảng công của mình. Quản lý mất thời gian khi duyệt nhiều đơn cùng lúc. HR khó truy xuất lịch sử thay đổi, khó kiểm tra ai đã duyệt và duyệt vào thời điểm nào.

## 5. Yêu cầu chức năng

Hệ thống Timesheet Pro được thiết kế với các nhóm chức năng chính:

### 5.1. Chức năng cho nhân viên

Nhân viên có thể đăng nhập, xem dashboard cá nhân, check-in/check-out trong ngày, xem lịch sử chấm công theo tháng, xem bảng công tháng, gửi bảng công khi đủ điều kiện, gửi yêu cầu chỉnh sửa công nếu có sai lệch, xem số ngày phép còn lại, gửi đơn nghỉ phép và nhận thông báo từ hệ thống.

### 5.2. Chức năng cho quản lý

Quản lý có thể xem dữ liệu nhân viên thuộc phòng ban, duyệt hoặc từ chối bảng công tháng, duyệt hoặc từ chối đơn nghỉ phép, nhập lý do từ chối và theo dõi tình trạng xử lý của các yêu cầu trong phòng ban.

### 5.3. Chức năng cho HR/Admin

HR/Admin có thể quản lý người dùng, kích hoạt hoặc vô hiệu hóa tài khoản, quản lý phòng ban, quản lý loại nghỉ phép, xem báo cáo công, xuất dữ liệu timesheet, xuất payroll theo tháng và theo dõi system logs.

## 6. Yêu cầu phi chức năng

Hệ thống cần đảm bảo giao diện dễ sử dụng, phản hồi nhanh và phân quyền rõ ràng. Backend cần có API contract rõ ràng, trả lỗi nhất quán, có tài liệu Swagger và validate dữ liệu đầu vào. Cơ sở dữ liệu cần có ràng buộc để tránh dữ liệu trùng lặp, đặc biệt là bảng công theo từng nhân viên, tháng và năm. Ngoài ra, hệ thống cần hỗ trợ triển khai bằng Docker để thuận tiện cho demo và vận hành.

--- Trang 3: Công nghệ sử dụng ---

## 7. Công nghệ phía frontend

Frontend của hệ thống được xây dựng bằng React 19, Vite, TypeScript, Tailwind CSS, Zustand và React Router. React giúp xây dựng giao diện theo component, dễ tái sử dụng và bảo trì. Vite giúp quá trình phát triển nhanh, thời gian build ngắn và phù hợp với dự án frontend hiện đại. TypeScript giúp kiểm soát kiểu dữ liệu, giảm lỗi khi trao đổi dữ liệu giữa các component và service.

Zustand được dùng để quản lý trạng thái theo từng domain. Các store chính gồm `authStore`, `attendanceStore`, `timesheetStore`, `leaveStore`, `hrStore`, `notificationStore` và `uiStore`. Cách chia này giúp tách logic theo nghiệp vụ, tránh việc toàn bộ trạng thái bị gom vào một nơi khó kiểm soát.

React Router được sử dụng để quản lý điều hướng và bảo vệ route theo vai trò. Người dùng sau khi đăng nhập sẽ được chuyển đến dashboard phù hợp với quyền của mình. Các route không có quyền truy cập sẽ được điều hướng đến trang unauthorized.

## 8. Công nghệ phía backend

Backend được xây dựng bằng NestJS và TypeScript. NestJS cung cấp kiến trúc module rõ ràng, phù hợp với hệ thống nhiều nghiệp vụ. Mỗi domain như auth, user, role, department, attendance, monthly timesheet, leave application, notification, warning và payroll được tổ chức thành module riêng.

Prisma ORM được dùng làm lớp truy cập cơ sở dữ liệu. Prisma schema là nguồn định nghĩa chính cho các bảng, quan hệ và ràng buộc. Hệ thống sử dụng PostgreSQL hoặc Supabase làm cơ sở dữ liệu. Các migration giúp quản lý thay đổi schema theo từng giai đoạn phát triển.

## 9. Công nghệ xác thực và tài liệu API

Hệ thống sử dụng JWT authentication kết hợp refresh token. Access token dùng cho các request cần xác thực, còn refresh token dùng để lấy token mới khi access token hết hạn. Backend có cơ chế kiểm soát quyền truy cập theo RBAC, bao gồm các quyền như `me`, `manager`, `managerOfDepartment` và `admin`.

Swagger/OpenAPI được tích hợp tại `/api/docs`, giúp lập trình viên và người kiểm thử có thể xem danh sách API, dữ liệu request/response và kiểm tra endpoint trực tiếp.

## 10. Triển khai

Dự án có Dockerfile riêng cho frontend và backend, đồng thời có `docker-compose.yaml` để chạy toàn bộ hệ thống. Backend chạy trên NestJS, frontend được build và phục vụ qua Nginx. Cấu hình môi trường được quản lý bằng các file `.env` riêng cho backend và frontend.

--- Trang 4: Kiến trúc hệ thống ---

## 11. Kiến trúc tổng quan

Timesheet Pro được tổ chức theo mô hình client-server. Frontend là ứng dụng React chạy trên trình duyệt, giao tiếp với backend thông qua REST API. Backend NestJS xử lý nghiệp vụ, xác thực, phân quyền và truy cập cơ sở dữ liệu PostgreSQL thông qua Prisma ORM.

Luồng xử lý cơ bản như sau: người dùng đăng nhập từ frontend, backend xác thực thông tin và trả về access token cùng refresh token. Frontend lưu token, gửi token trong header Authorization khi gọi các API cần bảo vệ. Backend kiểm tra token, xác định vai trò người dùng và cho phép hoặc từ chối thao tác dựa trên quyền tương ứng.

## 12. Kiến trúc frontend

Frontend được chia thành các nhóm thư mục chính. Thư mục `app` chứa provider và router. Thư mục `pages` chứa các màn hình như Login, Home, Employee Dashboard, Manager Dashboard và HR Dashboard. Thư mục `components` chứa các thành phần giao diện có thể tái sử dụng. Thư mục `services` là lớp giao tiếp với backend, còn `store` quản lý trạng thái toàn cục theo từng nghiệp vụ.

`apiClient.ts` đóng vai trò trung tâm khi gọi API. File này cấu hình base URL, tự động gắn Bearer token, xử lý refresh token khi gặp lỗi 401 và chuẩn hóa thông báo lỗi. Nhờ đó các service nghiệp vụ như attendanceService, leaveService, hrService hoặc timesheetService không cần lặp lại logic xử lý token.

## 13. Kiến trúc backend

Backend tổ chức theo module. Mỗi module thường gồm controller, service và DTO. Controller nhận request từ client, service xử lý nghiệp vụ, DTO validate dữ liệu đầu vào. Cách tổ chức này giúp hệ thống dễ bảo trì và mở rộng.

Các module chính gồm:

- `auth`: đăng nhập, refresh token, logout, SSO callback.
- `user`, `role`, `department`: quản lý nhân sự và phân quyền.
- `attendance-module`: check-in/check-out và lịch sử công.
- `monthly-time-sheet`: bảng công tháng, gửi duyệt, review và export.
- `request-correction`: yêu cầu chỉnh sửa công.
- `leave-application`, `type-leave`: nghỉ phép và loại nghỉ phép.
- `notification`, `warning`: thông báo và cảnh báo.
- `payroll`: tạo và xuất dữ liệu payroll.

## 14. Chuẩn hóa response

Backend dùng interceptor để chuẩn hóa response thành dạng `{ statusCode, message, data }`. Việc chuẩn hóa này giúp frontend dễ xử lý kết quả và hiển thị thông báo nhất quán cho người dùng.

--- Trang 5: Thiết kế cơ sở dữ liệu ---

## 15. Tổng quan dữ liệu

Cơ sở dữ liệu của Timesheet Pro được thiết kế quanh các thực thể chính: người dùng, vai trò, phòng ban, bảng công tháng, dòng chấm công, đơn nghỉ phép, loại nghỉ phép, thông báo, cảnh báo, payroll và system log.

Các bảng chính gồm:

- `users`: lưu thông tin người dùng, email, username, mật khẩu đã hash, vai trò, phòng ban, số ngày phép và refresh token.
- `roles`: lưu các vai trò như employee, manager, hr hoặc admin.
- `departments`: lưu phòng ban và người quản lý phòng ban.
- `monthly_timesheets`: lưu bảng công tháng của từng nhân viên.
- `timesheet_entries`: lưu từng dòng chấm công theo ngày.
- `request_corrections`: lưu yêu cầu chỉnh sửa công.
- `leave_applications`: lưu đơn nghỉ phép.
- `type_leaves`: lưu loại nghỉ phép và trạng thái hoạt động.
- `notifications`: lưu thông báo gửi đến người dùng.
- `warnings`: lưu cảnh báo liên quan đến công.
- `payrolls`: lưu dữ liệu lương theo giờ.
- `system_logs`: lưu nhật ký thao tác hệ thống.

## 16. Quan hệ dữ liệu

Một người dùng thuộc một vai trò và có thể thuộc một phòng ban. Một phòng ban có thể có một manager. Mỗi người dùng có nhiều bảng công tháng, mỗi bảng công tháng có nhiều dòng chấm công. Đơn nghỉ phép liên kết với người gửi, người duyệt và loại nghỉ phép. Thông báo liên kết với người gửi và người nhận.

Ràng buộc quan trọng là mỗi nhân viên chỉ có một bảng công duy nhất cho mỗi cặp tháng/năm. Điều này được đảm bảo bằng unique constraint trên `userID`, `month` và `year` trong bảng `monthly_timesheets`.

## 17. Trạng thái nghiệp vụ

Hệ thống định nghĩa các trạng thái rõ ràng cho từng nghiệp vụ. Bảng công tháng có các trạng thái `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`. Dòng chấm công có các trạng thái như `PENDING`, `APPROVED`, `REJECTED`, `MISSING_OUT`. Đơn nghỉ phép có các trạng thái `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

Việc định nghĩa enum giúp dữ liệu nhất quán, tránh nhập sai trạng thái bằng chuỗi tự do. Đây cũng là cơ sở để frontend hiển thị trạng thái phù hợp và backend kiểm tra logic duyệt.

## 18. Audit trail và lịch sử

Một số bảng có thông tin người duyệt và thời điểm duyệt như `approvedById`, `reviewedAt`, `reviewerID`. Điều này giúp hệ thống truy vết được ai đã xử lý yêu cầu và xử lý vào lúc nào. Các quan hệ lịch sử được cấu hình hạn chế xóa để tránh mất dữ liệu đã phát sinh.

--- Trang 6: Các chức năng chính ---

## 19. Đăng nhập và phân quyền

Người dùng đăng nhập bằng email hoặc username và mật khẩu. Backend xác thực thông tin, trả về access token, refresh token và dữ liệu người dùng. Frontend dựa vào vai trò để điều hướng đến dashboard tương ứng. Nhân viên vào dashboard nhân viên, manager vào dashboard quản lý, HR/Admin vào dashboard nhân sự.

Hệ thống không mở public register cho người dùng tự đăng ký. Tài khoản nhân viên được HR/Admin tạo thông qua API quản lý người dùng. Điều này phù hợp với mô hình doanh nghiệp, nơi thông tin nhân sự cần được kiểm soát tập trung.

## 20. Chấm công

Nhân viên có thể check-in khi bắt đầu làm việc và check-out khi kết thúc. Dữ liệu chấm công gồm thời điểm check-in, check-out, địa chỉ IP, thông tin thiết bị và trạng thái. Nếu nhân viên quên check-out, hệ thống có thể ghi nhận trạng thái thiếu checkout và tạo cảnh báo để xử lý sau.

Chức năng chấm công giúp nhân viên tự theo dõi lịch sử làm việc trong tháng. Dữ liệu này cũng là nguồn đầu vào để tạo bảng công tháng và phục vụ báo cáo.

## 21. Bảng công tháng

Bảng công tháng tổng hợp các dòng chấm công của nhân viên theo tháng và năm. Khi đủ điều kiện, nhân viên có thể gửi bảng công để quản lý duyệt. Nếu bảng công bị từ chối, quản lý cần nhập lý do từ chối để nhân viên biết nguyên nhân và xử lý.

Ngoài ra, hệ thống hỗ trợ export bảng công dưới dạng CSV/Excel. Với báo cáo PDF, frontend tạo từ dữ liệu report thật bằng luồng in từ trình duyệt, giúp giảm phụ thuộc backend vào thư viện PDF.

## 22. Yêu cầu chỉnh sửa công

Trong thực tế, nhân viên có thể quên chấm công hoặc chấm công sai thời điểm. Vì vậy hệ thống có chức năng gửi yêu cầu chỉnh sửa công. Yêu cầu này liên kết với bảng công tháng và có thể liên kết với một dòng công cụ thể. Nhân viên nhập lý do và thời gian đề xuất. Quản lý duyệt hoặc từ chối yêu cầu, nếu duyệt thì dữ liệu công được cập nhật theo thông tin đề xuất.

--- Trang 7: Nghỉ phép, thông báo và payroll ---

## 23. Quản lý nghỉ phép

Nhân viên có thể xem số ngày phép còn lại, chọn loại nghỉ phép, nhập thời gian bắt đầu, kết thúc, số ngày nghỉ và lý do. Hệ thống tạo đơn nghỉ phép ở trạng thái chờ duyệt. Manager xem danh sách đơn của phòng ban và duyệt hoặc từ chối.

Khi duyệt nghỉ phép, hệ thống có thể cập nhật số ngày phép còn lại của nhân viên. Nếu đơn nghỉ phép trùng với dữ liệu công đã tồn tại, hệ thống có thể trả cảnh báo để người duyệt kiểm tra xung đột giữa worklog và leave.

## 24. Quản lý loại nghỉ phép

HR/Admin có thể tạo, cập nhật, kích hoạt hoặc vô hiệu hóa loại nghỉ phép. Các loại nghỉ phép không hoạt động sẽ không được nhân viên chọn khi tạo đơn mới. Cách xử lý này giúp bảo toàn lịch sử đơn nghỉ phép cũ mà vẫn ngăn việc dùng loại nghỉ phép đã ngừng áp dụng.

## 25. Thông báo

Hệ thống có module thông báo để người dùng nhận các cập nhật liên quan đến bảng công, nghỉ phép hoặc cảnh báo. Người dùng có thể xem danh sách thông báo, số lượng chưa đọc và đánh dấu đã đọc. Chức năng này giúp tăng tính minh bạch, hạn chế việc nhân viên phải hỏi thủ công về trạng thái xử lý.

## 26. Payroll và báo cáo

Module payroll hỗ trợ tạo dữ liệu lương dựa trên bảng công đã có. HR/Admin có thể xuất payroll theo tháng, năm và định dạng JSON, CSV hoặc Excel. Khi kỳ dữ liệu không có payroll, hệ thống trả về file rỗng kèm thông báo rõ ràng, không tạo dữ liệu giả.

Hiện tại hệ thống có contract/stub cho external payroll provider với trạng thái `not_configured`. Điều này thể hiện phạm vi tích hợp đã được chuẩn bị, nhưng chưa triển khai kết nối thật với nhà cung cấp payroll bên ngoài.

--- Trang 8: Bảo mật và kiểm soát quyền ---

## 27. Xác thực bằng JWT

Hệ thống dùng JWT để xác thực request. Sau khi đăng nhập thành công, người dùng nhận access token và refresh token. Access token được gửi trong header Authorization khi gọi API. Nếu token hết hạn, frontend dùng refresh token để xin cặp token mới.

JWT payload chứa các thông tin quan trọng như `userID`, `email`, `username`, `roleId`, `role`, `roleName` và `departmentID`. Các thông tin này giúp backend xác định người dùng hiện tại và kiểm tra quyền truy cập.

## 28. RBAC

RBAC giúp kiểm soát thao tác theo vai trò. Quyền `me` cho phép người dùng thao tác trên dữ liệu của chính mình. Quyền `manager` cho phép quản lý xử lý dữ liệu thuộc phạm vi quản lý. Quyền `managerOfDepartment` ràng buộc thao tác với phòng ban mà manager phụ trách. Quyền `admin` dành cho HR/Admin với các chức năng quản trị.

Ví dụ, nhân viên chỉ được check-in/check-out cho chính mình. Manager chỉ duyệt bảng công và đơn nghỉ phép của nhân viên trong phòng ban. HR/Admin có quyền quản lý người dùng, loại nghỉ phép và xuất báo cáo.

## 29. Bảo vệ dữ liệu nhạy cảm

Thông tin cấu hình như database URL, JWT secret, SMTP credential, Google/Microsoft client secret được đặt trong file `.env` hoặc deployment secrets. Hệ thống không hard-code credential vào mã nguồn. Mật khẩu người dùng được lưu dưới dạng hash, không lưu mật khẩu thuần.

## 30. Kiểm soát dữ liệu đầu vào

Backend sử dụng ValidationPipe và DTO để kiểm tra dữ liệu request. Việc whitelist DTO giúp loại bỏ các field không hợp lệ, giảm nguy cơ người dùng gửi thêm dữ liệu ngoài ý muốn. Các endpoint quan trọng như tạo người dùng, cập nhật profile, tạo nghỉ phép, duyệt đơn và xuất báo cáo đều có DTO hoặc kiểm tra nghiệp vụ tương ứng.

--- Trang 9: Kiểm thử, demo và triển khai ---

## 31. Kiểm thử tự động

Dự án có các lệnh kiểm thử và build cho cả frontend và backend. Frontend có thể chạy `npm run build` để kiểm tra TypeScript và quá trình build Vite. Backend có thể chạy `npm run build`, `npm test -- --runInBand`, `npm run prisma:generate` và `npx prisma validate`.

Ngoài ra, backend có e2e test cho một số luồng quan trọng như auth refresh và request correction. Các e2e test cần chạy với database test riêng để tránh ảnh hưởng dữ liệu demo hoặc production.

## 32. Smoke test thủ công

Tài liệu smoke checklist mô tả 12 use case chính cần kiểm tra thủ công:

- Đăng nhập và chuyển dashboard theo vai trò.
- Check-in/check-out.
- Gửi bảng công tháng.
- Gửi đơn nghỉ phép.
- Xem số ngày phép và lịch sử đơn.
- Manager duyệt bảng công.
- Manager duyệt đơn nghỉ phép.
- HR export payroll.
- HR export timesheet.
- HR quản lý loại nghỉ phép.
- HR tạo tài khoản.
- HR kích hoạt hoặc vô hiệu hóa tài khoản.

Các use case này bao phủ phần lớn luồng nghiệp vụ quan trọng của hệ thống.

## 33. Demo hệ thống

Khi demo, hệ thống có thể sử dụng các tài khoản seed sẵn với mật khẩu `password123`: nhân viên `nv1@company.com`, quản lý `manager.kt@company.com` và HR/Admin `hr@company.com`. Luồng demo nên bắt đầu từ nhân viên, sau đó chuyển sang manager và cuối cùng là HR/Admin để thể hiện đầy đủ vòng đời dữ liệu.

## 34. Triển khai local và Docker

Để chạy local, backend cần cài package, generate Prisma client, migrate database, seed dữ liệu và chạy server dev. Frontend cần cài package và chạy Vite dev server. Với Docker, `docker-compose.yaml` định nghĩa hai service: backend và frontend. Backend expose port nội bộ 3000 ra 3001, frontend expose Nginx ra port 5173.

--- Trang 10: Đánh giá và hướng phát triển ---

## 35. Kết quả đạt được

Đồ án Timesheet Pro đã xây dựng được một hệ thống web quản lý chấm công, bảng công và nghỉ phép theo vai trò. Hệ thống có đầy đủ các luồng chính từ nhân viên đến manager và HR/Admin. Dữ liệu được lưu tập trung trong PostgreSQL, truy cập thông qua Prisma ORM và được bảo vệ bằng JWT/RBAC.

Frontend đã có các dashboard theo vai trò, service gọi API, store quản lý trạng thái và các màn hình nghiệp vụ. Backend có module rõ ràng, API contract, Swagger, validate dữ liệu, migration database và các endpoint phục vụ nghiệp vụ chính. Tài liệu dự án gồm setup local, API contract, analysis design, demo script, test plan và smoke checklist.

## 36. Ưu điểm của hệ thống

Hệ thống có kiến trúc tách biệt frontend/backend, dễ mở rộng và dễ kiểm thử. Việc chia backend theo module giúp mỗi nghiệp vụ có phạm vi rõ ràng. Frontend sử dụng store theo domain nên giảm phụ thuộc giữa các màn hình. API response được chuẩn hóa, giúp frontend xử lý thống nhất. Cơ sở dữ liệu có ràng buộc tránh trùng bảng công tháng và lưu thông tin audit trail cho các thao tác duyệt.

## 37. Hạn chế

Một số tính năng nâng cao mới ở mức chuẩn bị hoặc stub. Tích hợp Google/Microsoft SSO và email phụ thuộc vào credential môi trường nên khi demo local có thể chưa bật. External payroll provider chưa được tích hợp thật. Một số kiểm thử thủ công cần được chạy và ghi nhận evidence bằng screenshot hoặc API response để hoàn thiện hồ sơ nghiệm thu.

## 38. Hướng phát triển

Trong tương lai, hệ thống có thể phát triển thêm các chức năng:

- Tích hợp external payroll provider thật.
- Hoàn thiện SSO production với Google Workspace hoặc Microsoft Entra ID.
- Bổ sung dashboard thống kê chuyên sâu cho HR và manager.
- Tự động phát hiện bất thường trong chấm công dựa trên system logs.
- Bổ sung kiểm thử UI tự động bằng Playwright.
- Bổ sung phân quyền chi tiết hơn theo permission thay vì chỉ theo role.
- Tối ưu trải nghiệm mobile cho nhân viên khi chấm công.
- Tích hợp email hoặc push notification thật cho các sự kiện duyệt/từ chối.

## 39. Kết luận

Timesheet Pro là một đồ án có tính ứng dụng thực tế trong quản lý nhân sự và vận hành doanh nghiệp. Hệ thống giải quyết được các vấn đề quan trọng như phân tán dữ liệu công, khó kiểm soát nghỉ phép, thiếu minh bạch trong phê duyệt và khó tổng hợp báo cáo. Với kiến trúc React, NestJS, Prisma và PostgreSQL, hệ thống có nền tảng kỹ thuật tốt để tiếp tục mở rộng trong tương lai.

Thông qua quá trình xây dựng đồ án, nhóm đã vận dụng được kiến thức về phân tích yêu cầu, thiết kế cơ sở dữ liệu, xây dựng REST API, quản lý trạng thái frontend, xác thực JWT, phân quyền RBAC, kiểm thử và triển khai. Đây là nền tảng quan trọng để phát triển các hệ thống quản trị nội bộ có quy mô lớn hơn.

