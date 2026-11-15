// MCP adapter for the existing GPT agent. No approval or deletion tools.
const crypto = require('crypto');
const agent = require('../lib/agent')('gpt', 'GPT_ACCESS_KEY', 'x-gpt-key');
const spec = require('../tools/gpt/openapi.json');
const operations = new Map();
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    const inputSchema = method === 'post'
      ? JSON.parse(JSON.stringify(op.requestBody.content['application/json'].schema))
      : { type: 'object', properties: Object.fromEntries((op.parameters || []).map(p => [p.name, p.schema])), required: (op.parameters || []).filter(p => p.required).map(p => p.name) };
    inputSchema.additionalProperties = false;
    if (inputSchema.properties.openaiFileIdRefs) {
      inputSchema.properties.openaiFileIdRefs = { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', format: 'uri' }, description: 'Actual HTTPS download URLs of the exact images previewed and authorized by Mohamed. MCP does not automatically resolve file IDs. Never invent URLs or pass local paths.' };
      inputSchema.properties.uploadConfirmed = { type: 'boolean', const: true, description: 'Set true only after Mohamed explicitly says ارفع for these previewed designs.' };
      inputSchema.required = inputSchema.required.filter(k => k !== 'openaiFileIdRefs');
      inputSchema.required.push('uploadConfirmed');
      inputSchema.oneOf = [{ required: ['openaiFileIdRefs'] }, { required: ['images'] }];
      inputSchema.properties.images = { type: 'array', minItems: 1, maxItems: 20, description: 'Use for local ImageGen files when no genuine download URL is available. Base64-encode the actual approved file programmatically; never synthesize bytes.', items: { type: 'object', additionalProperties: false, required: ['name', 'type', 'base64'], properties: { name: { type: 'string', maxLength: 120 }, type: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp'] }, base64: { type: 'string', maxLength: 4000000 } } } };
      if (op.operationId === 'uploadPostDesign') {
        inputSchema.required.push('note', 'opts');
        inputSchema.properties.opts.items.enum = ['A', 'B'];
      }
    }
    operations.set(op.operationId, { path, method, inputSchema, description: op.summary });
  }
}
function valid(value, schema) {
  if (schema.oneOf && schema.oneOf.filter(s => (s.required || []).every(k => Object.hasOwn(value || {}, k))).length !== 1) return false;
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'object') return value && typeof value === 'object' && !Array.isArray(value) && (schema.required || []).every(k => k in value) && Object.keys(value).every(k => Object.hasOwn(schema.properties, k) && valid(value[k], schema.properties[k]));
  if (schema.type === 'array') return Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= (schema.maxItems || 20) && value.every(v => valid(v, schema.items));
  if (schema.type === 'integer') return Number.isInteger(value) && value >= 1 && value <= (schema.maximum || Infinity);
  if (schema.type === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string' && value.length <= (schema.maxLength || 10000);
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const expected = Buffer.from(process.env.GPT_ACCESS_KEY || '');
  const supplied = Buffer.from(String(req.headers['x-gpt-key'] || ''));
  if (!expected.length || expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();
  let rpc = req.body;
  try { if (typeof rpc === 'string') rpc = JSON.parse(rpc); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!rpc || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') return res.status(400).json({ error: 'Invalid JSON-RPC' });
  const reply = result => res.status(200).json({ jsonrpc: '2.0', id: rpc.id ?? null, result });
  const error = (code, message) => res.status(200).json({ jsonrpc: '2.0', id: rpc.id ?? null, error: { code, message } });
  if (rpc.method === 'notifications/initialized') return res.status(202).end();
  if (rpc.method === 'server/discover') return reply({ supportedVersions: ['2026-07-28'], capabilities: { tools: {} } });
  if (rpc.method === 'initialize') return reply({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'capital-suites-designer', version: '0.1.0' } });
  if (rpc.method === 'ping') return reply({});
  if (rpc.method === 'tools/list') return reply({ tools: [...operations].map(([name, op]) => ({ name, description: op.description, inputSchema: op.inputSchema, annotations: { readOnlyHint: op.method === 'get', destructiveHint: false, idempotentHint: op.method === 'get', openWorldHint: true } })) });
  if (rpc.method !== 'tools/call') return error(-32601, 'Method not found');
  const op = operations.get(rpc.params?.name), args = rpc.params?.arguments || {};
  if (!op || !valid(args, op.inputSchema)) return error(-32602, 'Invalid tool or arguments');
  if (args.openaiFileIdRefs) {
    for (const link of args.openaiFileIdRefs) {
      let u; try { u = new URL(link); } catch { return error(-32602, 'HTTPS image download URL required'); }
      const host = u.hostname.toLowerCase();
      if (u.protocol !== 'https:' || u.username || u.password || u.port || !(host.endsWith('.oaiusercontent.com') || host.endsWith('.blob.core.windows.net') || host === 'files.openai.com')) return error(-32602, 'Use a genuine OpenAI image download URL; local paths and file IDs are unsupported');
    }
    
  }
  if (args.images && args.images.reduce((n, img) => n + img.base64.length, 0) > 4000000) return error(-32602, 'Combined inline images must be at most 3 MB; use download URLs for larger batches');
  const imageCount = (args.images || args.openaiFileIdRefs || []).length;
  if (args.opts && args.opts.length !== imageCount) return error(-32602, 'One option label per image required');
  if (args.note && /[\r\n]/.test(args.note)) return error(-32602, 'Note must be one line');
  const forwarded = { ...args }; delete forwarded.uploadConfirmed;
  if (op.method === 'post') {
    // Validate every image before writing anything, then use the existing upload path.
    const pending = [];
    try {
      for (let i = 0; i < imageCount; i++) {
        let bytes, type, name;
        if (args.images) {
          const img = args.images[i];
          if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(img.base64)) throw new Error('Invalid base64');
          bytes = Buffer.from(img.base64, 'base64'); type = img.type; name = img.name;
        } else {
          const response = await fetch(args.openaiFileIdRefs[i], { redirect: 'error', signal: AbortSignal.timeout(20000) });
          if (!response.ok) throw new Error('Image download failed');
          type = (response.headers.get('content-type') || '').split(';')[0];
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new Error('Unsupported image type');
          let size = 0; const chunks = [];
          for await (const chunk of response.body) { size += chunk.length; if (size > 3000000) throw new Error('Image exceeds 3 MB'); chunks.push(chunk); }
          bytes = Buffer.concat(chunks); name = 'design-' + (i + 1) + '.' + (type === 'image/jpeg' ? 'jpg' : type.split('/')[1]);
        }
        const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
        if (!bytes.length || bytes.length > 3000000 || !(type === 'image/png' && png || type === 'image/jpeg' && jpg || type === 'image/webp' && webp)) throw new Error('Invalid image bytes or image exceeds 3 MB');
        pending.push({ bytes, type, name });
      }
      forwarded.files = [];
      for (let i = 0; i < pending.length; i++) {
        const img = pending[i];
        const file = await new Promise((resolve, reject) => {
          let status = 200;
          const capture = { setHeader() {}, status(n) { status = n; return this; }, json(data) { status >= 400 ? reject(new Error('Image storage failed')) : resolve(data); }, end() { reject(new Error('Image storage failed')); } };
          Promise.resolve(agent({ method: 'POST', headers: req.headers, url: '/api/gpt/upload', body: { post: args.post || 'ads', name: img.name, type: img.type, b64: img.bytes.toString('base64') } }, capture)).catch(reject);
        });
        forwarded.files.push({ ...file, opt: args.opts?.[i] || null });
      }
    } catch (e) { return reply({ content: [{ type: 'text', text: e.message + '. Check state before retrying; some files may already be stored.' }], isError: true }); }
    delete forwarded.images; delete forwarded.openaiFileIdRefs;
  }
  const query = op.method === 'get' ? '?' + new URLSearchParams(forwarded) : '';
  const inner = { method: op.method.toUpperCase(), headers: req.headers, url: op.path + query, query: forwarded, body: op.method === 'post' ? forwarded : undefined };
  let status = 200;
  const output = { setHeader() {}, status(n) { status = n; return this; }, json(data) { return reply({ content: [{ type: 'text', text: JSON.stringify(data) }], isError: status >= 400 }); }, end() { return reply({ content: [{ type: 'text', text: 'HTTP ' + status }], isError: status >= 400 }); } };
  try { return await agent(inner, output); } catch { return reply({ content: [{ type: 'text', text: 'Upstream request failed. Check state before retrying an upload.' }], isError: true }); }
};
