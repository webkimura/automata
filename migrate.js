const fs = require('fs');

const path = 'e:\\verstka\\siten8n\\backend-workflow.json';

try {
  let wf = JSON.parse(fs.readFileSync(path, 'utf8'));

  // 1. Remove Google Sheets nodes
  wf.nodes = wf.nodes.filter(n => n.type !== 'n8n-nodes-base.googleSheets');

  // 2. Remove Telegram node
  wf.nodes = wf.nodes.filter(n => n.type !== 'n8n-nodes-base.telegram');

  // Create base Supabase node template based on the existing one, but with new IDs
  const supabaseTemplate = {
    "parameters": {
      "operation": "getAll",
      "tableId": "",
      "returnAll": true
    },
    "type": "n8n-nodes-base.supabase",
    "typeVersion": 1,
    "position": [],
    "id": "",
    "name": "",
    "credentials": {
      "supabaseApi": {
        "id": "zTbgr9ff3PUeCNDg",
        "name": "Supabase account"
      }
    }
  };

  // Generate random ID
  const genId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // 3. Add Supabase - News
  wf.nodes.push({
    ...supabaseTemplate,
    parameters: { operation: "getAll", tableId: "news", returnAll: true },
    position: [416, 608],
    id: genId(),
    name: "Supabase - News"
  });

  // 4. Update Guides -> Portfolio
  const guidesWebhook = wf.nodes.find(n => n.name === 'Webhook - Get Guides');
  if (guidesWebhook) {
    guidesWebhook.name = 'Webhook - Get Portfolio';
    guidesWebhook.parameters.path = 'get-portfolio';
  }

  const guidesRespond = wf.nodes.find(n => n.name === 'Respond to Webhook - Guides');
  if (guidesRespond) {
    guidesRespond.name = 'Respond to Webhook - Portfolio';
  }

  wf.nodes.push({
    ...supabaseTemplate,
    parameters: { operation: "getAll", tableId: "portfolio", returnAll: true },
    position: [416, 832],
    id: genId(),
    name: "Supabase - Portfolio"
  });

  // 5. Add Supabase - Videos
  wf.nodes.push({
    ...supabaseTemplate,
    parameters: { operation: "getAll", tableId: "videos", returnAll: true },
    position: [416, 1056],
    id: genId(),
    name: "Supabase - Videos"
  });

  // 6. Update Telegram Contact -> AI Chat
  const tgWebhook = wf.nodes.find(n => n.name === 'Webhook - Telegram Contact');
  if (tgWebhook) {
    tgWebhook.name = 'Webhook - AI Chat';
    tgWebhook.parameters.path = 'ai-chat';
  }

  const tgRespond = wf.nodes.find(n => n.name === 'Respond to Webhook - Contact Success');
  if (tgRespond) {
    tgRespond.name = 'Respond to Webhook - AI Chat';
  }

  wf.nodes.push({
    "parameters": {
      "values": {
        "string": [
          {
            "name": "data",
            "value": "=[ { \"reply\": \"Ответ от AI в разработке...\" } ]"
          }
        ]
      },
      "options": {}
    },
    "name": "Mock AI Response",
    "type": "n8n-nodes-base.set",
    "position": [416, 1280],
    "typeVersion": 1,
    "id": genId()
  });


  // 7. Update connections
  wf.connections = {
    "Webhook - Get Templates": { main: [[{ node: "Get many rows", type: "main", index: 0 }]] },
    "Get many rows": { main: [[{ node: "Respond to Webhook - Templates", type: "main", index: 0 }]] },

    "Webhook - Get News": { main: [[{ node: "Supabase - News", type: "main", index: 0 }]] },
    "Supabase - News": { main: [[{ node: "Respond to Webhook - News", type: "main", index: 0 }]] },

    "Webhook - Get Portfolio": { main: [[{ node: "Supabase - Portfolio", type: "main", index: 0 }]] },
    "Supabase - Portfolio": { main: [[{ node: "Respond to Webhook - Portfolio", type: "main", index: 0 }]] },

    "Webhook - Get Videos": { main: [[{ node: "Supabase - Videos", type: "main", index: 0 }]] },
    "Supabase - Videos": { main: [[{ node: "Respond to Webhook - Videos", type: "main", index: 0 }]] },

    "Webhook - AI Chat": { main: [[{ node: "Mock AI Response", type: "main", index: 0 }]] },
    "Mock AI Response": { main: [[{ node: "Respond to Webhook - AI Chat", type: "main", index: 0 }]] },

    "Webhook - YooKassa Payment (Mock)": { main: [[{ node: "Mock YooKassa Link", type: "main", index: 0 }]] },
    "Mock YooKassa Link": { main: [[{ node: "Respond to Webhook - Payment", type: "main", index: 0 }]] }
  };

  fs.writeFileSync(path, JSON.stringify(wf, null, 2));
  console.log('Successfully updated workflow JSON.');

} catch (e) {
  console.error("Error updating workflow: ", e);
}
