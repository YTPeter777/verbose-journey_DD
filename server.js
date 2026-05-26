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

// Google Sheet 驗證設定
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // 處理換行符號
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

app.post('/callback', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => { console.error(err); res.status(500).end(); });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    if (event.message.text === '吃什麼') {
        try {
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();
            
            // 隨機選一個 (確保有資料)
            const randomRow = rows[Math.floor(Math.random() * rows.length)];
            const name = randomRow.get('名稱'); // 請確保 Google Sheet 第一列有「名稱」
            const location = randomRow.get('地點'); // 請確保 Google Sheet 第一列有「地點」

            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: `推薦你吃：${name}，地點在 ${location}`
            });
        } catch (err) {
            console.error('讀取試算表失敗:', err);
            return client.replyMessage(event.replyToken, { type: 'text', text: '抱歉，讀取資料庫發生錯誤！' });
        }
    }
}

const port = process.env.PORT || 10000;
app.listen(port, () => { console.log(`後端已在 Port ${port} 啟動！`); });
