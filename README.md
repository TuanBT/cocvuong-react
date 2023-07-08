1: phần mềm này có bị hết hạn sử dụng ko?
1. Không hết hạn. Vì em tự code.
=> Tên miền cocvuong.com sẽ mất 300K/Năm

2: có thể xuất file và in ra bản cứng ?
2. Chưa in được, nhưng sẽ có chức năng này nếu anh đưa ra template. Tốt nhất là excel.

3: thêm cờ nước?
3. Thêm được. Nếu theo cái hình anh gửi là vào góc. Nhưng sẽ cần thông tin này trong phần import data vdv trước giải đấu.
=> Thêm mặc định là VN

4: dùng pass khoá lại phần mềm sau khi mình import dữ liệu, sợ 1 ai đó vào chỉnh dữ liệu.
4. Hệ thống chưa có login. Sẽ cân nhắc.
=> Done

5: set 3 hoặc 5 gđ chấm thì đa số bấm là lên điểm.
5. Hơi khó làm. Nhưng sẽ cân nhắc
=> Done

6: 1 giây bấm bên xanh 1đ đá vào giáp, bên đỏ đấm lại vào mặt bên xanh bấm bên đỏ lên 1đ lại, trong 1s là lên liền?
6. Chỉ cần >50% giám định chấm là ghi nhận điểm. Không cần chờ thời gian.
6.1 Nếu dưới 2s thì bỏ phiên chấm điểm.
=> Done

7: quyền mà 5 GĐ chấm tự bỏ 1 điểm thấp 1 điểm cao tự tổng điểm, tự động xếp hạng 1,2,3 trong nội dung đó. Nếu 5 Gd quyền thì bỏ tổng điểm Min và Max. 
Lấy 3 số giữa. Riêng 3 GD thì tổng 3 luôn.
=> Done

8. bốc thăm thứ tự thi đấu từng nội dung của vđv thì tự nhảy tên vào bảng chia cặp đối với đối kháng, quyền thứ tự từ trên xuống 
Các bước như sau: Tự random số - Sếp schema - Export ra data
=> Done

Thứ tự ưu tiên:
6 - 8 - 3 - 4

-Chữ nên để dạng in đậm để thấy từ xa
=> Done

-màn giám định khi ấn vào hết 3s thì bỏ bôi màu. Ngoài ra trên di động chấm xong không tự bỏ màu hover.
=> Done

-chấm quyền, máy chủ ấn số về 0 thì đang hiển hẳn số 0 đáng lẽ nên là 000
=> Không thay đổi

- Chấp nhận điểm của giám định là cho cùng lúc được cả đỏ và xanh (Cho những trường hợp diễn biến trận đấu nhanh)
=> Bỏ cơ chế này

----------------------
-Các tính năng đã làm:
+ Thêm cờ quốc gia (Đang giới hạn ở 11 nước đông nam á). Cho phép lựa chọn hiển thị hoặc không ở Thiết đặt
+ Đặt pass ở tất cả các trang. Cho phép thay đổi pass ở thiết đặt.
+ Cho phép lựa chọn và chấm giải với 3 hoặc 5 giám định ở phần thiết đặt.
+ Cho phép 50% giám định chấm điểm là lập tức ghi nhận điểm. Cho phép chấm trong 2s.
+ 5 giám định thi quyền thì đếm tổng 3 Giám định điểm ở giữa.
+ Cho phép sắp xếp giải đấu từ dữ liệu thô ở cả Thi Quyền và Đối Kháng (Tự động xếp trận thi đấu). Export ra file để sử dụng.

-Các tính năng chưa làm:
+ Chưa thể export theo template có sẵn kết quả thi đấu
