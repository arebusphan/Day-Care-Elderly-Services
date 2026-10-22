import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import elderlyService from "../../services/elderlyService";
import type { ElderlyProfileDto } from "../../types/elderly";
import {
  billingApiService,
  type ServicePackageApiDto,
  type CreateRegistrationRequest,
} from "../../services/billingApiService";

// =====================================================================
// TYPES
// =====================================================================

interface ServicePackage {
  id: string;
  name: string;
  totalBeds: number;
  availableSlots: number;
  target: string;
  highlights: string[];
  included: string[];
  pricingNote: string;
  pricePerDay: number;
  priceMonth3Days: number;
  priceMonthFullWeek: number;
  breakdownBase: number;
  breakdownGroupCare: number;
  breakdownSpecialized: number;
  breakdownSpecializedLabel: string;
  endOfLifeRoomIncluded?: boolean;
}


// =====================================================================
// FAKE DATA — 5 GÓI DỊCH VỤ
// =====================================================================

const DEFAULT_PACKAGES: ServicePackage[] = [
  {
    id: "22222222-0001-0000-0000-000000000001",
    name: "Cơ bản",
    totalBeds: 45,
    availableSlots: 45,
    target:
      "Người cao tuổi còn tự lập, cần nơi an toàn ban ngày để sinh hoạt và giao lưu.",
    highlights: [
      "Vận động nhẹ và giao lưu mỗi ngày",
      "2 bữa chính và 1 bữa phụ dinh dưỡng",
      "Nhật ký chăm sóc kèm ảnh gửi gia đình",
      "Nhắc và cho uống thuốc theo hướng dẫn bác sĩ",
    ],
    included: [
      "Chăm sóc bán trú 07:00 – 17:00",
      "Bữa sáng, bữa trưa, bữa phụ chiều",
      "Kiểm tra sức khỏe cơ bản mỗi sáng",
      "Hoạt động giải trí, thể dục nhẹ",
      "Nhật ký và ảnh chăm sóc hàng ngày",
    ],
    pricingNote: "Phụ phí hỗ trợ tăng cường nếu cụ cần hỗ trợ di chuyển.",
    pricePerDay: 300000,
    priceMonth3Days: 3300000,
    priceMonthFullWeek: 6000000,
    breakdownBase: 6000000,
    breakdownGroupCare: 0,
    breakdownSpecialized: 0,
    breakdownSpecializedLabel: "Không có",
    endOfLifeRoomIncluded: false,
  },
  {
    id: "22222222-0002-0000-0000-000000000002",
    name: "Phục hồi chức năng",
    totalBeds: 20,
    availableSlots: 20,
    target:
      "Người cao tuổi yếu vận động, sau gãy xương hoặc phẫu thuật khớp, cần phục hồi.",
    highlights: [
      "Bài tập tầm vận động, tập đi, thăng bằng",
      "Chương trình tập cá nhân hóa theo tiến triển",
      "Báo cáo tiến triển hằng tuần gửi gia đình",
      "Bài nặng chỉ tập buổi sáng, chiều nghỉ nhẹ",
    ],
    included: [
      "Toàn bộ quyền lợi Gói Cơ bản",
      "Vật lý trị liệu 5 buổi/tuần",
      "Dụng cụ tập chuyên dụng",
      "Báo cáo tiến triển hằng tuần",
    ],
    pricingNote: "",
    pricePerDay: 450000,
    priceMonth3Days: 4950000,
    priceMonthFullWeek: 9000000,
    breakdownBase: 6000000,
    breakdownGroupCare: 1500000,
    breakdownSpecialized: 1500000,
    breakdownSpecializedLabel: "Bài tập, dụng cụ, báo cáo tuần",
    endOfLifeRoomIncluded: false,
  },
  {
    id: "22222222-0003-0000-0000-000000000003",
    name: "Sa sút trí tuệ",
    totalBeds: 15,
    availableSlots: 15,
    target:
      "Người cao tuổi hay quên, lú lẫn, có nguy cơ đi lạc, cần giám sát liên tục.",
    highlights: [
      "Lịch sinh hoạt cố định mỗi ngày giúp ổn định tâm lý",
      "Hoạt động âm nhạc, gợi nhớ, thủ công đơn giản",
      "Khu vực an toàn, kiểm soát ra vào",
      "Ghi chú cách giao tiếp riêng cho từng cụ",
    ],
    included: [
      "Toàn bộ quyền lợi Gói Cơ bản",
      "Nhân viên chuyên trách sa sút trí tuệ",
      "Khu vực sinh hoạt an toàn riêng",
      "Hoạt động kích thích nhận thức mỗi ngày",
    ],
    pricingNote: "",
    pricePerDay: 500000,
    priceMonth3Days: 5500000,
    priceMonthFullWeek: 10000000,
    breakdownBase: 6000000,
    breakdownGroupCare: 1500000,
    breakdownSpecialized: 2500000,
    breakdownSpecializedLabel: "Môi trường an toàn, lịch cố định",
    endOfLifeRoomIncluded: false,
  },
  {
    id: "22222222-0004-0000-0000-000000000004",
    name: "Sau tai biến",
    totalBeds: 12,
    availableSlots: 12,
    target:
      "Người cao tuổi sau đột quỵ, yếu hoặc liệt nửa người, khó nói, khó nuốt.",
    highlights: [
      "Đổi tư thế, vận động trị liệu chuyên sâu",
      "Tập nói, tập nuốt với kỹ thuật viên",
      "Thực đơn ăn mềm hoặc xay phù hợp",
      "Theo dõi dấu hiệu bất thường nhiều lần/ngày",
    ],
    included: [
      "Toàn bộ quyền lợi Gói Cơ bản",
      "Điều dưỡng hỗ trợ di chuyển, vệ sinh",
      "Trị liệu ngôn ngữ và nuốt",
      "Theo dõi sức khỏe liên tục",
      "Thực đơn đặc biệt",
    ],
    pricingNote: "",
    pricePerDay: 580000,
    priceMonth3Days: 6330000,
    priceMonthFullWeek: 11500000,
    breakdownBase: 6000000,
    breakdownGroupCare: 1500000,
    breakdownSpecialized: 4000000,
    breakdownSpecializedLabel: "Ăn riêng, theo dõi, hỗ trợ di chuyển",
    endOfLifeRoomIncluded: false,
  },
  {
    id: "22222222-0005-0000-0000-000000000005",
    name: "Giai đoạn cuối",
    totalBeds: 8,
    availableSlots: 8,
    target:
      "Người cao tuổi cần chăm sóc giảm nhẹ, thoải mái, đồng hành giai đoạn cuối đời.",
    highlights: [
      "Phòng yên tĩnh 1–2 người đã gồm trong giá",
      "Hoạt động nhẹ nhàng theo ý nguyện của cụ",
      "Liên lạc gia đình thường xuyên, gọi video hỗ trợ",
      "Nhật ký chi tiết, chăm sóc chu đáo từng giờ",
    ],
    included: [
      "Toàn bộ quyền lợi Gói Cơ bản",
      "Phòng 1–2 người yên tĩnh (đã gồm)",
      "Chăm sóc giảm nhẹ chuyên biệt",
      "Đồng hành tinh thần, tâm lý",
      "Liên lạc gia đình mọi lúc",
    ],
    pricingNote:
      "Lưu ý: Đây là dịch vụ chăm sóc thoải mái, không thay thế cơ sở y tế chuyên khoa.",
    pricePerDay: 700000,
    priceMonth3Days: 7700000,
    priceMonthFullWeek: 14000000,
    breakdownBase: 6000000,
    breakdownGroupCare: 1500000,
    breakdownSpecialized: 6500000,
    breakdownSpecializedLabel: "Chăm sóc giảm nhẹ, phòng yên tĩnh",
    endOfLifeRoomIncluded: true,
  },
];


/*
// =====================================================================
// LỊCH SINH HOẠT — HOẠT ĐỘNG THAY ĐỔI THEO NGÀY (THEO GÓI)
// dayIndex: 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
// slot: "am" = 09:00–10:30, "pm" = 13:30–15:30
// =====================================================================

type VariableSchedule = Record<
  string,
  Record<number, { am: any; pm: any }>
>;

const VARIABLE_SCHEDULES: VariableSchedule = {
  basic: {
    1: {
      am: {
        time: "09:00 – 10:30",
        name: "Thể dục buổi sáng — đi bộ sân vườn",
        description:
          "Đi bộ nhẹ nhàng quanh sân vườn, kéo giãn cơ, hít thở sâu trong không khí trong lành.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Đọc sách, báo — chia sẻ tin tức",
        description:
          "Đọc sách, báo hoặc nghe đọc. Nhóm cùng thảo luận tin tức, chia sẻ câu chuyện.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    2: {
      am: {
        time: "09:00 – 10:30",
        name: "Yoga trên ghế — bài tập thở",
        description:
          "Yoga nhẹ nhàng ngồi trên ghế: xoay cổ, vai, bài tập thở sâu giúp thư giãn.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Chơi cờ tướng, đánh bài, xếp hình",
        description:
          "Hoạt động trí tuệ: cờ tướng, bài, xếp hình. Giao lưu và kích thích tư duy.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    3: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập dưỡng sinh, vận động nhịp nhàng",
        description:
          "Bài tập dưỡng sinh theo nhạc nhẹ, vận động toàn thân nhịp nhàng, không gắng sức.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Thủ công — làm thiệp, gấp giấy, tô màu",
        description:
          "Hoạt động sáng tạo: làm thiệp, gấp hoa giấy, tô màu tranh. Rèn vận động tinh.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    4: {
      am: {
        time: "09:00 – 10:30",
        name: "Đi bộ kết hợp nghe nhạc",
        description:
          "Đi bộ chậm rãi trong khuôn viên, vừa đi vừa nghe nhạc nhẹ qua loa ngoài.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Xem phim tài liệu, ca nhạc",
        description:
          "Chiếu phim tài liệu ngắn hoặc chương trình ca nhạc. Cùng thưởng thức và bình luận.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    5: {
      am: {
        time: "09:00 – 10:30",
        name: "Thể dục với bóng mềm và dây thun",
        description:
          "Bài tập với bóng mềm và dây thun: tung bắt, kéo giãn. Vui và hiệu quả.",
        intensity: "Nhẹ – Vừa",
        suitableFor: "Người vận động tốt",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Câu lạc bộ kể chuyện, hồi tưởng",
        description:
          "Cùng kể lại kỷ niệm xưa, chia sẻ câu chuyện cuộc đời. Kết nối và vui vẻ.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    6: {
      am: {
        time: "09:00 – 10:30",
        name: "Tự do — thư giãn, trò chuyện",
        description:
          "Thời gian tự do: đọc sách, trò chuyện với bạn, ngồi thư giãn ngoài sân.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Sinh hoạt nhóm — hát karaoke, đố vui",
        description:
          "Karaoke bài hát quen thuộc, đố vui kiến thức. Sôi nổi và gắn kết.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
  },
  rehab: {
    1: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập tầm vận động khớp",
        description:
          "Bài tập xoay vai, khuỷu tay, cổ tay, cổ chân. Phục hồi biên độ vận động.",
        intensity: "Vừa",
        suitableFor: "Người yếu vận động",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Tập đi với thanh song song",
        description:
          "Tập đi dọc thanh song song, có nhân viên hỗ trợ. Rèn sức mạnh chân và thăng bằng.",
        intensity: "Vừa",
        suitableFor: "Người sau phẫu thuật khớp",
        type: "variable",
      },
    },
    2: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập thăng bằng — đứng, bước qua vật cản",
        description:
          "Đứng một chân, bước qua vật cản thấp, xoay người. Cải thiện thăng bằng.",
        intensity: "Vừa",
        suitableFor: "Người yếu thăng bằng",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Tập vận động tinh — cầm nắm, xoay vặn",
        description:
          "Bài tập tay: cầm nắm vật nhỏ, xoay vặn nắp chai, xâu hạt. Phục hồi vận động tinh.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    3: {
      am: {
        time: "09:00 – 10:30",
        name: "Bài tập sức bền — đạp xe, kéo dây",
        description:
          "Đạp xe tại chỗ, kéo dây đàn hồi. Tăng sức bền cơ và tim mạch.",
        intensity: "Vừa – Nặng",
        suitableFor: "Người sức khỏe ổn định",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Đi bộ có hỗ trợ trong hành lang",
        description:
          "Đi bộ với khung tập đi hoặc nạng dọc hành lang. Nhân viên đi kèm.",
        intensity: "Vừa",
        suitableFor: "Người yếu vận động",
        type: "variable",
      },
    },
    4: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập với tạ nhẹ và dụng cụ chuyên dụng",
        description:
          "Nâng tạ nhẹ (0.5–1kg), sử dụng dụng cụ phục hồi chuyên dụng. Có hướng dẫn.",
        intensity: "Vừa",
        suitableFor: "Người đang phục hồi",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Tập lên xuống bậc thang",
        description:
          "Tập lên xuống bậc thang thấp, có tay vịn và nhân viên hỗ trợ. Rèn sức mạnh chân.",
        intensity: "Vừa – Nặng",
        suitableFor: "Người tiến triển tốt",
        type: "variable",
      },
    },
    5: {
      am: {
        time: "09:00 – 10:30",
        name: "Đánh giá tiến triển tuần",
        description:
          "Đo lường khả năng vận động, ghi nhận tiến triển, điều chỉnh bài tập cho tuần tới.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Bài tập duy trì — lặp lại bài tốt nhất",
        description:
          "Lặp lại các bài tập hiệu quả nhất trong tuần để củng cố kết quả.",
        intensity: "Vừa",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    6: {
      am: {
        time: "09:00 – 10:30",
        name: "Yoga phục hồi nhẹ nhàng",
        description:
          "Yoga nhẹ tập trung vào thở, kéo giãn. Giúp cơ thể hồi phục sau tuần tập.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Thư giãn, massage nhẹ, ngâm chân",
        description:
          "Massage tay chân nhẹ nhàng, ngâm chân nước ấm. Thư giãn cuối tuần.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
  },
  dementia: {
    1: {
      am: {
        time: "09:00 – 10:30",
        name: "Bài tập gợi nhớ với hình ảnh",
        description:
          "Xem hình ảnh quen thuộc: gia đình, quê hương, món ăn. Gọi tên và kể chuyện liên quan.",
        intensity: "Nhẹ",
        suitableFor: "Người hay quên",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Nghe nhạc quen thuộc — bài hát thời trẻ",
        description:
          "Nghe các bài hát từ thời trẻ, vỗ tay theo nhạc, hát theo nếu nhớ. Kích thích trí nhớ dài hạn.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    2: {
      am: {
        time: "09:00 – 10:30",
        name: "Xếp hình, phân loại đồ vật theo màu",
        description:
          "Xếp hình đơn giản, phân loại đồ vật theo màu sắc hoặc hình dạng. Kích thích nhận thức.",
        intensity: "Nhẹ",
        suitableFor: "Người cần kích thích nhận thức",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Kể chuyện có hướng dẫn",
        description:
          "Nhân viên gợi ý đầu câu chuyện, cụ hoàn thành. Rèn khả năng diễn đạt và nhớ.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    3: {
      am: {
        time: "09:00 – 10:30",
        name: "Nhận diện đồ vật, ghép đôi hình ảnh",
        description:
          "Bài tập nhận diện: tên gọi đồ vật, ghép đôi hình ảnh giống nhau. Có hỗ trợ.",
        intensity: "Nhẹ",
        suitableFor: "Người suy giảm nhận thức",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Vẽ tranh, tô màu — bài mẫu đơn giản",
        description:
          "Tô màu tranh in sẵn hoặc vẽ tự do. Kích thích sáng tạo và vận động tay.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    4: {
      am: {
        time: "09:00 – 10:30",
        name: "Trò chơi ghép đôi, lật thẻ nhớ",
        description:
          "Lật thẻ tìm cặp giống nhau. Trò chơi vui nhộn rèn trí nhớ ngắn hạn.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Xem album ảnh gia đình, kể về quá khứ",
        description:
          "Xem ảnh gia đình do người thân cung cấp. Nhân viên gợi chuyện, cụ hồi tưởng.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    5: {
      am: {
        time: "09:00 – 10:30",
        name: "Hát các bài hát cũ",
        description:
          "Cùng hát các bài hát quen thuộc: nhạc trữ tình, dân ca. Kích thích trí nhớ dài hạn.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Hoạt động cảm giác — sờ, ngửi, nếm",
        description:
          "Sờ các loại vải, ngửi thảo mộc, nếm trái cây. Kích thích giác quan.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    6: {
      am: {
        time: "09:00 – 10:30",
        name: "Đi dạo sân vườn an toàn",
        description:
          "Đi dạo trong khu vườn an toàn có hàng rào, nhân viên đi kèm. Không khí trong lành.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người (cần giám sát)",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Xem phim ngắn, thư giãn",
        description:
          "Chiếu phim hoạt hình ngắn hoặc phim tài liệu nhẹ nhàng. Thư giãn cuối tuần.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
  },
  stroke: {
    1: {
      am: {
        time: "09:00 – 10:30",
        name: "Vận động trị liệu tay — bên liệt",
        description:
          "Bài tập tập trung vào tay bên yếu/liệt: co duỗi, xoay cổ tay, nắm mở bàn tay.",
        intensity: "Vừa",
        suitableFor: "Người yếu/liệt nửa người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Tập nói, phát âm — luyện cơ miệng",
        description:
          "Tập phát âm từ đơn giản, luyện cơ miệng, lưỡi. Kỹ thuật viên hướng dẫn 1:1.",
        intensity: "Nhẹ",
        suitableFor: "Người khó nói",
        type: "variable",
      },
    },
    2: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập nuốt an toàn",
        description:
          "Hướng dẫn kỹ thuật nuốt đúng cách, tập với nước đặc, thức ăn mềm. Phòng sặc.",
        intensity: "Nhẹ – Vừa",
        suitableFor: "Người khó nuốt",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Vận động trị liệu chân",
        description:
          "Bài tập duỗi, co, xoay cổ chân, đầu gối. Tập đạp chân trên giường hoặc ghế.",
        intensity: "Vừa",
        suitableFor: "Người yếu chân",
        type: "variable",
      },
    },
    3: {
      am: {
        time: "09:00 – 10:30",
        name: "Đổi tư thế, xoay trở",
        description:
          "Hỗ trợ đổi tư thế nằm, ngồi. Phòng ngừa loét do nằm lâu. Xoa bóp nhẹ.",
        intensity: "Nhẹ",
        suitableFor: "Người nằm nhiều",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Tập cầm nắm — thìa, bút, ly",
        description:
          "Tập cầm nắm vật dụng hàng ngày: thìa, bút, ly nước. Phục hồi khả năng tự phục vụ.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    4: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập đi có hỗ trợ",
        description:
          "Tập đi với khung tập đi hoặc nạng, có nhân viên kèm. Rèn sức mạnh và thăng bằng.",
        intensity: "Vừa – Nặng",
        suitableFor: "Người có tiến triển",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Bài tập giao tiếp — chỉ hình, viết bảng",
        description:
          "Chỉ vào hình ảnh để diễn đạt, viết lên bảng. Tìm cách giao tiếp thay lời nói.",
        intensity: "Nhẹ",
        suitableFor: "Người khó nói",
        type: "variable",
      },
    },
    5: {
      am: {
        time: "09:00 – 10:30",
        name: "Đánh giá tiến triển tuần",
        description:
          "Phối hợp bác sĩ đánh giá: sức mạnh cơ, khả năng nói, nuốt. Ghi nhận và điều chỉnh.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Tập phối hợp tay-mắt",
        description:
          "Bắt bóng mềm, xâu hạt, vẽ theo mẫu. Rèn phối hợp tay-mắt và tập trung.",
        intensity: "Nhẹ – Vừa",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    6: {
      am: {
        time: "09:00 – 10:30",
        name: "Tập nhẹ nhàng, nghỉ ngơi chủ động",
        description:
          "Bài tập nhẹ cuối tuần: kéo giãn, xoay khớp. Không gắng sức, tập trung hồi phục.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Thư giãn, nghe nhạc, massage nhẹ",
        description:
          "Nghe nhạc thư giãn, massage tay chân nhẹ nhàng. Cuối tuần thoải mái.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
  },
  endoflife: {
    1: {
      am: {
        time: "09:00 – 10:30",
        name: "Hoạt động nhẹ theo ý cụ",
        description:
          "Ngồi ngoài ban công nghe chim, ngắm cây xanh, hoặc nằm nghỉ. Theo sức khỏe và ý nguyện.",
        intensity: "Nhẹ",
        suitableFor: "Theo sức khỏe",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Đọc sách cho nghe, kể chuyện nhẹ nhàng",
        description:
          "Nhân viên đọc sách, kể chuyện cho cụ nghe. Nội dung nhẹ nhàng, ấm áp.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    2: {
      am: {
        time: "09:00 – 10:30",
        name: "Massage tay chân nhẹ nhàng",
        description:
          "Xoa bóp tay chân nhẹ nhàng, thoa kem dưỡng. Giúp tuần hoàn và thoải mái.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Trò chuyện, tâm sự — đồng hành",
        description:
          "Nhân viên chăm sóc ngồi bên cạnh, trò chuyện, lắng nghe. Đồng hành tinh thần.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    3: {
      am: {
        time: "09:00 – 10:30",
        name: "Ngồi thư giãn ngoài sân",
        description:
          "Ra ngoài sân hít thở không khí, ngắm cảnh. Nhân viên đi kèm hỗ trợ.",
        intensity: "Nhẹ",
        suitableFor: "Theo sức khỏe",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Nghe nhạc yêu thích, xem ảnh gia đình",
        description:
          "Phát nhạc theo sở thích, xem ảnh gia đình trên máy tính bảng. Ấm cúng.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    4: {
      am: {
        time: "09:00 – 10:30",
        name: "Hoạt động theo tình trạng sức khỏe",
        description:
          "Tùy tình trạng trong ngày: vận động nhẹ, nghỉ ngơi, hoặc hoạt động theo ý cụ.",
        intensity: "Nhẹ",
        suitableFor: "Theo sức khỏe",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Gọi video gia đình",
        description:
          "Nhân viên hỗ trợ kết nối gọi video với gia đình. Giữ liên lạc thường xuyên.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    5: {
      am: {
        time: "09:00 – 10:30",
        name: "Chăm sóc thoải mái — xoa bóp, dưỡng da",
        description:
          "Xoa bóp nhẹ nhàng, thoa kem dưỡng da. Chăm sóc thoải mái, không đau.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Hoạt động cảm giác — hoa, vải mềm",
        description:
          "Ngửi hoa, chạm vải mềm, nghe nhạc nhẹ. Kích thích giác quan nhẹ nhàng.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
    },
    6: {
      am: {
        time: "09:00 – 10:30",
        name: "Nghỉ ngơi, thư giãn — không gian yên tĩnh",
        description:
          "Nghỉ ngơi trong phòng yên tĩnh. Nhân viên kiểm tra định kỳ.",
        intensity: "Nhẹ",
        suitableFor: "Mọi người",
        type: "variable",
      },
      pm: {
        time: "13:30 – 15:30",
        name: "Sinh hoạt nhẹ theo ý cụ",
        description:
          "Hoạt động cuối tuần nhẹ nhàng theo ý cụ: nghe nhạc, xem ảnh, trò chuyện.",
        intensity: "Nhẹ",
        suitableFor: "Theo sức khỏe",
        type: "variable",
      },
    },
  },
};
*/

// =====================================================================
// DỮ LIỆU PHÒNG & GIƯỜNG — FAKE DATA
// =====================================================================

function createRooms(
  prefix: string,
  largeRoomConfigs: number[],
  smallRoomConfigs: number[]
): RoomData[] {
  const rooms: RoomData[] = [];
  largeRoomConfigs.forEach((bedCount, i) => {
    const roomId = `${prefix}1${String(i + 1).padStart(2, "0")}`;
    rooms.push({
      id: roomId,
      name: `Phòng ${roomId}`,
      type: "large",
      beds: Array.from({ length: bedCount }, (_, j) => ({
        id: `${roomId}-G${j + 1}`,
        label: `Giường ${j + 1}`,
        bookings: [],
      })),
    });
  });
  smallRoomConfigs.forEach((bedCount, i) => {
    const roomId = `${prefix}2${String(i + 1).padStart(2, "0")}`;
    rooms.push({
      id: roomId,
      name: `Phòng ${roomId}`,
      type: "small",
      beds: Array.from({ length: bedCount }, (_, j) => ({
        id: `${roomId}-G${j + 1}`,
        label: `Giường ${j + 1}`,
        bookings: [],
      })),
    });
  });
  return rooms;
}

function addBookingPattern(
  rooms: RoomData[],
  bedIndices: number[],
  daysOfWeek: number[],
  elderlyNames: string[],
  startOffset: number,
  durationDays: number
) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() + startOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  const startStr = fmt(start);
  const endStr = fmt(end);

  let bedIdx = 0;
  let assigned = 0;
  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bedIndices.includes(bedIdx) && assigned < elderlyNames.length) {
        bed.bookings.push({
          elderlyName: elderlyNames[assigned],
          daysOfWeek,
          startDate: startStr,
          endDate: endStr,
        });
        assigned++;
      }
      bedIdx++;
    }
  }
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildAllRooms(): Record<string, RoomData[]> {
  // Cơ bản: 45 giường = 5 phòng lớn (6g x5=30) + 5 phòng nhỏ (2g + 2g + 2g + 2g + 2g + 2g + 1g + 2g = 15)
  const basicRooms = createRooms("A", [6, 6, 6, 6, 6], [2, 2, 2, 2, 2, 2, 2, 1]);
  // Booking: 38 beds booked tomorrow (Sat=6), 7 free
  const basicNames = [
    "Nguyễn Văn Hùng","Trần Thị Mai","Lê Văn An","Phạm Thị Bé","Hoàng Văn Cường",
    "Ngô Thị Dung","Bùi Văn Em","Đặng Thị Phượng","Vũ Văn Giang","Lý Thị Hoa",
    "Trương Văn Ích","Dương Thị Kim","Phan Văn Long","Hồ Thị Mơ","Tạ Văn Nam",
    "Đinh Thị Oanh","Cao Văn Phú","Lương Thị Quỳnh","Mạc Văn Rồng","Châu Thị Sen",
    "Nguyễn Thị Tâm","Trần Văn Uy","Lê Thị Vân","Phạm Văn Xuân","Hoàng Thị Yến",
    "Bùi Văn Ánh","Đặng Thị Bích","Vũ Văn Chiến","Lý Thị Đào","Trương Văn Ếch",
    "Dương Văn Phong","Phan Thị Gấm","Hồ Văn Hải","Tạ Thị Ích","Đinh Văn Kiên",
    "Cao Thị Lan","Lương Văn Minh","Mạc Thị Ngọc",
  ];
  // MWF pattern for 20 beds, TTS for 10, daily for 8 = 38 booked on any day
  addBookingPattern(basicRooms, Array.from({length:20},(_, i)=>i), [1,3,5], basicNames.slice(0,20), -10, 40);
  addBookingPattern(basicRooms, Array.from({length:10},(_, i)=>i+20), [2,4,6], basicNames.slice(20,30), -10, 40);
  addBookingPattern(basicRooms, Array.from({length:8},(_, i)=>i+30), [1,2,3,4,5,6], basicNames.slice(30,38), -5, 30);

  // Phục hồi: 20 giường = 2 phòng lớn (5g x2=10) + 5 phòng nhỏ (2g x5=10)
  const rehabRooms = createRooms("B", [5, 5], [2, 2, 2, 2, 2]);
  const rehabNames = [
    "Nguyễn Văn Hùng B","Trần Thị Mai B","Lê Văn An B","Phạm Thị Bé B","Hoàng Văn Cường B",
    "Ngô Thị Dung B","Bùi Văn Em B","Đặng Thị Phượng B","Vũ Văn Giang B","Lý Thị Hoa B",
    "Trương Văn Ích B","Dương Thị Kim B","Phan Văn Long B","Hồ Thị Mơ B","Tạ Văn Nam B",
  ];
  addBookingPattern(rehabRooms, Array.from({length:8},(_, i)=>i), [1,3,5], rehabNames.slice(0,8), -10, 40);
  addBookingPattern(rehabRooms, Array.from({length:7},(_, i)=>i+8), [2,4,6], rehabNames.slice(8,15), -10, 40);

  // Sa sút trí tuệ: 15 giường = 2 phòng lớn (5g+4g=9) + 3 phòng nhỏ (2g x3=6)
  const dementiaRooms = createRooms("C", [5, 4], [2, 2, 2]);
  const dementiaNames = [
    "Nguyễn Thị An C","Trần Văn Bình C","Lê Thị Cúc C","Phạm Văn Dũng C","Hoàng Thị Én C",
    "Ngô Văn Phong C","Bùi Thị Gấm C","Đặng Văn Hải C","Vũ Thị Ích C","Lý Văn Kiên C",
    "Trương Thị Lan C","Dương Văn Minh C","Phan Thị Ngọc C","Hồ Văn Oanh C","Tạ Thị Phú C",
  ];
  // ALL 15 beds booked daily → hết chỗ
  addBookingPattern(dementiaRooms, Array.from({length:15},(_, i)=>i), [1,2,3,4,5,6], dementiaNames, -5, 40);

  // Sau tai biến: 12 giường = 2 phòng lớn (4g x2=8) + 2 phòng nhỏ (2g x2=4)
  const strokeRooms = createRooms("D", [4, 4], [2, 2]);
  const strokeNames = [
    "Nguyễn Văn Hùng D","Trần Thị Mai D","Lê Văn An D","Phạm Thị Bé D",
    "Hoàng Văn Cường D","Ngô Thị Dung D","Bùi Văn Em D","Đặng Thị Phượng D",
    "Vũ Văn Giang D",
  ];
  addBookingPattern(strokeRooms, Array.from({length:5},(_, i)=>i), [1,3,5], strokeNames.slice(0,5), -10, 40);
  addBookingPattern(strokeRooms, Array.from({length:4},(_, i)=>i+5), [2,4,6], strokeNames.slice(5,9), -10, 40);

  // Giai đoạn cuối: 8 giường = chỉ phòng nhỏ 1-2 người (2g x4=8)
  const endOfLifeRooms = createRooms("E", [], [2, 2, 2, 2]);
  const eolNames = [
    "Nguyễn Thị Tâm E","Trần Văn Uy E","Lê Thị Vân E",
    "Phạm Văn Xuân E","Hoàng Thị Yến E","Bùi Văn Ánh E",
  ];
  addBookingPattern(endOfLifeRooms, Array.from({length:6},(_, i)=>i), [1,2,3,4,5,6], eolNames, -5, 40);

  return {
    basic: basicRooms,
    rehab: rehabRooms,
    dementia: dementiaRooms,
    stroke: strokeRooms,
    endoflife: endOfLifeRooms,
  };
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

function getDayOfWeek(d: Date): number {
  const day = d.getDay(); // 0=Sun, 1=Mon...6=Sat
  return day === 0 ? 7 : day; // 1=Mon...7=Sun
}

function isSunday(d: Date): boolean {
  return d.getDay() === 0;
}

function dateStr(d: Date): string {
  return fmt(d);
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateVN(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getTomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function getMonthEndDate(startDate: Date): Date {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return end;
}

function getPatternDays(pattern: string): number[] {
  if (pattern === "all") return [1, 2, 3, 4, 5, 6];
  if (pattern === "mwf") return [1, 3, 5];
  if (pattern === "tts") return [2, 4, 6];
  return [];
}

function countDaysInRange(
  startDate: Date,
  endDate: Date,
  daysOfWeek: number[]
): number {
  let count = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = getDayOfWeek(d);
    if (daysOfWeek.includes(dow)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function listDatesInRange(
  startDate: Date,
  endDate: Date,
  daysOfWeek: number[]
): string[] {
  const dates: string[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = getDayOfWeek(d);
    if (daysOfWeek.includes(dow)) dates.push(dateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function isBedBookedOnDate(bed: BedData, dateString: string): boolean {
  const d = parseDateStr(dateString);
  const dow = getDayOfWeek(d);
  return bed.bookings.some((b) => {
    return (
      b.daysOfWeek.includes(dow) &&
      dateString >= b.startDate &&
      dateString <= b.endDate
    );
  });
}

function getBedStatusForDates(
  bed: BedData,
  selectedDates: string[]
): "empty" | "occupied" | "partial" {
  if (selectedDates.length === 0) return "empty";
  const overlapping = selectedDates.filter((d) => isBedBookedOnDate(bed, d));
  if (overlapping.length === 0) return "empty";
  if (overlapping.length === selectedDates.length) return "occupied";
  return "partial";
}

function getBedOccupantOnDate(bed: BedData, dateString: string): string | null {
  const d = parseDateStr(dateString);
  const dow = getDayOfWeek(d);
  const booking = bed.bookings.find(
    (b) =>
      b.daysOfWeek.includes(dow) &&
      dateString >= b.startDate &&
      dateString <= b.endDate
  );
  return booking ? booking.elderlyName : null;
}

function countAvailableTomorrow(rooms: RoomData[]): number {
  const tomorrow = dateStr(getTomorrow());
  let count = 0;
  for (const room of rooms) {
    for (const bed of room.beds) {
      if (!isBedBookedOnDate(bed, tomorrow)) count++;
    }
  }
  return count;
}

function calculatePrice(
  pkg: ServicePackage,
  regType: "daily" | "monthly",
  monthlyPattern: string,
  numDays: number,
  roomType: "large" | "small",
  mobilityStatus: string
): {
  packagePrice: number;
  supportSurcharge: number;
  roomSurcharge: number;
  total: number;
  packagePriceLabel: string;
  supportLabel: string;
  roomLabel: string;
} {
  let packagePrice = 0;
  let supportSurcharge = 0;
  let roomSurcharge = 0;
  let packagePriceLabel = "";
  let supportLabel = "";
  let roomLabel = "";

  const isBasic = pkg.id === "basic" || pkg.name.toLowerCase().includes("cơ bản");
  const isEndOfLife = pkg.endOfLifeRoomIncluded || pkg.name.toLowerCase().includes("giai đoạn cuối");

  if (regType === "daily") {
    packagePrice = pkg.pricePerDay * numDays;
    packagePriceLabel = `${formatCurrency(pkg.pricePerDay)} × ${numDays} ngày`;

    if (isBasic && mobilityStatus === "Cần hỗ trợ") {
      supportSurcharge = 75000 * numDays;
      supportLabel = `75.000 đ × ${numDays} ngày`;
    }

    if (roomType === "small" && !isEndOfLife) {
      roomSurcharge = 60000 * numDays;
      roomLabel = `60.000 đ × ${numDays} ngày`;
    }
  } else {
    // monthly
    if (monthlyPattern === "all") {
      packagePrice = pkg.priceMonthFullWeek;
      packagePriceLabel = "Tháng, cả tuần (Thứ 2 – Thứ 7)";
    } else {
      packagePrice = pkg.priceMonth3Days;
      packagePriceLabel =
        monthlyPattern === "mwf"
          ? "Tháng, Thứ 2-4-6"
          : "Tháng, Thứ 3-5-7";
    }

    if (isBasic && mobilityStatus === "Cần hỗ trợ") {
      if (monthlyPattern === "all") {
        supportSurcharge = 1500000;
        supportLabel = "Phụ phí hỗ trợ, cả tuần";
      } else {
        supportSurcharge = 825000;
        supportLabel = "Phụ phí hỗ trợ, 3 ngày/tuần";
      }
    }

    if (roomType === "small" && !isEndOfLife) {
      if (monthlyPattern === "all") {
        roomSurcharge = 1200000;
        roomLabel = "Phụ phí phòng 1–2 người, cả tuần";
      } else {
        roomSurcharge = 660000;
        roomLabel = "Phụ phí phòng 1–2 người, 3 ngày/tuần";
      }
    }
  }

  return {
    packagePrice,
    supportSurcharge,
    roomSurcharge,
    total: packagePrice + supportSurcharge + roomSurcharge,
    packagePriceLabel,
    supportLabel,
    roomLabel,
  };
}

function getDayLabel(dayIndex: number): string {
  const labels: Record<number, string> = {
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
  };
  return labels[dayIndex] || "";
}

function generateRegistrationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "DK-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =====================================================================
// COMPONENT CHÍNH
// =====================================================================

interface ServicePackagesViewProps {
  elderlyList?: ElderlyProfileDto[];
  onBackToProfile?: () => void;
  onNavigateToBilling?: () => void;
}

export const ServicePackagesView: React.FC<ServicePackagesViewProps> = ({
  onBackToProfile,
  onNavigateToBilling,
}) => {
  // ---- State ----
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Step 2
  const [selectedElderlyId, setSelectedElderlyId] = useState<string>("");
  const [regType, setRegType] = useState<"daily" | "monthly">("monthly");
  const [monthlyPattern, setMonthlyPattern] = useState("all");
  const [monthlyStartDate, setMonthlyStartDate] = useState("");
  const [dailySelectedDates, setDailySelectedDates] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = getTomorrow();
    return { year: t.getFullYear(), month: t.getMonth() };
  });

  // Step 3
  const [roomType, setRoomType] = useState<"large" | "small">("large");

  // Step 4
  const [holdActive, setHoldActive] = useState(false);
  const [countdown, setCountdown] = useState(900);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed" | "expired" | null>(null);
  const [registrationCode, setRegistrationCode] = useState("");

  // Data
  const [packages, setPackages] = useState<ServicePackage[]>(DEFAULT_PACKAGES);
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfileDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRegistrations, setSessionRegistrations] = useState<
    { elderlyId: string; dates: string[] }[]
  >([]);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load elderly profiles and active packages
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [elderlyRes, pkgRes] = await Promise.all([
          elderlyService.getMyElderlyProfiles(),
          billingApiService.getActivePackages(),
        ]);
        if (elderlyRes.success && elderlyRes.data) {
          setElderlyProfiles(elderlyRes.data);
          if (elderlyRes.data.length > 0) setSelectedElderlyId(elderlyRes.data[0].elderlyId);
        }
        if (pkgRes.success && pkgRes.data && pkgRes.data.length > 0) {
          const mapped: ServicePackage[] = pkgRes.data.map((dto) => ({
            id: dto.packageId,
            name: dto.packageName,
            totalBeds: dto.totalSlots,
            availableSlots: dto.availableSlots,
            target: dto.targetAudience || dto.description || "",
            highlights: dto.highlights || [],
            included: dto.includedServices || [],
            pricingNote: dto.pricingNote || "",
            pricePerDay: dto.pricePerDay,
            priceMonth3Days: dto.priceMonth3Days,
            priceMonthFullWeek: dto.priceMonthFullWeek,
            breakdownBase: 6000000,
            breakdownGroupCare: dto.priceMonthFullWeek > 6000000 ? 1500000 : 0,
            breakdownSpecialized: Math.max(
              0,
              dto.priceMonthFullWeek - 6000000 - (dto.priceMonthFullWeek > 6000000 ? 1500000 : 0)
            ),
            breakdownSpecializedLabel: "Chăm sóc & trị liệu chuyên biệt",
            endOfLifeRoomIncluded: dto.endOfLifeRoomIncluded,
          }));
          setPackages(mapped);
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (holdActive && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setHoldActive(false);
            setPaymentStatus("expired");
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [holdActive]);

  // ---- Derived values ----
  const selectedPackage = packages.find(
    (p) => p.id === selectedPackageId
  );
  const selectedElderly = elderlyProfiles.find(
    (e) => e.elderlyId === selectedElderlyId
  );

  const selectedDates = useMemo((): string[] => {
    if (regType === "daily") return dailySelectedDates;
    if (!monthlyStartDate) return [];
    const start = parseDateStr(monthlyStartDate);
    const end = getMonthEndDate(start);
    return listDatesInRange(start, end, getPatternDays(monthlyPattern));
  }, [regType, dailySelectedDates, monthlyStartDate, monthlyPattern]);

  const totalDays = selectedDates.length;

  const monthlyEndDate = useMemo(() => {
    if (!monthlyStartDate) return "";
    const start = parseDateStr(monthlyStartDate);
    const end = getMonthEndDate(start);
    return formatDateVN(end);
  }, [monthlyStartDate]);

  const pricing = useMemo(() => {
    if (!selectedPackage || !selectedElderly) return null;
    return calculatePrice(
      selectedPackage,
      regType,
      monthlyPattern,
      totalDays,
      roomType,
      selectedElderly.mobilityStatus
    );
  }, [selectedPackage, selectedElderly, regType, monthlyPattern, totalDays, roomType]);

  // Check overlap with session registrations
  const overlapError = useMemo(() => {
    if (!selectedElderlyId || selectedDates.length === 0) return "";
    const existing = sessionRegistrations.filter(
      (r) => r.elderlyId === selectedElderlyId
    );
    for (const reg of existing) {
      const overlap = selectedDates.filter((d) => reg.dates.includes(d));
      if (overlap.length > 0) {
        return `Người này đã có đăng ký trùng ${overlap.length} ngày. Vui lòng chọn ngày khác hoặc chọn người khác.`;
      }
    }
    return "";
  }, [selectedElderlyId, selectedDates, sessionRegistrations]);

  // ---- Handlers ----
  const handleSelectPackage = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    if (pkg.availableSlots === 0) return; // Hết chỗ
    setSelectedPackageId(pkgId);
  };

  const handleConfirmPackage = () => {
    if (!selectedPackageId) return;
    setCurrentStep(2);
  };

  const handleGoToStep3 = () => {
    if (!selectedElderlyId) return;
    if (selectedDates.length === 0) return;
    if (overlapError) return;
    // Reset step 3
    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (pkg?.endOfLifeRoomIncluded || pkg?.name.toLowerCase().includes("giai đoạn cuối")) {
      setRoomType("small");
    } else {
      setRoomType("large");
    }
    setCurrentStep(3);
  };

  const handleGoToStep4 = () => {
    setCurrentStep(4);
    setHoldActive(false);
    setPaymentStatus(null);
    setCountdown(900);
  };

  const handleHoldAndPay = () => {
    setHoldActive(true);
    setCountdown(900);
    setPaymentStatus("pending");
  };

  const handlePaymentResult = async (result: "success" | "failed") => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setHoldActive(false);
    if (result === "success") {
      if (selectedPackage && selectedElderly && pricing) {
        setIsSubmitting(true);
        try {
          const startIso =
            regType === "monthly"
              ? monthlyStartDate || fmt(getTomorrow())
              : selectedDates[0] || fmt(getTomorrow());
          const endIso =
            regType === "monthly" && monthlyStartDate
              ? fmt(getMonthEndDate(parseDateStr(monthlyStartDate)))
              : selectedDates[selectedDates.length - 1] || startIso;

          const req: CreateRegistrationRequest = {
            packageId: selectedPackage.id,
            elderlyId: selectedElderly.elderlyId,
            registrationType: regType,
            monthlyPattern: regType === "monthly" ? monthlyPattern : undefined,
            startDate: startIso,
            endDate: endIso,
            roomType: roomType,
            totalDays: totalDays,
            packagePrice: pricing.packagePrice,
            supportSurcharge: pricing.supportSurcharge,
            roomSurcharge: pricing.roomSurcharge,
            totalAmount: pricing.total,
            selectedDates: selectedDates,
            paymentMethod: "Chuyển khoản QR (VietQR / VNPay)",
          };

          const res = await billingApiService.registerPackage(req);
          if (res.success && res.data) {
            setRegistrationCode(res.data.registrationCode);
            setPaymentStatus("success");
            setSessionRegistrations((prev) => [
              ...prev,
              { elderlyId: selectedElderlyId, dates: selectedDates },
            ]);
            // Cập nhật số chỗ trống từ API
            const refreshPkg = await billingApiService.getActivePackages();
            if (refreshPkg.success && refreshPkg.data) {
              setPackages((prev) =>
                prev.map((p) => {
                  const updated = refreshPkg.data?.find((d) => d.packageId === p.id);
                  return updated ? { ...p, availableSlots: updated.availableSlots } : p;
                })
              );
            }
          } else {
            alert(res.message || "Đăng ký không thành công");
            setPaymentStatus("failed");
          }
        } catch (err: any) {
          console.error("Lỗi đăng ký dịch vụ:", err);
          alert(err?.response?.data?.message || "Có lỗi xảy ra khi lưu đăng ký gói vào hệ thống");
          setPaymentStatus("failed");
        } finally {
          setIsSubmitting(false);
        }
      }
    } else {
      setPaymentStatus("failed");
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setSelectedPackageId(null);
    setSelectedElderlyId(elderlyProfiles.length > 0 ? elderlyProfiles[0].elderlyId : "");
    setRegType("monthly");
    setMonthlyPattern("all");
    setMonthlyStartDate("");
    setDailySelectedDates([]);
    setRoomType("large");
    setHoldActive(false);
    setPaymentStatus(null);
    setCountdown(900);
    setRegistrationCode("");
  };

  const handleToggleDate = useCallback(
    (dateString: string) => {
      setDailySelectedDates((prev) =>
        prev.includes(dateString)
          ? prev.filter((d) => d !== dateString)
          : [...prev, dateString]
      );
    },
    []
  );


  // ---- RENDER ----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-base text-slate-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (elderlyProfiles.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md p-8 text-center">
        <p className="text-xl font-bold text-slate-800 mb-3">
          Chưa có hồ sơ người cao tuổi
        </p>
        <p className="text-base text-slate-600 mb-6">
          Vui lòng tạo hồ sơ người thân trước khi đăng ký gói dịch vụ.
        </p>
        {onBackToProfile && (
          <button
            onClick={onBackToProfile}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition"
          >
            Tạo Hồ Sơ Ngay
          </button>
        )}
      </div>
    );
  }

  // ===================================================================
  // STEP INDICATOR
  // ===================================================================
  const steps = [
    { num: 1, label: "Chọn gói dịch vụ" },
    { num: 2, label: "Hình thức đăng ký" },
    { num: 3, label: "Chọn phòng" },
    { num: 4, label: "Xác nhận & thanh toán" },
  ];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition ${
                currentStep === s.num
                  ? "bg-blue-600 text-white shadow-md"
                  : currentStep > s.num
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {currentStep > s.num ? "✓" : s.num}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                currentStep === s.num
                  ? "text-blue-700 font-semibold"
                  : currentStep > s.num
                    ? "text-green-600"
                    : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-1 ${
                currentStep > s.num ? "bg-green-400" : "bg-slate-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ===================================================================
  // STEP 1 — CHỌN GÓI DỊCH VỤ
  // ===================================================================
  const renderStep1 = () => {
    const pkg = selectedPackage;
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Bước 1: Chọn gói dịch vụ
        </h2>
        <p className="text-base text-slate-500 mb-6">
          Chọn một gói phù hợp với nhu cầu của cụ. Bấm vào thẻ để xem chi tiết.
        </p>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* BÊN TRÁI: Danh sách 5 gói */}
          <div className="lg:w-[380px] flex-shrink-0 space-y-3">
            {packages.map((p) => {
              const avail = p.availableSlots;
              const soldOut = avail === 0;
              const isSelected = selectedPackageId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => !soldOut && handleSelectPackage(p.id)}
                  disabled={soldOut}
                  className={`w-full text-left rounded-xl border-2 p-4 transition ${
                    soldOut
                      ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                      : isSelected
                        ? "bg-blue-50 border-blue-500 shadow-md"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-800">
                          {p.name}
                        </span>
                        {soldOut && (
                          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            Hết chỗ
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">
                        {p.target.split(",")[0]}
                      </p>
                      <div className="flex items-baseline gap-3 mt-2">
                        <span className="text-base font-bold text-blue-700">
                          từ {formatCurrency(p.pricePerDay)}/ngày
                        </span>
                        {!soldOut && (
                          <span className="text-xs text-green-600 font-medium">
                            Còn {avail} chỗ
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && !soldOut && (
                      <span className="text-blue-600 font-bold text-xl mt-1">▸</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* BÊN PHẢI: Chi tiết gói đang chọn */}
          <div className="flex-1 min-w-0">
            {!pkg ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-10 flex items-center justify-center min-h-[400px]">
                <p className="text-base text-slate-400 text-center">
                  Bấm vào một gói bên trái để xem chi tiết
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-1">Gói {pkg.name}</h3>
                  <p className="text-blue-100 text-base">{pkg.target}</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Điểm nổi bật */}
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-3">
                      Điểm nổi bật
                    </h4>
                    <ul className="space-y-2">
                      {pkg.highlights.map((h, i) => (
                        <li key={i} className="flex gap-2 text-base text-slate-700">
                          <span className="text-green-500 font-bold flex-shrink-0">✔</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Đã bao gồm */}
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-3">
                      Đã bao gồm trong giá
                    </h4>
                    <ul className="space-y-2">
                      {pkg.included.map((item, i) => (
                        <li key={i} className="flex gap-2 text-base text-slate-700">
                          <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bảng giá */}
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-3">
                      Bảng giá
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-base border border-slate-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left p-3 font-semibold text-slate-700 border-b">
                              Hình thức
                            </th>
                            <th className="text-right p-3 font-semibold text-slate-700 border-b">
                              Giá
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="p-3 text-slate-700">Theo ngày</td>
                            <td className="p-3 text-right font-semibold text-blue-700">
                              {formatCurrency(pkg.pricePerDay)}/ngày
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="p-3 text-slate-700">Theo tháng, 3 ngày/tuần</td>
                            <td className="p-3 text-right font-semibold text-blue-700">
                              {formatCurrency(pkg.priceMonth3Days)}/tháng
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 text-slate-700">Theo tháng, cả tuần</td>
                            <td className="p-3 text-right font-semibold text-blue-700">
                              {formatCurrency(pkg.priceMonthFullWeek)}/tháng
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Cấu thành giá tháng cả tuần */}
                    {(pkg.breakdownGroupCare > 0 ||
                      pkg.breakdownSpecialized > 0) && (
                      <div className="mt-3 bg-slate-50 rounded-lg p-4 text-sm">
                        <p className="font-semibold text-slate-700 mb-2">
                          Cấu thành giá tháng cả tuần:
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Giá nền</span>
                            <span className="font-medium">
                              {formatCurrency(pkg.breakdownBase)}
                            </span>
                          </div>
                          {pkg.breakdownGroupCare > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">
                                Chăm sóc nhóm nhỏ
                              </span>
                              <span className="font-medium">
                                {formatCurrency(pkg.breakdownGroupCare)}
                              </span>
                            </div>
                          )}
                          {pkg.breakdownSpecialized > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">
                                Chương trình riêng ({pkg.breakdownSpecializedLabel})
                              </span>
                              <span className="font-medium">
                                {formatCurrency(pkg.breakdownSpecialized)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-slate-300 pt-1 mt-1 font-bold">
                            <span>Tổng</span>
                            <span className="text-blue-700">
                              {formatCurrency(
                                pkg.breakdownBase +
                                  pkg.breakdownGroupCare +
                                  pkg.breakdownSpecialized
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {pkg.pricingNote && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mt-3">
                        {pkg.pricingNote}
                      </p>
                    )}
                  </div>


                  {/* Nút hành động */}
                  <div className="pt-2">
                    <button
                      onClick={handleConfirmPackage}
                      className="w-full py-3.5 px-4 bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
                    >
                      Chọn gói này →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===================================================================
  // STEP 2 — HÌNH THỨC ĐĂNG KÝ
  // ===================================================================
  const renderStep2 = () => {
    const tomorrow = getTomorrow();
    const tomorrowStr = dateStr(tomorrow);

    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Bước 2: Chọn hình thức đăng ký
        </h2>
        <p className="text-base text-slate-500 mb-6">
          Gói đã chọn:{" "}
          <strong className="text-blue-700">{selectedPackage?.name}</strong>
        </p>

        {/* Chọn cụ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Đăng ký cho:
          </label>
          <select
            value={selectedElderlyId}
            onChange={(e) => setSelectedElderlyId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-800 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            {elderlyProfiles.map((el) => (
              <option key={el.elderlyId} value={el.elderlyId}>
                {el.fullName}{" "}
                {el.mobilityStatus === "Cần hỗ trợ"
                  ? "(Cần hỗ trợ di chuyển)"
                  : "(Tự lập)"}
              </option>
            ))}
          </select>
          {selectedElderly &&
            selectedPackage?.id === "basic" &&
            selectedElderly.mobilityStatus === "Cần hỗ trợ" && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mt-3">
                Lưu ý: Gói Cơ bản sẽ có phụ phí hỗ trợ tăng cường cho người cần
                hỗ trợ di chuyển.
              </p>
            )}
        </div>

        {/* Toggle Theo ngày / Theo tháng */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
          <label className="block text-base font-semibold text-slate-700 mb-3">
            Hình thức:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setRegType("monthly")}
              className={`flex-1 py-3 rounded-xl text-base font-semibold transition ${
                regType === "monthly"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Theo tháng
            </button>
            <button
              onClick={() => setRegType("daily")}
              className={`flex-1 py-3 rounded-xl text-base font-semibold transition ${
                regType === "daily"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Theo ngày
            </button>
          </div>
        </div>

        {/* THEO THÁNG */}
        {regType === "monthly" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm space-y-5">
            {/* Chọn lịch đến */}
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-3">
                Cụ đến những ngày nào trong tuần?
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "all", label: "Cả tuần (Thứ 2 – Thứ 7)" },
                  { value: "mwf", label: "Thứ 2 – 4 – 6" },
                  { value: "tts", label: "Thứ 3 – 5 – 7" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMonthlyPattern(opt.value)}
                    className={`px-4 py-3 rounded-xl text-base font-medium transition border-2 ${
                      monthlyPattern === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn ngày bắt đầu */}
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">
                Ngày bắt đầu:
              </label>
              <input
                type="date"
                value={monthlyStartDate}
                min={tomorrowStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const d = parseDateStr(val);
                    if (isSunday(d)) {
                      alert("Chủ nhật trung tâm nghỉ, vui lòng chọn ngày khác.");
                      return;
                    }
                  }
                  setMonthlyStartDate(val);
                }}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              />
              {monthlyStartDate && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4 text-base">
                  <p className="text-green-800">
                    <strong>Từ:</strong>{" "}
                    {formatDateVN(parseDateStr(monthlyStartDate))}{" "}
                    <strong>đến:</strong> {monthlyEndDate}
                  </p>
                  <p className="text-green-700 mt-1">
                    Tổng <strong>{totalDays} ngày</strong> đến trung tâm
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* THEO NGÀY */}
        {regType === "daily" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
            <label className="block text-base font-semibold text-slate-700 mb-3">
              Chọn từng ngày (bấm vào ngày trên lịch):
            </label>

            {/* Calendar navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  setCalendarMonth((prev) => {
                    let m = prev.month - 1;
                    let y = prev.year;
                    if (m < 0) {
                      m = 11;
                      y--;
                    }
                    return { year: y, month: m };
                  });
                }}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
              >
                ‹
              </button>
              <span className="text-lg font-bold text-slate-800">
                Tháng {calendarMonth.month + 1}/{calendarMonth.year}
              </span>
              <button
                onClick={() => {
                  setCalendarMonth((prev) => {
                    let m = prev.month + 1;
                    let y = prev.year;
                    if (m > 11) {
                      m = 0;
                      y++;
                    }
                    return { year: y, month: m };
                  });
                }}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
              >
                ›
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div
                  key={d}
                  className={`text-center text-sm font-bold py-2 ${
                    d === "CN" ? "text-red-400" : "text-slate-500"
                  }`}
                >
                  {d}
                </div>
              ))}
              {(() => {
                const { year, month } = calendarMonth;
                const firstDay = new Date(year, month, 1);
                let startDow = firstDay.getDay(); // 0=Sun
                startDow = startDow === 0 ? 6 : startDow - 1; // Convert to 0=Mon
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const cells: React.ReactNode[] = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Blank cells before first day
                for (let i = 0; i < startDow; i++) {
                  cells.push(<div key={`blank-${i}`} />);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const d = new Date(year, month, day);
                  const ds = dateStr(d);
                  const isSun = isSunday(d);
                  const isPast = d <= today;
                  const isSelected = dailySelectedDates.includes(ds);
                  const disabled = isSun || isPast;

                  cells.push(
                    <button
                      key={day}
                      onClick={() => !disabled && handleToggleDate(ds)}
                      disabled={disabled}
                      className={`aspect-square rounded-lg text-base font-medium transition flex items-center justify-center ${
                        disabled
                          ? "text-slate-300 cursor-not-allowed"
                          : isSelected
                            ? "bg-blue-600 text-white font-bold shadow-sm"
                            : "text-slate-700 hover:bg-blue-100 cursor-pointer"
                      }`}
                      title={
                        isSun
                          ? "Chủ nhật trung tâm nghỉ"
                          : isPast
                            ? "Không chọn được ngày đã qua"
                            : ""
                      }
                    >
                      {day}
                    </button>
                  );
                }
                return cells;
              })()}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-base">
              <p className="text-blue-800">
                Đã chọn <strong>{dailySelectedDates.length} ngày</strong>
              </p>
              {dailySelectedDates.length >= 20 && (
                <p className="text-amber-700 mt-2 bg-amber-50 rounded-lg p-3 text-sm font-medium">
                  Gợi ý: Đăng ký theo tháng sẽ tiết kiệm hơn so với chọn từng ngày.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Overlap error */}
        {overlapError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-base text-red-700">
            {overlapError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition"
          >
            ← Quay lại
          </button>
          <button
            onClick={handleGoToStep3}
            disabled={
              selectedDates.length === 0 || !selectedElderlyId || !!overlapError
            }
            className={`flex-1 py-3 rounded-xl text-base font-semibold transition ${
              selectedDates.length > 0 && selectedElderlyId && !overlapError
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Tiếp tục →
          </button>
        </div>
      </div>
    );
  };

  // ===================================================================
  // STEP 3 — CHỌN PHÒNG
  // ===================================================================
  const renderStep3 = () => {
    if (!selectedPackageId) return null;
    const pkg = selectedPackage!;
    const isEndOfLife = pkg.endOfLifeRoomIncluded;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            Bước 3: Chọn loại phòng nghỉ trưa
          </h2>
          <p className="text-base text-slate-500">
            Gói: <strong className="text-blue-700">{pkg.name}</strong> ·{" "}
            {regType === "monthly"
              ? `Theo tháng (${monthlyPattern === "all" ? "cả tuần" : monthlyPattern === "mwf" ? "T2-4-6" : "T3-5-7"})`
              : `Theo ngày (${totalDays} ngày)`}
          </p>
        </div>

        {/* Lựa chọn loại phòng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Lựa chọn không gian phòng nghỉ
              </h3>
              <p className="text-xs text-slate-500">
                Chọn không gian nghỉ trưa và sinh hoạt ban ngày phù hợp với người cao tuổi
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {roomType === "large" ? "Đang chọn: Tiêu chuẩn (4–6 người)" : "Đang chọn: VIP (1–2 người)"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Thẻ Phòng 4-6 người */}
            <div
              onClick={() => {
                if (!isEndOfLife) {
                  setRoomType("large");
                }
              }}
              className={`p-5 rounded-2xl border-2 text-left transition relative flex flex-col justify-between ${
                isEndOfLife
                  ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                  : roomType === "large"
                  ? "border-blue-600 bg-blue-50/50 shadow-sm cursor-pointer ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50 cursor-pointer"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-base font-bold text-slate-900">
                    Phòng Tiêu Chuẩn (4–6 người)
                  </span>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                    Đã gồm trong gói
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Không gian mở, thoáng mát, giường nệm y tế êm ái, chuông gọi điều dưỡng khẩn cấp, khu vệ sinh khép kín chống trượt.
                </p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✔</span>
                    <span>Phù hợp người cao tuổi thích giao lưu bạn bè</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✔</span>
                    <span>Điều hòa 2 chiều và lọc không khí</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Chi phí phát sinh:</span>
                <span className="font-bold text-green-700">0 đ (Miễn phí)</span>
              </div>
            </div>

            {/* Thẻ Phòng 1-2 người */}
            <div
              onClick={() => {
                setRoomType("small");
              }}
              className={`p-5 rounded-2xl border-2 text-left transition relative flex flex-col justify-between cursor-pointer ${
                roomType === "small"
                  ? "border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-base font-bold text-slate-900">
                    Phòng VIP / Riêng Biệt (1–2 người)
                  </span>
                  {isEndOfLife ? (
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                      Đã bao gồm trọn gói
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Phụ phí VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Không gian riêng biệt yên tĩnh tuyệt đối, TV riêng, giường điều dưỡng đa năng nâng hạ tự động, chế độ chăm sóc cá nhân hóa cao.
                </p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✔</span>
                    <span>Nghỉ ngơi yên tĩnh, phục hồi chuyên sâu</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✔</span>
                    <span>Y tá và điều dưỡng hỗ trợ sát sao 1-1</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Chi phí phát sinh:</span>
                {isEndOfLife ? (
                  <span className="font-bold text-green-700">Đã bao gồm trong giá gói</span>
                ) : (
                  <span className="font-bold text-amber-700">
                    {regType === "daily"
                      ? "+60.000 đ/ngày"
                      : monthlyPattern === "all"
                      ? "+1.200.000 đ/tháng"
                      : "+660.000 đ/tháng"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setCurrentStep(2)}
            className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            ← Quay lại
          </button>
          <button
            onClick={handleGoToStep4}
            className="flex-1 py-3 rounded-xl text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
          >
            Tiếp tục sang bước Xác nhận & Thanh toán →
          </button>
        </div>
      </div>
    );
  };

  // ===================================================================
  // STEP 4 — XÁC NHẬN & THANH TOÁN
  // ===================================================================
  const renderStep4 = () => {
    if (!selectedPackage || !selectedElderly || !pricing) return null;


    const formatCountdown = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    // Success screen
    if (paymentStatus === "success") {
      return (
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl border border-green-200 shadow-lg p-8">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Đăng ký thành công!
            </h2>
            <p className="text-base text-slate-600 mb-6">
              Chỗ đã được xác nhận cho {selectedElderly.fullName}.
            </p>
            <div className="bg-green-50 rounded-xl p-5 mb-6 text-left">
              <p className="text-sm text-slate-500 mb-1">Mã đăng ký</p>
              <p className="text-2xl font-bold text-green-800 font-mono tracking-wider">
                {registrationCode}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-left text-base space-y-1 mb-6">
              <p>
                <strong>Người:</strong> {selectedElderly.fullName}
              </p>
              <p>
                <strong>Gói:</strong> {selectedPackage.name}
              </p>
              <p>
                <strong>Hình thức:</strong>{" "}
                {regType === "monthly"
                  ? `Theo tháng (${monthlyPattern === "all" ? "cả tuần" : monthlyPattern === "mwf" ? "T2-4-6" : "T3-5-7"})`
                  : `Theo ngày (${totalDays} ngày)`}
              </p>
              <p>
                <strong>Loại phòng:</strong>{" "}
                {roomType === "large" ? "Phòng 4–6 người (Tiêu chuẩn)" : "Phòng 1–2 người (VIP)"}
              </p>
              <p>
                <strong>Tổng tiền:</strong>{" "}
                <span className="text-blue-700 font-bold">
                  {formatCurrency(pricing.total)}
                </span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {onNavigateToBilling && (
                <button
                  onClick={onNavigateToBilling}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
                >
                  Xem Hóa Đơn & Chi Phí →
                </button>
              )}
              <button
                onClick={handleStartOver}
                className="flex-1 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-base font-semibold transition cursor-pointer"
              >
                Đăng ký thêm
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Failed screen
    if (paymentStatus === "failed") {
      return (
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl border border-red-200 shadow-lg p-8">
            <div className="text-6xl mb-4">✕</div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">
              Thanh toán thất bại
            </h2>
            <p className="text-base text-slate-600 mb-6">
              Giao dịch không thành công. Chỗ giữ đã được hủy.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPaymentStatus(null);
                  setHoldActive(false);
                  setCountdown(900);
                }}
                className="flex-1 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition"
              >
                Thử lại
              </button>
              <button
                onClick={handleStartOver}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition"
              >
                Về trang chọn gói
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Expired screen
    if (paymentStatus === "expired") {
      return (
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl border border-amber-200 shadow-lg p-8">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-amber-700 mb-2">
              Hết thời gian giữ chỗ
            </h2>
            <p className="text-base text-slate-600 mb-6">
              Thời gian giữ chỗ 15 phút đã hết. Chỗ đã được trả lại. Vui lòng thử
              lại.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPaymentStatus(null);
                  setHoldActive(false);
                  setCountdown(900);
                }}
                className="flex-1 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition"
              >
                Giữ chỗ lại
              </button>
              <button
                onClick={handleStartOver}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition"
              >
                Về trang chọn gói
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Payment pending screen
    if (paymentStatus === "pending") {
      return (
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Thanh toán
            </h2>
            <div
              className={`text-4xl font-bold font-mono mb-4 ${
                countdown <= 60 ? "text-red-600" : "text-blue-700"
              }`}
            >
              {formatCountdown(countdown)}
            </div>
            <p className="text-base text-slate-500 mb-6">
              Chỗ đang được giữ. Vui lòng hoàn tất thanh toán.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 text-left text-lg font-bold text-slate-800 mb-6">
              Số tiền: {formatCurrency(pricing.total)}
            </div>

            <p className="text-sm text-slate-400 mb-4">
              (Đây là thanh toán giả để thử nghiệm)
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handlePaymentResult("success")}
                disabled={isSubmitting}
                className={`w-full py-3 bg-green-600 text-white rounded-xl text-base font-semibold transition flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-green-700 cursor-pointer shadow-sm"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu đăng ký vào hệ thống...</span>
                  </>
                ) : (
                  <span>Mô phỏng: Thanh toán thành công</span>
                )}
              </button>
              <button
                onClick={() => handlePaymentResult("failed")}
                className="w-full py-3 bg-red-500 text-white rounded-xl text-base font-semibold hover:bg-red-600 transition"
              >
                Mô phỏng: Thanh toán thất bại
              </button>
              <button
                onClick={() => {
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  setHoldActive(false);
                  setCountdown(0);
                  setPaymentStatus("expired");
                }}
                className="w-full py-3 bg-amber-500 text-white rounded-xl text-base font-semibold hover:bg-amber-600 transition"
              >
                Mô phỏng: Hết thời gian giữ chỗ
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default — Summary + Confirm
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Bước 4: Xác nhận và thanh toán
        </h2>
        <p className="text-base text-slate-500 mb-6">
          Kiểm tra lại thông tin trước khi xác nhận.
        </p>

        {/* Tóm tắt */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Tóm tắt đăng ký
          </h3>
          <div className="space-y-3 text-base">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Người đăng ký</span>
              <span className="font-semibold text-slate-800">
                {selectedElderly.fullName}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Tình trạng vận động</span>
              <span className="font-semibold text-slate-800">
                {selectedElderly.mobilityStatus}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Gói dịch vụ</span>
              <span className="font-semibold text-blue-700">
                {selectedPackage.name}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Hình thức</span>
              <span className="font-semibold text-slate-800">
                {regType === "monthly"
                  ? `Theo tháng (${monthlyPattern === "all" ? "Cả tuần" : monthlyPattern === "mwf" ? "T2-4-6" : "T3-5-7"})`
                  : "Theo ngày"}
              </span>
            </div>
            {regType === "monthly" && monthlyStartDate && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Khoảng ngày</span>
                <span className="font-semibold text-slate-800">
                  {formatDateVN(parseDateStr(monthlyStartDate))} –{" "}
                  {monthlyEndDate}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Số ngày</span>
              <span className="font-semibold text-slate-800">
                {totalDays} ngày
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Loại phòng</span>
              <span className="font-semibold text-slate-800">
                {roomType === "large" ? "Phòng 4–6 người (Tiêu chuẩn)" : "Phòng 1–2 người (VIP)"}
              </span>
            </div>
          </div>
        </div>

        {/* Bảng giá */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Chi tiết thanh toán
          </h3>
          <div className="space-y-3 text-base">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <div>
                <span className="text-slate-700">Giá gói {selectedPackage.name}</span>
                <p className="text-sm text-slate-500">
                  {pricing.packagePriceLabel}
                </p>
              </div>
              <span className="font-semibold text-slate-800">
                {formatCurrency(pricing.packagePrice)}
              </span>
            </div>
            {pricing.supportSurcharge > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="text-slate-700">
                    Phụ phí hỗ trợ tăng cường
                  </span>
                  <p className="text-sm text-slate-500">
                    {pricing.supportLabel}
                  </p>
                </div>
                <span className="font-semibold text-amber-700">
                  + {formatCurrency(pricing.supportSurcharge)}
                </span>
              </div>
            )}
            {pricing.roomSurcharge > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="text-slate-700">
                    Phụ phí phòng 1–2 người
                  </span>
                  <p className="text-sm text-slate-500">{pricing.roomLabel}</p>
                </div>
                <span className="font-semibold text-amber-700">
                  + {formatCurrency(pricing.roomSurcharge)}
                </span>
              </div>
            )}
            {roomType === "small" && selectedPackage.endOfLifeRoomIncluded && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-700">
                  Phòng 1–2 người (đã gồm trong giá gói)
                </span>
                <span className="font-semibold text-green-600">Đã gồm</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-slate-300 mt-2">
              <span className="text-lg font-bold text-slate-800">
                TỔNG CỘNG
              </span>
              <span className="text-xl font-bold text-blue-700">
                {formatCurrency(pricing.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCurrentStep(3)}
            className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition"
          >
            ← Quay lại
          </button>
          <button
            onClick={handleHoldAndPay}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-blue-700 transition shadow-md"
          >
            Giữ chỗ và thanh toán
          </button>
        </div>
      </div>
    );
  };

  // ===================================================================
  // RENDER CHÍNH
  // ===================================================================
  return (
    <div className="min-h-[600px]">
      {/* Nút quay lại hồ sơ */}
      {onBackToProfile && currentStep === 1 && (
        <button
          onClick={onBackToProfile}
          className="mb-4 text-sm text-blue-600 font-medium hover:underline"
        >
          ← Quay lại Hồ sơ người thân
        </button>
      )}

      {renderStepIndicator()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
};

export default ServicePackagesView;
