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
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => { 
            console.error('Callback 錯誤:', err); 
            res.status(500).end(); 
        });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    if (event.message.text === '吃什麼') {
        try {
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();
            
            if (rows.length === 0) return client.replyMessage(event.replyToken, { type: 'text', text: '試算表裡面沒有資料喔！' });

            // 隨機選一行並使用 _rawData 讀取陣列資料
            const randomRow = rows[Math.floor(Math.random() * rows.length)];
            const rowData = randomRow._rawData; 
            
            // rowData[0] 是第一欄, rowData[1] 是第二欄
            const name = rowData[0] || '未知餐廳';
            const location = rowData[1] || '未知地點';

            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: `推薦你吃：${name}\n地點在：${location}`
            });
        } catch (err) {
            console.error('讀取失敗:', err);
            return client.replyMessage(event.replyToken, { type: 'text', text: '讀取資料失敗，請檢查權限或試算表ID！' });
        }
    }
}

const port = process.env.PORT || 10000;
app.listen(port, () => { console.log(`後端已在 Port ${port} 啟動！`); });
