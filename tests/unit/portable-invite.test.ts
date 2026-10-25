import test from 'node:test';
import assert from 'node:assert/strict';
import { makePortableInvite, readPortableInvite } from '../../packages/shared/src/sync/portable-invite.ts';

const code = 'abcdefghjkmnpqrs';
const base = 'https://yama-books.github.io/koten/';
const paths = ['100/', 'vintage-kana/detail.html', 'conj/'];
test('same QR code is accepted from all three application paths',()=>{
  for (const source of paths) {
    const invite = makePortableInvite(code, base + source);
    for (const receiver of paths) {
      const parsed=readPortableInvite(invite, base + receiver);
      assert.equal(parsed?.code, code);
      assert.equal(parsed?.fromApp, source.startsWith('100')?'100':source.startsWith('conj')?'conj':'vintage-kana');
    }
  }
});
test('legacy hyakunin invitation with r= remains compatible',()=>{
  const invitation = base + '100/?join='+code+'&r=1792725630';
  assert.equal(readPortableInvite(invitation,base+'conj/')?.code,code);
});
test('QR reader rejects other repo, origin, invalid or ambiguous code',()=>{
  const cases=[
    'https://evil.example/koten/100/?join='+code,
    'https://yama-books.github.io/other/100/?join='+code,
    base+'100/?join=bad',
    base+'100/?join='+code+'&join='+code,
    base+'checkpoint/?join='+code,
    base+'100/?join=',
  ];
  for(const input of cases) assert.equal(readPortableInvite(input,base+'conj/'),null);
});
test('generator keeps no query or fragment and rejects unsupported origins',()=>{
  const made=makePortableInvite(code,base+'vintage-kana/detail.html?foo=bar#hash');
  const url=new URL(made);
  assert.equal(url.hash,'');assert.equal(url.searchParams.size,1);
  assert.equal(url.searchParams.get('join'),code);
  assert.throws(()=>makePortableInvite(code,'http://example.org/koten/100/'));
  assert.throws(()=>makePortableInvite(code,'https://example.org/koten/checkpoint/'));
});
test('localhost is supported for local emulators',()=>{
  const qr=makePortableInvite(code,'http://localhost:5173/koten/conj/');
  assert.equal(readPortableInvite(qr,'http://localhost:5173/koten/100/')?.code,code);
});
