import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from './model.mjs';
import { workspaceFor, resolveRoute, canView, roleNotifications, markRoleNotificationsRead } from './workspaces.mjs';

test('switching role resolves stale links to the new responsibility area', () => {
  assert.equal(resolveRoute('learner', 'obs'), 'wallet');
  assert.equal(resolveRoute('commission', 'settings'), 'commission');
  assert.equal(resolveRoute('finance', 'commission'), 'finance');
  assert.equal(resolveRoute('instructor', 'finance'), 'catalog');
  assert.equal(resolveRoute('studentAffairs', 'settings'), 'obs');
  assert.equal(resolveRoute('it', 'applications'), 'integrations');
  assert.equal(resolveRoute('quality', 'finance'), 'quality');
  assert.equal(resolveRoute('admin', 'commission'), 'settings');
  assert.equal(resolveRoute('learner', 'applications'), 'applications');
  assert.equal(canView('learner', 'audit'), false);
  assert.equal(workspaceFor('coordinator').home, 'overview');
});

test('learner notifications only include own records; reads are role-scoped', () => {
  const s=seed(); s.role='learner';
  const own=roleNotifications(s);
  assert.equal(own.length, 2);
  assert.ok(own.every(n => !n.body.includes('0143') && !n.body.includes('0138')));
  s.role='coordinator'; markRoleNotificationsRead(s,['N1','unrelated']);
  assert.equal(roleNotifications(s).find(n=>n.id==='N1').read,true);
  assert.equal(s.notificationReads.coordinator.unrelated,undefined);
  s.role='commission'; assert.equal(roleNotifications(s).find(n=>n.id==='N1').read,false);
  assert.equal(s.applications.length,4);
});
