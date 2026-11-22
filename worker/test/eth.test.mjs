import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import { recover, personalHash, domainSeparator, bidStructHash, typedHash, siweMessage, parseSiwe, checksum, bytesToHex } from '../src/eth.js';

const w = ethers.Wallet.createRandom();

test('EIP-191: recover = alamat penanda tangan', async () => {
  const msg = siweMessage({ domain: 'axto.io', address: w.address, uri: 'https://axto.io', chainId: 8453, nonce: 'abc12345', issuedAt: '2026-11-22T00:00:00Z', statement: 'Masuk ke AXTO' });
  const sig = await w.signMessage(msg);
  assert.equal(recover(personalHash(msg), sig), w.address);
  assert.equal(parseSiwe(msg).nonce, 'abc12345');
  assert.equal(parseSiwe(msg).address, w.address);
});

test('EIP-712 Bid: hash identik dengan ethers & kontrak', async () => {
  const domain = { name: 'AXTO Auction House', version: '1', chainId: 8453, verifyingContract: '0x1111111111111111111111111111111111111111' };
  const types = { Bid: [
    { name: 'lotId', type: 'bytes32' }, { name: 'collection', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'currency', type: 'address' },
    { name: 'maxAmount', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] };
  const v = { lotId: ethers.id('time:0:42'), collection: '0x2222222222222222222222222222222222222222', tokenId: 42n, currency: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', maxAmount: 1_000_000n, nonce: 7n, deadline: 1_900_000_000n };
  const ours = bytesToHex(typedHash(domainSeparator(domain), bidStructHash(v)));
  assert.equal(ours, ethers.TypedDataEncoder.hash(domain, types, v));
  const sig = await w.signTypedData(domain, types, v);
  assert.equal(recover(typedHash(domainSeparator(domain), bidStructHash(v)), sig), w.address);
});

test('checksum EIP-55', () => {
  const a = ethers.Wallet.createRandom().address;
  assert.equal(checksum(a.toLowerCase()), a);
});

test('calldata claim identik dengan ethers Interface', async () => {
  const { encodeClaim } = await import('../src/eth.js');
  const iface = new ethers.Interface(['function claim((bytes32 lotId,address collection,uint256 tokenId,address currency,uint256 maxAmount,uint256 nonce,uint256 deadline) bid, bytes bidSig, (bytes32 lotId,address collection,uint256 tokenId,address winner,address currency,uint256 price,address seller,uint8 mode,uint256 deadline) res, bytes resSig)']);
  const bid = { lotId: ethers.id('a'), collection: ethers.Wallet.createRandom().address, tokenId: '42', currency: ethers.Wallet.createRandom().address, maxAmount: '1000000', nonce: '17', deadline: '1900000000' };
  const res = { lotId: bid.lotId, collection: bid.collection, tokenId: '42', winner: ethers.Wallet.createRandom().address, currency: bid.currency, price: '990000', seller: ethers.ZeroAddress, mode: 0, deadline: '1900000500' };
  const s1 = `0x${'ab'.repeat(65)}`; const s2 = `0x${'cd'.repeat(65)}`;
  assert.equal(encodeClaim(bid, s1, res, s2), iface.encodeFunctionData('claim', [bid, s1, res, s2]));
});
