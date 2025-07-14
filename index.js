const express = require("express");
const cors = require("cors");
const path = require("path");

const { createClient } = require("@supabase/supabase-js"); // 🟡 Supabase Admin용

const app = express();
app.set("trust proxy", true);

const 차단된IP목록 = ["117.3.0.137", "1.245.24.156",];
app.use((req, res, next) => {
    const clientIP = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();

    if (차단된IP목록.includes(clientIP)) {
        return res.status(403).send("🚫 접속이 차단된 IP입니다.");
    }

    next();
});

app.use(cors());
app.use(express.json());

// 🟡 gagl.html 요청 시 해당 파일 반환
app.get("/gagl.html", (req, res) => {
    res.sendFile(path.join(__dirname, "gagl.html"));
});

// ✅ Supabase Admin client 설정 (회원탈퇴용, 절대 클라이언트에 노출금지)
const supabaseAdmin = createClient(
    "https://piafesfywtvpachbfoxr.supabase.co", // 프로젝트 URL
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWZlc2Z5d3R2cGFjaGJmb3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDc4NDAxOCwiZXhwIjoyMDYwMzYwMDE4fQ.inGkUGNirltn3arVtb3rPvLpzoxK28OCDOx04rAH0EE"           // 서비스 롤 키
);



app.post("/get-user", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const clientIP = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();
    await 로그기록(유저.유저아이디, `접속 IP: ${clientIP}`);

    const now = new Date(); // ✅ 추가
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        weekday: "short",
        timeZone: "Asia/Seoul"
    });
    const parts = formatter.formatToParts(now);
    const 오늘요일 = parts.find(p => p.type === "weekday")?.value;

    const { data: 대표유저, error: 대표에러 } = await supabaseAdmin
        .from("users")
        .select("보스정산요일")
        .eq("유저아이디", "나주인장아니다")
        .single();

    if (!대표에러 && 대표유저 && 대표유저.보스정산요일 !== 오늘요일) {
        const { data: 전체합, error: 합계에러 } = await supabaseAdmin
            .from("users")
            .select("보스누적데미지");

        if (!합계에러 && 전체합) {
            const 누적데미지총합 = 전체합
                .filter(u => u.보스누적데미지 > 0)
                .reduce((합, u) => 합 + Number(u.보스누적데미지), 0);

            if (누적데미지총합 !== 0) {
                const { data: 상위유저들, error: 순위에러 } = await supabaseAdmin
                    .from("users")
                    .select("유저UID")
                    .gt("보스누적데미지", 0)
                    .order("보스누적데미지", { ascending: false })
                    .limit(9);

                const 보상목록 = [
                    { 이름: "루시퍼의 심장", 수량: 2 },
                    { 이름: "루시퍼의 심장", 수량: 1 },
                    { 이름: "사탄의 날개", 수량: 2 },
                    { 이름: "사탄의 날개", 수량: 1 },
                    { 이름: "벨제부브의 꼬리", 수량: 2 },
                    { 이름: "벨제부브의 꼬리", 수량: 1 },
                    { 이름: "레비아탄의 비늘", 수량: 2 },
                    { 이름: "레비아탄의 비늘", 수량: 1 },
                    { 이름: "디아블로의 뿔", 수량: 2 }
                ];

                const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
                const 날짜 = kstNow.toISOString().slice(0, 16).replace("T", " ");

                for (let i = 0; i < 상위유저들.length; i++) {
                    const user = 상위유저들[i];
                    const 보상 = 보상목록[i];

                    const { data: 현재유저, error: fetchErr } = await supabaseAdmin
                        .from("users")
                        .select("우편함, 유저아이디")
                        .eq("유저UID", user.유저UID)
                        .single();

                    if (fetchErr || !현재유저) continue;

                    const 새우편 = {
                        이름: 보상.이름,
                        수량: 보상.수량,
                        날짜,
                        메모: `보스 랭킹 ${i + 1}위 보상`
                    };

                    const newMail = [...(현재유저.우편함 || []), 새우편];

                    await supabaseAdmin
                        .from("users")
                        .update({ 우편함: newMail })
                        .eq("유저UID", user.유저UID);
                }

                // 2. 펫단계 계산
                let 펫단계 = 0;
                if (누적데미지총합 >= 99_999_999) 펫단계 = 3;
                else if (누적데미지총합 >= 9_999_999) 펫단계 = 2;
                else if (누적데미지총합 >= 999_999) 펫단계 = 1;

                await supabaseAdmin
                    .from("users")
                    .update({ 펫단계 })
                    .neq("펫단계", 펫단계);

                // 3. 보스누적데미지 초기화
                await supabaseAdmin
                    .from("users")
                    .update({ 보스누적데미지: 0 })
                    .neq("보스누적데미지", 0);

                // 4. 보스넘버 증가
                const { data: 대표보스유저 } = await supabaseAdmin
                    .from("users")
                    .select("보스넘버")
                    .eq("유저아이디", "나주인장아니다")
                    .single();

                const 현재보스번호 = 대표보스유저?.보스넘버 ?? 0;
                const 다음보스번호 = (현재보스번호 + 1) % 10;

                await supabaseAdmin
                    .from("users")
                    .update({ 보스넘버: 다음보스번호 })
                    .neq("보스넘버", 다음보스번호);

            }



        }
        await supabaseAdmin
            .from("users")
            .update({ 보스정산요일: 오늘요일 })
            .or(`보스정산요일.is.null,보스정산요일.neq.${오늘요일}`);

    }


    // const now = new Date();
    // const formatter = new Intl.DateTimeFormat("ko-KR", {
    //     weekday: "short",
    //     timeZone: "Asia/Seoul"
    // });
    // const parts = formatter.formatToParts(now);
    // const 오늘요일 = parts.find(p => p.type === "weekday")?.value;

    // if (요일 === "일") {
    //     const { data: 전체합, error: 합계에러 } = await supabaseAdmin
    //         .from("users")
    //         .select("보스누적데미지");

    //     if (합계에러 || !전체합) {
    //         return res.status(500).json({ 오류: "펫단계 계산 실패 (총합 조회 에러)" });
    //     }

    //     const 누적데미지총합 = 전체합
    //         .filter(u => u.보스누적데미지 > 0)
    //         .reduce((합, u) => 합 + Number(u.보스누적데미지), 0);

    //     if (누적데미지총합 != 0) {
    //         const { data: 상위유저들, error: 순위에러 } = await supabaseAdmin
    //             .from("users")
    //             .select("유저UID, 골드")
    //             .gt("보스누적데미지", 0)               // 보스누적데미지가 0초과인 유저만
    //             .order("보스누적데미지", { ascending: false })
    //             .limit(9);

    //         if (!순위에러) {
    //             const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    //             const 날짜 = kstNow.toISOString().slice(0, 16).replace("T", " ");


    //             const 보상목록 = [
    //                 { 이름: "루시퍼의 심장", 수량: 2 },
    //                 { 이름: "루시퍼의 심장", 수량: 1 },
    //                 { 이름: "사탄의 날개", 수량: 2 },
    //                 { 이름: "사탄의 날개", 수량: 1 },
    //                 { 이름: "벨제부브의 꼬리", 수량: 2 },
    //                 { 이름: "벨제부브의 꼬리", 수량: 1 },
    //                 { 이름: "레비아탄의 비늘", 수량: 2 },
    //                 { 이름: "레비아탄의 비늘", 수량: 1 },
    //                 { 이름: "디아블로의 뿔", 수량: 2 },
    //             ];



    //             for (let i = 0; i < 상위유저들.length; i++) {

    //                 const user = 상위유저들[i];
    //                 const 보상 = 보상목록[i];


    //                 const { data: 현재유저, error: fetchErr } = await supabaseAdmin
    //                     .from("users")
    //                     .select("우편함, 유저아이디")
    //                     .eq("유저UID", user.유저UID)
    //                     .single();

    //                 if (fetchErr || !현재유저) {
    //                     console.error(`우편함 조회 실패 (${user.유저UID}):`, fetchErr);
    //                     continue;
    //                 }
    //                 const oldMail = 현재유저.우편함 || [];

    //                 const 새우편 = {
    //                     이름: 보상.이름,
    //                     수량: 보상.수량,
    //                     날짜,
    //                     메모: `보스 랭킹 ${i + 1}위 보상`
    //                 };

    //                 const newMail = [...oldMail, 새우편];

    //                 const { error: updateErr } = await supabaseAdmin
    //                     .from("users")
    //                     .update({ 우편함: newMail })
    //                     .eq("유저UID", user.유저UID);

    //                 if (updateErr) {
    //                     console.error(`우편 지급 실패 (${user.유저UID}):`, updateErr);
    //                     await 로그기록(현재유저.유저아이디, `❌ 티켓 ${지급티켓}장 우편 지급 실패`);
    //                 } else {
    //                     await 로그기록(현재유저.유저아이디, `티켓 ${지급티켓}장 우편 지급`);
    //                 }
    //             }
    //         }

    //         let 펫단계 = 0;
    //         if (누적데미지총합 >= 99_999_999) {
    //             펫단계 = 3;
    //         } else if (누적데미지총합 >= 9_999_999) {
    //             펫단계 = 2;
    //         } else if (누적데미지총합 >= 999_999) {
    //             펫단계 = 1;
    //         }

    //         await supabaseAdmin
    //             .from("users")
    //             .update({ 펫단계 })
    //             .neq("펫단계", 펫단계);

    //         await supabaseAdmin
    //             .from("users")
    //             .update({ 보스누적데미지: 0 })
    //             .neq("보스누적데미지", 0); // 0이 아닌 유저만 업데이트 (불필요한 쓰기 방지)


    //         const { data: 대표유저, error: 보스에러 } = await supabaseAdmin
    //             .from("users")
    //             .select("보스넘버")
    //             .not("보스넘버", "is", null)
    //             .eq("유저아이디", "나주인장아니다")
    //             .single();

    //         if (!대표유저 || 보스에러) {
    //             return res.status(500).json({ 오류: "보스넘버 조회 실패" });
    //         }


    //         //보스추가
    //         const 현재보스번호 = 대표유저.보스넘버 ?? 0;
    //         const 다음보스번호 = (현재보스번호 + 1) % 10;

    //         await supabaseAdmin
    //             .from("users")
    //             .update({ 보스넘버: 다음보스번호 })
    //             .neq("보스넘버", 다음보스번호);

    //     }

    // }


    // const { data: 전체유저, error: 유저에러 } = await supabaseAdmin
    //     .from("users")
    //     .select("유저UID, 장비목록");

    // if (!유저에러 && 전체유저) {
    //     for (const 유저 of 전체유저) {
    //         let 변경 = false;
    //         const 장비목록 = 유저.장비목록 || [];

    //         for (const 장비 of 장비목록) {
    //             if (장비.이름 === "루시퍼의 심장" && 장비.등급 === "타락") {
    //                 const 기존강화 = 장비.강화 || 0;
    //                 장비.공격력 = 1200;
    //                 장비.수량 = (장비.수량 || 0) + 기존강화;
    //                 장비.강화 = 0;
    //                 변경 = true;
    //             }
    //         }

    //         if (변경) {
    //             const 장비공격력 = Math.max(...장비목록.map(e => e.공격력 || 0));
    //             const 최종공격력 = 최종공격력계산({
    //                 ...유저,
    //                 장비공격력
    //             });

    //             await supabaseAdmin
    //                 .from("users")
    //                 .update({
    //                     장비목록,
    //                     장비공격력,
    //                     최종공격력
    //                 })
    //                 .eq("유저UID", 유저.유저UID);
    //         }
    //     }
    // }


    // const { data: 싱글유저, error: 유저에러 } = await supabaseAdmin
    //     .from("users")
    //     .select("유저UID, 장비목록")
    //     .eq("유저아이디", "테스트아이디")
    //     .single(); // ⬅️ 한 명만 조회

    // if (!유저에러 && 싱글유저) {
    //     const 장비목록 = 유저.장비목록 || [];
    //     let 변경 = false;

    //     for (const 장비 of 장비목록) {
    //         if (장비.이름 === "루시퍼의 심장" && 장비.등급 === "타락") {
    //             const 기존강화 = 장비.강화 || 0;
    //             장비.공격력 = 1200;
    //             장비.수량 = (장비.수량 || 0) + 기존강화;
    //             장비.강화 = 0;
    //             변경 = true;
    //         }
    //     }

    //     if (변경) {
    //         const 장비공격력 = Math.max(...장비목록.map(e => e.공격력 || 0));
    //         const 최종공격력 = 최종공격력계산({
    //             ...유저,
    //             장비공격력
    //         });

    //         await supabaseAdmin
    //             .from("users")
    //             .update({
    //                 장비목록,
    //                 장비공격력,
    //                 최종공격력
    //             })
    //             .eq("유저UID", 유저.유저UID);
    //     }
    // }


    if ((유저.현질 ?? 0) >= 1) {
        const now = new Date();
        const kstNow = new Date(
            now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
        );
        const today = kstNow.toISOString().slice(0, 10);

        if (유저.현질기한체크 !== today) {
            // 1) 현질기한 1 증가
            let new현질기한 = (유저.현질기한 ?? 0) + 1;
            const updates = { 현질기한체크: today };

            await 로그기록(유저.유저아이디, `현질기한 +1됨`);

            // 2) 31일 도달 시 초기화
            if (new현질기한 >= 31) {
                const new현질 = (유저.현질 ?? 1) - 1;

                const next현질기한 = new현질 >= 1 ? 1 : 0;
                const next현질기한체크 = new현질 >= 1 ? today : null;
                const next팔레트 = new현질 >= 1 ? (유저.마법의팔레트 ?? null) : null;

                updates.현질 = new현질;
                updates.현질기한 = next현질기한;
                updates.현질기한체크 = next현질기한체크;
                updates.마법의팔레트 = next팔레트;

                // 메모리 반영
                유저.현질 = new현질;
                유저.현질기한 = next현질기한;
                유저.현질기한체크 = next현질기한체크;
                유저.마법의팔레트 = next팔레트;
            } else {
                // 3) 일반적인 날짜 증가만
                updates.현질기한 = new현질기한;
                유저.현질기한 = new현질기한;
            }

            // 4) DB 업데이트
            const { error: incErr } = await supabaseAdmin
                .from("users")
                .update(updates)
                .eq("유저UID", 유저UID);
        }

    }


    if ((유저.햄버거현질 ?? 0) >= 1) {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const today = kstNow.toISOString().slice(0, 10);
        const 날짜 = kstNow.toISOString().slice(0, 16).replace("T", " "); // YYYY-MM-DD HH:mm

        if (유저.햄버거현질기한체크 !== today) {
            let new햄버거현질기한 = (유저.햄버거현질기한 ?? 0) + 1;
            const updates = { 햄버거현질기한체크: today };

            await 로그기록(유저.유저아이디, `햄버거현질기한 +1됨`);

            const oldMails = 유저.우편함 ?? [];

            const 햄버거우편 = {
                이름: "햄버거",
                수량: 1,
                날짜,
                메모: `햄버거 정기배송 ${new햄버거현질기한}일째`
            };


            if (new햄버거현질기한 >= 31) {
                const new햄버거현질 = (유저.햄버거현질 ?? 1) - 1;
                const next기한 = new햄버거현질 >= 1 ? 1 : 0;
                const next체크 = new햄버거현질 >= 1 ? today : null;

                updates.햄버거현질 = new햄버거현질;
                updates.햄버거현질기한 = next기한;
                updates.햄버거현질기한체크 = next체크;

                유저.햄버거현질 = new햄버거현질;
                유저.햄버거현질기한 = next기한;
                유저.햄버거현질기한체크 = next체크;

                if (new햄버거현질 >= 1) {
                    const newMails = [...oldMails, 햄버거우편];
                    updates.우편함 = newMails;
                    유저.우편함 = newMails;

                    await 로그기록(유저.유저아이디, ` ${new햄버거현질기한}일차 햄버거지급완료`);
                }

            } else {
                updates.햄버거현질기한 = new햄버거현질기한;
                유저.햄버거현질기한 = new햄버거현질기한;

                const newMails = [...oldMails, 햄버거우편];
                updates.우편함 = newMails;
                유저.우편함 = newMails;

                await 로그기록(유저.유저아이디, ` ${new햄버거현질기한}일차 햄버거지급완료`);
            }

            const { error: incErr } = await supabaseAdmin
                .from("users")
                .update(updates)
                .eq("유저UID", 유저UID);

            if (incErr) {
                console.error("햄버거현질기한 증가/초기화 실패:", incErr);
            }
        }
    }



    const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const 오늘날짜 = kstNow.toISOString().slice(0, 10); // ⬅️ 한국 날짜 (YYYY-MM-DD)

    const 마지막지급날짜 = 유저.하루한번
        ? new Date(new Date(유저.하루한번).toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
            .toISOString()
            .slice(0, 10)
        : null;

    if (마지막지급날짜 !== 오늘날짜) {
        const 새로운유물목록 = { ...유저.유물목록 };
        새로운유물목록["스피커"] = 9;
        새로운유물목록["데빌마스크"] = 3;
        // const 현재열쇠 = 새로운유물목록["열쇠"] || 0;
        // if (현재열쇠 < 9) {
        //     새로운유물목록["열쇠"] = 현재열쇠 + 1;
        // }


        const { error: 하루업데이트에러 } = await supabaseAdmin
            .from("users")
            .update({
                유물목록: 새로운유물목록,
                하루한번: kstNow.toISOString()
            })
            .eq("유저UID", 유저UID);

        if (!하루업데이트에러) {
            유저.유물목록 = 새로운유물목록;
            유저.하루한번 = kstNow.toISOString();
        }
    }


    let 새로고침하자 = false;

    // ✅ 스태미너 회복 처리 (시간 기반)
    const 현재정각시간 = Math.floor(Date.now() / 1000 / 3600); // 시간 단위 기준 (정수)
    const 저장된정각시간 = 유저.스태미너갱신시간 ?? 현재정각시간;
    const 최대스태미너 = 유저.최대스태미너 ?? 2000;
    const 이전스태미너 = 유저.현재스태미너 ?? 2000;
    const 경과시간 = 현재정각시간 - 저장된정각시간;
    const 회복량 = 경과시간 * 120;
    const 회복후스태미너 = Math.min(이전스태미너 + 회복량, 최대스태미너);


    유저.현재스태미너 = 회복후스태미너;
    유저.스태미너갱신시간 = 현재정각시간;

    if (회복량 > 0) {
        새로고침하자 = true;


        const 유저아이디 = 유저.유저아이디;

        function 시간변환(정각시간) {
            const ms = 정각시간 * 3600 * 1000;
            return new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
        }

        const 현재KST = new Date().toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        await 로그기록(유저아이디,
            `\n` +
            `- 기존 저장 시각 (KST): ${시간변환(저장된정각시간)}\n` +
            `- 현재 접속 시각 (KST): ${현재KST}\n` +
            `- 경과 시간 (시간): ${경과시간}\n` +
            `- 회복량: ${회복량}\n` +
            `- 기존 현재스태미너: ${이전스태미너}\n` +
            `- 회복 적용 후 최종 스태미너: ${회복후스태미너}`
        );


    }



    if (유저.새로고침 == true) {
        새로고침하자 = true;
        유저.새로고침 = false;
    }



    let 점검하자 = false;
    if (유저.점검 == true) {
        점검하자 = true;
        // 유저.점검 = false;
    }





    유저.버전업 = 8;


    const calculatedLevel = Math.floor(유저.경험치 / 1000) + 1;
    유저.레벨 = calculatedLevel;

    const 장비목록 = 유저.장비목록 || [];
    유저.장비공격력 = Math.max(0, ...장비목록.map(e => e.공격력 || 0));
    유저.최종공격력 = 최종공격력계산(유저);

    유저.최대체력 = 최대체력계산(유저);


    const { error: 업데이트에러 } = await supabaseAdmin
        .from("users")
        .update({
            마법의팔레트: 유저.마법의팔레트,
            새로고침: 유저.새로고침,
            버전업: 유저.버전업,
            점검: 유저.점검,
            레벨: 유저.레벨,
            최종공격력: 유저.최종공격력,
            현재스태미너: 유저.현재스태미너,
            스태미너갱신시간: 유저.스태미너갱신시간,
            최대체력: 유저.최대체력
        })
        .eq("유저UID", 유저UID);

    if (업데이트에러) {
        return res.status(500).json({ 오류: "서버오류" });
    }

    const 주인장인가 = 유저.유저아이디 === "나주인장아니다";

    return res.json({ 유저데이터: { ...유저 }, 새로고침하자, 점검하자, 주인장인가 });
});






app.post("/boss-ranking", async (req, res) => {
    try {
        const { 유저UID } = req.body;

        // ✅ 모든 유저의 누적 데미지 합산
        const { data: 전체합, error: 합계에러 } = await supabaseAdmin
            .from("users")
            .select("보스누적데미지");

        if (합계에러 || !전체합) {
            return res.status(500).json({ 오류: "총합 계산 실패" });
        }

        const 누적데미지총합 = 전체합
            .filter(u => u.보스누적데미지 > 0)
            .reduce((합, u) => 합 + Number(u.보스누적데미지), 0);

        // ✅ 상위 10명 조회
        const { data: 유저들, error: 유저에러 } = await supabaseAdmin
            .from("users")
            .select("유저아이디, 보스누적데미지, 유저UID, 마법의팔레트")
            .gt("보스누적데미지", 0)
            .order("보스누적데미지", { ascending: false })

        // 내 순위 계산
        const 내순위 = 유저들.findIndex(u => u.유저UID === 유저UID);
        const 내정보 = 내순위 >= 0 ? {
            순위: 내순위 + 1,
            유저아이디: 유저들[내순위].유저아이디,
            보스누적데미지: 유저들[내순위].보스누적데미지,
            마법의팔레트: 유저들[내순위].마법의팔레트
        } : null;


        if (유저에러) {
            return res.status(500).json({ 오류: "서버오류" });
        }

        res.json({ 순위: 유저들, 누적데미지총합, 내정보 });

    } catch (e) {
        return res.status(500).json({ 오류: "서버오류" });
    }
});


app.post("/attack-boss", async (req, res) => {
    const { 유저데이터, 보스이름 } = req.body;
    const { 유저UID } = 유저데이터;
    const 전투로그 = [];

    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });


    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    let 현재스태미너 = 유저.현재스태미너 ?? 0;
    if (현재스태미너 < 10) {
        return res.json({ 결과: "불가", 메시지: "스태미너 부족" });
    }

    const 발동확률 = Math.min(0.99, 0.01 * (유저.유물목록?.["암포라"] || 0));

    const 스태미너감소량 = Math.random() < 발동확률 ? 5 : 10;
    현재스태미너 -= 스태미너감소량;

    유저.스태미너소모총량 = (유저.스태미너소모총량 || 0) + 스태미너감소량;

    유저.남은체력 = 유저.최대체력;
    let 현재턴 = 1;

    const 보스 = {
        이름: 보스이름 || "BOSS",
        체력: 9999999,
        방어력: Math.floor(유저.최종공격력 * 0.9),
        // 방어력: 0,
    };

    const 전투결과 = 전투시뮬레이션(유저, 보스, 전투로그, 현재턴, true); // 보스전: true

    유저.보스누적데미지 += 전투결과.누적데미지;
    유저.남은체력 = 유저.최대체력;

    await supabaseAdmin.from("users").update({
        현재스태미너,
        남은체력: 유저.최대체력,
        스태미너소모총량: 유저.스태미너소모총량,
        보스누적데미지: 유저.보스누적데미지
    }).eq("유저UID", 유저UID);

    return res.json({
        결과: "완료",
        누적데미지: 전투결과.누적데미지,
        유저데이터: {
            ...유저,
            현재스태미너,
            남은체력: 유저.최대체력,
            보스누적데미지: 유저.보스누적데미지
        },
        전투로그
    });
});

app.post("/attack-normal", async (req, res) => {
    const { 유저데이터 } = req.body;
    const { 유저UID, 현재층: 클라이언트층 } = 유저데이터;
    const 전투로그 = [];
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    let 현재스태미너 = 유저.현재스태미너 ?? 1000;
    if (현재스태미너 <= 0) {
        return res.json({ 결과: "불가", 메시지: "스태미너가 모두 소진되었습니다." });
    }

    const 확률 = Math.min(0.099, 0.001 * (유저.유물목록?.["모래시계"] || 0));
    const 모래시계발동 = Math.random() <= 확률;

    if (!모래시계발동) {
        현재스태미너--;
    }

    유저.스태미너소모총량++;

    const 몬스터 = 일반악마불러오기(클라이언트층 || 1);

    const 회복전체력 = 유저.남은체력;
    const 추가회복 = 아이언바디회복(유저);
    let 현재턴 = 0;

    if (추가회복 > 0) {
        유저.남은체력 = Math.min(유저.최대체력, 회복전체력 + 추가회복);

        전투로그.push({
            턴: 현재턴,
            타입: "회복",  // 회복 타입 추가
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: 유저.남은체력,
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 몬스터.체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["아이언바디아이콘"],  // 회복 스킬 아이콘
            효과: `${추가회복}`,  // "체력 회복"만 표시
        });
    }
    현재턴++;

    const 전투 = 전투시뮬레이션(유저, 몬스터, 전투로그, 현재턴);

    if (전투.결과 === "패배") {
        const 유저복구 = {
            ...유저,
            남은체력: 유저.최대체력,
            현재스태미너
        };

        await supabaseAdmin.from("users").update({
            남은체력: 유저복구.남은체력,
            현재스태미너,
            현재층: 클라이언트층,
        }).eq("유저UID", 유저UID);

        return res.json({
            결과: "패배",
            몬스터,
            유저남은체력: 전투.유저남은체력,
            유저데이터: 유저복구,
            전투로그,
            모래시계발동
        });
    }

    const 보상 = 보상계산(클라이언트층, 유저, 몬스터);
    보상.숙련도 += 인사이트추가숙련도(유저);
    보상.경험치 = Math.floor(보상.경험치 * 인텔리전스추가경험치배율(유저));
    보상.골드 = Math.floor(보상.골드 * 획득금화발굴(유저));

    const 인사이트발동 = 인사이트추가숙련도(유저) > 0;
    const 인텔리전스발동 = 인텔리전스추가경험치배율(유저) > 1;
    const 발굴발동 = 획득금화발굴(유저) > 1;

    const 레벨업 = 레벨업판정(유저.경험치 + 보상.경험치, 유저.레벨);
    const 드레인 = 드레인회복(유저);

    if (드레인 > 0) {
        전투로그.push({
            턴: "종료", // 마지막 전투 턴 그대로 사용
            타입: "회복",
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: Math.min(유저.최대체력, 전투.유저남은체력 + 드레인),
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 전투.몬스터남은체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["드레인아이콘"],  // 드레인 아이콘 표시
            효과: `${드레인}`  // 회복량
        });
    }

    const 새유저 = 전투보상반영(유저, 보상, 드레인, 레벨업, 전투.유저남은체력);
    새유저.현재층 = 클라이언트층;

    const 드랍유물 = 유물드랍판정(몬스터, 유저);
    if (드랍유물) {
        새유저.유물목록 = 새유저.유물목록 || {};
        새유저.유물목록[드랍유물] = (새유저.유물목록[드랍유물] || 0) + 1;

        for (const 체인 of Object.values(진화체인맵)) {
            for (let j = 0; j < 체인.length - 1; j++) {
                const 현재 = 체인[j];
                const 상위 = 체인[j + 1];
                const 보유 = 새유저.유물목록[현재] || 0;

                if (보유 >= 99) {
                    새유저.유물목록[현재] -= 3;
                    새유저.유물목록[상위] = (새유저.유물목록[상위] || 0) + 1;
                }
            }
        }

    }

    const 최종공격력 = 최종공격력계산(새유저);
    새유저.최종공격력 = 최종공격력;
    const 최대체력 = 최대체력계산(새유저);
    새유저.최대체력 = 최대체력;

    let 레어몬스터이름 = 레어몬스터등장판정(유저);

    if (레어몬스터이름) {

        await supabaseAdmin
            .from("users")
            .update({ 히든몬스터이름: 레어몬스터이름 })
            .eq("유저UID", 유저UID);

        if (현재스태미너 === 0) {
            현재스태미너++;
        }
    }



    let 새로고침하자 = false;
    if (유저.새로고침 == true) {
        새로고침하자 = true;
        유저.새로고침 = false;
    }

    let 점검하자 = false;
    if (유저.점검 == true) {
        점검하자 = true;
        // 유저.점검 = false;
    }

    await supabaseAdmin.from("users").update({
        레벨공격력: 새유저.레벨공격력,
        레벨: 새유저.레벨,
        최종공격력: 최종공격력,
        경험치: 새유저.경험치,
        골드: 새유저.골드,
        최대체력: 새유저.최대체력,
        남은체력: 새유저.남은체력,
        숙련도: 새유저.숙련도,
        현재층: 새유저.현재층,
        스킬: 새유저.스킬,
        유물목록: 새유저.유물목록,
        현재스태미너,
        스태미너소모총량: 유저.스태미너소모총량,
        새로고침: 유저.새로고침,
        점검: 유저.점검

    }).eq("유저UID", 새유저.유저UID);


    return res.json({
        결과: "승리",
        몬스터,
        유저남은체력: 새유저.남은체력,
        보상,
        레벨업,
        회복: 드레인,
        유저데이터: {
            ...새유저,
            현재스태미너
        },
        레어몬스터이름,
        전투로그,
        드랍유물,
        스킬발동: {
            인사이트: 인사이트발동,   // true/false
            인텔리전스: 인텔리전스발동, // true/false
            발굴: 발굴발동              // true/false
        },
        모래시계발동,
        새로고침하자,
        점검하자
    });
});

app.post("/attack-rare", async (req, res) => {
    const { 유저데이터, 레어몬스터이름 } = req.body;
    const { 유저UID, 현재층: 클라이언트층 } = 유저데이터;
    const 전투로그 = [];

    if (!유저UID || !레어몬스터이름) {
        return res.status(400).json({ 오류: "입력값 누락" });
    }

    const { data: 유저 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    //패치중

    // ✅ 레어몬스터 조우 여부 확인
    if (유저.히든몬스터이름 !== 레어몬스터이름) {
        await 로그기록(유저.유저아이디, `콘솔로장난질`);

        return res.status(403).json({ 오류: "장난질하다 걸리면 뒤집니다" });
    }

    let 현재스태미너 = 유저.현재스태미너 ?? 1000;
    if (현재스태미너 <= 0) {
        return res.json({ 결과: "불가", 메시지: "⚠️ 스태미너가 모두 소진되었습니다." });
    }

    const 확률 = Math.min(0.099, 0.001 * (유저.유물목록?.["모래시계"] || 0));
    const 모래시계발동 = Math.random() <= 확률;

    if (!모래시계발동) {
        현재스태미너--;
    }

    유저.스태미너소모총량++;

    const 몬스터 = 레어악마불러오기(클라이언트층 || 1, 레어몬스터이름);

    const 타입 = 몬스터.타입 || "";

    const 회복전체력 = 유저.남은체력;
    const 추가회복 = 아이언바디회복(유저);
    let 현재턴 = 0;

    if (추가회복 > 0) {
        유저.남은체력 = Math.min(유저.최대체력, 회복전체력 + 추가회복);

        전투로그.push({
            턴: 현재턴,
            타입: "회복",  // 회복 타입 추가
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: 유저.남은체력,
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 몬스터.체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["아이언바디아이콘"],  // 회복 스킬 아이콘
            효과: `${추가회복}`,  // "체력 회복"만 표시
        });
    }
    현재턴++;

    const 전투 = 전투시뮬레이션(유저, 몬스터, 전투로그, 현재턴);

    if (전투.결과 === "패배") {
        const 유저복구 = {
            ...유저,
            남은체력: 유저.최대체력,
            현재스태미너
        };


        await supabaseAdmin.from("users").update({
            남은체력: 유저복구.남은체력,
            현재스태미너,
            현재층: 클라이언트층,
        }).eq("유저UID", 유저UID);

        return res.json({
            결과: "패배",
            몬스터,
            유저남은체력: 전투.유저남은체력,
            유저데이터: 유저복구,
            전투로그,
            모래시계발동
        });
    }

    // ✅ 보상 계산
    const 보상 = 보상계산(클라이언트층, 유저, 몬스터);
    보상.경험치 += Math.floor(보상.경험치 * 인텔리전스추가경험치배율(유저));
    보상.골드 = Math.floor(보상.골드 * 획득금화발굴(유저));
    보상.숙련도 += 인사이트추가숙련도(유저);

    let 추가경험치 = 0;
    let 추가골드 = 0;
    let 추가숙련도 = 0;

    if (몬스터.타입 === "경험") {
        추가경험치 = 보상.경험치 * 19;
        보상.경험치 *= 20;
    }

    if (몬스터.타입 === "황금") {
        추가골드 = 보상.골드 * 19;
        보상.골드 *= 20;
    }

    if (몬스터.타입 === "계시") {
        추가숙련도 = 보상.숙련도 * 19;
        보상.숙련도 *= 20;
    }



    const 인사이트발동 = 인사이트추가숙련도(유저) > 0;
    const 인텔리전스발동 = 인텔리전스추가경험치배율(유저) > 1;
    const 발굴발동 = 획득금화발굴(유저) > 1;

    const 레벨업 = 레벨업판정(유저.경험치 + 보상.경험치, 유저.레벨);
    const 드레인 = 드레인회복(유저);

    if (드레인 > 0) {
        전투로그.push({
            턴: 현재턴, // 마지막 전투 턴 그대로 사용
            타입: "회복",
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: Math.min(유저.최대체력, 전투.유저남은체력 + 드레인),
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 전투.몬스터남은체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["드레인아이콘"],  // 드레인 아이콘 표시
            효과: `${드레인}`  // 회복량
        });
    }

    const 새유저 = 전투보상반영(유저, 보상, 드레인, 레벨업, 전투.유저남은체력);
    새유저.현재층 = 클라이언트층;

    // ✅ 드랍 장비 판정
    const 드랍장비 = 장비드랍판정(몬스터, 유저);
    if (드랍장비) {
        새유저.장비목록 = 새유저.장비목록 || [];
        const 키 = `${드랍장비.이름}|${드랍장비.등급}`;
        const 기존 = 새유저.장비목록.find(j => j.이름 === 드랍장비.이름 && j.등급 === 드랍장비.등급);


        if (기존) {
            기존.수량++;
        } else {
            새유저.장비목록.push(드랍장비);
        }

        if (드랍장비.등급 === "태초" || 드랍장비.등급 === "타락") {
            const 문구 = `${드랍장비.이름}(을)를 드랍했다!`;
            await 이벤트기록추가({
                유저UID: 유저.유저UID,
                유저아이디: 유저.유저아이디,
                문구
            });
        }

    }




    const 장비목록 = 새유저.장비목록 || [];
    const max공격력 = Math.max(...장비목록.map(e => e.공격력));
    유저.장비공격력 = max공격력;



    const 드랍유물 = 유물드랍판정(몬스터, 유저);
    if (드랍유물) {
        새유저.유물목록 = 새유저.유물목록 || {};
        새유저.유물목록[드랍유물] = (새유저.유물목록[드랍유물] || 0) + 1;

        for (const 체인 of Object.values(진화체인맵)) {
            for (let j = 0; j < 체인.length - 1; j++) {
                const 현재 = 체인[j];
                const 상위 = 체인[j + 1];
                const 보유 = 새유저.유물목록[현재] || 0;

                if (보유 >= 99) {
                    새유저.유물목록[현재] -= 3;
                    새유저.유물목록[상위] = (새유저.유물목록[상위] || 0) + 1;
                }
            }
        }

    }


    const 최종공격력 = 최종공격력계산(새유저);
    새유저.최종공격력 = 최종공격력;
    const 최대체력 = 최대체력계산(새유저);
    새유저.최대체력 = 최대체력;

    let 새로운레어몬스터이름 = 레어몬스터등장판정(유저);


    if (새로운레어몬스터이름) {

        if (현재스태미너 === 0) {
            현재스태미너++;
        }
    }


    await supabaseAdmin.from("users").update({
        레벨공격력: 새유저.레벨공격력,
        레벨: 새유저.레벨,
        장비공격력: 새유저.장비공격력,
        최종공격력: 최종공격력,
        경험치: 새유저.경험치,
        골드: 새유저.골드,
        숙련도: 새유저.숙련도,
        최대체력: 최대체력,
        남은체력: 새유저.남은체력,
        현재층: 새유저.현재층,
        스킬: 새유저.스킬,
        장비목록: 새유저.장비목록,
        유물목록: 새유저.유물목록,
        현재스태미너,
        스태미너소모총량: 유저.스태미너소모총량,
        히든몬스터이름: null,
    }).eq("유저UID", 유저UID);


    return res.json({
        결과: "승리",
        몬스터,
        유저남은체력: 새유저.남은체력,
        보상,
        레벨업,
        회복: 드레인,
        드랍장비,
        추가경험치,
        추가골드,
        추가숙련도,
        유저데이터: {
            ...새유저,
            현재스태미너
        },
        레어몬스터이름: 새로운레어몬스터이름,
        전투로그,
        드랍유물,
        스킬발동: {
            인사이트: 인사이트발동,   // true/false
            인텔리전스: 인텔리전스발동, // true/false
            발굴: 발굴발동              // true/false
        },
        모래시계발동
    });
});

app.post("/use-salad", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("현재스태미너, 최대스태미너, 유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const 보유 = 유저.유물목록?.["샐러드"] || 0;
    if (보유 < 1) return res.status(400).json({ 오류: "샐러드가 없습니다" });

    const 회복량 = 60;
    const 현재스태미너 = 유저.현재스태미너 ?? 0;
    const 최대스태미너 = 유저.최대스태미너 ?? 2000;

    // ✅ 초과할 경우 거부
    if (현재스태미너 + 회복량 > 최대스태미너) {
        return res.status(400).json({ 오류: "샐러드를 먹기엔 이릅니다" });
    }

    const 새스태미너 = 현재스태미너 + 회복량;
    const 유물목록 = { ...유저.유물목록, 샐러드: 보유 - 1 };

    await supabaseAdmin
        .from("users")
        .update({ 현재스태미너: 새스태미너, 유물목록 })
        .eq("유저UID", 유저UID);

    return res.json({
        결과: "성공",
        현재스태미너: 새스태미너,
        유물목록
    });
});

app.post("/use-Hamburger", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("현재스태미너, 최대스태미너, 유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const 보유 = 유저.유물목록?.["햄버거"] || 0;
    if (보유 < 1) return res.status(400).json({ 오류: "햄버거가 없습니다" });

    const 회복량 = 300;
    const 현재스태미너 = 유저.현재스태미너 ?? 0;
    const 최대스태미너 = 유저.최대스태미너 ?? 2000;

    // ✅ 초과할 경우 거부
    if (현재스태미너 + 회복량 > 최대스태미너) {
        return res.status(400).json({ 오류: "배불러서 못먹겠어요" });
    }

    const 새스태미너 = 현재스태미너 + 회복량;
    const 유물목록 = { ...유저.유물목록, 햄버거: 보유 - 1 };

    await supabaseAdmin
        .from("users")
        .update({ 현재스태미너: 새스태미너, 유물목록 })
        .eq("유저UID", 유저UID);

    return res.json({
        결과: "성공",
        현재스태미너: 새스태미너,
        유물목록
    });
});

// “마법의팔레트” 사용 처리
app.post("/use-magic-palette", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID가 누락되었습니다" });

    // 1. 유저 정보 조회
    const { data: 유저, error: selectError } = await supabaseAdmin
        .from("users")
        .select("유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (selectError || !유저) {
        return res.status(404).json({ 오류: "유저 정보를 찾을 수 없습니다" });
    }

    // 2. 보유 개수 확인 및 차감
    const 현재목록 = { ...유저.유물목록 };
    const 팔레트개수 = Number(현재목록["마법의팔레트"] || 0);
    if (팔레트개수 < 1) {
        return res.status(400).json({ 오류: "마법의팔레트가 부족합니다" });
    }
    현재목록["마법의팔레트"] = 팔레트개수 - 1;

    // 3. 랜덤 팔레트 색상 선택
    const 팔레트목록 = [
        "민초",
        "지옥",
        "블라섬",
        "겨울",
        "네온사인",
        "핑크오션",
        "황혼하늘",
        "에메랄드숲",
        "노랭",
        "초록",
        "보라",
        "핑크",
    ];
    const 랜덤색 = 팔레트목록[Math.floor(Math.random() * 팔레트목록.length)];


    const now = new Date();
    const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const today = kstNow.toISOString().slice(0, 10);



    // 4. DB 업데이트
    const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
            유물목록: 현재목록,
            마법의팔레트: 랜덤색,
            현질: 1,
            현질기한: 1,
            현질기한체크: today
        })
        .eq("유저UID", 유저UID);


    if (updateError) {
        return res.status(500).json({ 오류: "DB 업데이트 중 오류가 발생했습니다" });
    }

    // 5. 결과 반환
    return res.json({
        결과: "성공",
        마법의팔레트: 랜덤색,
        유물목록: 현재목록
    });
});

app.post("/use-flower", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("골드, 유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const 보유 = 유저.유물목록?.["플라워"] || 0;
    if (보유 < 1) return res.status(400).json({ 오류: "꽃이 없습니다" });

    const 판매골드 = 100000;
    유저.골드 += 판매골드;
    const 유물목록 = { ...유저.유물목록, 플라워: 보유 - 1 };

    await supabaseAdmin
        .from("users")
        .update({ 골드: 유저.골드, 유물목록 })
        .eq("유저UID", 유저UID);

    return res.json({
        결과: "성공",
        골드: 유저.골드,
        유물목록
    });
});

app.post("/use-bone", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("골드, 유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const 보유 = 유저.유물목록?.["뼈다구"] || 0;
    if (보유 < 1) return res.status(400).json({ 오류: "뼈다구가 없습니다" });

    const 판매골드 = 100000;
    유저.골드 += 판매골드;
    const 유물목록 = { ...유저.유물목록, 뼈다구: 보유 - 1 };

    await supabaseAdmin
        .from("users")
        .update({ 골드: 유저.골드, 유물목록 })
        .eq("유저UID", 유저UID);

    return res.json({
        결과: "성공",
        골드: 유저.골드,
        유물목록
    });
});




app.post("/update-skill", async (req, res) => {
    const { 유저UID, 스킬이름, 행동 } = req.body;
    if (!유저UID || !스킬이름 || !행동) {
        return res.status(400).json({ 오류: "입력값 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("스킬, 숙련도, 유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    let 스킬 = 유저.스킬 || {};
    let 숙련도 = 유저.숙련도 || 0;

    if (스킬이름 === "전체" && 행동 === "초기화") {
        const 플라워 = 유저.유물목록?.["플라워"] || 0;

        if (플라워 < 1) {
            return res.status(400).json({ 오류: "플라워 유물이 부족합니다" });
        }

        const 총투자 = Object.values(스킬).reduce((a, b) => a + b, 0);
        const 환급 = 500 * 총투자 * (총투자 + 1) / 2;

        숙련도 += 환급;
        스킬 = {};

        const 유물목록 = { ...유저.유물목록, 플라워: 플라워 - 1 }; // 1개 차감

        const { error: 저장오류 } = await supabaseAdmin
            .from("users")
            .update({ 스킬, 숙련도, 유물목록 })  // ← 유물목록도 같이 저장
            .eq("유저UID", 유저UID);

        if (저장오류) return res.status(500).json({ 오류: "서버오류" });

        return res.json({ 성공: true, 스킬, 숙련도, 스킬상태: {}, 유물목록 }); // ← 유물목록도 같이 반환
    }

    const 스킬정보 = {
        버서커: { 단계: Array(23).fill(0) },
        드레인: { 단계: Array(23).fill(0) },
        발굴: { 단계: Array(23).fill(0) },
        아이언바디: { 단계: Array(23).fill(0) },
        인사이트: { 단계: Array(1).fill(0) },
        크리티컬: { 단계: Array(23).fill(0) },
        버닝: { 단계: Array(23).fill(0) },
        인텔리전스: { 단계: Array(23).fill(0) },
        브로큰: { 단계: Array(23).fill(0) },
    };

    if (!스킬정보[스킬이름]) {
        return res.status(400).json({ 오류: "구현중입니다. 조금만 기다려주세요" });
    }

    const 단계수 = 스킬정보[스킬이름].단계.length;
    const 최대레벨 = 단계수;
    const 현재레벨 = 스킬[스킬이름] || 0;
    const 총투자 = Object.values(스킬).reduce((a, b) => a + b, 0);

    if (행동 === "습득") {
        if (현재레벨 >= 최대레벨) return res.status(400).json({ 오류: "최종단계입니다" });

        const 투자 = 총투자;
        const 필요한숙련도 = (투자 + 1) * 500;

        if (숙련도 < 필요한숙련도) return res.status(400).json({ 오류: "숙련도 부족" });

        숙련도 -= 필요한숙련도;
        스킬[스킬이름] = 현재레벨 + 1;
    }

    else if (행동 === "회수") {
        if (현재레벨 < 1) return res.status(400).json({ 오류: "회수할 스킬 없음" });

        const 투자 = 총투자;
        const 환급숙련도 = 투자 * 500;

        숙련도 += 환급숙련도;
        스킬[스킬이름] = 현재레벨 - 1;
    }

    else if (행동 === "최대") {
        let 투자 = 총투자;
        let 남은숙련도 = 숙련도;
        let 증가 = 0;

        while (현재레벨 + 증가 < 최대레벨) {
            const 필요한숙련도 = (투자 + 1) * 500;
            if (남은숙련도 < 필요한숙련도) break;

            남은숙련도 -= 필요한숙련도;
            증가 += 1;
            투자 += 1;
        }

        if (증가 === 0) {
            return res.status(400).json({ 오류: "숙련도 부족" });
        }

        숙련도 = 남은숙련도;
        스킬[스킬이름] = 현재레벨 + 증가;
    }


    else {
        return res.status(400).json({ 오류: "서버오류" });
    }

    // ✅ 스킬상태 계산: 각 계열의 현재 이름과 설명
    const 스킬상태 = {};
    for (const 키 in 스킬정보) {
        const 레벨 = 스킬[키] || 0;
        const 인덱스 = Math.min(레벨 - 1, 스킬정보[키].단계.length - 1);
        if (레벨 > 0) {
            스킬상태[키] = {
                이름: 스킬정보[키].단계[인덱스]
            };
        } else {
            스킬상태[키] = {
                이름: 스킬정보[키].단계[0]
            };
        }
    }

    const { error: 저장오류 } = await supabaseAdmin
        .from("users")
        .update({ 스킬, 숙련도 })
        .eq("유저UID", 유저UID);

    if (저장오류) return res.status(500).json({ 오류: "서버오류" });

    return res.json({ 성공: true, 스킬, 숙련도, 스킬상태 });
});



app.post("/register-user", async (req, res) => {
    const { 유저UID, 유저아이디, 기기ID, 로그인이메일 } = req.body;

    if (!유저UID || !유저아이디 || !기기ID) {
        return res.status(400).json({ 오류: "서버오류" });
    }

    const now = new Date();
    const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const today = kstNow.toISOString().slice(0, 10);
    const 날짜 = kstNow.toISOString().slice(0, 16).replace("T", " "); // YYYY-MM-DD HH:mm

    const 현재정각시간 = Math.floor(Date.now() / 1000 / 3600); // 시간 단위 기준 (정수)

    // const 유물목록 = Object.fromEntries(
    //     Object.keys(신화유물데이터).map(이름 => [이름, 1])
    // );
    // 유물목록["스피커"] = 9;
    // 유물목록["데빌마스크"] = 3;
    // 유물목록["마법의팔레트"] = 0;

    const 유물목록 = {
        "스피커": 9,
        "열쇠": 9,
        "데빌마스크": 3,
        "마법의팔레트": 0
    };

    const clientIP = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();

    await 로그기록(유저아이디, `신규 IP: ${clientIP}`);

    //신규유저
    const 삽입값 = {
        유저UID,
        유저아이디,
        로그인이메일,
        기기ID,
        레벨: 1,
        레벨공격력: 10,
        전직공격력: 1,
        최종공격력: 10,
        장비공격력: 0,
        펫단계: 0,
        경험치: 0,
        골드: 0,
        최대체력: 10,
        남은체력: 10,
        숙련도: 0,
        현재층: 1,
        현재악마번호: Math.floor(Math.random() * 72) + 1,
        스킬: {},
        유물목록,
        장비목록: [],
        버전업: 8,
        현재스태미너: 2000,
        최대스태미너: 2000,
        스태미너갱신시간: 현재정각시간,
        전직정보: {
            "백인장": 0,
            "오백인장": 0,
            "천인장": 0,
            "만인장": 0,
            "부장군": 0,
            "장군": 0,
            "대장군": 0,
            "대사마": 0,
            "승상": 0,
            "후": 0,
            "공": 0,
            "제후": 0,
            "왕": 0,
            "황제": 0,
            "천황": 0,
            "제황": 0,
            "태황": 0,
            "천제": 0
        },
        생성일: today,
        지하던전: 1,
        하루한번: today,
        악세사리장비칸: 1,
        우편함: [
            { 이름: "햄버거", 수량: 1, 날짜, 메모: "신규유저 이벤트보상. 유물화면에서 사용하세요" },
            { 이름: "사탄의 날개", 수량: 3, 날짜, 메모: "신규유저 이벤트보상. 무기화면에서 합성을 진행하세요" },
            { 이름: "안경", 수량: 1, 날짜, 메모: "25년 6월 27일 악세사리 구현 기념 보상" },
            { 이름: "티켓", 수량: 1, 날짜, 메모: "25년 6월 11일 자동사냥 오류 보상" },
            { 이름: "뼈다구", 수량: 1, 날짜, 메모: "25년 6월 05일 직업 구현 기념 보상" },
            { 이름: "티켓", 수량: 1, 날짜, 메모: "25년 5월 30일 연속고급장비뽑기 기능 구현 보상" },
            { 이름: "햄버거", 수량: 1, 날짜, 메모: "25년 5월 29일 주인장 첫 루시퍼 조우 기념 보상" },
            { 이름: "샐러드", 수량: 5, 날짜, 메모: "25년 5월 26일 가글(gagl) 오픈 기념 보상" },
        ]
    };

    await 이벤트기록추가({
        유저UID: 삽입값.유저UID,
        유저아이디: 삽입값.유저아이디,
        문구: `대륙에 등장했다`
    });

    const { error: 삽입오류 } = await supabaseAdmin
        .from("users")
        .insert(삽입값);

    if (삽입오류) {
        return res.status(500).json({ 오류: "서버오류" });
    }

    return res.json({ 유저데이터: 삽입값 });
});

app.post("/ranking", async (req, res) => {
    const { 유저UID } = req.body;

    try {
        const { data: 유저들, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("버전업", 8)
            .not("최종공격력", "is", null)
            .neq("유저아이디", "테스트아이디")
            // .neq("유저아이디", "나주인장아니다")
            .order("최종공격력", { ascending: false });

        if (error) {
            return res.status(500).json({ 오류: "서버오류" });
        }

        const kstToday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const todayDateOnly = new Date(kstToday.getFullYear(), kstToday.getMonth(), kstToday.getDate());

        // ✅ 하루한번 컬럼 기준으로 25일~27일 접속자만 필터링
        const 최근접속유저들 = 유저들.filter(유저 => {
            const 접속시각 = new Date(유저.하루한번);
            const 접속KST = new Date(접속시각.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const 접속DateOnly = new Date(접속KST.getFullYear(), 접속KST.getMonth(), 접속KST.getDate());

            const diff일수 = (todayDateOnly - 접속DateOnly) / (1000 * 60 * 60 * 24); // 밀리초 차이를 일수로
            return diff일수 <= 2; // 오늘, 어제, 그제
        });

        // 직위 처리
        for (const 유저 of 최근접속유저들) {
            유저.직위 = 최고전직명(유저.전직정보) || "";
        }

        const { data: 보스랭킹, error: 유저에러 } = await supabaseAdmin
            .from("users")
            .select("유저아이디, 보스누적데미지, 유저UID")
            .gt("보스누적데미지", 0)
            .order("보스누적데미지", { ascending: false });

        return res.json({ 유저들: 최근접속유저들, 보스랭킹 });
    } catch (e) {
        return res.status(500).json({ 오류: "서버오류" });
    }
});

app.post("/delete-user", async (req, res) => {
    const { 유저UID, 유저아이디 } = req.body;

    if (!유저UID) {
        return res.status(400).json({ 오류: "UID 누락됨" });
    }

    const clientIP = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();
    await 로그기록(유저아이디, `탈퇴 IP: ${clientIP}`);

    try {
        // 1. users 테이블 삭제
        const { error: 테이블삭제오류 } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("유저UID", 유저UID);

        if (테이블삭제오류) {
            console.error("유저 테이블 삭제 실패:", 테이블삭제오류.message);
            return res.status(500).json({ 오류: "서버오류" });
        }

        // 2. Supabase Auth 계정 삭제
        const { error: 인증삭제오류 } = await supabaseAdmin.auth.admin.deleteUser(유저UID);

        if (인증삭제오류) {
            console.error("Auth 삭제 실패:", 인증삭제오류.message);
            return res.status(500).json({ 오류: "서버오류" });
        }

        return res.json({ 메시지: "유저 데이터 및 인증 삭제 완료" });
    } catch (e) {
        console.error("유저 삭제 중 예외:", e.message);
        return res.status(500).json({ 오류: "서버오류" });
    }
});

app.post("/update-username", async (req, res) => {
    const { 유저UID, 새아이디 } = req.body;

    if (!유저UID || !새아이디 || 새아이디.length > 8) {
        return res.status(400).json({ 오류: "입력값 누락 또는 길이 초과" });
    }

    // ✅ 이미 존재하는 아이디 있는지 확인
    const { data: 중복, error: 조회오류 } = await supabaseAdmin
        .from("users")
        .select("유저UID")
        .eq("유저아이디", 새아이디)
        .neq("유저UID", 유저UID);

    if (조회오류) {
        return res.status(500).json({ 오류: "서버오류" });
    }

    if (중복.length > 0) {
        return res.status(409).json({ 오류: "이미 사용 중인 아이디입니다" });
    }

    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({ 유저아이디: 새아이디 })
        .eq("유저UID", 유저UID);

    if (업데이트오류) {
        return res.status(500).json({ 오류: "서버오류" });
    }

    return res.json({ 성공: true });
});

app.post("/get-job-info", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("전직정보, 경험치")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    return res.json({
        전직정보: 유저.전직정보,
        경험치: 유저.경험치
    });
});

app.post("/get-job-result", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("직업결정, 경험치")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    return res.json({
        직업결정: 유저.직업결정,
        경험치: 유저.경험치
    });
});

app.post("/set-job-result", async (req, res) => {
    const { 유저UID, 계열선택 } = req.body;
    if (!유저UID || !계열선택) {
        return res.status(400).json({ 오류: "유저UID 또는 계열 정보 누락" });
    }

    try {
        // 1) 현재 저장된 직업결정(JSON) 컬럼 + 경험치 조회
        const { data: 유저, error: 조회에러 } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("유저UID", 유저UID)
            .single();

        if (조회에러 || !유저) {
            return res.status(404).json({ 오류: "유저 정보 없음" });
        }

        // 2) 기존에 저장된 JSON을 파싱하거나, 없으면 빈 객체로 초기화
        const 기존직업결정 = 유저.직업결정 || {};

        // 3) 해당 계열의 단계 계산 (이미 키가 있으면 +1, 없으면 1부터 시작)
        const 현재단계 = 기존직업결정[계열선택] ?? 0;
        const 다음단계 = 현재단계 + 1;

        // 4) 경험치 비용 계산 (단계 1 → 100,000p, 단계 2 → 200,000p, …)
        const cost = 다음단계 * 150000;

        // 5) 경험치 충분 여부 검사
        const 현재경험치 = 유저.경험치 ?? 0;
        if (현재경험치 < cost) {
            return res.status(400).json({ 오류: `경험치가 부족합니다` });
        }

        // 6) 새로운 JSON 객체 생성
        const 새로운직업결정 = {
            ...기존직업결정,
            [계열선택]: 다음단계
        };

        // 7) 새로운 경험치 계산
        const 새로운경험치 = 현재경험치 - cost;

        const calculatedLevel = Math.floor(새로운경험치 / 1000) + 1;      // 추가
        유저.레벨 = calculatedLevel;                                      // 추가
        유저.최종공격력 = 최종공격력계산(유저);

        // 8) users 테이블의 직업결정 + 경험치 컬럼 업데이트
        const { error: 업데이트에러 } = await supabaseAdmin
            .from("users")
            .update({
                직업결정: 새로운직업결정,
                경험치: 새로운경험치,
                레벨: 유저.레벨,
                최종공격력: 유저.최종공격력
            })
            .eq("유저UID", 유저UID);


        const 문구 = `${계열선택} ${다음단계}차로 전직했다`;
        await 이벤트기록추가({
            유저UID: 유저.유저UID,
            유저아이디: 유저.유저아이디,
            문구
        });



        if (업데이트에러) {
            return res.status(500).json({ 오류: "DB 업데이트 실패" });
        }

        return res.json({ 성공: true, 새로운경험치, 레벨: 유저.레벨, 최종공격력: 유저.최종공격력 });
    } catch (e) {
        return res.status(500).json({ 오류: "서버 예외 발생" });
    }
});

app.post("/promote-job", async (req, res) => {
    const { 유저UID, 직위 } = req.body;

    if (!유저UID || !직위) {
        return res.status(400).json({ 오류: "유저UID 또는 직위 누락" });
    }

    // 유저 정보 불러오기
    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    const 전직정보 = 유저.전직정보 ?? {};
    const 완료전직갯수 = Object.values(전직정보).filter(v => v === 1).length;
    const 비용 = (완료전직갯수 + 1) * 50000;

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 경험치 = 유저.경험치 ?? 0;

    if (경험치 < 비용) {
        return res.status(400).json({ 오류: "경험치 부족" });
    }

    if (전직정보[직위] === 1) {
        return res.status(400).json({ 오류: "이미 전직 완료된 직위입니다" });
    }

    전직정보[직위] = 1;

    유저.전직공격력 = 완료전직갯수 + 2;
    const 새레벨 = Math.floor((경험치 - 비용) / 1000) + 1;

    const 최종공격력 = 최종공격력계산(유저);
    유저.최종공격력 = 최종공격력;

    const 업데이트 = {
        최종공격력: 최종공격력,
        경험치: 경험치 - 비용,
        레벨: 새레벨,
        전직정보,
        전직공격력: 완료전직갯수 + 2
    };


    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update(업데이트)
        .eq("유저UID", 유저UID);

    if (업데이트오류) {
        return res.status(500).json({ 오류: "서버오류" });
    }

    return res.json({ 성공: true, 전직정보: 전직정보, 경험치: 경험치 - 비용, 레벨: 새레벨, 최종공격력: 최종공격력, });
});

function calc전직환급(expInfo) {
    // expInfo 는 JSON 객체. 예: { "공":0, "왕":1, "후":1, ... }
    const learnedCount = Object.values(expInfo).filter(v => v === 1).length;
    let total = 0;
    for (let i = 1; i <= learnedCount; i++) {
        total += 50000 * i;
    }
    return total;
}

// Helper: 직업결정 JSON에서 레벨을 꺼내어 누적 경험치 계산 (150k * 1 + 150k * 2 + …)
function calc직업환급(jobDecision) {
    // jobDecision 은 null 이거나 { "계열명": 숫자 } 형태
    if (!jobDecision) return 0;
    // Object.values(jobDecision)[0]으로 레벨을 가져옴
    const level = Object.values(jobDecision)[0];
    if (typeof level !== 'number' || level < 1) return 0;

    let total = 0;
    for (let i = 1; i <= level; i++) {
        total += 150000 * i;
    }
    return total;
}


app.post('/reset-job', async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) {
        return res.status(400).json({ 오류: '유저UID 누락' });
    }

    try {
        // 1) 유저 정보 조회
        const { data: user, error: selectError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('유저UID', 유저UID)
            .single();

        if (selectError || !user) {
            return res.status(404).json({ 오류: '유저 정보 없음' });
        }

        // 2) "뼈다구" 유물이 최소 1개 있는지 확인
        const 유물목록 = user.유물목록 || {};
        const 현재뼈다구개수 = (유물목록['뼈다구'] ?? 0);
        if (현재뼈다구개수 < 1) {
            return res.status(400).json({ 오류: '뼈다구 유물이 부족합니다.' });
        }

        // 3) 기존 전직정보에서 환급 경험치 계산
        //    calc전직환급() 함수는, 값이 1인 키의 개수만큼 (50,000 × 레벨번호)를 누적하여 반환합니다.
        const 전직정보 = user.전직정보 || {};
        const 전직환급 = calc전직환급(전직정보);  // :contentReference[oaicite:0]{index=0}

        // 4) 기존 직업결정에서 환급 경험치 계산
        //    calc직업환급() 함수는, 저장된 레벨에 따라 (150,000 × 레벨번호)를 누적하여 반환합니다.
        const 직업환급 = calc직업환급(user.직업결정);  // :contentReference[oaicite:1]{index=1}

        // 5) 최종 환급 경험치 = 전직환급 + 직업환급
        const total환급 = 전직환급 + 직업환급;

        // 6) 기존 경험치 + 환급된 경험치
        const 기존경험치 = user.경험치 ?? 0;
        const 환급후경험치 = 기존경험치 + total환급;

        // 7) 유물목록에서 "뼈다구" 1개 차감
        const updated유물목록 = {
            ...유물목록,
            '뼈다구': 현재뼈다구개수 - 1
        };

        // 8) 전직정보 초기화: 모든 키를 0으로 변경
        const 초기전직정보 = {};
        for (const key of Object.keys(전직정보)) {
            초기전직정보[key] = 0;
        }

        const 새전직공격력 = 1;

        const 새레벨 = Math.floor(환급후경험치 / 1000) + 1;


        user.경험치 = 환급후경험치;
        user.전직정보 = 초기전직정보;
        user.전직공격력 = 새전직공격력;
        user.레벨 = 새레벨;
        user.유물목록 = updated유물목록;

        const 새최종공격력 = 최종공격력계산(user);  // :contentReference[oaicite:2]{index=2}

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                전직정보: 초기전직정보,
                직업결정: null,
                경험치: 환급후경험치,
                유물목록: updated유물목록,
                전직공격력: 새전직공격력,
                레벨: 새레벨,
                최종공격력: 새최종공격력
            })
            .eq('유저UID', 유저UID);

        if (updateError) {
            return res.status(500).json({ 오류: '업데이트 실패: ' + updateError.message });
        }

        // 14) 클라이언트에 반환
        return res.json({
            경험치: 환급후경험치,
            레벨: 새레벨,
            전직공격력: 새전직공격력,
            최종공격력: 새최종공격력,
            유물목록: updated유물목록
        });
    } catch (e) {
        return res.status(500).json({ 오류: '서버 오류: ' + e.message });
    }
});





function 최고전직명(전직정보) {
    const 전직순서 = ["백인장", "오백인장", "천인장", "만인장", "부장군", "장군", "대장군", "대사마", "승상", "후", "공", "제후", "왕", "황제", "천황", "제황", "태황", "천제"];

    let 마지막직위 = null;
    for (const 직위 of 전직순서) {
        if (전직정보?.[직위] === 1) {
            마지막직위 = 직위;
        } else {
            break;
        }
    }
    return 마지막직위;
}

app.post("/gamble-Equipment", async (req, res) => {
    const { 유저UID, 종류 } = req.body;
    const 비용 = 100000;

    try {
        // 1) 유저 조회
        const { data: 유저, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("유저UID", 유저UID)
            .single();
        if (error || !유저) {
            return res.status(400).json({ 오류: "유저 정보 없음" });
        }

        // 2) 고급·연속고급 티켓 차감 (한 번만)
        if (종류 === "고급") {
            const 티켓 = 유저.유물목록?.["티켓"] || 0;
            if (티켓 < 1) {
                return res.status(400).json({ 오류: "티켓이 부족합니다" });
            }
            유저.유물목록["티켓"] = 티켓 - 1;
        } else if (종류 === "연속고급") {
            const 티켓 = 유저.유물목록?.["티켓"] || 0;
            if (티켓 < 10) {
                return res.status(400).json({ 오류: "티켓이 부족합니다" });
            }
            유저.유물목록["티켓"] = 티켓 - 10;
        } else if (종류 === "일반") {
            if (유저.골드 < 비용) {
                return res.status(400).json({ 오류: "골드가 부족합니다" });
            }
        } else if (종류 === "연속일반") {
            if (유저.골드 < 10 * 비용) {
                return res.status(400).json({ 오류: "골드가 부족합니다" });
            }
        }

        let 횟수;
        if (종류 === "연속고급") {
            횟수 = 11;                           // ← 11회 뽑기
        } else if (종류 === "연속일반") {
            횟수 = 10;
        } else {
            횟수 = 1;
        }

        const results = [];

        // 4) 드랍 로직 반복 처리
        for (let i = 0; i < 횟수; i++) {
            let 퍼즐발동 = false;
            if (종류 === "일반" || 종류 === "연속일반") {
                const 퍼즐 = 유저.유물목록?.["퍼즐"] || 0;
                퍼즐발동 = Math.random() < 0.001 * 퍼즐;  // 퍼즐 발동 여부 결정

                if (!퍼즐발동) {
                    if (유저.골드 < 비용) {
                        return res.status(400).json({ 오류: "골드가 부족합니다" });
                    }
                    유저.골드 -= 비용;
                }
            }

            const 클로버보정 = Math.min(1.099, 1 + 0.001 * (유저.유물목록?.["클로버"] || 0));

            const 월계수보정 = Math.min(1.099, 1 + 0.001 * (유저.유물목록?.["월계수"] || 0));

            const 보정 = 클로버보정 * 월계수보정;


            let 확률표;
            if (종류 === "고급" || 종류 === "연속고급") {
                확률표 = [
                    { 등급: "타락", 확률: 보정 * (1 - Math.pow(1 - 1 / 25600, 500)) },
                    { 등급: "태초", 확률: 보정 * (1 - Math.pow(1 - 1 / 12800, 500)) },
                    { 등급: "고대", 확률: 보정 * (1 - Math.pow(1 - 1 / 6400, 500)) },
                    { 등급: "신화", 확률: 보정 * (1 - Math.pow(1 - 1 / 3200, 500)) },
                    { 등급: "레어", 확률: 보정 * (1 - Math.pow(1 - 1 / 1600, 500)) }
                ];
            } else {
                확률표 = [
                    { 등급: "태초", 확률: 보정 * (1 - Math.pow(1 - 1 / 12800, 500)) },
                    { 등급: "고대", 확률: 보정 * (1 - Math.pow(1 - 1 / 6400, 500)) },
                    { 등급: "신화", 확률: 보정 * (1 - Math.pow(1 - 1 / 3200, 500)) },
                    { 등급: "레어", 확률: 보정 * (1 - Math.pow(1 - 1 / 1600, 500)) },
                    { 등급: "일반", 확률: 보정 * (1 - Math.pow(1 - 1 / 800, 500)) }
                ];
            }

            // 4-3) 랜덤으로 등급 선택
            let r = Math.random(), 누적 = 0;
            let 뽑힌등급 = 확률표[확률표.length - 1].등급;
            for (const 항목 of 확률표) {
                누적 += 항목.확률;
                if (r < 누적) {
                    뽑힌등급 = 항목.등급;
                    break;
                }
            }


            const 드랍장비 = 장비맵[뽑힌등급];

            const 장비목록 = 유저.장비목록 || [];
            const 키 = `${드랍장비.이름}|${뽑힌등급}`;
            let 기존 = 장비목록.find(e => e.이름 === 드랍장비.이름 && e.등급 === 뽑힌등급);
            let 체력증가 = 0;

            if (기존) {
                기존.수량++;
            } else {
                장비목록.push({
                    이름: 드랍장비.이름,
                    등급: 뽑힌등급,
                    공격력: 드랍장비.공격력,
                    강화: 0,
                    수량: 0
                });
            }

            유저.장비목록 = 장비목록;
            const max공격력 = Math.max(...장비목록.map(e => e.공격력));
            유저.장비공격력 = max공격력;

            // 유저.장비공격력 = (유저.장비공격력 || 0) + 드랍장비.공격력;
            유저.최종공격력 = 최종공격력계산(유저);



            if (뽑힌등급 === "태초" || 뽑힌등급 === "타락") {
                const 문구 = `${드랍장비.이름}(을)를 획득했다!`;
                await 이벤트기록추가({
                    유저UID: 유저.유저UID,
                    유저아이디: 유저.유저아이디,
                    문구
                });
            }

            results.push({
                장비: { ...드랍장비, 등급: 뽑힌등급 },
                퍼즐발동,
                남은골드: 유저.골드,
                남은티켓: 유저.유물목록?.["티켓"] || 0
            });
        }





        await supabaseAdmin
            .from("users")
            .update({
                골드: 유저.골드,
                유물목록: 유저.유물목록,
                장비목록: 유저.장비목록,
                장비공격력: 유저.장비공격력,
                최대체력: 유저.최대체력,
                최종공격력: 유저.최종공격력
            })
            .eq("유저UID", 유저UID);

        return res.json({ 유저데이터: 유저, results });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ 오류: "서버 오류입니다" });
    }
});

const 진화체인맵 = {
    "소드": ["소드", "스피어", "투핸드소드", "사이", "라이트세이버즈", "추방자의검"],
    "쉴드밴": ["쉴드밴", "쉴드배앤",],
    "고스트": ["고스트", "고오스", "고오스트",],
    "클로버": ["클로버", "월계수",],
    "하트플러스": ["하트플러스", "하트비트", "소망", "물약", "하트윙", "테크놀로지아",],
    "하트마이너스": ["하트마이너스", "브로큰하트", "산산조각하트",],
};

app.post("/gamble-Relic", async (req, res) => {
    const { 유저UID, 종류 = "일반" } = req.body;
    const 비용 = 100000;
    const maxCounts = {
        "플라워": 9,
        "뼈다구": 9,
        "안경": 9,
        "샐러드": 0,
        "스피커": 0,
        "열쇠": 9,
        "데빌마스크": 0,
    };


    try {
        const { data: 유저, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("유저UID", 유저UID)
            .single();

        if (error || !유저) {
            return res.status(400).json({ 오류: "유저 정보 없음" });
        }

        const 후보 = Object.keys(레어유물데이터).filter(이름 => {
            const 보유 = 유저.유물목록?.[이름] || 0;
            const max = maxCounts[이름] ?? 99;
            return 보유 < max;
        });

        if (후보.length === 0) {
            return res.status(400).json({ 오류: "더 이상 획득 가능한 유물이 없습니다" });
        }

        // ✅ 일반유물 포화 검사 추가
        const 일반유물이름들 = Object.keys(일반유물데이터);
        const 일반유물포화 = 일반유물이름들.every(이름 => {
            const 보유 = 유저.유물목록?.[이름] || 0;
            return 보유 >= (maxCounts[이름] ?? 99);
        });

        if (일반유물포화) {
            return res.status(400).json({ 오류: "패시브 유물 수량이 최대입니다. 유물화면에서 합성 후 시도하세요" });
        }

        const 횟수 = 종류 === "연속일반" ? 10 : 1;
        const results = [];

        if (종류 === "일반") {
            if (유저.골드 < 비용) {
                return res.status(400).json({ 오류: "골드가 부족합니다" });
            }
        } else if (종류 === "연속일반") {
            if (유저.골드 < 10 * 비용) {
                return res.status(400).json({ 오류: "골드가 부족합니다" });
            }
        }

        for (let i = 0; i < 횟수; i++) {
            const 퍼즐 = 유저.유물목록?.["퍼즐"] || 0;
            const 퍼즐발동 = Math.random() < 0.001 * 퍼즐;

            if (!퍼즐발동) {
                유저.골드 -= 비용;
            }

            // 3) 랜덤으로 유물 선택
            const 유물이름 = 후보[Math.floor(Math.random() * 후보.length)];

            // 4) 유물목록 업데이트 (최대 99개까지)
            const 유물목록복사 = { ...유저.유물목록 };
            유물목록복사[유물이름] = (유물목록복사[유물이름] || 0) + 1;



            for (const 체인 of Object.values(진화체인맵)) {
                for (let j = 0; j < 체인.length - 1; j++) { // i → j
                    const 현재 = 체인[j];
                    const 상위 = 체인[j + 1];
                    const 보유 = 유물목록복사[현재] || 0;
                    if (보유 >= 99) {
                        유물목록복사[현재] -= 3;
                        유물목록복사[상위] = (유물목록복사[상위] || 0) + 1;

                        const 상위최대 = maxCounts[상위] ?? 99;
                        if (유물목록복사[상위] >= 상위최대) {
                            const idx = 후보.indexOf(상위);
                            if (idx !== -1) 후보.splice(idx, 1);
                        }
                    }
                }
            }



            // 5) 결과 배열에 저장
            results.push({
                유물이름,
                퍼즐발동,
                남은골드: 유저.골드,
            });

            const max = maxCounts[유물이름] ?? 99;
            if (유물목록복사[유물이름] >= max) {
                const idx = 후보.indexOf(유물이름);
                if (idx !== -1) 후보.splice(idx, 1);
            }

            // 7) 유저 객체에도 유물목록 반영
            유저.유물목록 = 유물목록복사;



            // 8) 더 이상 후보가 없으면 반복 종료
            if (후보.length === 0) break;
        }

        // 9) DB에 유저 정보(골드, 유물목록) 업데이트
        await supabaseAdmin
            .from("users")
            .update({
                골드: 유저.골드,
                유물목록: 유저.유물목록,
            })
            .eq("유저UID", 유저UID);

        // 10) 응답으로 최신 유저데이터와 결과 배열 전달
        const 유저데이터 = {
            ...유저,
            골드: 유저.골드,
            유물목록: 유저.유물목록,
        };


        return res.json({
            결과: "성공",
            유저데이터,
            results,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            오류: "서버 오류입니다. 잠시 후 다시 시도해주세요.",
        });
    }
});






app.post('/synthesize-item', async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    // 필요한 필드 함께 조회
    const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('유저UID', 유저UID)
        .single();
    if (fetchError || !user) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }
    let equipmentList = user.장비목록 || [];

    const gradeOrder = ['일반', '레어', '신화', '고대', '태초', '타락'];
    const gradeMap = {
        일반: { 이름: '릴리트의 독니', 공격력: 30 },
        레어: { 이름: '디아블로의 뿔', 공격력: 63 },
        신화: { 이름: '레비아탄의 비늘', 공격력: 132 },
        고대: { 이름: '벨제부브의 꼬리', 공격력: 276 },
        태초: { 이름: '사탄의 날개', 공격력: 576 },
        타락: { 이름: '루시퍼의 심장', 공격력: 1200 }
    };

    for (let i = 0; i < gradeOrder.length - 1; i++) {
        const currentGrade = gradeOrder[i];
        const nextGrade = gradeOrder[i + 1];
        const currentItem = equipmentList.find(item => item.등급 === currentGrade);
        const nextItem = equipmentList.find(item => item.등급 === nextGrade);
        const currentQty = currentItem ? currentItem.수량 : 0;
        const synthCount = Math.floor(currentQty / 3);
        if (synthCount > 0) {
            // 하위 장비 수량 차감
            currentItem.수량 -= synthCount * 3;



            if (nextItem) {
                // 기존 상위 장비 수량 증가
                nextItem.수량 += synthCount;
            } else {
                // 신규 상위 장비 생성 시 수수료 1개 제하고 생성
                const createdQty = synthCount > 0 ? synthCount - 1 : 0;
                equipmentList.push({
                    이름: gradeMap[nextGrade].이름,
                    공격력: gradeMap[nextGrade].공격력,
                    등급: nextGrade,
                    강화: 0,
                    수량: createdQty
                });


            }


            if ((nextGrade === "태초" || nextGrade === "타락")) {
                const 문구 = `${gradeMap[nextGrade].이름}(을)를 합성했다!`;
                await 이벤트기록추가({
                    유저UID,
                    유저아이디: user.유저아이디,
                    문구
                });


            }
        }
    }



    const 장비공격력 = Math.max(...equipmentList.map(e => e.공격력 || 0));
    user.장비공격력 = 장비공격력;
    const 최종공격력 = 최종공격력계산(user);

    const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 장비목록: equipmentList, 장비공격력, 최종공격력 })
        .eq('유저UID', 유저UID);
    if (updateError) {
        return res.status(500).json({ 오류: '서버 오류로 합성에 실패했습니다.' });
    }

    return res.json({ 장비목록: equipmentList, 장비공격력, 최종공격력 });
});








app.post("/upgrade-corrupted-item", async (req, res) => {
    const { 유저UID, 이름, 등급 } = req.body;
    if (!유저UID || !이름 || !등급) {
        return res.status(400).json({ 오류: "필수 값 누락" });
    }

    const { data: 유저, error: userErr } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();
    if (userErr || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 장비목록 = 유저.장비목록 || [];
    const 대상 = 장비목록.find(e => e.이름 === 이름 && e.등급 === 등급);
    if (!대상) {
        return res.status(404).json({ 오류: "장비를 찾을 수 없음" });
    }
    if (등급 !== "타락") {
        return res.status(400).json({ 오류: "타락 장비만 강화 가능합니다" });
    }
    if ((대상.수량 || 0) < 1) {
        return res.status(400).json({ 오류: "수량이 부족합니다" });
    }
    const current = 대상.강화 || 0;

    // ❌ 11강 이상 차단
    if (current > 10) {
        return res.status(400).json({ 오류: "더 이상 강화할 수 없습니다" });
    }

    let successRate;

    if (current === 10) {
        // 10강일 때는 무조건 1%
        successRate = 1;

        const 펜타그램보정 = Math.min(0.99, 0.01 * (유저.유물목록?.["펜타그램개수"] || 0));

        successRate += 펜타그램보정;

        // if (유저.마왕전랭킹 === 1) {
        //     successRate += 1;
        // }

    } else {
        // 일반 강화는 보정 포함
        successRate = 100 - current * 10;

        const 망치보정 = Math.min(9.9, 0.1 * (유저.유물목록?.["망치"] || 0));

        successRate += 망치보정;

        const 실패카운트보정 = Math.min(유저.실패카운트 || 0, 20);
        successRate += 실패카운트보정;

        if (successRate > 100) successRate = 100;
    }


    if (Math.random() * 100 > successRate) {

        const 모루확률 = Math.min(9.9, 0.1 * (유저.유물목록?.["모루"] || 0));

        const 재료소모무시 = Math.random() * 100 < 모루확률;

        if (!재료소모무시) {
            대상.수량 -= 1;
        }

        const 실패카운트 = (유저.실패카운트 || 0) + 1;

        const { error: updFailErr } = await supabaseAdmin
            .from("users")
            .update({ 장비목록, 실패카운트 })
            .eq("유저UID", 유저UID);
        if (updFailErr) {
            return res.status(500).json({ 오류: "강화 실패 처리 중 오류 발생" });
        }


        const 문구 = (current === 10)
            ? `루시퍼의 심장 진화 실패..`
            : `루시퍼의 심장 +${대상.강화 + 1}강 실패..`;

        await 이벤트기록추가({
            유저UID: 유저.유저UID,
            유저아이디: 유저.유저아이디,
            문구
        });
        return res.status(400).json({
            오류: `강화 실패. 재료가 증발했습니다`,
            수량: 대상.수량,
            실패카운트
        });
    }

    대상.수량 -= 1;

    if (current === 10) {
        const 기존 = 장비목록.find(e => e.이름 === "베히모스의 허물" && e.등급 === "진화");
        if (기존) {
            기존.수량 = (기존.수량 || 0) + 1;
        } else {
            장비목록.push({
                이름: "베히모스의 허물",
                등급: "진화",
                강화: 0,
                공격력: 10000,
                수량: 0
            });
        }

        // ✅ 루시퍼 초기화
        대상.강화 = 0;
        대상.공격력 = 1200;
    }
    else {
        // 일반 강화 성공
        대상.강화 = current + 1;

        const 기준공격력 = 1200;
        const 증가비율 = 대상.강화 / 10;
        대상.공격력 += 기준공격력 * 증가비율;
    }

    const maxAtk = Math.max(...장비목록.map(e => e.공격력));
    유저.장비공격력 = maxAtk;
    유저.최종공격력 = 최종공격력계산(유저);

    const { error: updErr1 } = await supabaseAdmin
        .from("users")
        .update({ 장비목록, 장비공격력: 유저.장비공격력, 최종공격력: 유저.최종공격력 })
        .eq("유저UID", 유저UID);
    if (updErr1) {
        return res.status(500).json({ 오류: "강화 처리 중 오류 발생" });
    }


    const 문구 = (current === 10)
        ? `루시퍼의 심장을 진화시켜 베히모스의 허물 획득!`
        : `루시퍼의 심장 +${대상.강화}강에 성공했다!`;

    await 이벤트기록추가({
        유저UID: 유저.유저UID,
        유저아이디: 유저.유저아이디,
        문구
    });

    res.json({
        이름: 대상.이름,
        등급: 대상.등급,
        수량: 대상.수량,
        강화: 대상.강화,
        공격력: 대상.공격력,
        최종공격력: 유저.최종공격력,
        유저데이터: {
            ...유저,
            장비목록,
            최종공격력: 유저.최종공격력
        }
    });
});







app.post("/attack-dungeon", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();
    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });



    const 열쇠 = 유저.유물목록?.["열쇠"] || 0;
    if (열쇠 < 1) {
        return res.status(400).json({ 오류: "열쇠가 필요합니다" });
    }


    const level = 유저.지하던전;
    const 몬스터 = {
        이름: `???`,
        체력: 5000 * level,
        방어력: 500 * level
    };

    유저.남은체력 = 유저.최대체력;

    let 현재턴 = 1;

    const 전투로그 = [];
    const 결과 = 전투시뮬레이션(유저, 몬스터, 전투로그, 현재턴);

    let 새로운레벨 = level;
    let 드랍티켓 = false;
    if (결과.결과 === "승리") {
        새로운레벨 = level + 1;
        const oldTickets = Number(유저.유물목록?.티켓 || 0);
        유저.유물목록 = { ...유저.유물목록, 티켓: oldTickets + 1 };
        드랍티켓 = true;
    }


    유저.유물목록 = { ...유저.유물목록, 열쇠: 열쇠 - 1 };

    await supabaseAdmin
        .from("users")
        .update({
            지하던전: 새로운레벨,
            유물목록: 유저.유물목록
        })
        .eq("유저UID", 유저UID);

    return res.json({
        결과: 결과.결과,
        새로운레벨,
        몬스터,
        드랍티켓,
        유물목록: 유저.유물목록,
        전투로그,
        유저데이터: { ...유저 },

    });
});



app.post("/get-chat", async (req, res) => {
    try {
        const { data: 채팅, error } = await supabaseAdmin
            .from("광장")
            .select("유저아이디, 내용, 시각, 마법의팔레트")
            .order("시각", { ascending: false })
            .limit(50);


        if (error) {
            console.error("쿼리 오류:", error);
            return res.status(500).json({ 오류: error.message });
        }

        return res.json({ 채팅 });
    } catch (e) {
        console.error("채팅 로드 오류:", e);
        return res.status(500).json({ 오류: "서버 오류 발생" });
    }
});



app.post("/save-chat", async (req, res) => {
    const { 유저UID, 유저아이디, 메시지 } = req.body;
    if (!유저UID || !유저아이디 || !메시지) {
        return res.status(400).json({ 오류: "유저UID / 유저아이디 / 메시지 누락" });
    }

    const { data: 유저, error: userErr } = await supabaseAdmin
        .from("users")
        .select("유물목록, 마법의팔레트")
        .eq("유저UID", 유저UID)
        .single();

    if (userErr || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 유물목록 = 유저.유물목록 || {};
    const 스피커 = 유물목록["스피커"] || 0;

    if (스피커 < 1) {
        return res.status(400).json({ 오류: "스피커가 없습니다" });
    }

    // 1개 차감
    유물목록["스피커"] = 스피커 - 1;

    try {
        // 1) 광장 테이블에 메시지 저장
        const { error: insertErr } = await supabaseAdmin
            .from("광장")
            .insert([{
                유저아이디,
                내용: 메시지,
                마법의팔레트: 유저.마법의팔레트 || ""
            }]);

        if (insertErr) {
            console.error("메시지 저장 실패:", insertErr);
            return res.status(500).json({ 오류: insertErr.message });
        }

        // 2) 유저 테이블에서 스피커 -1 반영
        const { error: updateErr } = await supabaseAdmin
            .from("users")
            .update({ 유물목록 })
            .eq("유저UID", 유저UID);

        if (updateErr) {
            console.error("스피커 차감 실패:", updateErr);
            return res.status(500).json({ 오류: updateErr.message });
        }

        return res.json({
            성공: true,
            유물목록  // ← 클라이언트에서 사용할 수 있도록 함께 전송
        });

    } catch (e) {
        console.error("서버 오류:", e);
        return res.status(500).json({ 오류: "서버 오류 발생" });
    }
});



app.post("/get-events", async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from("이벤트기록")
        .select("유저아이디, 일어난일, 일어난일시각")
        .neq("유저아이디", "테스트아이디")
        .order("일어난일시각", { ascending: false })
        .limit(50);

    if (error) {
        return res.status(500).json({ 오류: "조회 실패", 상세: error.message });
    }

    res.json({ 기록: data });
});




app.post("/obtain-accessory", async (req, res) => {
    const { 유저UID, 이름 } = req.body;
    if (!유저UID || !이름) return res.status(400).json({ 오류: "필수 정보 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 없음" });

    const 목록 = 유저.악세사리목록 || [];

    if (목록.find(a => a.이름 === 이름)) {
        return res.status(400).json({ 오류: "이미 보유 중" });
    }

    // ✅ 골드 체크
    if ((유저.골드 || 0) < 1000000) {
        return res.status(400).json({ 오류: "골드 부족" });
    }

    // ✅ 골드 차감
    const 차감된골드 = 유저.골드 - 1000000;

    목록.push({
        이름,
        등급: 1,
        강화: 0,
        장착: 0
    });

    const 문구 = `악세사리 ${이름}(을)를 획득했다!`;
    await 이벤트기록추가({
        유저UID: 유저.유저UID,
        유저아이디: 유저.유저아이디,
        문구
    });


    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({ 악세사리목록: 목록, 골드: 차감된골드 })
        .eq("유저UID", 유저UID);

    if (업데이트오류) return res.status(500).json({ 오류: "업데이트 실패" });

    res.json({
        메시지: "획득 완료",
        업데이트된악세목록: 목록,
        현재골드: 차감된골드
    });
});



app.post("/equip-accessory", async (req, res) => {
    const { 유저UID, 이름 } = req.body;
    if (!유저UID || !이름) return res.status(400).json({ 오류: "필수 정보 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });


    const 목록 = 유저.악세사리목록 || [];

    // 현재 장착된 악세사리 개수
    const 장착된수 = (유저.악세사리목록 || []).filter(a => a.장착 === 1).length;
    const 장비칸수 = 유저.악세사리장비칸 ?? 1;


    const 안경개수 = 유저.유물목록?.["안경"] || 0;
    if (안경개수 < 1) {
        return res.status(403).json({ 오류: "유물. 안경이 필요합니다" });
    }

    if (장착된수 >= 장비칸수) {
        return res.status(403).json({ 오류: "장비칸이 부족합니다" });
    }


    // 새 목록 구성 (기존 장착 상태 유지, 새 장비만 장착)
    const 새목록 = 목록.map(a => {
        if (a.이름 === 이름) {
            return { ...a, 장착: 1 };
        }
        return a;
    });

    const 유저복사 = { ...유저, 악세사리목록: 새목록 };
    const 최대체력 = 최대체력계산(유저복사);
    const 최종공격력 = 최종공격력계산(유저복사);


    const 유물복사 = { ...(유저.유물목록 || {}) };
    유물복사["안경"] = Math.max(0, (유물복사["안경"] || 0) - 1);



    // ✅ 서버에 저장
    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({
            악세사리목록: 새목록,
            최대체력: 최대체력,
            최종공격력: 최종공격력,
            유물목록: 유물복사
        })
        .eq("유저UID", 유저UID);

    if (업데이트오류) return res.status(500).json({ 오류: "업데이트 실패" });


    const 문구 = `악세사리 ${이름} 장착`;
    await 이벤트기록추가({
        유저UID: 유저.유저UID,
        유저아이디: 유저.유저아이디,
        문구
    });


    res.json({
        메시지: "장착 완료",
        업데이트된악세목록: 새목록,
        최대체력,
        최종공격력,
        갱신된유물목록: 유물복사,
        악세사리장비칸: 유저.악세사리장비칸 ?? 1
    });
});

app.post("/unequip-accessory", async (req, res) => {
    const { 유저UID, 이름 } = req.body;
    if (!유저UID || !이름) return res.status(400).json({ 오류: "필수 정보 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const 목록 = 유저.악세사리목록 || [];
    let 변경됨 = false;

    const 새목록 = 목록.map(a => {
        if (a.이름 === 이름 && a.장착 === 1) {
            변경됨 = true;
            return { ...a, 장착: 0 };
        }
        return a;
    });

    if (!변경됨) {
        return res.status(200).json({ 메시지: "이미 장착되지 않음", 업데이트된악세목록: 새목록 });
    }

    const 유저복사 = { ...유저, 악세사리목록: 새목록 };
    const 최대체력 = 최대체력계산(유저복사);
    const 최종공격력 = 최종공격력계산(유저복사);

    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({
            악세사리목록: 새목록,
            최대체력,
            최종공격력
        })
        .eq("유저UID", 유저UID);

    if (업데이트오류) return res.status(500).json({ 오류: "업데이트 실패" });

    const 문구 = `악세사리 ${이름} 장착 해제`;
    await 이벤트기록추가({
        유저UID: 유저.유저UID,
        유저아이디: 유저.유저아이디,
        문구
    });


    res.json({
        메시지: "장착 해제 완료",
        업데이트된악세목록: 새목록,
        최대체력,
        최종공격력,
        갱신된유물목록: 유저.유물목록,
        악세사리장비칸: 유저.악세사리장비칸 ?? 1
    });
});



app.post("/upgrade-accessory-slot", async (req, res) => {
    const { 유저UID, 목표칸수 } = req.body;
    if (!유저UID || !목표칸수) {
        return res.status(400).json({ 오류: "필수 정보 누락" });
    }

    if (![2, 3].includes(목표칸수)) {
        return res.status(400).json({ 오류: "잘못된 장비칸 수" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("악세사리장비칸, 골드, 유저아이디")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 현재칸수 = 유저.악세사리장비칸 ?? 1;
    if (목표칸수 <= 현재칸수) {
        return res.status(400).json({ 오류: "이미 확장되었거나 잘못된 요청입니다" });
    }

    const 비용 = 목표칸수 === 2 ? 10000000 : 20000000;
    if ((유저.골드 || 0) < 비용) {
        return res.status(403).json({ 오류: "골드가 부족합니다" });
    }

    const 새골드 = 유저.골드 - 비용;

    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({
            악세사리장비칸: 목표칸수,
            골드: 새골드
        })
        .eq("유저UID", 유저UID);

    if (업데이트오류) {
        return res.status(500).json({ 오류: "업데이트 실패" });
    }

    await 이벤트기록추가({
        유저UID,
        유저아이디: 유저.유저아이디,
        문구: `장비칸 ${목표칸수}칸으로 확장`
    });

    res.json({
        메시지: "장비칸 확장 완료",
        현재골드: 새골드,
        악세사리장비칸: 목표칸수
    });
});

app.post("/upgrade-accessory", async (req, res) => {
    const { 유저UID, 이름, 비용 } = req.body;

    if (!유저UID || !이름 || !비용) {
        return res.status(400).json({ 오류: "필수 정보 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 목록 = 유저.악세사리목록 || [];
    const 대상 = 목록.find(a => a.이름 === 이름);

    if (!대상) {
        return res.status(404).json({ 오류: "악세사리를 보유하고 있지 않습니다" });
    }

    const 현재등급 = 대상.등급 || 1;

    if (현재등급 >= 6) {
        return res.status(400).json({ 오류: "최고 등급입니다" });
    }

    const 예상비용 = (현재등급 + 1) * 1000000;

    if (비용 !== 예상비용) {
        return res.status(400).json({ 오류: "비용 정보가 올바르지 않습니다" });
    }

    if ((유저.골드 || 0) < 비용) {
        return res.status(403).json({ 오류: "골드가 부족합니다" });
    }

    // 등급 +1 적용
    const 새목록 = 목록.map(a => {
        if (a.이름 === 이름) {
            return { ...a, 등급: (a.등급 || 0) + 1 };
        }
        return a;
    });

    const 새골드 = 유저.골드 - 비용;

    const 유저복사 = { ...유저, 악세사리목록: 새목록 };
    const 최대체력 = 최대체력계산(유저복사);
    const 최종공격력 = 최종공격력계산(유저복사);

    const 등급이름매핑 = {
        1: "일반",
        2: "레어",
        3: "신화",
        4: "고대",
        5: "태초",
        6: "타락"
    };
    const 현재등급이름 = 등급이름매핑[현재등급 + 1] || `${현재등급 + 1}단계`;

    const { error: 업데이트에러 } = await supabaseAdmin
        .from("users")
        .update({
            악세사리목록: 새목록,
            골드: 새골드,
            최대체력,
            최종공격력
        })
        .eq("유저UID", 유저UID);

    if (업데이트에러) {
        return res.status(500).json({ 오류: "업데이트 실패" });
    }

    await 이벤트기록추가({
        유저UID,
        유저아이디: 유저.유저아이디,
        문구: `${이름} 악세사리 ${현재등급이름}(으)로 등급업`
    });

    return res.json({
        메시지: "등급업 성공",
        업데이트된악세목록: 새목록,
        현재골드: 새골드,
        최대체력,
        최종공격력,
        현재등급: 현재등급 + 1,
        현재등급이름
    });
});


app.post("/use-Sword", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error: 조회에러 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (조회에러 || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 유물목록 = { ...유저.유물목록 };
    const 소드수량 = 유물목록["소드"] || 0;
    const 스피어수량 = 유물목록["스피어"] || 0;
    if (스피어수량 >= 99) {
        return res.status(400).json({ 오류: "스피어는 99개 이상 보유할 수 없습니다" });
    }


    if (소드수량 < 3) {
        return res.status(400).json({ 오류: "소드가 부족합니다" });
    }

    // ✅ 유물 변경
    유물목록["소드"] = 소드수량 - 3;
    유물목록["스피어"] = (유물목록["스피어"] || 0) + 1;

    // ✅ 변경 적용 후 공격력 재계산
    유저.유물목록 = 유물목록;
    const 최종공격력 = 최종공격력계산(유저);

    const { error: 저장에러 } = await supabaseAdmin
        .from("users")
        .update({
            유물목록,
            최종공격력
        })
        .eq("유저UID", 유저UID);

    if (저장에러) {
        return res.status(500).json({ 오류: "공격력 저장 실패" });
    }

    return res.json({ 유물목록, 최종공격력 });
});

app.post("/use-shieldban", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error: 조회에러 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (조회에러 || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 유물목록 = { ...유저.유물목록 };
    const 쉴드밴수량 = 유물목록["쉴드밴"] || 0;

    const 쉴드배앤수량 = 유물목록["쉴드배앤"] || 0;
    if (쉴드배앤수량 >= 99) {
        return res.status(400).json({ 오류: "쉴드배앤은 99개 이상 보유할 수 없습니다" });
    }


    if (쉴드밴수량 < 3) {
        return res.status(400).json({ 오류: "쉴드밴이 부족합니다" });
    }

    // ✅ 유물 변경
    유물목록["쉴드밴"] = 쉴드밴수량 - 3;
    유물목록["쉴드배앤"] = (유물목록["쉴드배앤"] || 0) + 1;

    // ✅ 변경 적용 후 공격력 재계산
    유저.유물목록 = 유물목록;

    const { error: 저장에러 } = await supabaseAdmin
        .from("users")
        .update({
            유물목록,
        })
        .eq("유저UID", 유저UID);

    if (저장에러) {
        return res.status(500).json({ 오류: "공격력 저장 실패" });
    }

    return res.json({ 유물목록 });
});

app.post("/use-ghost", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error: 조회에러 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (조회에러 || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 유물목록 = { ...유저.유물목록 };
    const 고스트수량 = 유물목록["고스트"] || 0;

    const 고오스수량 = 유물목록["고오스"] || 0;
    if (고오스수량 >= 99) {
        return res.status(400).json({ 오류: "고오스는 99개 이상 보유할 수 없습니다" });
    }


    if (고스트수량 < 3) {
        return res.status(400).json({ 오류: "고스트이 부족합니다" });
    }

    // ✅ 유물 변경
    유물목록["고스트"] = 고스트수량 - 3;
    유물목록["고오스"] = (유물목록["고오스"] || 0) + 1;

    // ✅ 변경 적용 후 공격력 재계산
    유저.유물목록 = 유물목록;

    const { error: 저장에러 } = await supabaseAdmin
        .from("users")
        .update({
            유물목록,
        })
        .eq("유저UID", 유저UID);

    if (저장에러) {
        return res.status(500).json({ 오류: "공격력 저장 실패" });
    }

    return res.json({ 유물목록 });
});

app.post("/use-Clover", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error: 조회에러 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (조회에러 || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 유물목록 = { ...유저.유물목록 };
    const 클로버수량 = 유물목록["클로버"] || 0;

    const 월계수수량 = 유물목록["월계수"] || 0;
    if (월계수수량 >= 99) {
        return res.status(400).json({ 오류: "월계수는 99개 이상 보유할 수 없습니다" });
    }


    if (클로버수량 < 3) {
        return res.status(400).json({ 오류: "클로버가 부족합니다" });
    }

    // ✅ 유물 변경
    유물목록["클로버"] = 클로버수량 - 3;
    유물목록["월계수"] = (유물목록["월계수"] || 0) + 1;

    // ✅ 변경 적용 후 공격력 재계산
    유저.유물목록 = 유물목록;

    const { error: 저장에러 } = await supabaseAdmin
        .from("users")
        .update({
            유물목록,
        })
        .eq("유저UID", 유저UID);

    if (저장에러) {
        return res.status(500).json({ 오류: "공격력 저장 실패" });
    }

    return res.json({ 유물목록 });
});


app.post("/receive-mail", async (req, res) => {
    const { 유저UID, 우편인덱스 } = req.body;
    if (유저UID == null || 우편인덱스 == null) {
        return res.status(400).json({ 오류: "필수 값 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 없음" });

    const 우편함 = 유저.우편함 || [];
    if (우편인덱스 < 0 || 우편인덱스 >= 우편함.length)
        return res.status(400).json({ 오류: "잘못된 인덱스" });

    const 우편 = 우편함[우편인덱스];
    const 수량 = 우편.수량 || 1;

    const 유물목록 = { ...유저.유물목록 };
    const 장비목록 = Array.isArray(유저.장비목록) ? [...유저.장비목록] : [];

    // ✅ 유물 처리
    if (우편.이름 in 신화유물데이터) {
        유물목록[우편.이름] = (유물목록[우편.이름] || 0) + 수량;
    }

    // ✅ 장비 처리 (장비맵 역탐색)
    else {
        const 등급 = Object.keys(장비맵).find(key => 장비맵[key].이름 === 우편.이름);
        if (!등급) {
            return res.status(400).json({ 오류: "잘못된 우편입니다. 주인장에게 문의하세요" });
        }

        const 장비정보 = 장비맵[등급]; // { 이름, 공격력 }

        const 기존 = 장비목록.find(x => x.이름 === 우편.이름);
        if (기존) {
            기존.수량 += 수량;
        } else {
            장비목록.push({
                이름: 우편.이름,
                공격력: 장비정보.공격력,
                등급,
                강화: 0,
                수량: Math.max(0, 수량 - 1)
            });
        }
    }

    우편함.splice(우편인덱스, 1);

    유저.장비공격력 = Math.max(0, ...장비목록.map(e => e.공격력 || 0));
    유저.최종공격력 = 최종공격력계산(유저);


    const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ 유물목록, 장비목록, 우편함, 장비공격력: 유저.장비공격력, 최종공격력: 유저.최종공격력 })
        .eq("유저UID", 유저UID);

    if (updateErr) return res.status(500).json({ 오류: "업데이트 실패" });

    await 로그기록(유저.유저아이디, `우편 수령: ${우편.이름} x${수량}`);

    return res.json({ 유물목록, 장비목록, 우편함, 장비공격력: 유저.장비공격력, 최종공격력: 유저.최종공격력 });
});



app.post("/refresh-mailbox", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("우편함") // 🎯 우편함만 선택
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 없음" });
    }

    return res.json({ 우편함: 유저.우편함 || [] });
});


app.post("/send-mail-to-user", async (req, res) => {
    const { 유저아이디, 이름, 수량 } = req.body;
    if (!유저아이디 || !이름 || !수량 || 수량 <= 0) {
        return res.status(400).json({ 오류: "입력값 누락 또는 잘못됨" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("유저UID, 우편함")
        .eq("유저아이디", 유저아이디)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "해당 유저를 찾을 수 없습니다" });
    }

    const 기존우편함 = 유저.우편함 || [];

    const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const 날짜 = kstNow.toISOString().slice(0, 16).replace("T", " "); // "2025-07-07 17:20"
    const 메모 = req.body.메모 || "";  // 클라에서 입력받은 메모

    const 새우편 = { 이름, 수량, 날짜, 메모 };

    const 갱신된우편함 = [...기존우편함, 새우편];

    const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ 우편함: 갱신된우편함 })
        .eq("유저UID", 유저.유저UID);

    if (updateErr) {
        return res.status(500).json({ 오류: "우편 저장 실패" });
    }

    await 로그기록(유저아이디, `에게 ${이름} x${수량} 우편 발송`);

    return res.json({ 메시지: "우편 발송 성공" });
});


app.post("/send-mail-to-all-users", async (req, res) => {
    const { 이름, 수량 } = req.body;
    if (!이름 || !수량 || 수량 <= 0) {
        return res.status(400).json({ 오류: "입력값 누락 또는 잘못됨" });
    }

    const { data: 유저들, error } = await supabaseAdmin
        .from("users")
        .select("유저UID, 유저아이디, 우편함");

    if (error || !유저들 || 유저들.length === 0) {
        return res.status(500).json({ 오류: "유저 목록 조회 실패" });
    }

    const 메모 = req.body.메모 || "";
    const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const 날짜 = kstNow.toISOString().slice(0, 16).replace("T", " ");

    const 새우편 = { 이름, 수량, 날짜, 메모 };
    const 업데이트작업 = [];

    for (const 유저 of 유저들) {
        const 기존우편함 = 유저.우편함 || [];
        const 갱신된우편함 = [...기존우편함, 새우편];

        업데이트작업.push(
            supabaseAdmin
                .from("users")
                .update({ 우편함: 갱신된우편함 })
                .eq("유저UID", 유저.유저UID)
        );

        await 로그기록(유저.유저아이디, `에게 ${이름} x${수량} 전체발송중`);
    }

    // 병렬 처리
    await Promise.all(업데이트작업);

    return res.json({ 메시지: "전체 유저에게 발송 완료" });
});


// app.post("/get-mawang", async (req, res) => {
//     try {
//         const { data, error } = await supabaseAdmin
//             .from("users")
//             .select("*")
//             .eq("마왕전랭킹", 1)
//             .limit(1)
//             .single();

//         if (error || !data) {
//             return res.json({ 존재함: false });
//         }

//         return res.json({
//             존재함: true,
//             마왕정보: data,
//         });
//     } catch (e) {
//         console.error("마왕정보 조회 실패:", e);
//         return res.status(500).json({ 오류: "서버 오류" });
//     }
// });


// app.post("/challenge-mawang", async (req, res) => {
//     const { 유저UID } = req.body;

//     if (!유저UID) {
//         return res.status(400).json({ 오류: "유저UID 누락" });
//     }

//     try {
//         // ① 도전자 정보 조회
//         const { data: 도전자, error: err1 } = await supabaseAdmin
//             .from("users")
//             .select("*")
//             .eq("유저UID", 유저UID)
//             .single();

//         if (err1 || !도전자) {
//             return res.status(404).json({ 오류: "도전자 정보 없음" });
//         }

//         // ② 마왕 정보 조회
//         const { data: 마왕, error: err2 } = await supabaseAdmin
//             .from("users")
//             .select("*")
//             .eq("마왕전랭킹", 1)
//             .single();

//         if (err2 || !마왕) {
//             return res.status(404).json({ 오류: "마왕이 존재하지 않습니다" });
//         }

//         if (마왕.유저UID === 도전자.유저UID) {
//             return res.status(400).json({ 오류: "마왕이시여, 도전자를 기다리세요" });
//         }

//         const 유물목록 = 도전자.유물목록 || {};
//         const 데빌마스크개수 = (유물목록['데빌마스크'] ?? 0);
//         if (데빌마스크개수 < 1) {
//             return res.status(400).json({ 오류: '도전장이 부족합니다' });
//         }


//         let 결과;
//         try {
//             결과 = 마왕전전투시뮬레이션(도전자, 마왕);
//         } catch (e) {
//             return res.status(500).json({ 오류: "전투 시뮬레이션 실패" });
//         }

//         if (결과.승리자 === "도전자") {
//             await supabaseAdmin
//                 .from("users")
//                 .update({ 마왕전랭킹: 0 })
//                 .eq("유저UID", 마왕.유저UID);

//             await supabaseAdmin
//                 .from("users")
//                 .update({ 마왕전랭킹: 1 })
//                 .eq("유저UID", 도전자.유저UID);

//         } else {
//             await supabaseAdmin
//                 .from("users")
//                 .update({
//                     마왕전방어: (마왕.마왕전방어 || 0) + 1
//                 })
//                 .eq("유저UID", 마왕.유저UID);
//         }

//         const 갱신유물 = { ...도전자.유물목록 };
//         갱신유물["데빌마스크"] = Math.max((갱신유물["데빌마스크"] || 0) - 1, 0);

//         await supabaseAdmin
//             .from("users")
//             .update({ 유물목록: 갱신유물 })
//             .eq("유저UID", 도전자.유저UID);

//         const 문구 = 결과.승리자 === "도전자"
//             ? `체력차${결과.도전자HP}로 새로운 마왕에 등극합니다!`
//             : `체력차${결과.마왕HP}로 마왕에게 패배..`;


//         if (도전자.유저아이디 !== "나주인장아니다") {
//             await 이벤트기록추가({
//                 유저UID: 도전자.유저UID,
//                 유저아이디: 도전자.유저아이디,
//                 문구
//             });
//         }


//         return res.json({
//             결과메시지: 결과.승리자 === "도전자" ? `체력차${결과.도전자HP}로 마왕을 물리치고 새로운 마왕에 등극합니다!` : `체력차${결과.마왕HP}로 패배했습니다`,
//             승리자: 결과.승리자,
//             도전자HP: 결과.도전자HP,
//             마왕HP: 결과.마왕HP,
//             유물목록: 갱신유물,
//             전투로그: 결과.전투로그
//         });



//     } catch (e) {
//         console.error("마왕 도전 에러:", e);
//         return res.status(500).json({ 오류: "서버 내부 오류" });
//     }
// });



































app.listen(3000, () => {
});
































function 마왕전전투시뮬레이션(도전자, 마왕) {
    const 전투로그 = [];

    도전자.최종공격력 = Math.round(도전자.최종공격력 * 0.01);
    마왕.최종공격력 = Math.round(마왕.최종공격력 * 0.01);

    도전자.최대체력 = 도전자.최대체력 * 1000;
    마왕.최대체력 = 마왕.최대체력 * 1000;

    let 도전자HP = 도전자.최대체력;
    let 마왕HP = 마왕.최대체력;

    let 현재턴 = 1;

    // const 신술회복량 = [1, 2, 3, 4, 5, 8];
    const 신술회복률 = [0.10, 0.20, 0.30, 0.40, 0.50, 0.80];
    const 신술성공확률 = 0.11;
    const 검술확률 = [0.10, 0.20, 0.30, 0.40, 0.50, 0.80];
    const 궁술무시확률 = [0.06, 0.12, 0.18, 0.24, 0.30, 0.48];
    const 마술배율 = [1.2, 1.4, 1.6, 1.8, 2.0, 2.6];





    const 마왕계열 = Object.keys(마왕.직업결정 || {})[0];
    const 마왕단계 = 마왕.직업결정?.[마왕계열] || 0;

    const 마왕스탭 = 마왕.유물목록?.["스탭"] || 0;
    const 마왕무시확률 = 마왕스탭 * 0.001;

    const 마왕음양 = 마왕.악세사리목록?.find(a => a.이름 === "음양" && a.장착 === 1);
    const 마왕음양확률 = 마왕음양 ? 마왕음양.등급 * 0.03 : 0;

    let 마왕궁술확률 = 0;
    if (마왕계열 === "궁술" && 마왕단계 >= 1 && 마왕단계 <= 궁술무시확률.length) {
        마왕궁술확률 = 궁술무시확률[마왕단계 - 1];
    }

    const 마왕무시총확률 = 마왕무시확률 + 마왕음양확률 + 마왕궁술확률;







    const 도전자계열 = Object.keys(도전자.직업결정 || {})[0];
    const 도전자단계 = 도전자.직업결정?.[도전자계열] || 0;

    const 도전자스탭 = 도전자.유물목록?.["스탭"] || 0;
    const 도전자무시확률 = 도전자스탭 * 0.001;

    const 도전자음양 = 도전자.악세사리목록?.find(a => a.이름 === "음양" && a.장착 === 1);
    const 도전자음양확률 = 도전자음양 ? 도전자음양.등급 * 0.05 : 0;

    let 도전자궁술확률 = 0;
    if (도전자계열 === "궁술" && 도전자단계 >= 1 && 도전자단계 <= 궁술무시확률.length) {
        도전자궁술확률 = 궁술무시확률[도전자단계 - 1];
    }

    const 도전자무시총확률 = 도전자무시확률 + 도전자음양확률 + 도전자궁술확률;






    while (도전자HP > 0 && 마왕HP > 0) {
        const 도전자행동 = [];
        const 마왕행동 = [];


        if (도전자계열 === "신술") {
            if (도전자단계 >= 1 && 도전자단계 <= 신술회복률.length) {
                if (Math.random() < 신술성공확률) {
                    const 회복량 = Math.floor(도전자.최대체력 * 신술회복률[도전자단계 - 1]);
                    도전자HP += 회복량;
                    도전자행동.push({ 직업: "신술", 효과: `체력${회복량}회복` });

                    도전자HP = Math.min(도전자HP, 도전자.최대체력);
                }
            }
        }


        let 크리티컬배율 = 1;
        const 크리티컬레벨 = (도전자.스킬?.["크리티컬"] || 0);
        if (크리티컬레벨 > 0) {
            크리티컬배율 = 1 + 크리티컬레벨 * 0.1;
            도전자행동.push({ 발동스킬: "크리티컬" });

        }


        let 버서커배율 = 1;
        let 체력소모 = 0;
        const 버서커레벨 = (도전자.스킬?.["버서커"] || 0);
        if (버서커레벨 > 0) {
            도전자행동.push({ 발동스킬: "버서커" });

            체력소모 = 버서커레벨;
            버서커배율 = 1 + ((버서커레벨 * 110 + 10) / 100);
            도전자HP = Math.max(0, 도전자HP - 체력소모 * 도전자.최종공격력);
        }

        let 버닝배율 = 1;
        const 버닝레벨 = 도전자.스킬?.["버닝"] || 0;
        if (도전자HP <= 도전자.최대체력 * 0.5 && 버닝레벨 > 0) {
            버닝배율 = 1 + 버닝레벨 * 0.2;
            도전자행동.push({ 발동스킬: "버닝" });
        }

        let 마술추가배율 = 1;
        if (도전자계열 === "마술") {
            if (도전자단계 >= 1 && 도전자단계 <= 마술배율.length) {
                마술추가배율 = 마술배율[도전자단계 - 1];
                도전자행동.push({ 직업: `마술`, 효과: `데미지증가` });
            }

        }

        const 랜덤보정 = Math.random() * 0.4 + 0.8;
        const 데미지 = Math.floor(도전자.최종공격력 * 랜덤보정 * 크리티컬배율 * 버서커배율 * 버닝배율 * 마술추가배율);


        if (Math.random() >= 마왕무시총확률) {
            마왕HP -= 데미지;
            도전자행동.push({ 데미지: `${데미지}` });
            마왕HP = Math.max(0, 마왕HP);
        } else {
            도전자행동.push({ 마왕체력소모무시: `${마왕무시총확률}로 체력소모무시` });

        }

        let 추가공격횟수 = 0;

        if (도전자계열 === "검술") {
            if (도전자단계 >= 1 && 도전자단계 <= 검술확률.length) {
                const 확률 = 검술확률[도전자단계 - 1];
                if (Math.random() < 확률) {
                    추가공격횟수 = Math.floor(Math.random() * 4) + 1;
                    도전자행동.push({ 직업: `검술`, 효과: `${추가공격횟수}회 추가공격` });

                    for (let i = 0; i < 추가공격횟수; i++) {
                        // 무시 확률이 발동되지 않은 경우에만 데미지 적용
                        if (Math.random() >= 마왕무시총확률) {
                            마왕HP -= 데미지;
                            마왕HP = Math.max(0, 마왕HP);
                        } else {

                        }
                    }
                }
            }
        }






        // 마왕 턴 시작
        if (마왕계열 === "신술") {
            if (마왕단계 >= 1 && 마왕단계 <= 신술회복률.length) {
                if (Math.random() < 신술성공확률) {
                    const 회복량 = Math.floor(마왕.최대체력 * 신술회복률[마왕단계 - 1]);
                    마왕HP += 회복량;
                    마왕행동.push({ 직업: `신술`, 효과: `체력${회복량}회복` });
                    마왕HP = Math.min(마왕HP, 마왕.최대체력);
                }
            }
        }

        let 마왕크리티컬배율 = 1;
        const 마왕크리티컬레벨 = (마왕.스킬?.["크리티컬"] || 0);
        if (마왕크리티컬레벨 > 0) {
            마왕크리티컬배율 = 1 + 마왕크리티컬레벨 * 0.1;
            마왕행동.push({ 발동스킬: `크리티컬` });
        }

        let 마왕버서커배율 = 1;
        let 마왕체력소모 = 0;
        const 마왕버서커레벨 = (마왕.스킬?.["버서커"] || 0);
        if (마왕버서커레벨 > 0) {
            마왕행동.push({ 발동스킬: `버서커` });
            마왕체력소모 = 마왕버서커레벨;
            마왕버서커배율 = 1 + ((마왕버서커레벨 * 110 + 10) / 100);
            마왕HP = Math.max(0, 마왕HP - 마왕체력소모 * 마왕.최종공격력);
        }

        let 마왕버닝배율 = 1;
        const 마왕버닝레벨 = 마왕.스킬?.["버닝"] || 0;
        if (마왕HP <= 마왕.최대체력 * 0.5 && 마왕버닝레벨 > 0) {
            마왕행동.push({ 발동스킬: `버닝` });
            마왕버닝배율 = 1 + 마왕버닝레벨 * 0.2;
        }

        let 마왕마술배율 = 1;
        if (마왕계열 === "마술") {
            if (마왕단계 >= 1 && 마왕단계 <= 마술배율.length) {
                마왕행동.push({ 직업: `마술`, 효과: `데미지증가` });
                마왕마술배율 = 마술배율[마왕단계 - 1];
            }
        }

        const 마왕보정 = Math.random() * 0.4 + 0.8;
        const 마왕데미지 = Math.floor(마왕.최종공격력 * 마왕보정 * 마왕크리티컬배율 * 마왕버서커배율 * 마왕버닝배율 * 마왕마술배율);

        if (Math.random() >= 도전자무시총확률) {
            도전자HP -= 마왕데미지;
            마왕행동.push({ 데미지: `${마왕데미지}` });
            도전자HP = Math.max(0, 도전자HP);
        } else {
            마왕행동.push({ 도전자체력소모무시: `${도전자무시총확률}로 체력소모무시` });
        }

        // 마왕 검술 추가 공격
        let 마왕추가공격 = 0;
        if (마왕계열 === "검술") {
            if (마왕단계 >= 1 && 마왕단계 <= 검술확률.length) {
                const 확률 = 검술확률[마왕단계 - 1];
                if (Math.random() < 확률) {
                    마왕추가공격 = Math.floor(Math.random() * 4) + 1;
                    마왕행동.push({ 직업: `검술`, 효과: `${마왕추가공격}회 추가공격` });
                    for (let i = 0; i < 마왕추가공격; i++) {
                        if (Math.random() >= 도전자무시총확률) {
                            도전자HP -= 마왕데미지;
                            도전자HP = Math.max(0, 도전자HP);
                        }
                    }
                }
            }
        }


        전투로그.push({
            턴: 현재턴,
            도전자행동,
            마왕행동,
            체력: { 도전자: 도전자HP, 마왕: 마왕HP }
        });
        현재턴++;



    }


    const 승리자 = 마왕HP <= 0 ? "도전자" : "마왕";
    return { 승리자, 도전자HP, 마왕HP, 전투로그 };


}


// 로그 기록 함수
async function 로그기록(유저아이디, 내용) {
    const now = new Date().toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });

    const 접두어 = `${now} | `;
    await supabaseAdmin.from("logs").insert([
        {
            유저아이디,
            내용: 접두어 + 내용
        }
    ]);
}




async function 이벤트기록추가({ 유저UID, 유저아이디, 문구 }) {
    const 실제문구 = `${유저아이디} (이)가 ${문구}`;
    const { error } = await supabaseAdmin.from("이벤트기록").insert([
        { 유저UID, 유저아이디, 일어난일: 실제문구 }
    ]);

    if (error) {
        console.error("이벤트기록 저장 실패:", error);
    }
}


function 크리티컬배율계산(유저) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["크리티컬"] || 0;
    if (레벨 <= 0) return 1; // 배운 게 없으면 기본값 1배

    // 각 레벨당 10% → 0.1 증가, 기본 배율 1
    return 1 + 레벨 * 0.1;
}

function 버서커배율계산(유저) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["버서커"] || 0;

    return {
        배율: 레벨 > 0 ? 1.1 * 레벨 + 1.1 : 1, // 기본 1배
        체력소모: 레벨
    };
}

function 버닝배율계산(유저, 현재HP, 최대HP) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["버닝"] || 0;

    // 체력이 50% 이상이면 발동 안 함
    if (현재HP > 최대HP * 0.5) return 1;

    return 레벨 > 0 ? 1 + 레벨 * 0.2 : 1;
}

function 브로큰방어무시율계산(유저) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["브로큰"] || 0;
    return 레벨 * 0.04;
}

function 데미지계산(유저, 몬스터, 스킬결과) {
    let 방어력 = 몬스터.방어력 || 0;

    const 보정 = Math.max(0.01, 1 - 0.01 * (유저.유물목록?.["쉴드밴"] || 0));
    const 보정투 = Math.max(0.01, 1 - 0.01 * (유저.유물목록?.["쉴드배앤"] || 0));

    const 카드세우스 = 유저.악세사리목록?.find(a => a.이름 === "카드세우스" && a.장착 === 1);
    const 카드세우스보정 = 카드세우스 ? (1 - 0.05 * 카드세우스.등급) : 1;

    if (스킬결과.방어무시율 > 0) {
        방어력 = Math.floor(방어력 * (1 - 스킬결과.방어무시율) * 보정 * 보정투 * 카드세우스보정);
    } else {
        방어력 = Math.floor(방어력 * 보정 * 보정투 * 카드세우스보정);
    }

    // 3) 랜덤 보정 및 기본/랜덤 데미지 계산
    const 랜덤보정 = Math.random() * 0.4 + 0.8;
    const 기본데미지 = Math.max(0, 유저.최종공격력 - 방어력);
    const 랜덤데미지 = Math.floor(기본데미지 * 랜덤보정);

    // 4) 크리티컬·버서커·버닝 등의 배율 합성
    const 최종배율 = (스킬결과.크리티컬배율) * (스킬결과.버서커배율) * (스킬결과.버닝배율);

    const 결정객체 = 유저.직업결정 || {};
    const 계열키 = Object.keys(결정객체)[0];  // 예: "궁술", "마술" 등

    let 직업추가배율 = 1;
    if (계열키 === "마술") {
        const 단계 = 결정객체[계열키];  // 1~6
        const 마술배율 = [1.2, 1.4, 1.6, 1.8, 2.0, 2.6];
        if (단계 >= 1 && 단계 <= 마술배율.length) {
            직업추가배율 = 마술배율[단계 - 1];
        }
    }

    // 6) 최종데미지 계산 (원래 데미지 * 마술추가배율)
    const 최종데미지 = Math.floor(랜덤데미지 * 최종배율 * 직업추가배율);

    return 최종데미지;
}


function 전투시뮬레이션(유저, 몬스터, 전투로그, 시작턴, 보스전 = false) {
    let 유저HP = 유저.남은체력;
    let 누적데미지 = 0;
    const 보정 = Math.max(0.901, 1 - 0.001 * (유저.유물목록?.["하트마이너스"] || 0));
    const 브로큰하트 = Math.max(0.901, 1 - 0.001 * (유저.유물목록?.["브로큰하트"] || 0));
    const 산산조각하트 = Math.max(0.901, 1 - 0.001 * (유저.유물목록?.["산산조각하트"] || 0));

    몬스터.체력 = Math.floor(몬스터.체력 * 보정 * 브로큰하트 * 산산조각하트);
    let 몬스터HP = 몬스터.체력;
    let 현재턴 = 시작턴;

    const 신술회복량 = [1, 2, 3, 4, 5, 8];
    const 신술성공확률 = 0.11;

    const 검술확률 = [0.10, 0.20, 0.30, 0.40, 0.50, 0.80];

    const 궁술무시확률 = [0.07, 0.14, 0.21, 0.28, 0.35, 0.56];

    while (유저HP > 0 && (보스전 || 몬스터HP > 0)) {
        몬스터HP = Math.max(0, 몬스터HP);
        유저HP = Math.max(0, 유저HP);


        const 결정객체 = 유저.직업결정 || {};
        const 계열키 = Object.keys(결정객체)[0];


        const 무시확률 = Math.min(0.099, 0.001 * (유저.유물목록?.["스탭"] || 0));

        const 음양 = 유저.악세사리목록?.find(a => a.이름 === "음양" && a.장착 === 1);
        const 음양확률 = 음양 ? 음양.등급 * 0.05 : 0;


        let 궁술확률 = 0;

        if (계열키 === "궁술") {
            const 단계 = 결정객체[계열키]; // 1 ~ 6
            if (단계 >= 1 && 단계 <= 궁술무시확률.length) {
                궁술확률 = 궁술무시확률[단계 - 1];
            }
        }


        const 전체무시확률 = 무시확률 + 음양확률 + 궁술확률;

        if (!(Math.random() < 전체무시확률)) {
            유저HP--;
        }



        if (계열키 === "신술") {
            const 단계 = 결정객체[계열키];      // 1 ~ 6
            if (단계 >= 1 && 단계 <= 신술회복량.length) {
                if (Math.random() < 신술성공확률) {
                    유저HP += 신술회복량[단계 - 1];
                    유저HP = Math.min(유저HP, 유저.최대체력);
                }
            }
        }

        const 크리티컬배율 = 크리티컬배율계산(유저);
        const { 배율: 버서커배율, 체력소모 } = 버서커배율계산(유저);
        const 버닝배율 = 버닝배율계산(유저, 유저HP, 유저.최대체력);
        const 방어무시율 = 브로큰방어무시율계산(유저);

        const 데미지 = 데미지계산(유저, 몬스터, {
            크리티컬배율,
            버서커배율,
            버닝배율,
            방어무시율
        });

        유저HP -= 체력소모;






        if (!보스전) {
            몬스터HP -= 데미지;
            몬스터HP = Math.max(0, 몬스터HP);
        }

        // 누적데미지 += 데미지;
        누적데미지 += Math.ceil(데미지 / 1000);

        const 발동아이콘 = [];
        if (크리티컬배율 > 1) 발동아이콘.push("크리티컬아이콘");
        if (버서커배율 > 1) 발동아이콘.push("버서커아이콘");
        if (버닝배율 > 1) 발동아이콘.push("버닝아이콘");
        if (방어무시율 > 0) 발동아이콘.push("브로큰아이콘");

        const 방어보정 = Math.max(0.01, 1 - 0.01 * (유저.유물목록?.["쉴드밴"] || 0));

        const 몬스터방어력계산 = Math.floor(
            (몬스터.방어력 || 0) *
            (1 - 방어무시율) *
            방어보정
        );





        // ── 검술 추가공격 로직 ──
        let 추가공격횟수 = 0;  // 기본값 0으로 초기화

        if (계열키 === "검술") {
            const 단계 = 결정객체[계열키];  // 1~6
            if (단계 >= 1 && 단계 <= 검술확률.length) {
                const 확률 = 검술확률[단계 - 1];
                if (Math.random() < 확률) {
                    const 횟수 = Math.floor(Math.random() * 4) + 1;
                    추가공격횟수 = 횟수;

                    for (let i = 0; i < 횟수; i++) {
                        if (!보스전) {
                            몬스터HP -= 데미지;
                            몬스터HP = Math.max(0, 몬스터HP);
                        }

                        누적데미지 += Math.ceil(데미지 / 1000);

                    }
                }
            }
        }

        // ── 전투로그에 기본 공격 로그 + 추가공격횟수만 푸쉬 ──
        전투로그.push({
            턴: 현재턴,
            타입: "공격",
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: 유저HP,
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 보스전 ? 몬스터.체력 : 몬스터HP,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터방어력계산,
            아이콘: 발동아이콘,
            효과: `${데미지}`,
            추가공격횟수  // 예: 2면 { 추가공격횟수: 2 }로 들어감
        });

        현재턴++;
    }

    return {
        결과: 유저HP <= 0 ? "패배" : "승리",
        유저남은체력: 유저HP,
        몬스터남은체력: 몬스터HP,
        누적데미지
    };
}


function 장비드랍판정(몬스터, 유저) {
    const 고정드랍 = {
        "일반": { 이름: "릴리트의 독니", 공격력: 30 },
        "레어": { 이름: "디아블로의 뿔", 공격력: 63 },
        "신화": { 이름: "레비아탄의 비늘", 공격력: 132 },
        "고대": { 이름: "벨제부브의 꼬리", 공격력: 276 },
        "태초": { 이름: "사탄의 날개", 공격력: 576 },
        "타락": { 이름: "루시퍼의 심장", 공격력: 1200 },
    };

    const 드랍 = 고정드랍[몬스터.타입];
    const 드랍확률 = 1; // 기본 100% 드랍. 나중에 조건부로 바꿔도 됨

    if (!드랍 || Math.random() > 드랍확률) return null;

    return {
        이름: 드랍.이름,
        공격력: 드랍.공격력,
        등급: 몬스터.타입,
        강화: 0,
        수량: 0
    };
}

function 유물드랍판정(몬스터, 유저) {
    // 유물별 최대 보유 개수 맵
    const maxCounts = {
        "샐러드": 0,
        "데빌마스크": 0,

    };

    const 후보유물 = Object.keys(일반유물데이터).filter(유물이름 => {
        const 보유량 = 유저.유물목록?.[유물이름] || 0;
        const max = maxCounts[유물이름] ?? 99;
        return 보유량 < max;
    });

    const 드랍확률 = 0.003;
    if (후보유물.length > 0 && Math.random() < 드랍확률) {
        const 랜덤유물 = 후보유물[Math.floor(Math.random() * 후보유물.length)];
        return 랜덤유물;
    }

    return null; // 드랍 안됨
}

function 보상계산(층, 유저, 몬스터) {
    let 경험치 = 400;
    let 감소율 = 0.2;
    for (let i = 1; i < 유저.레벨; i++) {
        경험치 *= (1 - 감소율);
        감소율 *= 0.9;
    }

    const 보정계수 = 0.9 + Math.random() * 0.2;
    경험치 = Math.floor(경험치 * 보정계수);

    let 골드 = Math.floor(Math.random() * 100) + (층 - 1) * 100;
    let 숙련도 = Math.floor(층 * 1);


    // let 추가경험치 = 0;
    // let 추가골드 = 0;
    // let 추가숙련도 = 0;

    // if (몬스터.타입 === "경험") {
    //     추가경험치 = 경험치 * 19;
    //     경험치 *= 20;
    // }

    // if (몬스터.타입 === "황금") {
    //     추가골드 = 골드 * 19;
    //     골드 *= 20;
    // }

    // if (몬스터.타입 === "계시") {
    //     추가숙련도 = 숙련도 * 19;
    //     숙련도 *= 20;
    // }

    // return { 경험치, 골드, 숙련도, 추가골드, 추가숙련도, 추가경험치 };
    return { 경험치, 골드, 숙련도 };
}

function 레벨업판정(현재경험치, 현재레벨) {
    const 새레벨 = Math.floor(현재경험치 / 1000) + 1;

    const 증가량 = 새레벨 - 현재레벨;
    return {
        새레벨,
        증가한레벨: 증가량,
        증가한공격력: 증가량 * 1,
    };
}

function 드레인회복(유저) {
    const 스킬 = 유저.스킬 || {};
    const 드레인레벨 = 스킬["드레인"] || 0;

    // 레벨만큼 회복
    return 드레인레벨;
}

function 아이언바디회복(유저) {
    const 스킬 = 유저.스킬 || {};
    const 아이언레벨 = 스킬["아이언바디"] || 0;

    return 아이언레벨; // 각 레벨당 +1 회복
}

function 인사이트추가숙련도(유저) {
    const 스킬 = 유저.스킬 || {};
    const 인사이트레벨 = 스킬["인사이트"] || 0;

    return 인사이트레벨; // 레벨 1당 추가숙련도 1
}

function 인텔리전스추가경험치배율(유저) {
    const 스킬 = 유저.스킬 || {};
    const 인텔리레벨 = 스킬["인텔리전스"] || 0;

    // 레벨당 10% → 곱셈용 1.0 + 레벨 * 0.1
    return 1 + 인텔리레벨 * 0.1;
}

function 획득금화발굴(유저) {
    const 스킬 = 유저.스킬 || {};
    const 발굴레벨 = 스킬["발굴"] || 0;

    // 각 레벨당 10% 증가 → 곱셈 배율로 1.0 + (레벨 × 0.1)
    return 1 + 발굴레벨 * 0.1;
}

function 전투보상반영(유저, 보상, 회복량, 레벨업정보, 전투체력) {
    const 새유저 = { ...유저 };

    새유저.유저UID = 유저.유저UID;
    새유저.경험치 += 보상.경험치;
    새유저.골드 += 보상.골드;
    새유저.숙련도 += 보상.숙련도;

    새유저.레벨 += 레벨업정보.증가한레벨;
    새유저.남은체력 = Math.min(
        새유저.최대체력,
        전투체력 + 회복량
    );

    if ((새유저.전직공격력 ?? 1) === 27) {
        새유저.레벨공격력 = (새유저.레벨 ?? 1) + 10;
    }

    return 새유저;
}

function 일반악마불러오기(층) {
    const 일반몬스터이름 = [
        "디나르", "에리곤", "도레알", "크로셀", "루페스", "벨", "시에르", "세레우스", "버알베리스", "발라크",
        "로노베", "자간", "안드라멜리우스", "니베로스", "에이몬", "라에스", "아라타바", "바티바스", "아몬", "안드로말리우스",
        "바피메트", "오로이아스", "오세", "아미", "데카브리아", "벨리알", "디카리브", "세이르", "오로버스", "무루무르",
        "카이미", "알로세스", "샤르나크", "샤크", "사브낙", "라하브", "말포르스", "하우레스", "피닉스", "부알",
        "푸르카스", "가프", "아스모데우스", "포르카스", "보락스", "글라시아라볼라스", "나베리우스", "아이몬", "프루푸스", "살로스",
        "하프리", "페니악스", "다이몬", "스틸", "마르코시아스", "보트스", "제파르", "엘리고스", "레리어", "베레트",
        "시트리", "구시온", "부에르", "카임", "포르네우스", "부네", "아몬", "마라바스", "푸르손", "말파스",
        "파임", "바르바토스"
    ];

    const 랜덤가중치 = () => (Math.random() * 0.2 + 0.9); // 0.9 ~ 1.1 랜덤

    const 일반목록 = 일반몬스터이름.map((이름, i) => {
        const 기준체력 = 층 === 1 ? 30 : 30 * Math.pow(10, 층 - 1);
        const 기준방어력 = 층 === 1 ? 1 : Math.pow(10, 층 - 1);

        return {
            이름,
            체력: Math.floor(기준체력 * 랜덤가중치()),
            방어력: Math.floor(기준방어력 * 랜덤가중치()),
            타입: "일반"
        };
    });

    const 기준몬스터 = 일반목록[Math.floor(Math.random() * 일반목록.length)];

    return 기준몬스터;
}

function 레어악마불러오기(층, 이름) {
    const 이름맵 = {
        "루시퍼": { 체력계수: 3.2, 방어계수: 1.6, 타입: "타락" },
        "사탄": { 체력계수: 2.0, 방어계수: 1.5, 타입: "태초" },
        "벨제부브": { 체력계수: 1.8, 방어계수: 1.4, 타입: "고대" },
        "레비아탄": { 체력계수: 1.6, 방어계수: 1.3, 타입: "신화" },
        "디아블로": { 체력계수: 1.2, 방어계수: 1.1, 타입: "레어" },
        "릴리트": { 체력계수: 1, 방어계수: 1, 타입: "일반" },
        "경고블린": { 체력계수: 1.1, 방어계수: 1.1, 타입: "경험" },
        "황금고블린": { 체력계수: 0.8, 방어계수: 0.8, 타입: "황금" },
        "숙고블린": { 체력계수: 1.4, 방어계수: 1.2, 타입: "계시" },
    };

    const 설정 = 이름맵[이름];
    if (!설정) return null;

    const 기준체력 = 층 === 1 ? 30 : 30 * Math.pow(10, 층 - 1);
    const 기준방어력 = 층 === 1 ? 1 : Math.pow(10, 층 - 1);

    const 랜덤가중치 = () => (Math.random() * 0.2 + 0.9);

    return {
        이름,
        체력: Math.floor(기준체력 * 설정.체력계수 * 랜덤가중치()),
        방어력: Math.floor(기준방어력 * 설정.방어계수 * 랜덤가중치()),
        타입: 설정.타입
    };
}

function 최종공격력계산(유저) {
    const 레벨공격력 = 유저.레벨공격력 || 10;
    const 장비공격력 = 유저.장비공격력 || 0;
    const 전직공격력 = 유저.전직공격력 || 1;
    const 펫단계원본 = 유저.펫단계 || 0;
    const 펫배율 = 1 + 0.1 * 펫단계원본;

    const 소드 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["소드"] || 0));
    const 스피어 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["스피어"] || 0));
    const 투핸드소드 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["투핸드소드"] || 0));
    const 사이 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["사이"] || 0));
    const 라이트세이버즈 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["라이트세이버즈"] || 0));
    const 추방자의검 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["추방자의검"] || 0));

    const 룬검 = 유저.악세사리목록?.find(a => a.이름 === "룬검" && a.장착 === 1);
    const 룬검배율 = 룬검 ? (1 + 룬검.등급 * 0.05) : 1;


    const 최종공격력 = (레벨공격력 + 장비공격력)
        * (전직공격력 * 0.1 + 0.9)
        * 소드
        * 스피어
        * 투핸드소드
        * 사이
        * 라이트세이버즈
        * 추방자의검
        * 펫배율
        * 룬검배율;

    return Math.round(최종공격력);
}


function 최대체력계산(유저) {
    const 하트플러스 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["하트플러스"] || 0));
    const 하트비트 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["하트비트"] || 0));
    const 소망 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["소망"] || 0));
    const 물약 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["물약"] || 0));
    const 하트윙 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["하트윙"] || 0));
    const 테크놀로지아 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["테크놀로지아"] || 0));

    const 악세목록 = 유저.악세사리목록 || [];
    const 캡틴 = 악세목록.find(a => a.이름 === "캡틴" && a.장착 === 1);
    const 추가체력 = 캡틴 ? 캡틴.등급 : 0;

    return Math.round((10 + 추가체력) * 하트플러스 * 하트비트 * 소망 * 물약 * 하트윙 * 테크놀로지아);
}

function 레어몬스터등장판정(유저) {
    const 고스트보정 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["고스트"] || 0));
    const 고오스보정 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["고오스"] || 0));
    const 고오스트보정 = Math.min(1.99, 1 + 0.01 * (유저.유물목록?.["고오스트"] || 0));


    const 드림캐처 = 유저.악세사리목록?.find(a => a.이름 === "드림캐처" && a.장착 === 1);
    const 드림캐처보정 = 드림캐처 ? (1 + 0.05 * 드림캐처.등급) : 1;

    const 보정 = 고스트보정 * 고오스보정 * 드림캐처보정 * 고오스트보정;

    const 후보 = [
        { 이름: "루시퍼", 확률: 보정 * (1 / 25600) },
        { 이름: "사탄", 확률: 보정 * (1 / 12800) },
        { 이름: "벨제부브", 확률: 보정 * (1 / 6400) },
        { 이름: "레비아탄", 확률: 보정 * (1 / 3200) },
        { 이름: "디아블로", 확률: 보정 * (1 / 1600) },
        { 이름: "릴리트", 확률: 보정 * (1 / 800) },
        { 이름: "경고블린", 확률: 보정 * (1 / 200) },
        { 이름: "황금고블린", 확률: 보정 * (1 / 200) },
        { 이름: "숙고블린", 확률: 보정 * (1 / 200) },
    ];

    const 총합 = 후보.reduce((합, 항목) => 합 + 항목.확률, 0);
    const 남은확률 = Math.max(0, 1 - 총합);  // null 확률

    if (남은확률 > 0) 후보.push({ 이름: null, 확률: 남은확률 });

    const r = Math.random();
    let 누적 = 0;
    for (const 항목 of 후보) {
        누적 += 항목.확률;
        if (r < 누적) return 항목.이름;
    }
    return null;
}


const 일반유물데이터 = {
    "소드": { 설명: "공격력이 증가합니다(*1%)" },
    "하트플러스": { 설명: "체력이 증가합니다(*1%)" },
    "고스트": { 설명: "히든몬스터 등장률이 증가합니다(*1%)" },
    "쉴드밴": { 설명: "악마들의 방어력을 감소시킵니다(*1%)" },
    "하트마이너스": { 설명: "악마들의 체력 감소(*0.1%)" },
    "클로버": { 설명: "장비 뽑기확률이 증가합니다(*0.1%)" },
    "모래시계": { 설명: "스태미너 소모를 무시합니다(0.1%)" },
    "암포라": { 설명: "보스전 스태미너 소모량 감소(1%)" },
    "퍼즐": { 설명: "도박비용을 무시합니다(0.1%)" },
    "스탭": { 설명: "화려한 발재간으로 체력소모무시(0.1%)" },
    "망치": { 설명: "루시퍼의 심장 강화확률 증가(+0.1%)" },
    "모루": { 설명: "증발되는 재료를 재조립합니다(0.1%)" },
    "펜타그램": { 설명: "진화 확률을 증가시킵니다(+0.01%)" },
};
const 레어유물데이터 = {
    "소드": { 설명: "공격력이 증가합니다(*1%)" },
    "하트플러스": { 설명: "체력이 증가합니다(*1%)" },
    "고스트": { 설명: "히든몬스터 등장률이 증가합니다(*1%)" },
    "쉴드밴": { 설명: "악마들의 방어력을 감소시킵니다(*1%)" },
    "하트마이너스": { 설명: "악마들의 체력 감소(*0.1%)" },
    "클로버": { 설명: "장비 뽑기확률이 증가합니다(*0.1%)" },
    "모래시계": { 설명: "스태미너 소모를 무시합니다(0.1%)" },
    "암포라": { 설명: "보스전 스태미너 소모량 감소(1%)" },
    "퍼즐": { 설명: "도박비용을 무시합니다(0.1%)" },
    "스탭": { 설명: "화려한 발재간으로 체력소모무시(0.1%)" },
    "플라워": { 설명: "스킬을 초기화합니다" },
    "뼈다구": { 설명: "직업을 초기화합니다" },
    "티켓": { 설명: "고급장비도박에 사용됩니다" },
    "샐러드": { 설명: "스태미너를 충전합니다(+60)" },
    "열쇠": { 설명: "지하던전에 진입합니다" },
    "스피커": { 설명: "광장에서 소리칠 수 있습니다" },
    "망치": { 설명: "루시퍼의 심장 강화확률 증가(+0.1%)" },
    "모루": { 설명: "증발되는 재료를 재조립합니다(0.1%)" },
    "펜타그램": { 설명: "진화 확률을 증가시킵니다(+0.01%)" },
    "안경": { 설명: "악세사리를 바꿔낄 수 있습니다" },
    "데빌마스크": { 설명: "마왕에게 도전할 수 있습니다" },
};
const 신화유물데이터 = {
    "소드": { 설명: "공격력이 증가합니다(*1%)" },
    "스피어": { 설명: "공격력이 증가합니다(*1%)" },
    "투핸드소드": { 설명: "공격력이 증가합니다(*1%)" },
    "사이": { 설명: "공격력이 증가합니다(*1%)" },
    "라이트세이버즈": { 설명: "공격력이 증가합니다(*1%)" },
    "추방자의검": { 설명: "공격력이 증가합니다(*1%)" },
    "하트플러스": { 설명: "체력이 증가합니다(*1%)" },
    "하트비트": { 설명: "체력이 증가합니다(*1%)" },
    "소망": { 설명: "체력이 증가합니다(*1%)" },
    "물약": { 설명: "체력이 증가합니다(*1%)" },
    "하트윙": { 설명: "체력이 증가합니다(*1%)" },
    "테크놀로지아": { 설명: "체력이 증가합니다(*1%)" },
    "고스트": { 설명: "히든몬스터 등장률이 증가합니다(*1%)" },
    "쉴드밴": { 설명: "악마들의 방어력을 감소시킵니다(*1%)" },
    "하트마이너스": { 설명: "악마들의 체력 감소(*0.1%)" },
    "브로큰하트": { 설명: "악마들의 체력 감소(*0.1%)" },
    "산산조각하트": { 설명: "악마들의 체력 감소(*0.1%)" },
    "클로버": { 설명: "장비 뽑기확률이 증가합니다(*0.1%)" },
    "모래시계": { 설명: "스태미너 소모를 무시합니다(0.1%)" },
    "암포라": { 설명: "보스전 스태미너 소모량 감소(1%)" },
    "퍼즐": { 설명: "도박비용을 무시합니다(0.1%)" },
    "스탭": { 설명: "화려한 발재간으로 체력소모무시(0.1%)" },
    "플라워": { 설명: "스킬을 초기화합니다" },
    "뼈다구": { 설명: "직업을 초기화합니다" },
    "티켓": { 설명: "고급장비도박에 사용됩니다" },
    "샐러드": { 설명: "스태미너를 충전합니다(+60)" },
    "열쇠": { 설명: "지하던전에 진입합니다" },
    "스피커": { 설명: "광장에서 소리칠 수 있습니다" },
    "마법의팔레트": { 설명: "아이디를 염색합니다" },
    "햄버거": { 설명: "스태미너를 충전합니다(+300)" },
    "망치": { 설명: "루시퍼의 심장 강화확률 증가(+0.1%)" },
    "모루": { 설명: "증발되는 재료를 재조립합니다(0.1%)" },
    "펜타그램": { 설명: "진화 확률을 증가시킵니다(+0.01%)" },
    "안경": { 설명: "악세사리를 바꿔낄 수 있습니다" },
    "쉴드배앤": { 설명: "악마들의 방어력을 더 감소시킵니다(*1%)" },
    "고오스": { 설명: "히든몬스터 등장률이 더 증가합니다(*1%)" },
    "고오스트": { 설명: "히든몬스터 등장률이 더 더 증가합니다(*1%)" },
    "월계수": { 설명: "장비 뽑기확률이 더 증가합니다(*0.1%)" },
    "데빌마스크": { 설명: "마왕에게 도전할 수 있습니다" },
};

const 장비맵 = {
    "일반": { 이름: "릴리트의 독니", 공격력: 30 },
    "레어": { 이름: "디아블로의 뿔", 공격력: 63 },
    "신화": { 이름: "레비아탄의 비늘", 공격력: 132 },
    "고대": { 이름: "벨제부브의 꼬리", 공격력: 276 },
    "태초": { 이름: "사탄의 날개", 공격력: 576 },
    "타락": { 이름: "루시퍼의 심장", 공격력: 1200 },
    "진화": { 이름: "베히모스의 허물", 공격력: 10000 },
};



// 🟡 정적 파일 경로 설정
app.use(express.static(path.join(__dirname)));

