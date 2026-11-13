import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/schedules-click.js';

test('cada clic en horarios crea un registro y devuelve 204', async () => {
  let statement = '';
  let insertedAt = 0;
  let writes = 0;
  const env = {
    DB: {
      prepare(sql) {
        statement = sql;
        return {
          bind(at) {
            insertedAt = at;
            return { async run() { writes++; } };
          }
        };
      }
    }
  };
  const response = await onRequestPost({ env });
  assert.equal(response.status, 204);
  assert.equal(statement, 'INSERT INTO schedule_link_clicks (clicked_at) VALUES (?)');
  assert.ok(insertedAt > 0);
  assert.equal(writes, 1);
});

test('sin D1 el contador devuelve 503', async () => {
  const response = await onRequestPost({ env: {} });
  assert.equal(response.status, 503);
});

test('cuando falla la escritura responde 503', async () => {
  const oldError = console.error;
  console.error = () => {};
  try {
    const response = await onRequestPost({
      env: { DB: { prepare() { throw new Error('D1 no disponible'); } } }
    });
    assert.equal(response.status, 503);
  } finally {
    console.error = oldError;
  }
});
