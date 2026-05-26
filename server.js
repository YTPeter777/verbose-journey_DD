const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const config = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const app = express();
const client = new line.Client(config);
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

app.post('/callback', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent)).then((r) => res.json(r)).catch((e) => { console.error(e); res.status(500).end(); });
});

async function handleEvent(event) {
    // 歡迎事件：新用戶加入時
    if (event.type === 'follow') {
        return client.replyMessage(event.replyToken, { type: 'text', text: '歡迎加入美食管家！請點選選單或輸入「吃什麼」來開始吧！' });
    }
    if (event.type !== 'message' || event.message.type !== 'text') return;

    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const rows = await doc.sheetsByIndex[0].getRows();
        const msg = event.message.text;
        let target;

        if (msg === '吃什麼') {
            target = rows[Math.floor(Math.random() * rows.length)];
        } else if (msg.startsWith('找 ')) {
            const kw = msg.split(' ')[1];
            const filtered = rows.filter(r => r._rawData.join(',').includes(kw));
            if (filtered.length === 0) return client.replyMessage(event.replyToken, { type: 'text', text: '抱歉，找不到該關鍵字的美食。' });
            target = filtered[Math.floor(Math.random() * filtered.length)];
        } else return;

        const d = target._rawData;
        return client.replyMessage(event.replyToken, {
            "type": "flex", "altText": d[0],
            "contents": {
                "type": "bubble",
                "hero": { "type": "image", "url": d[2] || "https://i.imgur.com/O6Lq9i5.jpg", "size": "full", "aspectRatio": "20:13", "aspectMode": "cover" },
                "body": {
                    "type": "box", "layout": "vertical",
                    "contents": [
                        { "type": "text", "text": d[0] || "未命名", "weight": "bold", "size": "xl" },
                        { "type": "text", "text": "📍 " + (d[1] || "無地址"), "margin": "md", "size": "sm" },
                        { "type": "text", "text": "💰 " + (d[3] || "未標示"), "margin": "sm", "size": "sm", "color": "#ff6b6b" }
                    ]
                }
            }
        });
    } catch (e) { console.error(e); }
}
app.listen(process.env.PORT || 10000);
