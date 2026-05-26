const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const config = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const client = new line.Client(config);

app.post('/callback', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;
    
    // 這裡是你簡單的回應邏輯
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '收到你的訊息囉！我的程式碼已經就位了！'
    });
}

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`後端已在 Port ${port} 啟動！`);
});