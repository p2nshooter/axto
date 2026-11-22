/** Kripto Ethereum minimal untuk worker: keccak, ecrecover, EIP-191 (SIWE), EIP-712 (Bid), eth_call. */
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';

const enc = new TextEncoder();
export const hexToBytes = (h) => {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  if (s.length % 2 || /[^0-9a-f]/i.test(s)) throw new Error('hex');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};
export const bytesToHex = (b) => `0x${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
export const keccak = (b) => keccak_256(typeof b === 'string' ? enc.encode(b) : b);
const concat = (...a) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};

export const isAddress = (a) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);

/** Checksum EIP-55. */
export function checksum(addr) {
  const a = addr.toLowerCase().replace(/^0x/, '');
  const h = bytesToHex(keccak(a)).slice(2);
  return `0x${[...a].map((c, i) => (parseInt(h[i], 16) >= 8 ? c.toUpperCase() : c)).join('')}`;
}

/** Pulihkan alamat dari hash 32 byte + tanda tangan 65 byte (r,s,v). */
export function recover(hash32, sigHex) {
  const sig = hexToBytes(sigHex);
  if (sig.length !== 65) throw new Error('sig length');
  let v = sig[64];
  if (v >= 27) v -= 27;
  if (v !== 0 && v !== 1) throw new Error('sig v');
  const s = secp256k1.Signature.fromCompact(sig.slice(0, 64));
  if (s.hasHighS()) throw new Error('sig high-s'); // tolak tanda tangan yang bisa dimalleabel
  const pub = s.addRecoveryBit(v).recoverPublicKey(hash32).toRawBytes(false);
  return checksum(bytesToHex(keccak(pub.slice(1)).slice(12)));
}

/** EIP-191 personal_sign. */
export function personalHash(message) {
  const m = enc.encode(message);
  return keccak(concat(enc.encode(`\x19Ethereum Signed Message:\n${m.length}`), m));
}

// ---------- EIP-712 ----------
const word = (n) => {
  const b = new Uint8Array(32);
  let x = BigInt(n);
  if (x < 0n) x = (1n << 256n) + x;
  for (let i = 31; i >= 0; i -= 1) { b[i] = Number(x & 0xffn); x >>= 8n; }
  return b;
};
const addrWord = (a) => concat(new Uint8Array(12), hexToBytes(a));
const bytes32 = (h) => { const b = hexToBytes(h); if (b.length !== 32) throw new Error('bytes32'); return b; };

const DOMAIN_TYPE = keccak('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');
export const BID_TYPE = 'Bid(bytes32 lotId,address collection,uint256 tokenId,address currency,uint256 maxAmount,uint256 nonce,uint256 deadline)';

export function domainSeparator({ name, version, chainId, verifyingContract }) {
  return keccak(concat(DOMAIN_TYPE, keccak(name), keccak(version), word(chainId), addrWord(verifyingContract)));
}

export function bidStructHash(b) {
  return keccak(concat(keccak(BID_TYPE), bytes32(b.lotId), addrWord(b.collection), word(b.tokenId), addrWord(b.currency), word(b.maxAmount), word(b.nonce), word(b.deadline)));
}

export const typedHash = (domainSep, structHash) => keccak(concat(new Uint8Array([0x19, 0x01]), domainSep, structHash));

/** lotId bytes32 dari string lot (deterministik). */
export const lotIdHex = (lotKey) => bytesToHex(keccak(lotKey));

// ---------- SIWE (EIP-4361) ----------
export function siweMessage({ domain, address, uri, chainId, nonce, issuedAt, statement }) {
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\n${statement}\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

export function parseSiwe(msg) {
  const lines = msg.split('\n');
  const field = (k) => lines.find((l) => l.startsWith(`${k}: `))?.slice(k.length + 2);
  return { domain: lines[0]?.split(' wants you')[0], address: lines[1], nonce: field('Nonce'), chainId: field('Chain ID'), issuedAt: field('Issued At'), uri: field('URI') };
}

// ---------- RPC ----------
const SEL = { balanceOf: '70a08231', allowance: 'dd62ed3e', ownerOf: '6352211e' };
const pad32 = (a) => a.toLowerCase().replace(/^0x/, '').padStart(64, '0');

export async function ethCall(rpc, to, data) {
  const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }) });
  const j = await r.json();
  if (j.error) throw new Error(`rpc ${j.error.message}`);
  return j.result;
}

/** min(saldo, allowance ke spender) dalam base unit (BigInt). */
export async function spendable(rpc, token, owner, spender) {
  const [bal, alw] = await Promise.all([
    ethCall(rpc, token, `0x${SEL.balanceOf}${pad32(owner)}`),
    ethCall(rpc, token, `0x${SEL.allowance}${pad32(owner)}${pad32(spender)}`),
  ]);
  const b = BigInt(bal);
  const a = BigInt(alw);
  return b < a ? b : a;
}

export async function ownerOf(rpc, collection, tokenId) {
  try {
    const r = await ethCall(rpc, collection, `0x${SEL.ownerOf}${word(tokenId).reduce((s, x) => s + x.toString(16).padStart(2, '0'), '')}`);
    return checksum(`0x${r.slice(-40)}`);
  } catch {
    return null; // belum di-mint (lazy mint)
  }
}
