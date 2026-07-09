// DAILBERT desk backend — one Lambda behind a Function URL, one DynamoDB table.
// GET  /            -> full state { published:[], chosen:{}, votes:{}, comments:{} }  (open, cacheable)
// POST /  {op,...}  -> mutate one slice; requires header x-desk-key == DESK_KEY
//   op:'published' ids:[...]              (editor: which strips are public)
//   op:'chosen'    map:{date:id}          (editor: which candidate wins each day)
//   op:'vote'      id, v:1|-1|0           (editor vote; 0 clears)
//   op:'comment'   id, name, text, ts     (append a comment)
// Writes are gated; reads are open. AWS SDK v3 ships in the nodejs20 runtime.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE || 'dailbert-desk';
const KEY = process.env.DESK_KEY || '';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-desk-key',
  'content-type': 'application/json',
};
const reply = (code, body) => ({ statusCode: code, headers: CORS, body: JSON.stringify(body) });
const get = (pk) => ddb.send(new GetCommand({ TableName: TABLE, Key: { pk } })).then((r) => r.Item);
const put = (item) => ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
const del = (pk) => ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk } }));

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET';
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  if (method === 'GET') {
    const out = { published: [], chosen: {}, votes: {}, comments: {} };
    let ExclusiveStartKey;
    do {
      const r = await ddb.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey }));
      for (const it of r.Items || []) {
        const pk = it.pk || '';
        if (pk === 'published') out.published = it.ids || [];
        else if (pk === 'chosen') out.chosen = it.map || {};
        else if (pk.startsWith('vote#')) { if (it.v === 1 || it.v === -1) out.votes[pk.slice(5)] = it.v; }
        else if (pk.startsWith('comments#')) { if (it.list && it.list.length) out.comments[pk.slice(9)] = it.list; }
      }
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return reply(200, out);
  }

  if (method === 'POST') {
    const hk = (event.headers && (event.headers['x-desk-key'] || event.headers['X-Desk-Key'])) || '';
    if (!KEY || hk !== KEY) return reply(401, { error: 'bad key' });
    let b = {};
    try {
      const raw = event.isBase64Encoded && event.body
        ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body || '{}');
      b = JSON.parse(raw || '{}');
    } catch { return reply(400, { error: 'bad json' }); }
    const op = b.op;
    if (op === 'published') {
      await put({ pk: 'published', ids: Array.isArray(b.ids) ? b.ids : [] });
    } else if (op === 'chosen') {
      await put({ pk: 'chosen', map: (b.map && typeof b.map === 'object') ? b.map : {} });
    } else if (op === 'vote') {
      const id = String(b.id || '');
      if (!id) return reply(400, { error: 'no id' });
      if (b.v === 0) await del('vote#' + id);
      else await put({ pk: 'vote#' + id, v: b.v === -1 ? -1 : 1 });
    } else if (op === 'comment') {
      const id = String(b.id || '');
      if (!id) return reply(400, { error: 'no id' });
      const cur = await get('comments#' + id);
      const list = (cur && cur.list) || [];
      list.push({
        name: String(b.name || '').slice(0, 60),
        text: String(b.text || '').slice(0, 1000),
        ts: Number(b.ts) || 0,
      });
      await put({ pk: 'comments#' + id, list });
    } else {
      return reply(400, { error: 'bad op' });
    }
    return reply(200, { ok: true });
  }
  return reply(405, { error: 'method' });
};
