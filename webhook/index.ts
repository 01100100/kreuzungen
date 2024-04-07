import express, { response } from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express().use(bodyParser.json());

app.listen(process.env.PORT || 80, () => console.log('webhook is listening'));

app.post('/webhook', (req, res) => {
  console.log("webhook event received!", req.query, req.body);
  const event = req.body;

  if (event.aspect_type === 'create' && event.object_type === 'activity') {
    try {
      const activity_id = event.object_id;
      const owner_id = event.owner_id;
      // TODO: get activity and calculate intersecting rivers.
      const description = `I just crossed rivers! 🏞️ | 🌐 https://kreuzungen.world 🗺️`;
      updateStravaActivityDescription(activity_id, owner_id, description);
    } catch (error) {
      console.error('Error updating activity description', error);
    }
  }
  res.status(200).send('EVENT_RECEIVED');

});

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "STRAVA";

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.json({ "hub.challenge": challenge });
    } else {
      res.sendStatus(403);
    }
  }
});

async function getStravaAccessToken(user_id: number) {
  try {
    const resp = await fetch('https://kreuzungen.fly.dev/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `userId=${user_id}`
    });

    if (!resp.ok) {
      throw new Error('Request failed. Status: ' + resp.status);
    }
    const response = await resp.json();
    return response.access_token;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function updateStravaActivityDescription(activity_id: number, owner_id: number, description: string) {
  const token = await getStravaAccessToken(owner_id);
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activity_id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: description
    })
  });
  const data = await response.json();
}

